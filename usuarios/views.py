from django.contrib import messages
from django.http import JsonResponse
from .models import Aplicacion, Evento, Usuario, Vacante
from django.shortcuts import get_object_or_404, render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
import json
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from datetime import datetime, timedelta
from django.template.loader import render_to_string
from django.core.paginator import Paginator
from django.db.models import Q
import re
from django.utils.dateparse import parse_datetime
from django.utils.crypto import get_random_string
from django.core.mail import EmailMultiAlternatives
from django.db.models import Q
from django.conf import settings

def welcome(request):
    return render(request, 'welcome.html')

def registro(request):
    return render(request, 'login.html')

def vista_usuario(request):
    return render(request, 'usuarios/dashU.html')

def login_view(request):
    if request.method == 'POST':
        correo = request.POST.get('correo')
        contrasena = request.POST.get('password')
        try:
            user_obj = Usuario.objects.get(email=correo)
            user = authenticate(request, username=user_obj.username, password=contrasena)
        except Usuario.DoesNotExist:
            print("Usuario NO encontrado con ese correo")
            user = None
        if user is not None:
            if user.is_active:
                login(request, user)
                if user.rol == 'admin':
                    return redirect('dashboard')
                else:
                    return redirect('vista_usuario')
            else:
                messages.error(request, 'Tu cuenta está inactiva.')
        else:
            messages.error(request, 'Correo o contraseña incorrectos.')

    return render(request, 'usuarios/login.html')

def registrarse(request):
    if request.method == 'POST':
        nombre = request.POST.get('nombre')             
        apellidos = request.POST.get('apellidos')        
        username = request.POST.get('username')
        correo = request.POST.get('email')
        contrasena1 = request.POST.get('password1')
        contrasena2 = request.POST.get('password2')

        if contrasena1 != contrasena2:
            messages.error(request, 'Las contraseñas no coinciden.')
            return redirect('login')

        if Usuario.objects.filter(username=username).exists():
            messages.error(request, 'Este nombre de usuario ya está en uso.')
            return redirect('login')

        if Usuario.objects.filter(email=correo).exists():
            messages.error(request, 'Ya existe un usuario con este correo.')
            return redirect('login')

        nuevo_usuario = Usuario.objects.create_user(
            username=username,
            first_name=nombre,
            last_name=apellidos,
            email=correo,
            password=contrasena1,
            rol='user'
        )

        messages.success(request, 'Registro exitoso. Ya puedes iniciar sesión.')
        return redirect('login')

    return redirect('login')

@login_required
def bienvenida(request):
    return render(request, 'usuarios/bienvenida.html')

def cerrar_sesion(request):
    logout(request)
    return redirect('login')
@login_required
def vista_admin(request):
    if request.user.rol != 'admin':
        return redirect('vista_usuario') 
    return render(request, 'admin/d_admin.html')
def vista_admin(request):
    administradores = Usuario.objects.filter(rol='admin')
    return render(request, 'admin/d_admin.html', {'administradores': administradores})

@login_required
def vista_admin(request):
    if request.user.rol != 'admin':
        return redirect('vista_usuario')
    
    limite = timezone.now() - timedelta(hours=48)
    Evento.objects.filter(fin__lt=limite).delete()

    total_usuarios = Usuario.objects.filter(rol='user').count()
    total_admins = Usuario.objects.filter(rol='admin').count()
    vacantes_activas = Vacante.objects.filter(activa=True).count()
    vacantes_no_activas = Vacante.objects.filter(activa=False).count()
    solicitudes_vistas = Aplicacion.objects.filter(vista=True).count()
    solicitudes_no_vistas = Aplicacion.objects.filter(vista=False).count()

    ahora = timezone.localtime()
    hoy = ahora.date()
    manana = hoy + timedelta(days=1)

    inicio_dia = timezone.make_aware(datetime.combine(hoy, datetime.min.time()))
    fin_dia = timezone.make_aware(datetime.combine(hoy, datetime.max.time()))

    citas_hoy = Evento.objects.filter(
        usuario=request.user, 
        inicio__range=(ahora, fin_dia)
    ).order_by('inicio')

    inicio_manana = timezone.make_aware(datetime.combine(manana, datetime.min.time()))
    fin_manana = timezone.make_aware(datetime.combine(manana, datetime.max.time()))

    cita_proxima_manana = Evento.objects.filter(
        usuario=request.user, 
        inicio__range=(inicio_manana, fin_manana)
    ).order_by('inicio').first()

    contexto = {
        'opcion_activa': 'dashboard',
        'total_usuarios': total_usuarios,
        'total_admins': total_admins,
        'vacantes_activas': vacantes_activas,
        'vacantes_no_activas': vacantes_no_activas,
        'solicitudes_vistas': solicitudes_vistas,
        'solicitudes_no_vistas': solicitudes_no_vistas,
        'citas_hoy': citas_hoy,
        'cita_proxima_manana': cita_proxima_manana,
    }

    return render(request, 'admin/d_admin.html', contexto)

