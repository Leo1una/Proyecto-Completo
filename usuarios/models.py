from django.db import models
from django.contrib.auth.models import AbstractUser
import re
from Jsoft import settings
class Usuario(AbstractUser):
    ROLES = (
        ('admin', 'Administrador'),
        ('user', 'Usuario'),
    )

    rol = models.CharField(max_length=10, choices=ROLES, default='user')
    curriculum = models.FileField(upload_to='curriculums/', null=True, blank=True)
    imagen = models.ImageField(upload_to='imagenes_usuarios/', null=True, blank=True)

    email = models.EmailField(unique=True)

    def __str__(self):
        return f"{self.username} ({self.email})"

class Vacante(models.Model):
    ESTADOS_MEXICO = [
        ('AG', 'Aguascalientes'),
        ('BC', 'Baja California'),
        ('BS', 'Baja California Sur'),
        ('CM', 'Campeche'),
        ('CS', 'Chiapas'),
        ('CH', 'Chihuahua'),
        ('CO', 'Coahuila'),
        ('CL', 'Colima'),
        ('DF', 'Ciudad de México'),
        ('DG', 'Durango'),
        ('GT', 'Guanajuato'),
        ('GR', 'Guerrero'),
        ('HG', 'Hidalgo'),
        ('JC', 'Jalisco'),
        ('MX', 'Estado de México'),
        ('MN', 'Michoacán'),
        ('MS', 'Morelos'),
        ('NT', 'Nayarit'),
        ('NL', 'Nuevo León'),
        ('OC', 'Oaxaca'),
        ('PL', 'Puebla'),
        ('QT', 'Querétaro'),
        ('QR', 'Quintana Roo'),
        ('SP', 'San Luis Potosí'),
        ('SL', 'Sinaloa'),
        ('SR', 'Sonora'),
        ('TC', 'Tabasco'),
        ('TS', 'Tamaulipas'),
        ('TL', 'Tlaxcala'),
        ('VZ', 'Veracruz'),
        ('YN', 'Yucatán'),
        ('ZS', 'Zacatecas'),
    ]

    TIPOS_EMPLEO = [
        ('FT', 'Tiempo completo'),
        ('PT', 'Medio tiempo'),
        ('IN', 'Prácticas'),
        ('FR', 'Freelance'),
        ('RE', 'Remoto'),
    ]

    titulo = models.CharField(max_length=200)
    descripcion_corta = models.CharField(max_length=300, blank=True)
    descripcion = models.TextField()
    estado_mexico = models.CharField(max_length=5, choices=ESTADOS_MEXICO)
    nivel = models.CharField(max_length=2, choices=TIPOS_EMPLEO, default='FT')
    destacada = models.BooleanField(default=False)
    activa = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titulo

class Aplicacion(models.Model):
    usuario = models.ForeignKey('Usuario', on_delete=models.CASCADE)
    vacante = models.ForeignKey('Vacante', on_delete=models.CASCADE, related_name='aplicaciones')
    nombre = models.CharField(max_length=100)
    correo = models.EmailField()
    direccion = models.TextField()
    telefono = models.CharField(max_length=15)

    imagen = models.ImageField(upload_to='imagenes_usuarios/', blank=True, null=True)
    curriculum = models.FileField(upload_to='curriculums/', blank=True, null=True)

    vista = models.BooleanField(default=False) 

    def __str__(self):
        return f"{self.nombre} - {self.vacante.titulo}"

class Evento(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='eventos')
    titulo = models.CharField(max_length=200)
    inicio = models.DateTimeField()
    fin = models.DateTimeField()
    telefono = models.CharField(max_length=20)
    email = models.EmailField(null=True, blank=True)
    enlace = models.URLField()
    persona = models.CharField(max_length=100)

    def save(self, *args, **kwargs):
        if self.telefono:
            self.telefono = re.sub(r'[^0-9]', '', self.telefono)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.titulo