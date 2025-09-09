document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebarMenu');
    const content = document.getElementById('contentArea');
    const toggleMobile = document.getElementById('sidebarToggleMobile');
    const toggleDesktop = document.getElementById('sidebarToggleDesktop');

    toggleMobile?.addEventListener('click', () => {
        const isShown = sidebar.classList.toggle('show');
        toggleMobile.setAttribute('aria-expanded', isShown);
    });

    toggleDesktop?.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.toggle('collapsed');
        content.classList.toggle('expanded');
        toggleDesktop.setAttribute('aria-expanded', !isCollapsed);
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('show');
        }
    });
});

function activarMenu(elemento) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    if (elemento.classList.contains('nav-link')) {
        elemento.classList.add('active');
    }
}

function mostrarAdministradores() {
    opcionActiva = 'administradores';
    activarMenu(document.querySelector('.btnAdministradores'));

    fetch('/cargar/administradores/')
        .then(response => response.text())
        .then(html => {
            const contentArea = document.getElementById('contenido-dinamico');
            if (contentArea) {
                contentArea.innerHTML = html;
                restaurarMenuLateral();
            }
        });
}

function mostrarUsuarios() {
    opcionActiva = 'Usuarios';
    activarMenu(document.querySelector('.btnUsuarios'));

    fetch('/cargar/usuarios/')
        .then(response => response.text())
        .then(html => {
            const contentArea = document.getElementById('contenido-dinamico');
            if (contentArea) {
                contentArea.innerHTML = html;
                restaurarMenuLateral();
            }
        });
}

function mostrarPerfil() {
    opcionActiva = 'Perfil';
    activarMenu(document.querySelector('.btnPerfil'));

    fetch('/cargar/perfil/')
        .then(response => response.text())
        .then(html => {
            const contentArea = document.getElementById('contenido-dinamico');
            if (contentArea) {
                contentArea.innerHTML = html;
                restaurarMenuLateral();
            }
        });
}

function mostrarConvocatorias() {
    opcionActiva = 'Convocatorias';
    activarMenu(document.querySelector('.btnConvocatorias'));

    fetch('/cargar/convocatoria/')
        .then(response => response.text())
        .then(html => {
            const contentArea = document.getElementById('contenido-dinamico');
            if (contentArea) {
                contentArea.innerHTML = html;
                restaurarMenuLateral();
                inicializarFiltrosDinamicos();
            }
        });
}

function inicializarFiltrosDinamicos() {
    const formFiltros = document.getElementById('form-filtros');
    if (!formFiltros) return;

    formFiltros.querySelectorAll('input, select').forEach(elemento => {
        elemento.addEventListener('input', () => {
            actualizarTablaVacantes();
        });
    });
}

function actualizarTablaVacantes() {
    const form = document.getElementById('form-filtros');
    const datos = new FormData(form);
    const params = new URLSearchParams(datos).toString();

    fetch(`/ajax/filtrar-convocatorias/?${params}`)
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('tbody-vacantes');
            if (tbody) {
                tbody.innerHTML = data.html;
            }
        })
        .catch(error => {
            console.error('Error al filtrar convocatorias:', error);
        });
}