def administradores(request):
    return render(request, 'admin/administradores.html')

def usuarios(request):
    return render(request, 'admin/usuarios.html')

def perfil(request):
    return render(request, 'admin/perfil.html')

def perfilU(request):
    return render(request, 'usuarios/perfil.html')

def convocatoria(request):
    vacantes = Vacante.objects.all()

    return render(request, 'admin/convocatoria.html', {
        'vacante': vacantes,
        'modelo': Vacante, 
    })

def solicitud(request):
    return render(request, 'admin/solicitudes.html')

def listar_solicitudes(request):
    vista = request.GET.get('vista', '')
    nombre = request.GET.get('nombre', '')
    vacante = request.GET.get('vacante', '')
    correo = request.GET.get('correo', '')

    aplicaciones = Aplicacion.objects.all()

    if vista == 'true':
        aplicaciones = aplicaciones.filter(vista=True)
    elif vista == 'false':
        aplicaciones = aplicaciones.filter(vista=False)

    if nombre:
        aplicaciones = aplicaciones.filter(nombre__icontains=nombre)
    if vacante:
        aplicaciones = aplicaciones.filter(vacante__titulo__icontains=vacante)
    if correo:
        aplicaciones = aplicaciones.filter(correo__icontains=correo)

    aplicaciones = aplicaciones.order_by('vista', 'id')

    return render(request, 'admin/parcial_solicitudes.html', {'aplicaciones': aplicaciones})

def marcar_solicitud(request, pk):
    if request.method == 'POST':
        app = get_object_or_404(Aplicacion, pk=pk)
        app.vista = not app.vista
        app.save()
        return JsonResponse({'success': True})
    return JsonResponse({'success': False})

def eliminar_solicitud(request, pk):
    if request.method == 'POST':
        app = get_object_or_404(Aplicacion, pk=pk)
        app.delete()
        return JsonResponse({'success': True})
    return JsonResponse({'success': False})

def calendario(request):
    return render(request, 'admin/calendario.html')

def calendarioU(request):
    return render(request, 'usuarios/calendario.html')

def vacantesU(request):
    vacantes = Vacante.objects.filter(activa=True).order_by('-destacada', '-fecha_creacion')

    for vacante in vacantes:
        vacante.ya_aplico = False
        if request.user.is_authenticated:
            vacante.ya_aplico = Aplicacion.objects.filter(
                usuario=request.user, vacante=vacante
            ).exists()

    return render(request, "usuarios/vacantes.html", {"vacantes": vacantes})


def agregar_administrador(request):
    if request.method == 'POST':
        try:
            Usuario.objects.create(
                username=request.POST['username'],
                password=make_password(request.POST['password']), 
                first_name=request.POST['first_name'],
                last_name=request.POST['last_name'],
                email=request.POST['email'],
                is_superuser=request.POST.get('is_superuser') == 'on',
                is_staff=request.POST.get('is_staff') == 'on',
                is_active=True,
                rol='admin'
            )
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

User = get_user_model()

@login_required
def cargar_administradores(request):
    administradores = User.objects.filter(is_staff=True).exclude(id=request.user.id)
    return render(request, 'admin/administradores.html', {
        'administradores': administradores
    })

@login_required
@csrf_exempt
def agregar_administrador(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            is_superuser = data.get('is_superuser', False)

            if is_superuser and not request.user.is_superuser:
                return JsonResponse({'success': False, 'message': 'No tienes permisos para asignar superusuario'}, status=403)

            user = Usuario.objects.create_user(
                username=data['email'],
                email=data['email'],
                first_name=data['nombre'],
                last_name=data['apellido'],
                password=data['password'],
                is_staff=True, 
                is_superuser=is_superuser,
                rol='admin',
                is_active=True
            )
            user.save()
            return JsonResponse({'success': True})

        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
    return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)

