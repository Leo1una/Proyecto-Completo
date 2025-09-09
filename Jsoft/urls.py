from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import static
from Jsoft import settings

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('usuarios.urls')),
]
if settings.DEBUG:
    urlpatterns += static(settings.IMAGENES_USUARIOS_URL, document_root=settings.IMAGENES_USUARIOS_ROOT)
    urlpatterns += static(settings.CURRICULUMS_URL, document_root=settings.CURRICULUMS_ROOT)