function mostrarSolicitudes() {
    opcionActiva = 'Solicitudes';
    activarMenu(document.querySelector('.btnSolicitudes'));

    const contentArea = document.getElementById('contenido-dinamico');
    if (!contentArea) return;

    fetch('/cargar/solicitud/')
        .then(response => response.text())
        .then(html => {
            contentArea.innerHTML = html;
            inicializarFiltrosSolicitudes();
            restaurarMenuLateral();
        })
        .catch(err => console.error('Error al mostrar solicitudes:', err));
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const csrfToken = getCookie('csrftoken');

function obtenerFiltros() {
    const form = document.getElementById('form-filtros');
    return new URLSearchParams(new FormData(form)).toString();
}

function cargarSolicitudes() {
    const params = obtenerFiltros();
    fetch('/solicitudes/listar/?' + params)
        .then(response => response.text())
        .then(html => {
            document.getElementById('tbody-solicitudes').innerHTML = html;
        });
}

function marcarVista(id) {
    fetch(`/solicitudes/marcar/${id}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    text: 'El estado de la solicitud ha sido cambiado.',
                    timer: 1500,
                    showConfirmButton: false
                });
                cargarSolicitudes();
            } else {
                Swal.fire('Error', 'No se pudo cambiar el estado.', 'error');
            }
        });
}
function eliminarSolicitud(id) {
    Swal.fire({
        title: '¿Seguro que quieres eliminar esta solicitud?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/solicitudes/eliminar/${id}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire('Eliminado', 'La solicitud fue eliminada.', 'success');
                        cargarSolicitudes();
                    } else {
                        Swal.fire('Error', 'No se pudo eliminar la solicitud.', 'error');
                    }
                });
        }
    });
}

function inicializarFiltrosSolicitudes() {
    const form = document.getElementById('form-filtros');
    if (!form) return;
    form.querySelectorAll('select').forEach(el => el.addEventListener('change', cargarSolicitudes));
    form.querySelectorAll('input').forEach(input => {
        let timer = null;
        input.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(cargarSolicitudes, 400);
        });
    });
    cargarSolicitudes();
}
document.addEventListener('DOMContentLoaded', inicializarFiltrosSolicitudes);
function restaurarMenuLateral() {
    const sidebar = document.getElementById('sidebarMenu');
    const content = document.getElementById('contentArea');
    const toggleMobile = document.getElementById('sidebarToggleMobile');
    const toggleDesktop = document.getElementById('sidebarToggleDesktop');

    if (window.innerWidth <= 768) {
        sidebar.classList.remove('show');
        toggleMobile.setAttribute('aria-expanded', false);
    }

    if (sidebar.classList.contains('collapsed')) {
        content.classList.add('expanded');
        toggleDesktop.setAttribute('aria-expanded', false);
    } else {
        content.classList.remove('expanded');
        toggleDesktop.setAttribute('aria-expanded', true);
    }
    document.querySelectorAll('[data-bs-toggle="collapse"]').forEach(el => {
        el.addEventListener('click', function () {
            const target = document.querySelector(this.getAttribute('data-bs-target'));
            if (target) {
                target.classList.toggle('show');
            }
        });
    });
}

function mostrarFormularioAgregar() {
    const esSuperUser = usuarioActualEsSuperuser;
    Swal.fire({
        title: 'Agregar Administrador',
        html: `
        <form id="form-agregar-admin" style="max-width: 400px; margin: auto; text-align: left;">
            <div style="margin-bottom: 10px;">
                <label for="swal-nombre">Nombre</label>
                <input id="swal-nombre" class="swal2-input" placeholder="Nombre" autocomplete="off">
            </div>
            <div style="margin-bottom: 10px;">
                <label for="swal-apellido">Apellido</label>
                <input id="swal-apellido" class="swal2-input" placeholder="Apellido" autocomplete="off">
            </div>
            <div style="margin-bottom: 10px;">
                <label for="swal-email">Correo</label>
                <input id="swal-email" type="email" class="swal2-input" placeholder="Correo">
            </div>
            <div style="margin-bottom: 10px;">
                <label for="swal-password">Contraseña</label>
                <input id="swal-password" type="password" class="swal2-input" placeholder="Contraseña">
            </div>

            ${esSuperUser ? `
            <div style="margin-bottom: 10px;">
                <label for="swal-superuser">¿Es Superusuario?</label>
                <select id="swal-superuser" class="swal2-select" style="width: 100%;">
                    <option value="true">Sí</option>
                    <option value="false" selected>No</option>
                </select>
            </div>
            ` : ''}
        </form>
    `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const nombre = document.getElementById('swal-nombre').value.trim();
            const apellido = document.getElementById('swal-apellido').value.trim();
            const email = document.getElementById('swal-email').value.trim();
            const password = document.getElementById('swal-password').value.trim();
            const is_superuser = esSuperUser ? document.getElementById('swal-superuser').value === 'true' : false;

            if (!nombre || !apellido || !email || !password) {
                Swal.showValidationMessage('Todos los campos son obligatorios');
                return false;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                Swal.showValidationMessage('Ingrese un correo válido');
                return false;
            }

            if (is_superuser && !esSuperUser) {
                Swal.showValidationMessage('No tienes permisos para crear superusuarios');
                return false;
            }

            return fetch('/agregar/administrador/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    nombre,
                    apellido,
                    email,
                    password,
                    is_superuser,
                    rol: 'admin'
                })
            })
                .then(async res => {
                    const data = await res.json();
                    if (!res.ok) {
                        throw new Error(data.message || 'Error en la respuesta del servidor');
                    }
                    return data;
                })
                .then(data => {
                    Swal.fire('Éxito', 'Administrador agregado', 'success');
                    mostrarAdministradores();
                })
                .catch(err => {
                    Swal.fire('Error', err.message, 'error');
                });
        }
    });
}

function convertirNivelTextoACodigo(texto) {
    switch (texto.trim()) {
        case 'Tiempo completo': return 'FT';
        case 'Medio tiempo': return 'PT';
        case 'Prácticas': return 'IN';
        case 'Freelance': return 'FR';
        case 'Remoto': return 'RE';
        default: return '';
    }
}

function mostrarFormularioU() {
    Swal.fire({
        title: 'Agregar Usuario',
        html: `
        <form id="form-agregar-usuario" style="max-width: 400px; margin: auto; text-align: left;">
            <div style="margin-bottom: 10px;">
                <label for="swal-nombre">Nombre</label>
                <input id="swal-nombre" class="swal2-input" placeholder="Nombre" autocomplete="off">
            </div>
            <div style="margin-bottom: 10px;">
                <label for="swal-apellido">Apellido</label>
                <input id="swal-apellido" class="swal2-input" placeholder="Apellido" autocomplete="off">
            </div>
            <div style="margin-bottom: 10px;">
                <label for="swal-email">Correo</label>
                <input id="swal-email" type="email" class="swal2-input" placeholder="Correo">
            </div>
            <div style="margin-bottom: 10px;">
                <label for="swal-password">Contraseña</label>
                <input id="swal-password" type="password" class="swal2-input" placeholder="Contraseña">
            </div>
        </form>
    `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const nombre = document.getElementById('swal-nombre').value.trim();
            const apellido = document.getElementById('swal-apellido').value.trim();
            const email = document.getElementById('swal-email').value.trim();
            const password = document.getElementById('swal-password').value.trim();

            if (!nombre || !apellido || !email || !password) {
                Swal.showValidationMessage('Todos los campos son obligatorios');
                return false;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                Swal.showValidationMessage('Ingrese un correo válido');
                return false;
            }

            return fetch('/agregar/usuario/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    nombre,
                    apellido,
                    email,
                    password
                })
            })
                .then(async res => {
                    const data = await res.json();
                    if (!res.ok) {
                        throw new Error(data.message || 'Error en la respuesta del servidor');
                    }
                    return data;
                })
                .then(data => {
                    Swal.fire('Éxito', 'Usuario agregado', 'success');
                    mostrarUsuarios();
                })
                .catch(err => {
                    Swal.fire('Error', err.message, 'error');
                });
        }
    });
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function confirmarEliminar(adminId, nombre) {
    Swal.fire({
        title: `¿Eliminar a ${nombre}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/eliminar-admin/${adminId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                }
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => {
                            throw err;
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        document.querySelector(`#admin-row-${adminId}`).remove();
                        Swal.fire('¡Eliminado!', 'Administrador eliminado correctamente.', 'success');
                    } else {
                        Swal.fire('Error', data.message || 'No se pudo eliminar.', 'error');
                    }
                })
                .catch(err => {
                    Swal.fire('Error', err.message || 'No tienes permisos para realizar esta acción.', 'error');
                });
        }
    });
}