def obtener_admin(request, id):
    admin = User.objects.get(id=id)
    return JsonResponse({
        'first_name': admin.first_name,
        'last_name': admin.last_name,
        'email': admin.email,
        'is_staff': admin.is_staff,
        'is_superuser': admin.is_superuser,
        'rol': admin.rol
    })
User = get_user_model()
@csrf_exempt
@login_required
def actualizar_admin(request, id):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            admin = Usuario.objects.get(id=id)

            admin.first_name = data.get('nombre', admin.first_name)
            admin.last_name = data.get('apellido', admin.last_name)
            admin.email = data.get('correo', admin.email)

            nuevo_rol = data.get('rol', admin.rol)
            admin.rol = nuevo_rol

            admin.is_staff = True if nuevo_rol == 'admin' else False

            if request.user.is_superuser:
                admin.is_superuser = data.get('is_superuser', admin.is_superuser)
            elif data.get('is_superuser', admin.is_superuser) != admin.is_superuser:
                return JsonResponse({'success': False, 'message': 'No tienes permisos para asignar superusuario'}, status=403)

            nueva_contraseña = data.get('password', '').strip()
            if nueva_contraseña:
                admin.set_password(nueva_contraseña)

            admin.save()
            return JsonResponse({'success': True})

        except Usuario.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Administrador no encontrado'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

    return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)

User = get_user_model()
@csrf_exempt
@login_required
def eliminar_admin(request, id):
    if request.method == 'POST':
        if not request.user.is_superuser:
            return JsonResponse({'success': False, 'message': 'No tienes permisos para eliminar administradores.'}, status=403)
        try:
            admin = User.objects.get(id=id)
            admin.delete()
            return JsonResponse({'success': True})
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Administrador no encontrado'}, status=404)
    return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)

User = get_user_model()
@login_required
def listar_administradores_ajax(request):
    nombre = request.GET.get('nombre', '').strip()
    email = request.GET.get('email', '').strip()
    pagina = int(request.GET.get('pagina', 1))
    per_page = 10

    qs = User.objects.filter(is_staff=True, rol='admin').exclude(id=request.user.id)

    if nombre:
        qs = qs.filter(Q(first_name__icontains=nombre) | Q(last_name__icontains=nombre))
    if email:
        qs = qs.filter(email__icontains=email)

    paginator = Paginator(qs.order_by('first_name', 'last_name'), per_page)
    page_obj = paginator.get_page(pagina)

    admins_list = []
    for admin in page_obj.object_list:
        admins_list.append({
            'id': admin.id,
            'first_name': admin.first_name,
            'last_name': admin.last_name,
            'email': admin.email,
            'is_staff': admin.is_staff,
            'is_superuser': admin.is_superuser,
            'rol': admin.rol,
        })

    return JsonResponse({
        'administradores': admins_list,
        'pagina_actual': page_obj.number,
        'total_paginas': paginator.num_pages,
        'total_items': paginator.count,
    })

@login_required
def cargar_usuarios(request):
    usuarios = User.objects.filter(is_staff=False).exclude(id=request.user.id)
    return render(request, 'admin/usuarios.html', {
        'usuarios': usuarios
    })

@login_required
@csrf_exempt
def agregar_usuario(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            user = Usuario.objects.create_user(
                username=data['email'],
                email=data['email'],
                first_name=data['nombre'],
                last_name=data['apellido'],
                password=data['password'],
                is_staff=False,
                is_superuser=False,
                is_active=True,
                rol='user'
            )
            user.save()
            return JsonResponse({'success': True})

        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)

@csrf_exempt
@login_required
def eliminar_usuario(request, id):
    if request.method == 'POST':
        try:
            usuario = User.objects.get(id=id)
            usuario.delete()
            return JsonResponse({'success': True})
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Usuario no encontrado'}, status=404)
    return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)

@csrf_exempt 
@login_required
def obtener_usuario(request, id):
    try:
        usuario = Usuario.objects.get(id=id)
        return JsonResponse({
            'first_name': usuario.first_name,
            'last_name': usuario.last_name,
            'email': usuario.email,
            'username': usuario.username,
            'is_staff': usuario.is_staff,
            'is_superuser': usuario.is_superuser,
            'rol': usuario.rol
        })
    except Usuario.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Usuario no encontrado'}, status=404)

