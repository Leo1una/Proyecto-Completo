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



function mostrarPerfil() {
    fetch('/perfilU/editar/')
        .then(res => res.text())
        .then(html => {
            document.getElementById('contenido-dinamico').innerHTML = html;
            agregarEventoEnvioFormulario();
        })
        .catch(() => {
            Swal.fire('Error', 'No se pudo cargar el formulario', 'error');
        });
}

function mostrarConvocatorias() {
    fetch('/cargar/vacantesU/')
        .then(res => res.text())
        .then(html => {
            document.getElementById('contenido-dinamico').innerHTML = html;
            inicializarFiltros();
        })
        .catch((error) => {
            Swal.fire('Error', 'No se pudo cargar el formulario', 'error');
        });
}

function agregarEventoEnvioFormulario() {
    const form = document.getElementById('form-editar-perfil');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const formData = new FormData(form);

        fetch('/perfilU/editar/', {
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

                    if (data.imagen_url) {
                        document.getElementById('imagen-preview').src = data.imagen_url;
                    }

                    if (data.curriculum_url) {
                        document.getElementById('curriculum-link').innerHTML =
                            `<p><a href="${data.curriculum_url}" target="_blank">📄 Ver currículum actual</a></p>`;
                    }
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

function mostrarVistaPrevia(input) {
    if (input.files && input.files[0]) {
        let reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('imagen-preview').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

async function mostrarCalendario() {
    try {
        const response = await fetch('/cargar/calendarioU/');
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

        const eventosResponse = await fetch('/cargar/eventosU/');
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
function getCSRFToken() {
    let cookieValue = null;
    const cookies = document.cookie ? document.cookie.split(';') : [];
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('csrftoken=')) {
            cookieValue = decodeURIComponent(cookie.substring('csrftoken='.length));
            break;
        }
    }
    return cookieValue;
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
                        'X-CSRFToken': getCSRFToken(), // 👈 asegúrate de tener esta función
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

function mostrarFormularioCita() {
    Swal.fire({
        title: 'Agregar Cita',
        html: `
    <form id="form-agregar-cita" style="max-width: 500px; margin: auto; text-align: left;">
      <div style="margin-bottom: 10px;">
        <label for="swal-persona">Nombre de la empresa</label>
        <input id="swal-persona" class="swal2-input" placeholder="Nombre" autocomplete="off">
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

function verMasVacante(id, titulo, descripcion, estado_abrev, estado_nombre, nivel, yaAplico) {
    let showApplyButton = !yaAplico;

    Swal.fire({
        title: `<strong>${titulo}</strong>`,
        html: `
            <p><b>📍 Estado:</b> ${estado_nombre} (${estado_abrev})</p>
            <p><b>💼 Tipo de empleo:</b> ${nivel}</p>
            <hr>
            <p style="text-align: justify;">${descripcion}</p>
        `,
        icon: 'info',
        width: 600,
        showCancelButton: true,
        confirmButtonText: showApplyButton ? 'Aplicar' : 'Ya aplicaste',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d',
        showClass: {
            popup: 'animate__animated animate__fadeInDown'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp'
        },
        allowOutsideClick: !showApplyButton,
    }).then((result) => {
        if (result.isConfirmed && showApplyButton) {
            aplicarVacante(id, titulo);
        }
    });
}

function aplicarVacante(id, titulo) {
    fetch(`/api/usuario/datos/${id}/`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                Swal.fire('Error', data.error, 'error');
                return;
            }

            Swal.fire({
                title: `Aplicar a <strong>${titulo}</strong>`,
                html: `
                <form id="formAplicacion" enctype="multipart/form-data">
                    <input type="hidden" name="vacante_id" value="${id}">
                    
                    <div class="mb-2 text-start">
                        <label><b>Nombre</b></label>
                        <input type="text" name="nombre" class="form-control" value="${data.nombre || ''}" required>
                    </div>

                    <div class="mb-2 text-start">
                        <label><b>Correo</b></label>
                        <input type="email" name="correo" class="form-control" value="${data.correo || ''}" required>
                    </div>

                    <div class="mb-2 text-start">
                        <label><b>Dirección</b></label>
                        <textarea name="direccion" class="form-control">${data.direccion || ''}</textarea>
                    </div>

                    <div class="mb-2 text-start">
                        <label><b>Teléfono</b></label>
                        <input type="text" name="telefono" class="form-control" value="${data.telefono || ''}" required>
                    </div>

                    <div class="mb-2 text-start">
                        <label><b>Imagen</b></label><br>
                        ${data.imagen ? `<img src="${data.imagen}" class="img-thumbnail mb-2" width="120"><br>` : ""}
                        <input type="file" name="imagen" class="form-control" accept="image/png, image/jpeg">
                    </div>

                    <div class="mb-2 text-start">
                        <label><b>Curriculum en PDF</b></label><br>
                        ${data.curriculum ? `<a href="${data.curriculum}" target="_blank" class="btn btn-outline-primary btn-sm">📄 Ver Curriculum</a><br><br>` : ""}
                        <input type="file" name="curriculum" class="form-control" accept="application/pdf" ${data.curriculum ? "" : "required"}>
                    </div>
                </form>
            `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Enviar solicitud',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#6c757d',
                preConfirm: () => {
                    const form = document.getElementById('formAplicacion');
                    const formData = new FormData(form);

                    const imagenInput = form.imagen.files[0];
                    const curriculumInput = form.curriculum.files[0];

                    if (!imagenInput && data.imagen) formData.delete('imagen');
                    if (!curriculumInput && data.curriculum) formData.delete('curriculum');

                    if (imagenInput && !['image/png', 'image/jpeg'].includes(imagenInput.type)) {
                        Swal.showValidationMessage("La imagen debe ser PNG o JPEG");
                        return false;
                    }
                    if (curriculumInput && curriculumInput.type !== 'application/pdf') {
                        Swal.showValidationMessage("El curriculum debe ser un PDF");
                        return false;
                    }
                    if (!curriculumInput && !data.curriculum) {
                        Swal.showValidationMessage("Debes subir tu curriculum en PDF");
                        return false;
                    }

                    return fetch(`/api/usuario/aplicar/${id}/`, {
                        method: "POST",
                        body: formData,
                        headers: { "X-CSRFToken": getCookie("csrftoken") }
                    })
                        .then(res => res.json())
                        .then(result => {
                            if (result.error) throw new Error(result.error);
                            return result;
                        })
                        .catch(err => Swal.showValidationMessage(`Error: ${err}`));
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire("¡Listo!", "Tu aplicación ha sido enviada correctamente ✅", "success");

                    // Actualizar botón dinámicamente sin recargar
                    const boton = document.querySelector(`a[onclick="aplicarVacante('${id}','${titulo}')"]`);
                    if (boton) {
                        boton.outerHTML = `<button class="btn btn-secondary" disabled>Ya aplicaste</button>`;
                    }
                }
            });
        });
}

document.addEventListener("DOMContentLoaded", () => {

    function llenarFormulario(form, data) {
        form.nombre.value = data.nombre || "";
        form.correo.value = data.correo || "";
        form.telefono.value = data.telefono || "";
        form.direccion.value = data.direccion || "";

        const inputImagen = form.querySelector("#imagenInput");
        const preview = form.querySelector("#previewImagen");
        if (data.imagen) {
            preview.src = data.imagen;
            preview.style.display = "block";
        } else {
            preview.style.display = "none";
        }

        inputImagen.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    preview.src = ev.target.result;
                    preview.style.display = "block";
                };
                reader.readAsDataURL(file);
            }
        });

        const cvLink = form.querySelector("#cvLink");
        if (data.curriculum) {
            cvLink.href = data.curriculum;
            cvLink.style.display = "inline-block";
        } else {
            cvLink.style.display = "none";
        }
    }

    function abrirModalEdicion(row, appId) {
        fetch(`/api/aplicacion/${appId}/`)
            .then(res => {
                if (!res.ok) return res.text().then(txt => { throw new Error(`Error ${res.status}: ${txt}`); });
                return res.json();
            })
            .then(data => {
                if (data.error) throw new Error(data.error);

                Swal.fire({
                    title: "Editar aplicación",
                    html: `
                    <form id="formEditar" enctype="multipart/form-data">
                        <input type="hidden" name="app_id" value="${appId}">

                        <div class="mb-2 text-start">
                            <label><b>Nombre</b></label>
                            <input type="text" name="nombre" class="form-control" required>
                        </div>

                        <div class="mb-2 text-start">
                            <label><b>Correo</b></label>
                            <input type="email" name="correo" class="form-control" required>
                        </div>

                        <div class="mb-2 text-start">
                            <label><b>Teléfono</b></label>
                            <input type="text" name="telefono" class="form-control" required>
                        </div>

                        <div class="mb-2 text-start">
                            <label><b>Dirección</b></label>
                            <textarea name="direccion" class="form-control"></textarea>
                        </div>

                        <div class="mb-2 text-start">
                            <label><b>Imagen</b></label><br>
                            <img id="previewImagen" class="img-thumbnail mb-2" width="120" style="display:none;"><br>
                            <input type="file" name="imagen" id="imagenInput" class="form-control" accept="image/png, image/jpeg">
                        </div>

                        <div class="mb-2 text-start">
                            <label><b>Curriculum en PDF</b></label><br>
                            <a id="cvLink" href="#" target="_blank" class="btn btn-outline-primary btn-sm" style="display:none">📄 Ver Curriculum</a><br><br>
                            <input type="file" name="curriculum" id="curriculumInput" class="form-control" accept="application/pdf">
                        </div>
                    </form>
                `,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: "Guardar cambios",
                    cancelButtonText: "Cancelar",
                    confirmButtonColor: "#28a745",
                    cancelButtonColor: "#6c757d",
                    didOpen: () => {
                        const form = document.getElementById("formEditar");
                        llenarFormulario(form, data);
                    },
                    preConfirm: () => {
                        const form = document.getElementById("formEditar");
                        const formData = new FormData(form);

                        const imagenInput = form.imagen.files[0];
                        const curriculumInput = form.curriculum.files[0];

                        if (imagenInput && !["image/png", "image/jpeg"].includes(imagenInput.type)) {
                            Swal.showValidationMessage("La imagen debe ser PNG o JPEG");
                            return false;
                        }
                        if (curriculumInput && curriculumInput.type !== "application/pdf") {
                            Swal.showValidationMessage("El curriculum debe ser un PDF");
                            return false;
                        }

                        return fetch(`/api/usuario/editar/${appId}/`, {
                            method: "POST",
                            body: formData,
                            headers: { "X-CSRFToken": getCookie("csrftoken") }
                        })
                            .then(res => {
                                if (!res.ok) return res.text().then(txt => { throw new Error(txt); });
                                return res.json();
                            })
                            .then(result => {
                                if (result.error) throw new Error(result.error);
                                return result;
                            })
                            .catch(err => Swal.showValidationMessage(`Error: ${err.message}`));
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        Swal.fire("¡Listo!", "La aplicación fue actualizada ✅", "success");

                        row.querySelector(".nombre").textContent = result.value.nombre;
                        row.querySelector(".correo").textContent = result.value.correo;
                        row.querySelector(".telefono").textContent = result.value.telefono;
                        row.querySelector(".direccion").textContent = result.value.direccion;

                        if (result.value.imagen_url) {
                            const imgCell = row.querySelector("td:nth-child(8)");
                            imgCell.innerHTML = `<img src="${result.value.imagen_url}" width="50">`;
                        }

                        if (result.value.curriculum_url) {
                            const cvCell = row.querySelector("td:nth-child(7)");
                            cvCell.innerHTML = `<a href="${result.value.curriculum_url}" target="_blank">Ver CV</a>`;
                        }
                    }
                });
            })
            .catch(err => {
                Swal.fire("Error al cargar la aplicación", err.message, "error");
                console.error(err);
            });
    }

    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.addEventListener("click", () => {
            const row = btn.closest("tr");
            const appId = row.dataset.id;
            abrirModalEdicion(row, appId);
        });
    });

    document.querySelectorAll(".btn-eliminar").forEach((btn) => {
        btn.addEventListener("click", () => {
            const row = btn.closest("tr");
            const appId = row.dataset.id;

            Swal.fire({
                title: "¿Cancelar aplicación?",
                text: "Esta acción no se puede deshacer",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "No",
                confirmButtonColor: "#d33",
                cancelButtonColor: "#6c757d",
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(`/api/usuario/eliminar/${appId}/`, {
                        method: "POST",
                        headers: {
                            "X-CSRFToken": getCookie("csrftoken"),
                        },
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.error) throw new Error(data.error);
                            Swal.fire("Eliminado", "La aplicación fue cancelada ✅", "success");
                            row.remove();
                        })
                        .catch(err => Swal.fire("Error", err, "error"));
                }
            });
        });
    });

});

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.substring(0, name.length + 1) === (name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function inicializarFiltros() {
    document.querySelectorAll("#formFiltros select").forEach(select => {
        select.addEventListener("change", aplicarFiltros);
    });

    let timer = null;
    const busquedaInput = document.querySelector("#formFiltros input[name='busqueda']");
    if (busquedaInput) {
        busquedaInput.addEventListener("keyup", function () {
            clearTimeout(timer);
            timer = setTimeout(aplicarFiltros, 400);
        });
    }
}

function aplicarFiltros() {
    const form = document.getElementById("formFiltros");
    if (!form) return;

    const formData = new FormData(form);
    const params = new URLSearchParams(formData).toString();

    fetch(`/filtrar-vacantes/?${params}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("contenedorVacantes").innerHTML = data.html;
        });
}