function eliminarUsuario(usuarioId, nombre) {
    Swal.fire({
        title: `¿Eliminar a ${nombre}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/eliminar-usuario/${usuarioId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                }
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const row = document.querySelector(`#usuario-row-${usuarioId}`);
                        if (row) {
                            row.remove();
                            Swal.fire('¡Eliminado!', 'Usuario eliminado correctamente.', 'success');
                        } else {
                            Swal.fire('Error', 'No se encontró la fila del usuario.', 'error');
                        }
                    } else {
                        Swal.fire('Error', data.message || 'No se pudo eliminar.', 'error');
                    }
                })
                .catch(err => {
                    Swal.fire('Error', err.message || 'Error de red.', 'error');
                });
        }
    });
}

function mostrarFormularioEditar(id) {
    fetch(`/obtener-admin/${id}/`)
        .then(response => response.json())
        .then(data => {
            const esSuperUser = USER_ES_SUPERUSER; // Variable global que indica si el usuario logueado es superusuario

            Swal.fire({
                title: 'Editar Administrador',
                html: `
            <form id="form-editar-admin" style="text-align:left; max-width:400px; margin:auto;">
                <label style="margin-top:8px;">Nombre</label>
                <input id="edit-nombre" class="swal2-input" value="${data.first_name}">

                <label style="margin-top:8px;">Apellido</label>
                <input id="edit-apellido" class="swal2-input" value="${data.last_name}">

                <label style="margin-top:8px;">Correo</label>
                <input id="edit-correo" class="swal2-input" value="${data.email}">

                <label style="margin-top:8px;">Contraseña (dejar vacío para no cambiar)</label>
                <input id="edit-password" type="password" class="swal2-input" placeholder="Nueva contraseña" style="margin-bottom:10px;">

                ${esSuperUser ? `
                <label style="margin-top:8px;">Es Superusuario</label><br>
                <select id="edit-superuser" class="swal2-select" style="width: 100%; margin-bottom: 15px;">
                    <option value="true" ${data.is_superuser ? 'selected' : ''}>Sí</option>
                    <option value="false" ${!data.is_superuser ? 'selected' : ''}>No</option>
                </select>
                ` : ''}

                <label style="margin-top:8px;">Rol</label><br>
                <select id="edit-rol" class="swal2-select" style="width: 100%; margin-bottom: 15px;">
                    <option value="admin" ${data.rol === 'admin' ? 'selected' : ''}>Administrador</option>
                    <option value="user" ${data.rol === 'user' ? 'selected' : ''}>Usuario</option>
                </select>
            </form>
        `,
                showCancelButton: true,
                confirmButtonText: 'Actualizar',
                preConfirm: () => {
                    const nombre = document.getElementById('edit-nombre').value.trim();
                    const apellido = document.getElementById('edit-apellido').value.trim();
                    const correo = document.getElementById('edit-correo').value.trim();
                    const password = document.getElementById('edit-password').value;
                    const is_superuser = esSuperUser ? document.getElementById('edit-superuser').value === 'true' : undefined;
                    const rol = document.getElementById('edit-rol').value;

                    if (!nombre || !apellido || !correo) {
                        Swal.showValidationMessage('Nombre, apellido y correo son obligatorios');
                        return false;
                    }

                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(correo)) {
                        Swal.showValidationMessage('Ingrese un correo válido');
                        return false;
                    }

                    if (!esSuperUser && is_superuser === true) {
                        Swal.showValidationMessage('No tienes permisos para asignar superusuario');
                        return false;
                    }

                    const payload = {
                        nombre,
                        apellido,
                        correo,
                        rol
                    };

                    if (esSuperUser) {
                        payload.is_superuser = is_superuser;
                    }

                    if (password.trim() !== '') {
                        payload.password = password.trim();
                    }

                    return fetch(`/actualizar-admin/${id}/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCSRFToken()
                        },
                        body: JSON.stringify(payload)
                    })
                        .then(res => {
                            if (!res.ok) throw new Error('Error al actualizar');
                            return res.json();
                        })
                        .then(data => {
                            if (data.success) {
                                return fetch(`/obtener-admin/${id}/`)
                                    .then(res => res.json())
                                    .then(adminData => {
                                        actualizarFilaAdmin(id, adminData);
                                        Swal.fire('¡Actualizado!', 'Administrador actualizado correctamente.', 'success');
                                    });
                            } else {
                                Swal.showValidationMessage(data.message || 'Error desconocido');
                            }
                        })
                        .catch(() => {
                            Swal.showValidationMessage('No se pudo actualizar');
                        });
                }
            });
        });
}

function actualizarFilaAdmin(id, datos) {
    const fila = document.querySelector(`#admin-row-${id}`);
    if (!fila) return;

    if (datos.rol !== 'admin') {
        fila.remove();
        return;
    }

    fila.innerHTML = `
        <td>${datos.first_name}</td>
        <td>${datos.last_name}</td>
        <td>${datos.email}</td>
        <td>${datos.is_staff ? 'Sí' : 'No'}</td>
        <td>${datos.is_superuser ? 'Sí' : 'No'}</td>
        <td>
            <button class="btn btn-sm btn-warning me-1" onclick="mostrarFormularioEditar(${id})">Editar</button>
            <button class="btn btn-sm btn-danger" onclick="confirmarEliminar(${id}, '${datos.first_name}')">Eliminar</button>
        </td>
    `;
}

function getCSRFToken() {
    const name = 'csrftoken';
    const cookieValue = document.cookie.split('; ')
        .find(row => row.startsWith(name + '='))
        ?.split('=')[1];
    return cookieValue;
}

function editarUsuario(id) {
    fetch(`/obtener-usuario/${id}/`)
        .then(response => response.json())
        .then(data => {
            const esAdmin = USER_ES_ADMIN;
            const esSuperUser = USER_ES_SUPERUSER;

            Swal.fire({
                title: 'Editar Usuario',
                html: `
            <form id="form-editar-usuario" style="text-align:left; max-width:400px; margin:auto;">
                <label style="margin-top:8px;">Nombre</label>
                <input id="edit-nombre" class="swal2-input" value="${data.first_name}">

                <label style="margin-top:8px;">Apellido</label>
                <input id="edit-apellido" class="swal2-input" value="${data.last_name}">

                <label style="margin-top:8px;">Correo</label>
                <input id="edit-correo" class="swal2-input" value="${data.email}">

                ${esSuperUser ? `
                <label style="margin-top:8px;">Es Superusuario</label>
                <select id="edit-superuser" class="swal2-select" style="width: 100%; margin-bottom: 15px;">
                    <option value="true" ${data.is_superuser ? 'selected' : ''}>Sí</option>
                    <option value="false" ${!data.is_superuser ? 'selected' : ''}>No</option>
                </select>
                ` : ''}

                <label style="margin-top:8px;">Rol</label>
                <select id="edit-rol" class="swal2-select" style="width: 100%; margin-bottom: 15px;">
                    <option value="admin" ${data.rol === 'admin' ? 'selected' : ''}>Administrador</option>
                    <option value="user" ${data.rol === 'user' ? 'selected' : ''}>Usuario</option>
                </select>

                <label style="margin-top:8px;">Contraseña (dejar vacío para no cambiar)</label>
                <input id="edit-password" type="password" class="swal2-input" placeholder="Nueva contraseña" style="margin-bottom:10px;">
            </form>
        `,
                showCancelButton: true,
                confirmButtonText: 'Actualizar',
                preConfirm: () => {
                    const nombre = document.getElementById('edit-nombre').value.trim();
                    const apellido = document.getElementById('edit-apellido').value.trim();
                    const correo = document.getElementById('edit-correo').value.trim();
                    const password = document.getElementById('edit-password').value;
                    const is_superuser = esSuperUser ? document.getElementById('edit-superuser').value === 'true' : undefined;
                    const rol = document.getElementById('edit-rol').value;

                    if (!nombre || !apellido || !correo) {
                        Swal.showValidationMessage('Nombre, apellido y correo son obligatorios');
                        return false;
                    }

                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(correo)) {
                        Swal.showValidationMessage('Ingrese un correo válido');
                        return false;
                    }

                    if (!esSuperUser && is_superuser === true) {
                        Swal.showValidationMessage('No tienes permisos para asignar superusuario');
                        return false;
                    }

                    const payload = {
                        nombre,
                        apellido,
                        correo,
                        rol
                    };

                    if (esSuperUser) {
                        payload.is_superuser = is_superuser;
                    }

                    if (password.trim() !== '') {
                        payload.password = password.trim();
                    }

                    return fetch(`/actualizar-usuario/${id}/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCSRFToken()
                        },
                        body: JSON.stringify(payload)
                    })
                        .then(res => {
                            if (!res.ok) return res.json().then(data => { throw new Error(data.message || 'Error al actualizar') });
                            return res.json();
                        })
                        .then(data => {
                            if (data.success) {
                                actualizarFilaUsuario(id, data);
                                Swal.fire('¡Actualizado!', 'Usuario actualizado correctamente.', 'success');
                            } else {
                                Swal.showValidationMessage(data.message || 'Error desconocido');
                            }
                        })
                        .catch(err => {
                            Swal.fire('Error', err.message || 'No se pudo actualizar', 'error');
                        });
                }
            });
        });
}

function actualizarFilaUsuario(id, datos) {
    const tbody = document.querySelector('#tabla-usuarios tbody');
    let fila = document.querySelector(`#usuario-row-${id}`);

    if (datos.rol !== 'user') {
        if (fila) fila.remove();
        return;
    }

    if (!fila) {
        fila = document.createElement('tr');
        fila.id = `usuario-row-${id}`;
        tbody.appendChild(fila);
    }
    fila.innerHTML = `
    <td>${datos.first_name} ${datos.last_name}</td>
    <td>${datos.username}</td>
    <td>${datos.email}</td>
    <td>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</td>
    <td class="text-center">
        <button class="btn btn-sm btn-warning me-1" onclick="editarUsuario(${id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="eliminarUsuario(${id}, '${datos.first_name} ${datos.last_name}')">Eliminar</button>
    </td>
`;
}

function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value;
}
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function mostrarVistaPrevia(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('imagen-preview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function mostrarPerfil() {
    fetch('/perfil/editar/')
        .then(res => res.text())
        .then(html => {
            document.getElementById('contenido-dinamico').innerHTML = html;
            agregarEventoEnvioFormulario();
        })
        .catch(() => {
            Swal.fire('Error', 'No se pudo cargar el formulario', 'error');
        });
}

function agregarEventoEnvioFormulario() {
    const form = document.getElementById('form-editar-perfil');
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const formData = new FormData(form);

        fetch('/perfil/editar/', {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: formData
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    Swal.fire('¡Éxito!', data.message, 'success');
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Errores',
                        html: data.errors.join('<br>')
                    });
                }
            })
            .catch(() => {
                Swal.fire('Error', 'No se pudo actualizar', 'error');
            });
    });
}
async function mostrarCalendario() {
    try {
        const response = await fetch('/cargar/calendario/');
        const html = await response.text();
        const contentArea = document.getElementById('contenido-dinamico');
        contentArea.innerHTML = html;

        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) {
            Swal.fire('Error', 'No se encontró el div #calendar después de cargar la vista.', 'error');
            return;
        }

        if (window.calendar && typeof window.calendar.destroy === 'function') {
            window.calendar.destroy();
        }

        const eventosResponse = await fetch('/cargar/eventos/');
        const eventos = await eventosResponse.json();

        window.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'es',
            height: 600,
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek'
            },
            events: eventos,
            eventClick: function (info) {
                info.jsEvent.preventDefault();

                mostrarDetallesEvento(info.event);
            }
        });

        window.calendar.render();
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'No se pudo cargar la vista del calendario.', 'error');
    }
}