@csrf_exempt
@login_required
def actualizar_usuario(request, id):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            usuario = Usuario.objects.get(id=id)

            usuario.first_name = data.get('nombre', usuario.first_name)
            usuario.last_name = data.get('apellido', usuario.last_name)
            usuario.email = data.get('correo', usuario.email)

            nuevo_rol = data.get('rol', usuario.rol)
            usuario.rol = nuevo_rol

            if nuevo_rol == 'admin':
                usuario.is_staff = True
            else:
                usuario.is_staff = False

            if request.user.is_superuser:
                usuario.is_superuser = data.get('is_superuser', usuario.is_superuser)
            elif data.get('is_superuser', usuario.is_superuser) != usuario.is_superuser:
                return JsonResponse({'success': False, 'message': 'No tienes permisos para asignar superusuario'}, status=403)

            nueva_contraseña = data.get('password', '').strip()
            if nueva_contraseña:
                usuario.set_password(nueva_contraseña)

            usuario.save()

            return JsonResponse({
                'success': True,
                'first_name': usuario.first_name,
                'last_name': usuario.last_name,
                'email': usuario.email,
                'username': usuario.username,
                'is_staff': usuario.is_staff,
                'is_superuser': usuario.is_superuser,
                'rol': usuario.rol,
            })

        except Usuario.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Usuario no encontrado'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

    return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)

@login_required
def editar_perfil(request):
    user = request.user

    if request.method == 'POST' and request.headers.get('x-requested-with') == 'XMLHttpRequest':
        errores = []

        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '').strip()
        imagen = request.FILES.get('imagen')

        if not first_name:
            errores.append("El nombre es obligatorio.")
        if not last_name:
            errores.append("El apellido es obligatorio.")
        if not email:
            errores.append("El correo electrónico es obligatorio.")
        elif not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            errores.append("El correo electrónico no es válido.")
        if imagen and not imagen.content_type.startswith('image/'):
            errores.append("El archivo debe ser una imagen.")

        if errores:
            return JsonResponse({'success': False, 'errors': errores})

        user.first_name = first_name
        user.last_name = last_name
        user.email = email
        if imagen:
            user.imagen = imagen
        if password:
            user.set_password(password)
        user.save()

        return JsonResponse({'success': True, 'message': 'Perfil actualizado correctamente.'})

    return render(request, 'admin/perfil.html', {'user': user})

def editar_perfilU(request):
    user = request.user

    if request.method == 'POST' and request.headers.get('x-requested-with') == 'XMLHttpRequest':
        errores = []

        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '').strip()
        imagen = request.FILES.get('imagen')
        curriculum = request.FILES.get('curriculum')
        if not first_name:
            errores.append("El nombre es obligatorio.")
        if not last_name:
            errores.append("El apellido es obligatorio.")
        if not email:
            errores.append("El correo electrónico es obligatorio.")
        elif not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            errores.append("El correo electrónico no es válido.")
        if imagen and not imagen.content_type.startswith('image/'):
            errores.append("El archivo de imagen no es válido.")
        if curriculum and curriculum.content_type != 'application/pdf':
            errores.append("El currículum debe estar en formato PDF.")

        if errores:
            return JsonResponse({'success': False, 'errors': errores})

        user.first_name = first_name
        user.last_name = last_name
        user.email = email
        if imagen:
            user.imagen = imagen
        if curriculum:
            user.curriculum = curriculum
        if password:
            user.set_password(password)
        user.save()

        return JsonResponse({
            'success': True,
            'message': 'Perfil actualizado correctamente.',
            'imagen_url': user.imagen.url if user.imagen else None,
            'curriculum_url': user.curriculum.url if user.curriculum else None
        })

    return render(request, 'usuarios/perfil.html', {
        'user': user,
        'opcion_activa': 'perfil'
    })

@csrf_exempt
def guardar_evento(request):
    if request.method == 'POST' and request.user.is_authenticated:
        try:
            data = json.loads(request.body)

            nuevo_evento = Evento.objects.create(
                usuario=request.user,
                titulo=f"Cita con {data['persona']}",
                inicio=parse_datetime(data['inicio']),
                fin=parse_datetime(data['fin']),
                telefono=data['telefono'],
                enlace=data['enlace'],
                persona=data['persona'],
                email=data.get('email', '')  # Aquí agregamos el email
            )

            return JsonResponse({'status': 'ok', 'id': nuevo_evento.id})

        except Exception as e:
            print("❌ ERROR al guardar cita:", e)
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'No autorizado'}, status=403)