function mostrarDetallesEvento(evento) {
    const telefono = evento.extendedProps.telefono;
    const email = evento.extendedProps.email;
    const enlace = evento.extendedProps.enlace;

    const telefonoLink = telefono
        ? `<a href="https://wa.me/52${telefono}" target="_blank">${telefono}</a>`
        : 'No especificado';

    const emailLink = email
        ? `<a href="mailto:${email}">${email}</a>`
        : 'No especificado';

    const enlaceReunion = enlace
        ? `<a href="${enlace}" target="_blank">Enlace de reunión</a>`
        : 'No especificado';

    Swal.fire({
        title: evento.title,
        html: `
    <p><strong>Persona:</strong> ${evento.extendedProps.persona || 'No especificado'}</p>
    <p><strong>Email:</strong> ${emailLink}</p>
    <p><strong>Teléfono:</strong> ${telefonoLink}</p>
    <p><strong>Inicio:</strong> ${evento.start ? evento.start.toLocaleString() : 'No definido'}</p>
    <p><strong>Fin:</strong> ${evento.end ? evento.end.toLocaleString() : 'Sin definir'}</p>
    <p><strong>Enlace:</strong> ${enlaceReunion}</p>
  `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Editar',
        denyButtonText: 'Eliminar',
        cancelButtonText: 'Cerrar',
        preConfirm: () => {
            mostrarFormularioEditarE(evento);
        },
        preDeny: () => {
            eliminarEvento(evento);
        }
    });
}