def vista_calendario(request):
    eventos = Evento.objects.filter(usuario=request.user)  
    lista_eventos = []

    for evento in eventos:
        lista_eventos.append({
            'title': evento.titulo,
            'start': evento.fecha_inicio.isoformat(),
            'end': evento.fecha_fin.isoformat() if evento.fecha_fin else None,
            'url': evento.url if evento.url else '',
        })

    return render(request, 'calendario.html', {
        'eventos_json': json.dumps(lista_eventos)
    })

def vista_calendarioU(request):
    eventos = Evento.objects.filter(usuario=request.user) 
    lista_eventos = []

    for evento in eventos:
        lista_eventos.append({
            'title': evento.titulo,
            'start': evento.fecha_inicio.isoformat(),
            'end': evento.fecha_fin.isoformat() if evento.fecha_fin else None,
            'url': evento.url if evento.url else '',
        })

    return render(request, 'usuarios/calendario.html', {
        'eventos_json': json.dumps(lista_eventos)
    })

def cargar_eventos(request):
    eventos = Evento.objects.filter(usuario=request.user)
    eventos_list = []
    for e in eventos:
        eventos_list.append({
            "id": str(e.id),
            "title": e.titulo,
            "start": e.inicio.isoformat(),
            "end": e.fin.isoformat(),
            "extendedProps": {
                "telefono": e.telefono,
                "email": e.email or "",
                "enlace": e.enlace,
                "persona": e.persona,
            }
        })
    return JsonResponse(eventos_list, safe=False)

def cargar_eventosU(request):
    eventos = Evento.objects.filter(usuario=request.user) 
    eventos_list = []
    for e in eventos:
        eventos_list.append({
            "id": str(e.id),
            "title": e.titulo,
            "start": e.inicio.isoformat(),
            "end": e.fin.isoformat(),
            "extendedProps": {
                "telefono": e.telefono,
                "email": e.email or "",
                "enlace": e.enlace,
                "persona": e.persona,
            }
        })
    return JsonResponse(eventos_list, safe=False)

@csrf_exempt
@require_http_methods(["PUT"])
def actualizar_evento(request, evento_id):
    evento = get_object_or_404(Evento, id=evento_id)
    
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'JSON inválido'}, status=400)
    
    persona = data.get('persona')
    email = data.get('email')
    telefono = data.get('telefono')
    enlace = data.get('enlace')
    titulo = data.get('titulo')
    inicio_str = data.get('inicio')
    fin_str = data.get('fin')

    if not all([titulo, persona, telefono, inicio_str, fin_str]):
        return JsonResponse({'status': 'error', 'message': 'Faltan campos obligatorios'}, status=400)
    
    telefono = re.sub(r'[^0-9]', '', telefono)
    
    inicio = parse_datetime(inicio_str)
    fin = parse_datetime(fin_str)
    if not inicio or not fin:
        return JsonResponse({'status': 'error', 'message': 'Formato de fecha inválido'}, status=400)
    
    if fin <= inicio:
        return JsonResponse({'status': 'error', 'message': 'La fecha/hora de fin debe ser posterior al inicio'}, status=400)

    evento.titulo = titulo
    evento.persona = persona
    evento.telefono = telefono
    evento.email = email
    evento.enlace = enlace
    evento.inicio = inicio
    evento.fin = fin
    evento.save()
    
    return JsonResponse({'status': 'ok', 'message': 'Evento actualizado correctamente'})

@require_http_methods(["DELETE"])
def eliminar_evento(request, evento_id):
    evento = get_object_or_404(Evento, id=evento_id)
    evento.delete()
    return JsonResponse({'status': 'ok', 'message': 'Evento eliminado'})

def filtrar_convocatorias_ajax(request):
    vacantes = Vacante.objects.all()
    busqueda = request.GET.get('busqueda', '')
    estado = request.GET.get('estado_mexico', '')
    nivel = request.GET.get('nivel', '')
    destacada = request.GET.get('destacada', '')
    activa = request.GET.get('activa', '')

    if busqueda:
        vacantes = vacantes.filter(Q(titulo__icontains=busqueda) | Q(descripcion_corta__icontains=busqueda))

    if estado:
        vacantes = vacantes.filter(estado_mexico=estado)

    if nivel:
        vacantes = vacantes.filter(nivel=nivel)

    if destacada == 'true':
        vacantes = vacantes.filter(destacada=True)
    elif destacada == 'false':
        vacantes = vacantes.filter(destacada=False)

    if activa == 'true':
        vacantes = vacantes.filter(activa=True)
    elif activa == 'false':
        vacantes = vacantes.filter(activa=False)

    html = render_to_string('admin/parcial_vacantes.html', {'vacante': vacantes})
    return JsonResponse({'html': html})

@csrf_exempt
@require_http_methods(["POST"])
def vacante_agregar(request):
    try:
        data = json.loads(request.body)

        vacante = Vacante.objects.create(
            titulo=data.get('titulo', ''),
            descripcion_corta=data.get('descripcion_corta', ''),
            descripcion=data.get('descripcion', ''),
            estado_mexico=data.get('estado_mexico', ''),
            nivel=data.get('nivel', 'FT'),
            destacada=data.get('destacada', False),
            activa=data.get('activa', True)
        )
        return JsonResponse({'success': True, 'id': vacante.id})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@require_http_methods(["GET"])
def vacante_detalle(request, id):
    vacante = get_object_or_404(Vacante, id=id)
    data = {
        'id': vacante.id,
        'titulo': vacante.titulo,
        'descripcion_corta': vacante.descripcion_corta,
        'descripcion': vacante.descripcion,
        'estado_mexico': vacante.estado_mexico,
        'nivel': vacante.nivel,
        'destacada': vacante.destacada,
        'activa': vacante.activa
    }
    return JsonResponse(data)

@csrf_exempt
@require_http_methods(["PUT"])
def vacante_editar(request, id):
    vacante = get_object_or_404(Vacante, id=id)
    try:
        data = json.loads(request.body)

        vacante.titulo = data.get('titulo', vacante.titulo)
        vacante.descripcion_corta = data.get('descripcion_corta', vacante.descripcion_corta)
        vacante.descripcion = data.get('descripcion', vacante.descripcion)
        vacante.estado_mexico = data.get('estado_mexico', vacante.estado_mexico)
        vacante.nivel = data.get('nivel', vacante.nivel)
        vacante.destacada = data.get('destacada', vacante.destacada)
        vacante.activa = data.get('activa', vacante.activa)
        vacante.save()

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["DELETE"])
def vacante_eliminar(request, id):
    vacante = get_object_or_404(Vacante, id=id)
    try:
        vacante.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
@login_required
def vista_usuario(request):
    solicitudes_vistas = Aplicacion.objects.filter(usuario=request.user, vista=True).count()
    solicitudes_no_vistas = Aplicacion.objects.filter(usuario=request.user, vista=False).count()

    ahora = timezone.localtime()
    hoy = ahora.date()
    manana = hoy + timedelta(days=1)

    inicio_dia = timezone.make_aware(datetime.combine(hoy, datetime.min.time()))
    fin_dia = timezone.make_aware(datetime.combine(hoy, datetime.max.time()))

    citas_hoy = Evento.objects.filter(
        usuario=request.user, 
        inicio__range=(ahora, fin_dia)
    ).order_by('inicio')

    inicio_manana = timezone.make_aware(datetime.combine(manana, datetime.min.time()))
    fin_manana = timezone.make_aware(datetime.combine(manana, datetime.max.time()))

    cita_proxima_manana = Evento.objects.filter(
        usuario=request.user, 
        inicio__range=(inicio_manana, fin_manana)
    ).order_by('inicio').first()

    aplicaciones_no_vistas = Aplicacion.objects.filter(usuario=request.user, vista=False).order_by('-id')

    contexto = {
        'opcion_activa': 'vista_usuario',
        'solicitudes_vistas': solicitudes_vistas,
        'solicitudes_no_vistas': solicitudes_no_vistas,
        'citas_hoy': citas_hoy,
        'cita_proxima_manana': cita_proxima_manana,
        'aplicaciones_no_vistas': aplicaciones_no_vistas,
    }

    return render(request, 'usuarios/dashU.html', contexto)