function mostrarFormularioEditarE(evento) {
    function formatDateForInput(date) {
        if (!date) return '';
        const d = new Date(date);
        const pad = n => n.toString().padStart(2, '0');
        const yyyy = d.getFullYear();
        const mm = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const min = pad(d.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    }

    Swal.fire({
        title: 'Editar Cita',
        html: `
    <input id="edit-persona" class="swal2-input" placeholder="Persona" value="${evento.extendedProps.persona || ''}">
    <input id="edit-email" class="swal2-input" placeholder="Correo" value="${evento.extendedProps.email || ''}">
    <input id="edit-telefono" class="swal2-input" placeholder="Teléfono" value="${evento.extendedProps.telefono || ''}">
    <input id="edit-enlace" class="swal2-input" placeholder="Enlace reunión" value="${evento.extendedProps.enlace || ''}">
    <label for="edit-inicio" style="text-align:left; width:100%; margin-top:10px;">Inicio</label>
    <input id="edit-inicio" type="datetime-local" class="swal2-input" value="${formatDateForInput(evento.start)}">
    <label for="edit-fin" style="text-align:left; width:100%;">Fin</label>
    <input id="edit-fin" type="datetime-local" class="swal2-input" value="${formatDateForInput(evento.end)}">
  `,
        confirmButtonText: 'Guardar cambios',
        focusConfirm: false,
        preConfirm: () => {
            const inicio = document.getElementById('edit-inicio').value;
            const fin = document.getElementById('edit-fin').value;

            if (!inicio || !fin || new Date(fin) <= new Date(inicio)) {
                Swal.showValidationMessage('La fecha/hora de fin debe ser posterior a la de inicio');
                return false;
            }

            return {
                persona: document.getElementById('edit-persona').value,
                email: document.getElementById('edit-email').value,
                telefono: document.getElementById('edit-telefono').value,
                enlace: document.getElementById('edit-enlace').value,
                inicio,
                fin,
                id: evento.id,
                titulo: `Reunión con ${document.getElementById('edit-persona').value || '...'}`,
            };
        }
    }).then(result => {
        if (result.isConfirmed && result.value) {
            actualizarEvento(result.value);
        }
    });
}

async function actualizarEvento(datos) {
    try {
        const response = await fetch(`/evento/${datos.id}/actualizar/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify(datos),
        });

        if (!response.ok) throw new Error('Error al actualizar la cita');

        const data = await response.json();

        Swal.fire('Actualizado', data.message || 'La cita fue actualizada.', 'success');

        const evento = window.calendar.getEventById(datos.id);
        if (evento) {
            evento.setProp('title', datos.titulo);
            evento.setExtendedProp('persona', datos.persona);
            evento.setExtendedProp('email', datos.email);
            evento.setExtendedProp('telefono', datos.telefono);
            evento.setExtendedProp('enlace', datos.enlace);
            evento.setStart(datos.inicio);
            evento.setEnd(datos.fin);
        }
    } catch (error) {
        console.error('Error al actualizar:', error);
        Swal.fire('Error', 'No se pudo actualizar la cita.', 'error');
    }
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function mostrarFormularioCita() {
    Swal.fire({
        title: 'Agregar Cita',
        html: `
    <form id="form-agregar-cita" style="max-width: 500px; margin: auto; text-align: left;">
      <div style="margin-bottom: 10px;">
        <label for="swal-persona">Nombre de la persona</label>
        <input id="swal-persona" class="swal2-input" placeholder="Nombre completo" autocomplete="off">
      </div>
      <div style="margin-bottom: 10px;">
        <label for="swal-email">Correo electrónico</label>
        <input id="swal-email" type="email" class="swal2-input" placeholder="correo@ejemplo.com" autocomplete="off">
      </div>
      <div style="margin-bottom: 10px;">
        <label for="swal-telefono">Número de teléfono</label>
        <input id="swal-telefono" class="swal2-input" placeholder="Ej. 5512345678" autocomplete="off">
      </div>
      <div style="margin-bottom: 10px;">
        <label for="swal-link">Enlace de reunión</label>
        <input id="swal-link" type="url" class="swal2-input" placeholder="https://meet.google.com/xyz">
      </div>
      <div style="margin-bottom: 10px;">
        <label for="swal-inicio">Fecha y hora de inicio</label>
        <input id="swal-inicio" type="datetime-local" class="swal2-input">
      </div>
      <div style="margin-bottom: 10px;">
        <label for="swal-fin">Fecha y hora de fin</label>
        <input id="swal-fin" type="datetime-local" class="swal2-input">
      </div>
    </form>
  `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const persona = document.getElementById('swal-persona').value.trim();
            const email = document.getElementById('swal-email').value.trim();
            const telefono = document.getElementById('swal-telefono').value.trim();
            const link = document.getElementById('swal-link').value.trim();
            const inicio = document.getElementById('swal-inicio').value;
            const fin = document.getElementById('swal-fin').value;

            if (!persona || !email || !inicio || !fin) {
                Swal.showValidationMessage('Por favor completa todos los campos obligatorios');
                return false;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                Swal.showValidationMessage('Ingrese un correo electrónico válido');
                return false;
            }

            const urlRegex = /^(https?:\/\/)[^\s$.?#].[^\s]*$/gm;
            if (link && !urlRegex.test(link)) {
                Swal.showValidationMessage('Ingrese un enlace válido');
                return false;
            }

            if (new Date(inicio) >= new Date(fin)) {
                Swal.showValidationMessage('La hora de fin debe ser posterior a la de inicio');
                return false;
            }

            return fetch('/guardar/evento/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ persona, email, telefono, enlace: link, inicio, fin })
            })
                .then(async res => {
                    const data = await res.json();
                    if (!res.ok) {
                        throw new Error(data.message || 'Error al guardar la cita');
                    }
                    return data;
                })
                .then(data => {
                    window.calendar.addEvent({
                        id: data.id,
                        title: `Cita con ${persona}`,
                        start: inicio,
                        end: fin,
                        extendedProps: {
                            telefono: telefono,
                            email: email,
                            enlace: link,
                            persona: persona
                        }
                    });
                    Swal.fire('Éxito', 'Cita agregada correctamente', 'success');
                })
                .catch(err => {
                    Swal.fire('Error', err.message, 'error');
                });
        }
    });
}

function eliminarEvento(evento) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`/evento/${evento.id}/eliminar/`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRFToken': getCSRFToken(),
                    },
                });

                if (!response.ok) throw new Error('Error al eliminar');

                window.calendar.getEventById(evento.id).remove();

                Swal.fire('Eliminado', 'La cita ha sido eliminada.', 'success');
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar la cita.', 'error');
            }
        }
    });
}

function mostrarFormularioC() {
    Swal.fire({
        title: 'Agregar Vacante',
        html: `
            <input id="titulo" class="swal2-input" placeholder="Título">
            <input id="descripcion_corta" class="swal2-input" placeholder="Descripción corta">
            <textarea id="descripcion" class="swal2-textarea" placeholder="Descripción"></textarea>
            <select id="estado_mexico" class="swal2-select">
                <option value="" disabled selected>Estado</option>
                ${estados.map(e => `<option value="${e.codigo}">${e.nombre}</option>`).join('')}
            </select>
            <select id="nivel" class="swal2-select">
                ${tipos.map(t => `<option value="${t.codigo}">${t.nombre}</option>`).join('')}
            </select>
            <label><input type="checkbox" id="destacada"> ¿Destacada?</label>
            <label><input type="checkbox" id="activa" checked> ¿Activa?</label>
        `,
        confirmButtonText: 'Guardar',
        preConfirm: () => {
            const vacante = {
                titulo: document.getElementById('titulo').value,
                descripcion_corta: document.getElementById('descripcion_corta').value,
                descripcion: document.getElementById('descripcion').value,
                estado_mexico: document.getElementById('estado_mexico').value,
                nivel: document.getElementById('nivel').value,
                destacada: document.getElementById('destacada').checked,
                activa: document.getElementById('activa').checked,
            };
            return fetch('/vacantes/agregar/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
                body: JSON.stringify(vacante),
            }).then(res => {
                if (!res.ok) throw new Error('Error al guardar');
                return res.json();
            });
        }
    }).then(result => {
        if (result.isConfirmed) {
            Swal.fire('¡Guardado!', 'La vacante ha sido creada.', 'success');
            actualizarTablaVacantes();
        }
    });
}

function mostrarFormularioEditarV(id) {
    fetch(`/vacantes/${id}/detalle/`)
        .then(res => res.json())
        .then(data => {
            Swal.fire({
                title: 'Editar Vacante',
                html: `
                    <input id="titulo" class="swal2-input" value="${data.titulo}" placeholder="Título">
                    <input id="descripcion_corta" class="swal2-input" value="${data.descripcion_corta}" placeholder="Descripción corta">
                    <textarea id="descripcion" class="swal2-textarea" placeholder="Descripción">${data.descripcion}</textarea>
                    <select id="estado_mexico" class="swal2-select">
                        ${estados.map(e => `<option value="${e.codigo}" ${e.codigo === data.estado_mexico ? 'selected' : ''}>${e.nombre}</option>`).join('')}
                    </select>
                    <select id="nivel" class="swal2-select">
                        ${tipos.map(t => `<option value="${t.codigo}" ${t.codigo === data.nivel ? 'selected' : ''}>${t.nombre}</option>`).join('')}
                    </select>
                    <label><input type="checkbox" id="destacada" ${data.destacada ? 'checked' : ''}> ¿Destacada?</label>
                    <label><input type="checkbox" id="activa" ${data.activa ? 'checked' : ''}> ¿Activa?</label>
                `,
                confirmButtonText: 'Actualizar',
                preConfirm: () => {
                    const vacante = {
                        titulo: document.getElementById('titulo').value,
                        descripcion_corta: document.getElementById('descripcion_corta').value,
                        descripcion: document.getElementById('descripcion').value,
                        estado_mexico: document.getElementById('estado_mexico').value,
                        nivel: document.getElementById('nivel').value,
                        destacada: document.getElementById('destacada').checked,
                        activa: document.getElementById('activa').checked,
                    };
                    return fetch(`/vacantes/${id}/editar/`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
                        body: JSON.stringify(vacante),
                    }).then(res => {
                        if (!res.ok) throw new Error('Error al actualizar');
                        return res.json();
                    });
                }
            }).then(result => {
                if (result.isConfirmed) {
                    Swal.fire('¡Actualizado!', 'La vacante fue modificada.', 'success');
                    actualizarTablaVacantes();
                }
            });
        });
}

function confirmarEliminarV(id, titulo) {
    Swal.fire({
        title: `¿Eliminar "${titulo}"?`,
        text: "Esta acción no se puede deshacer",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/vacantes/${id}/eliminar/`, {
                method: 'DELETE',
                headers: { 'X-CSRFToken': getCSRFToken() }
            }).then(res => {
                if (!res.ok) throw new Error('Error al eliminar');
                Swal.fire('Eliminada', 'La vacante fue eliminada.', 'success');
                actualizarTablaVacantes();
            });
        }
    });
}
const tipos = [
    { codigo: 'FT', nombre: 'Tiempo completo' },
    { codigo: 'PT', nombre: 'Medio tiempo' },
    { codigo: 'IN', nombre: 'Prácticas' },
    { codigo: 'FR', nombre: 'Freelance' },
    { codigo: 'RE', nombre: 'Remoto' },
];