def obtener_datos_usuario(request, vacante_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "No autenticado"}, status=401)

    usuario = request.user
    aplicacion = Aplicacion.objects.filter(usuario=usuario, vacante_id=vacante_id).first()

    data = {
        "nombre": f"{usuario.first_name} {usuario.last_name}".strip() or (aplicacion.nombre if aplicacion else ""),
        "correo": usuario.email or (aplicacion.correo if aplicacion else ""),
        "direccion": aplicacion.direccion if aplicacion else "",
        "telefono": aplicacion.telefono if aplicacion else "",
        "imagen": usuario.imagen.url if usuario.imagen else (aplicacion.imagen.url if aplicacion and aplicacion.imagen else ""),
        "curriculum": usuario.curriculum.url if usuario.curriculum else (aplicacion.curriculum.url if aplicacion and aplicacion.curriculum else "")
    }
    return JsonResponse(data)

@csrf_exempt
def aplicar_vacante(request, vacante_id):
    if request.method == "POST":
        try:
            vacante = Vacante.objects.get(id=vacante_id)
        except Vacante.DoesNotExist:
            return JsonResponse({"error": "Vacante no encontrada"}, status=404)

        usuario = request.user
        if Aplicacion.objects.filter(usuario=usuario, vacante=vacante).exists():
            return JsonResponse({"error": "Ya aplicaste a esta vacante"}, status=400)

        nombre = request.POST.get('nombre')
        correo = request.POST.get('correo')
        direccion = request.POST.get('direccion', '')
        telefono = request.POST.get('telefono')
        imagen = request.FILES.get('imagen')
        curriculum = request.FILES.get('curriculum') 

        if not nombre or not correo or not telefono or not (curriculum or usuario.curriculum):
            return JsonResponse({"error": "Faltan campos obligatorios"}, status=400)

        if not imagen and usuario.imagen:
            imagen = usuario.imagen

        if not curriculum and usuario.curriculum:
            curriculum = usuario.curriculum

        aplicacion = Aplicacion.objects.create(
            usuario=usuario,
            vacante=vacante,
            nombre=nombre,
            correo=correo,
            direccion=direccion,
            telefono=telefono,
            imagen=imagen,
            curriculum=curriculum
        )

        return JsonResponse({"success": "Aplicación enviada correctamente"})
    else:
        return JsonResponse({"error": "Método no permitido"}, status=405)
    
@login_required
def obtener_aplicacion(request, id):
    try:
        app = get_object_or_404(Aplicacion, id=id, usuario=request.user)

        data = {
            "id": app.id,
            "nombre": app.nombre or "",
            "correo": app.correo or "",
            "telefono": app.telefono or "",
            "direccion": app.direccion or "",
            "imagen": app.imagen.url if app.imagen else "",
            "curriculum": app.curriculum.url if app.curriculum else "",
        }

        return JsonResponse(data)
    
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@login_required
def editar_aplicacion(request, pk):
    if request.method == "POST":
        app = Aplicacion.objects.get(pk=pk, usuario=request.user)

        app.nombre = request.POST.get("nombre", app.nombre)
        app.correo = request.POST.get("correo", app.correo)
        app.telefono = request.POST.get("telefono", app.telefono)
        app.direccion = request.POST.get("direccion", app.direccion)

        if "imagen" in request.FILES:
            app.imagen = request.FILES["imagen"]

        if "curriculum" in request.FILES:
            app.curriculum = request.FILES["curriculum"]

        app.save()

        return JsonResponse({
            "id": app.id,
            "nombre": app.nombre,
            "correo": app.correo,
            "telefono": app.telefono,
            "direccion": app.direccion,
            "imagen_url": app.imagen.url if app.imagen else None,
            "curriculum_url": app.curriculum.url if app.curriculum else None,
        })
    return JsonResponse({"error": "Método no permitido"}, status=405)

@login_required
def eliminar_aplicacion(request, pk):
    if request.method == "POST":
        app = Aplicacion.objects.get(pk=pk, usuario=request.user)
        app.delete()
        return JsonResponse({"success": True})
    return JsonResponse({"error": "Método no permitido"}, status=405)

def filtrar_vacantes_ajax(request):
    vacantes = Vacante.objects.filter(activa=True)

    busqueda = request.GET.get('busqueda', '').strip()
    estado = request.GET.get('estado_mexico', '')
    nivel = request.GET.get('nivel', '')
    destacada = request.GET.get('destacada', '')

    if busqueda:
        vacantes = vacantes.filter(
            Q(titulo__icontains=busqueda) |
            Q(descripcion__icontains=busqueda) |
            Q(descripcion_corta__icontains=busqueda)
        )
    if estado:
        vacantes = vacantes.filter(estado_mexico=estado)
    if nivel:
        vacantes = vacantes.filter(nivel=nivel)
    if destacada == 'true':
        vacantes = vacantes.filter(destacada=True)
    elif destacada == 'false':
        vacantes = vacantes.filter(destacada=False)
        
    vacantes = vacantes.order_by('-destacada', '-fecha_creacion')

    if request.user.is_authenticated:
        aplicadas = set(
            Aplicacion.objects.filter(usuario=request.user)
            .values_list('vacante_id', flat=True)
        )
        for v in vacantes:
            v.ya_aplico = v.id in aplicadas
    else:
        for v in vacantes:
            v.ya_aplico = False

    html = render_to_string('usuarios/parcial_vacantes.html', {
        'vacantes': vacantes,
        'user': request.user
    })
    return JsonResponse({'html': html})

User = get_user_model()

def _plantilla_email_html(nombre, nueva_contrasena, soporte_email=None):
    soporte = soporte_email or getattr(settings, "DEFAULT_FROM_EMAIL", "soporte@tuapp.com")
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <style>
        body {{
          margin:0; padding:0; background:#f5f7fb; font-family: Arial, Helvetica, sans-serif;
        }}
        .container {{
          max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 14px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.08); overflow: hidden;
        }}
        .header {{
          background: linear-gradient(135deg,#6a11cb 0%, #2575fc 100%);
          color: #fff; padding: 24px 28px;
        }}
        .header h1 {{
          margin: 0; font-size: 22px; letter-spacing: .3px;
        }}
        .content {{ padding: 26px 28px; color:#333; }}
        .saludo {{ font-size: 16px; margin-bottom: 10px; }}
        .texto {{ font-size: 14px; line-height: 1.6; color:#555; }}
        .pass-box {{
          display:inline-block; background:#eef5ff; border:1px dashed #2575fc; border-radius: 10px;
          padding: 14px 18px; margin: 18px 0; font-size: 18px; letter-spacing: 1.4px; color:#1b5fd4;
          font-weight: bold;
        }}
        .btn {{
          display:inline-block; text-decoration:none; background:#2575fc; color:#fff; padding:12px 18px;
          border-radius:10px; margin-top:8px; font-weight:600;
        }}
        .footer {{
          border-top:1px solid #eee; padding:16px 28px; font-size:12px; color:#999; text-align:center;
        }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Recuperación de contraseña</h1>
        </div>
        <div class="content">
          <p class="saludo">Hola{f" {nombre}" if nombre else ""} 👋,</p>
          <p class="texto">
            Hemos generado una nueva contraseña para tu cuenta. Puedes usarla para iniciar sesión
            y te recomendamos cambiarla desde tu perfil por una que recuerdes.
          </p>

          <div class="pass-box">{nueva_contrasena}</div>

          <p class="texto">
            Si no solicitaste este cambio, por favor responde a este correo o escríbenos a <b>{soporte}</b>.
          </p>
        </div>
        <div class="footer">
          © {settings.SITE_NAME if hasattr(settings, "SITE_NAME") else "Tu Aplicación"} — Equipo de soporte
        </div>
      </div>
    </body>
    </html>
    """
def recuperar_contrasena(request):
    ctx = {}
    if request.method == "POST":
        correo = (request.POST.get("correo") or "").strip()

        user = User.objects.filter(Q(email__iexact=correo)).first()

        nueva_pass = get_random_string(
            length=10,
            allowed_chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$_'
        )

        if user:
            user.set_password(nueva_pass)
            user.save()

            asunto = "Tu nueva contraseña"
            html = _plantilla_email_html(
                nombre=(getattr(user, "first_name", "") or getattr(user, "nombre", "")),
                nueva_contrasena=nueva_pass,
                soporte_email=getattr(settings, "DEFAULT_FROM_EMAIL", None)
            )

            email = EmailMultiAlternatives(
                subject=asunto,
                body=f"Hola, tu nueva contraseña es: {nueva_pass}",
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@tuapp.com"),
                to=[correo],
            )
            email.attach_alternative(html, "text/html")
            email.send()

        ctx["success"] = True

        if not user:
             ctx["error"] = "El correo no está registrado."
        else:
             ctx["success"] = True

    return render(request, "auth/recuperar_contrasena.html", ctx)