const estados = [
    { codigo: 'AG', nombre: 'Aguascalientes' },
    { codigo: 'BC', nombre: 'Baja California' },
    { codigo: 'BS', nombre: 'Baja California Sur' },
    { codigo: 'CM', nombre: 'Campeche' },
    { codigo: 'CS', nombre: 'Chiapas' },
    { codigo: 'CH', nombre: 'Chihuahua' },
    { codigo: 'CO', nombre: 'Coahuila' },
    { codigo: 'CL', nombre: 'Colima' },
    { codigo: 'DF', nombre: 'Ciudad de México' },
    { codigo: 'DG', nombre: 'Durango' },
    { codigo: 'GT', nombre: 'Guanajuato' },
    { codigo: 'GR', nombre: 'Guerrero' },
    { codigo: 'HG', nombre: 'Hidalgo' },
    { codigo: 'JC', nombre: 'Jalisco' },
    { codigo: 'MX', nombre: 'Estado de México' },
    { codigo: 'MN', nombre: 'Michoacán' },
    { codigo: 'MS', nombre: 'Morelos' },
    { codigo: 'NT', nombre: 'Nayarit' },
    { codigo: 'NL', nombre: 'Nuevo León' },
    { codigo: 'OC', nombre: 'Oaxaca' },
    { codigo: 'PL', nombre: 'Puebla' },
    { codigo: 'QT', nombre: 'Querétaro' },
    { codigo: 'QR', nombre: 'Quintana Roo' },
    { codigo: 'SP', nombre: 'San Luis Potosí' },
    { codigo: 'SL', nombre: 'Sinaloa' },
    { codigo: 'SR', nombre: 'Sonora' },
    { codigo: 'TC', nombre: 'Tabasco' },
    { codigo: 'TS', nombre: 'Tamaulipas' },
    { codigo: 'TL', nombre: 'Tlaxcala' },
    { codigo: 'VZ', nombre: 'Veracruz' },
    { codigo: 'YN', nombre: 'Yucatán' },
    { codigo: 'ZS', nombre: 'Zacatecas' }
];