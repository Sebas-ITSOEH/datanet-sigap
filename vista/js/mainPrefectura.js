/**
 * mainPrefectura.js - Panel de Control Unificado
 * DIVIDIDO: SECCIÓN BIENVENIDA | SECCIÓN CONTROL | SECCIÓN PERSONAL | SECCIÓN SISTEMA
 */

// === CONFIGURACIÓN DE API ===
const PREFECTURA_API = '../controlador/prefectura.php';

async function apiPrefectura(accion, opciones = {}) {
    const query = opciones.query ? `&${new URLSearchParams(opciones.query).toString()}` : '';
    const config = {
        method: opciones.method || 'GET',
        headers: { 'Content-Type': 'application/json' }
    };
    if (opciones.body) {
        config.body = JSON.stringify(opciones.body);
    }
    const response = await fetch(`${PREFECTURA_API}?accion=${accion}${query}`, config);
    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data.mensaje || 'No se pudo completar la operación.');
    }
    return data;
}

function prefecturaEscapeHTML(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function prefecturaEscapeAttr(valor) {
    return prefecturaEscapeHTML(valor).replace(/`/g, '&#96;');
}

function prefecturaUrlArchivo(url) {
    if (!url) return '#';
    if (/^https?:\/\//i.test(url) || url.startsWith('../')) return url;
    return `../${String(url).replace(/^\/+/, '')}`;
}
// ===================================

document.addEventListener('DOMContentLoaded', function () {
    const navItems = document.querySelectorAll('.nav-item');
    const viewContainer = document.getElementById('view-container');

    async function loadSection(sectionName) {
        if (!sectionName) return;
        try {
            const response = await fetch('prefectura/' + sectionName + '.html?t=' + Date.now());
            if (!response.ok) throw new Error('No se encontró: ' + sectionName + '.html');
            const html = await response.text();

            viewContainer.innerHTML = html;
            viewContainer.classList.remove('fade-in');
            void viewContainer.offsetWidth;
            viewContainer.classList.add('fade-in');

            if (sectionName === 'bienvenida') { initBienvenidaLogic(); }
            else if (sectionName === 'control') { initControlLogic(); }
            else if (sectionName === 'personal') { initPersonalLogic(); }
            else if (sectionName === 'sistema') { initSistemaLogic(); }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    if (navItems.length > 0) {
        navItems.forEach(function (item) {
            item.addEventListener('click', function () {
                navItems.forEach(function (i) { i.classList.remove('active'); });
                item.classList.add('active');
                loadSection(item.getAttribute('data-section'));
            });
        });
    }

    loadSection('bienvenida');

    // === FUNCIÓN PARA CERRAR SESIÓN ===
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function () {
            Swal.fire({
                title: '¿Cerrar Sesión?',
                text: 'Vas a salir del Panel de Control.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#64748B',
                confirmButtonText: '<i class="fa-solid fa-right-from-bracket"></i> Sí, salir',
                cancelButtonText: 'Cancelar',
                customClass: { popup: 'swal-solicitud-popup' }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        await apiPrefectura('logout', { method: 'POST' });
                        window.location.href = '../index.html';
                    } catch (error) {
                        console.error('Error al cerrar sesión:', error);
                        window.location.href = '../index.html';
                    }
                }
            });
        });
    }

    const logoBox = document.querySelector('.logo-box');
    if (logoBox) {
        logoBox.parentElement.addEventListener('click', function () {
            navItems.forEach(function (i) { i.classList.remove('active'); });
            loadSection('bienvenida');
        });
    }

    if (document.querySelector('.bienvenida-layout')) { initBienvenidaLogic(); }
    if (document.querySelector('.personal-layout')) { initPersonalLogic(); }
    if (document.querySelector('.sistema-layout')) { initSistemaLogic(); }
    if (document.querySelector('.control-layout')) { initControlLogic(); }
});

function navigateToSection(sectionName) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionName) {
            item.classList.add('active');
        }
    });

    const viewContainer = document.getElementById('view-container');
    if (viewContainer) {
        fetch('prefectura/' + sectionName + '.html?t=' + Date.now())
            .then(response => response.text())
            .then(html => {
                viewContainer.innerHTML = html;
                viewContainer.classList.remove('fade-in');
                void viewContainer.offsetWidth;
                viewContainer.classList.add('fade-in');

                if (sectionName === 'bienvenida') initBienvenidaLogic();
                else if (sectionName === 'control') initControlLogic();
                else if (sectionName === 'personal') initPersonalLogic();
                else if (sectionName === 'sistema') initSistemaLogic();
            })
            .catch(error => console.error('Error:', error));
    }
}

// ==========================================
//      SECCIÓN: BIENVENIDA
// ==========================================
function initBienvenidaLogic() {
    console.log('✔ Vista de Bienvenida inicializada');
    updateGreeting();
    updateDate();

    function updateGreeting() {
        const greetingElement = document.getElementById('saludo-horario');
        if (!greetingElement) return;

        const hour = new Date().getHours();
        let greeting, icon;

        if (hour >= 6 && hour < 12) {
            greeting = '¡Buenos días!';
            icon = 'fa-sun';
        } else if (hour >= 12 && hour < 18) {
            greeting = '¡Buenas tardes!';
            icon = 'fa-cloud-sun';
        } else if (hour >= 18 && hour < 22) {
            greeting = '¡Buenas noches!';
            icon = 'fa-moon';
        } else {
            greeting = '¡Buenas noches!';
            icon = 'fa-moon';
        }

        greetingElement.innerHTML = `<i class="fa-solid ${icon}"></i> ${greeting}`;
    }

    function updateDate() {
        const dateElement = document.getElementById('fecha-actual');
        if (!dateElement) return;

        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString('es-MX', options);
    }
}

// ==========================================
//      SECCIÓN: PANEL DE CONTROL
// ==========================================
function initControlLogic() {
    console.log('✔ Panel de Control inicializado');

    var subNavItems = document.querySelectorAll('.sub-nav-item');
    var sections = document.querySelectorAll('.control-view');
    var searchAlumno = document.getElementById('searchAlumno');
    var filtroGrupo = document.getElementById('filtro-grupo');
    var filtroMotivo = document.getElementById('filtro-motivo');

    // === CARGAR SOLICITUDES DESDE LA BD ===
    async function cargarSolicitudes() {
        try {
            const data = await apiPrefectura('listar_solicitudes');
            const tbody = document.querySelector('#tabla-solicitudes tbody');
            const tbodyHistorial = document.querySelector('#tabla-historial tbody');

            if (!tbody || !tbodyHistorial) return;

            tbody.innerHTML = '';
            tbodyHistorial.innerHTML = '';

            if (data.solicitudes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No hay solicitudes registradas.</td></tr>';
            }

            // CONTADORES PARA LOS NÚMEROS ROJOS Y VERDES
            let countPendientes = 0;
            let countHistorial = 0;

            data.solicitudes.forEach(sol => {
                const nombreCompleto = `${sol.alumno_nombre} ${sol.alumno_apellido}`;
                const tutorCompleto = sol.tutor_nombre ? `${sol.tutor_nombre} ${sol.tutor_apellido || ''}`.trim() : 'Sin tutor asignado';
                const claseMotivo = (sol.asunto || '').toLowerCase().includes('salud') ? 'salud' : ((sol.asunto || '').toLowerCase().includes('viaje') ? 'viaje' : 'familiar');

                let docJSON = '[]';
                if (sol.archivo_url) {
                    const documentos = String(sol.archivo_url)
                        .split(',')
                        .map(url => url.trim())
                        .filter(Boolean)
                        .map(url => ({
                            nombre: url.split('/').pop(),
                            url,
                            tipo: url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'imagen'
                        }));
                    docJSON = JSON.stringify(documentos);
                }

                // RECIBIENDO LAS MATERIAS EN FORMATO JSON
                const materiasJSON = sol.materias_afectadas_json || '[]';

                const fInicio = new Date(sol.fecha_inicio);
                const fFin = new Date(sol.fecha_fin);
                const diffTime = Math.abs(fFin - fInicio);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                const textoDias = diffDays === 1 ? '1 día' : `${diffDays} días`;

                const fechaSolicitud = sol.fecha_solicitud ? sol.fecha_solicitud.split(' ')[0] : sol.fecha_inicio;
                const fechaFin = sol.fecha_fin || sol.fecha_inicio;
                const estadoSolicitud = sol.estado || '';
                const matricula = sol.matricula_escolar || 'N/A';
                const grupo = sol.grupo || 'N/A';
                const telefonoTutor = sol.telefono_tutor || sol.tutor_telefono || 'N/A';
                const motivo = sol.asunto || '';
                const descripcion = sol.descripcion || '';
                const tipoJustificacion = sol.tipo_justificacion || '';
                const tipoFalta = tipoJustificacion === 'materias'
                    ? 'materias'
                    : (tipoJustificacion === 'rango' || diffDays > 1 ? 'rango' : 'completa');

                const atributosFila = [
                    `data-id="${prefecturaEscapeAttr(sol.id_justificante)}"`,
                    `data-nombre="${prefecturaEscapeAttr(nombreCompleto)}"`,
                    `data-matricula="${prefecturaEscapeAttr(matricula)}"`,
                    `data-grupo="${prefecturaEscapeAttr(grupo)}"`,
                    `data-tutor="${prefecturaEscapeAttr(tutorCompleto)}"`,
                    `data-telefono-tutor="${prefecturaEscapeAttr(telefonoTutor)}"`,
                    `data-motivo="${prefecturaEscapeAttr(motivo)}"`,
                    `data-descripcion="${prefecturaEscapeAttr(descripcion)}"`,
                    `data-fecha="${prefecturaEscapeAttr(fechaSolicitud)}"`,
                    'data-hora-inicio="07:00"',
                    'data-hora-fin="14:00"',
                    `data-tipo-falta="${tipoFalta}"`,
                    `data-dias="${prefecturaEscapeAttr(`${textoDias} (${sol.fecha_inicio} al ${fechaFin})`)}"`,
                    `data-documentos="${prefecturaEscapeAttr(docJSON)}"`,
                    `data-materias-afectadas="${prefecturaEscapeAttr(materiasJSON)}"`,
                    `data-estado="${prefecturaEscapeAttr(estadoSolicitud)}"`
                ].join(' ');

                if (estadoSolicitud === 'pendiente') {
                    countPendientes++;

                    const filaHTML = `
                        <tr class="solicitud-row" ${atributosFila}>
                            <td>
                                <div class="alumno-cell">
                                    <div class="avatar-wrapper">
                                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(nombreCompleto)}&background=D6A848&color=192A56&size=36">
                                    </div>
                                    <div class="alumno-details">
                                        <span class="alumno-name">${prefecturaEscapeHTML(nombreCompleto)}</span>
                                        <span class="alumno-matricula">Matrícula: ${prefecturaEscapeHTML(matricula)}</span>
                                    </div>
                                </div>
                            </td>
                            <td><span class="grupo-tag">${prefecturaEscapeHTML(grupo)}</span></td>
                            <td><span class="motivo-tag ${claseMotivo}">${prefecturaEscapeHTML(motivo)}</span></td>
                            <td><div class="fecha-cell"><span class="fecha">${prefecturaEscapeHTML(sol.fecha_inicio)}</span></div></td>
                            <td><span class="estado-tag pendiente">Pendiente</span></td>
                            <td>
                                <div class="acciones-cell">
                                    <button class="btn-accion aprobar" title="Aprobar"><i class="fa-solid fa-check"></i></button>
                                    <button class="btn-accion rechazar" title="Rechazar"><i class="fa-solid fa-xmark"></i></button>
                                    <button class="btn-accion detalle" title="Ver Detalle"><i class="fa-solid fa-eye"></i></button>
                                </div>
                            </td>
                        </tr>
                    `;
                    tbody.insertAdjacentHTML('beforeend', filaHTML);
                } else {
                    countHistorial++;

                    const bgAvatar = estadoSolicitud === 'aprobado' ? '10B981' : 'EF4444';
                    const filaHistorial = `
                        <tr class="solicitud-row historial-row" ${atributosFila}>
                            <td>
                                <div class="alumno-cell">
                                    <div class="avatar-wrapper">
                                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(nombreCompleto)}&background=${bgAvatar}&color=fff&size=36">
                                    </div>
                                    <div class="alumno-details">
                                        <span class="alumno-name">${prefecturaEscapeHTML(nombreCompleto)}</span>
                                        <span class="alumno-matricula">Matrícula: ${prefecturaEscapeHTML(matricula)}</span>
                                    </div>
                                </div>
                            </td>
                            <td><span class="grupo-tag">${prefecturaEscapeHTML(grupo)}</span></td>
                            <td><span class="motivo-tag ${claseMotivo}">${prefecturaEscapeHTML(motivo)}</span></td>
                            <td><div class="fecha-cell"><span class="fecha">${prefecturaEscapeHTML(sol.fecha_inicio)}</span></div></td>
                            <td><span class="estado-tag ${prefecturaEscapeAttr(estadoSolicitud)}">${prefecturaEscapeHTML(estadoSolicitud.charAt(0).toUpperCase() + estadoSolicitud.slice(1))}</span></td>
                            <td><span class="text-muted-small">Prefectura</span></td>
                            <td>
                                <button class="btn-accion detalle" title="Ver Detalle" style="margin-right: 5px;"><i class="fa-solid fa-eye"></i></button>
                                ${estadoSolicitud === 'aprobado' ? `
                                    <button class="btn-descargar-permiso" title="Descargar Permiso PDF" onclick="event.stopPropagation();descargarPermisoDesdeBoton(this);"><i class="fa-solid fa-file-pdf"></i> PDF</button>
                                ` : '<span class="text-muted-small">N/A</span>'}
                            </td>
                        </tr>
                    `;
                    tbodyHistorial.insertAdjacentHTML('beforeend', filaHistorial);
                }
            });

            // ACTUALIZAR LOS CONTADORES EN EL DOM
            const badgeBandeja = document.querySelector('button[data-target="section-bandeja"] .badge');
            const badgeHistorial = document.querySelector('button[data-target="section-historial"] .badge');
            const campanaNotif = document.querySelector('.notification-box .badge-red');

            if (badgeBandeja) badgeBandeja.textContent = countPendientes;
            if (badgeHistorial) badgeHistorial.textContent = countHistorial;

            if (campanaNotif) {
                if (countPendientes > 0) {
                    campanaNotif.style.display = 'block';
                    campanaNotif.textContent = countPendientes;
                } else {
                    campanaNotif.style.display = 'none';
                }
            }

        } catch (error) {
            console.error("Error al cargar solicitudes:", error);
            const tbody = document.querySelector('#tabla-solicitudes tbody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: red; font-weight: bold;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Error de conexión: ${error.message} <br> <small>Revisa la pestaña 'Network' con F12.</small>
                </td></tr>`;
            }
        }
    }

    cargarSolicitudes(); // Ejecutar al entrar a la vista

    function getFilas() { return document.querySelectorAll('.solicitud-row'); }

    function switchSubView(targetId) {
        sections.forEach(function (s) { s.classList.add('hidden'); });
        var target = document.getElementById(targetId);
        if (target) {
            target.classList.remove('hidden'); target.classList.remove('fade-in');
            void target.offsetWidth; target.classList.add('fade-in');
        }
        subNavItems.forEach(function (b) { b.classList.remove('active'); });
        var ab = document.querySelector('.sub-nav-item[data-target="' + targetId + '"]');
        if (ab) ab.classList.add('active');
        if (targetId === 'section-historial') initHistorialLogic();
    }

    subNavItems.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var tid = btn.getAttribute('data-target');
            if (tid) switchSubView(tid);
        });
    });

    function filtrar() {
        var st = searchAlumno ? searchAlumno.value.toLowerCase().trim() : '';
        var gf = filtroGrupo ? filtroGrupo.value : 'todos';
        var mf = filtroMotivo ? filtroMotivo.value : 'todos';
        getFilas().forEach(function (f) {
            var n = f.getAttribute('data-nombre') || '', m = f.getAttribute('data-matricula') || '';
            var g = f.getAttribute('data-grupo') || '', mo = f.getAttribute('data-motivo') || '';
            var ok = (!st || n.toLowerCase().includes(st) || m.includes(st)) && (gf === 'todos' || g === gf) && (mf === 'todos' || mo.toLowerCase() === mf);
            f.style.display = ok ? '' : 'none';
        });
    }

    if (searchAlumno) searchAlumno.addEventListener('input', filtrar);
    if (filtroGrupo) filtroGrupo.addEventListener('change', filtrar);
    if (filtroMotivo) filtroMotivo.addEventListener('change', filtrar);

    // EVENTOS CLIC EN TABLAS
    [document.getElementById('tabla-solicitudes'), document.getElementById('tabla-historial')].forEach(tabla => {
        if (tabla) {
            tabla.addEventListener('click', function (e) {
                var fila = e.target.closest('.solicitud-row');
                if (!fila) return;

                if (e.target.closest('.btn-accion.aprobar')) { e.stopPropagation(); aprobar(fila); return; }
                if (e.target.closest('.btn-accion.rechazar')) { e.stopPropagation(); rechazar(fila); return; }

                // Si el clic no fue en el botón de PDF, entonces abrimos el detalle
                if (!e.target.closest('.btn-descargar-permiso') && !e.target.closest('.btn-accion.aprobar') && !e.target.closest('.btn-accion.rechazar')) {
                    mostrarDetalle(fila);
                }
            });
        }
    });

    async function aprobar(fila) {
        var nombre = fila.getAttribute('data-nombre');
        var idSolicitud = fila.getAttribute('data-id');

        Swal.fire({
            title: '¿Aprobar Solicitud?',
            html: `<p>Estás por <strong style="color:#10B981;">aprobar</strong> la solicitud de:</p><p style="font-size:1.1rem;color:#192A56;font-weight:600;">${nombre}</p>`,
            icon: 'question', showCancelButton: true,
            confirmButtonText: 'Sí, Aprobar', confirmButtonColor: '#10B981',
            cancelButtonText: 'Cancelar', cancelButtonColor: '#64748B'
        }).then(async function (r) {
            if (r.isConfirmed) {
                try {
                    await apiPrefectura('actualizar_solicitud', {
                        method: 'POST',
                        body: { id_solicitud: idSolicitud, estado: 'aprobada' }
                    });
                    Swal.fire({ title: '¡Aprobada!', icon: 'success', confirmButtonColor: '#192A56', timer: 1500 });
                    setTimeout(() => cargarSolicitudes(), 1500);
                } catch (error) {
                    Swal.fire({ title: 'Error', text: error.message, icon: 'error', confirmButtonColor: '#192A56' });
                }
            }
        });
    }

    async function rechazar(fila) {
        var nombre = fila.getAttribute('data-nombre');
        var idSolicitud = fila.getAttribute('data-id');

        Swal.fire({
            title: '¿Rechazar?',
            html: `<p>Estás por <strong style="color:#EF4444;">rechazar</strong> la solicitud de:</p><p style="font-size:1.1rem;color:#EF4444;">${nombre}</p><textarea id="motivo-rechazo" class="swal2-textarea" placeholder="Motivo del rechazo..." style="width:100%;height:60px;"></textarea>`,
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Rechazar', confirmButtonColor: '#EF4444',
            cancelButtonText: 'Cancelar', cancelButtonColor: '#64748B',
            preConfirm: function () {
                var motivo = document.getElementById('motivo-rechazo').value;
                if (!motivo) Swal.showValidationMessage('Escribe un motivo');
                return motivo;
            }
        }).then(async function (r) {
            if (r.isConfirmed) {
                try {
                    await apiPrefectura('actualizar_solicitud', {
                        method: 'POST',
                        body: { id_solicitud: idSolicitud, estado: 'rechazada', motivo_rechazo: r.value }
                    });
                    Swal.fire({ title: '¡Rechazada!', icon: 'error', confirmButtonColor: '#192A56' });
                    setTimeout(() => cargarSolicitudes(), 1500);
                } catch (error) {
                    Swal.fire({ title: 'Error', text: error.message, icon: 'error', confirmButtonColor: '#192A56' });
                }
            }
        });
    }

    function mostrarDetalle(fila) {
        var d = {
            id: fila.getAttribute('data-id'), nombre: fila.getAttribute('data-nombre'), grupo: fila.getAttribute('data-grupo'),
            matricula: fila.getAttribute('data-matricula'), tutor: fila.getAttribute('data-tutor'),
            telefonoTutor: fila.getAttribute('data-telefono-tutor'), motivo: fila.getAttribute('data-motivo'),
            descripcion: fila.getAttribute('data-descripcion'), fecha: fila.getAttribute('data-fecha'),
            horaInicio: fila.getAttribute('data-hora-inicio'), horaFin: fila.getAttribute('data-hora-fin'),
            tipoFalta: fila.getAttribute('data-tipo-falta'), dias: fila.getAttribute('data-dias'),
            materiasAfectadas: fila.getAttribute('data-materias-afectadas'),
            documentos: fila.getAttribute('data-documentos'), estado: fila.getAttribute('data-estado')
        };
        abrirModalDetalle(construirModal(d), d);
    }

    function construirModal(d) {
        var mat = [], doc = [];
        try { mat = JSON.parse(d.materiasAfectadas || '[]'); } catch (e) { mat = []; }
        try { doc = JSON.parse(d.documentos || '[]'); } catch (e) { doc = []; }
        var tf = d.tipoFalta === 'completa'
            ? 'Día Completo'
            : (d.tipoFalta === 'materias' ? 'Materias Específicas' : 'Rango de Fechas');

        var mh = mat.length ? mat.map(function (m) {
            return `<tr><td><div class="docente-info"><i class="fa-solid fa-user-tie"></i>${m.docente}</div></td><td><strong>${m.materia}</strong></td><td><span class="horario-badge"><i class="fa-regular fa-clock"></i> ${m.hora}</span></td></tr>`;
        }).join('') : '<tr><td colspan="3" class="vacio">Sin materias registradas</td></tr>';

        var dh = doc.length ? doc.map(function (dc) {
            const url = prefecturaUrlArchivo(dc.url || dc.nombre);
            return `<div class="documento-item"><i class="fa-solid fa-file-${dc.tipo === 'pdf' ? 'pdf' : 'image'}"></i><div class="documento-info"><span class="documento-nombre">${prefecturaEscapeHTML(dc.nombre)}</span><a href="${prefecturaEscapeAttr(url)}" class="documento-ver" target="_blank" rel="noopener">Ver documento</a></div></div>`;
        }).join('') : '<p class="vacio">Sin documentos adjuntos</p>';

        return `
        <div class="modal-solicitud-detalle">
            <div class="modal-header-section">
                <div class="modal-alumno-info">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(d.nombre)}&background=D6A848&color=192A56&size=44">
                    <div>
                        <h3>${d.nombre}</h3>
                        <span class="modal-grupo">Grupo ${d.grupo} | Matrícula: ${d.matricula}</span>
                    </div>
                </div>
                <span class="modal-motivo ${(d.motivo || '').toLowerCase()}">${d.motivo}</span>
            </div>
            <div class="modal-tutor-section">
                <h4><i class="fa-solid fa-user"></i> Información del Tutor</h4>
                <div class="tutor-details">
                    <div class="tutor-item"><label>Nombre Completo</label><span>${d.tutor}</span></div>
                    <div class="tutor-item"><label>Teléfono de Contacto</label><span><i class="fa-solid fa-phone"></i> ${d.telefonoTutor}</span></div>
                </div>
            </div>
            <div class="modal-justificante-section">
                <h4><i class="fa-solid fa-file-lines"></i> Detalle del Justificante</h4>
                <div class="justificante-info">
                    <div class="info-row"><label>Fecha de Solicitud</label><span>${d.fecha}</span></div>
                    <div class="info-row"><label>Tipo de Falta</label><span class="tipo-falta-badge">${tf}</span></div>
                    <div class="info-row"><label>Duración</label><span>${d.dias || '1 día'}</span></div>
                    <div class="info-row descripcion-row"><label>Descripción del Motivo</label><p>${d.descripcion}</p></div>
                </div>
            </div>
            <div class="modal-materias-section">
                <h4><i class="fa-solid fa-book-open"></i> Materias Afectadas</h4>
                <table class="materias-table"><thead><tr><th>Docente</th><th>Materia</th><th>Horario</th></tr></thead><tbody>${mh}</tbody></table>
            </div>
            <div class="modal-documentos-section">
                <h4><i class="fa-solid fa-paperclip"></i> Documentos Adjuntos</h4>
                <div class="documentos-grid">${dh}</div>
            </div>
        </div>`;
    }

    function abrirModalDetalle(html, d) {
        var op = { title: 'Detalle de Solicitud', html: html, width: 750, showCloseButton: true, confirmButtonText: 'Cerrar', confirmButtonColor: '#192A56', customClass: { popup: 'swal-solicitud-popup', htmlContainer: 'swal-solicitud-content' } };
        if (d.estado === 'pendiente') { op.showDenyButton = true; op.denyButtonText = 'Rechazar'; op.denyButtonColor = '#EF4444'; op.confirmButtonText = 'Aprobar'; op.confirmButtonColor = '#10B981'; }
        Swal.fire(op).then(async function (r) {
            if (r.isConfirmed && d.estado === 'pendiente') {
                var fila = document.querySelector(`.solicitud-row[data-id="${d.id}"]`);
                if (fila) await aprobar(fila);
            }
            else if (r.isDenied) {
                var fila = document.querySelector(`.solicitud-row[data-id="${d.id}"]`);
                if (fila) await rechazar(fila);
            }
        });
    }

    // Funciones de PDF
    window.descargarPermisoDesdeBoton = function (btn) {
        var f = btn.closest('.historial-row');
        if (!f) return;
        descargarPermiso({
            id: f.getAttribute('data-id'), nombre: f.getAttribute('data-nombre'), grupo: f.getAttribute('data-grupo'),
            matricula: f.getAttribute('data-matricula'), tutor: f.getAttribute('data-tutor'),
            telefonoTutor: f.getAttribute('data-telefono-tutor'), motivo: f.getAttribute('data-motivo'),
            descripcion: f.getAttribute('data-descripcion'), fecha: f.getAttribute('data-fecha'),
            horaInicio: f.getAttribute('data-hora-inicio'), horaFin: f.getAttribute('data-hora-fin'),
            tipoFalta: f.getAttribute('data-tipo-falta'), dias: f.getAttribute('data-dias')
        });
    };

    function descargarPermiso(d) {
        var fh = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
        var tf = d.tipoFalta === 'completa'
            ? 'Día Completo'
            : (d.tipoFalta === 'materias' ? 'Materias Específicas' : 'Rango de Fechas');
        var esc = {
            nombre: 'Esc.Sec.Gral. Lic. "Benito Juarez"',
            direccion: 'Miguel Hidalgo 14, Educación, 42952 Tlaxcoapan, Hgo.',
            telefono: '778 737 0111',
            logo: 'vista/vPrefectura/img/logo-escuela.png'
        };
        var folio = 'SEC-2026-' + String(d.id || '000').padStart(4, '0');
        var datosQR = encodeURIComponent(`FOLIO: ${folio}\nALUMNO: ${d.nombre}\nGRUPO: ${d.grupo}\nTUTOR: ${d.tutor}\nFECHA: ${d.fecha}\nMOTIVO: ${d.motivo}`);
        var qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${datosQR}&bgcolor=FFFFFF&color=192A56`;

        var c = `
            <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Justificante - ${d.nombre}</title>
            <style>
                @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap");
                *{margin:0;padding:0;box-sizing:border-box;}
                body{font-family:Inter,sans-serif;padding:25px;color:#1E293B;background:#F8FAFC;}
                .justificante{max-width:800px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.1);overflow:hidden;}
                .j-header{background:linear-gradient(135deg,#192A56,#1E3A6E);color:#fff;padding:25px 30px;display:flex;align-items:center;justify-content:space-between;gap:20px;}
                .j-header-izq{display:flex;align-items:center;gap:15px;}
                .j-header .logo{width:70px;height:70px;object-fit:contain;background:#fff;border-radius:10px;padding:5px;}
                .j-header h1{font-size:1.2rem;font-weight:700;margin-bottom:3px;}
                .j-header .subtitulo{font-size:.7rem;opacity:.85;}
                .j-qr{background:#fff;padding:8px;border-radius:8px;text-align:center;}
                .j-qr img{width:100px;height:100px;}
                .j-qr p{font-size:.55rem;color:#192A56;font-weight:700;margin-top:3px;}
                .j-body{padding:25px 30px;}
                .j-folio{display:flex;justify-content:space-between;align-items:center;color:#64748B;font-size:.78rem;margin-bottom:20px;padding:12px 15px;background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;}
                .j-seccion{margin-bottom:22px;}
                .j-seccion h2{font-size:.95rem;color:#192A56;margin-bottom:10px;padding-bottom:7px;border-bottom:2px solid #D6A848;}
                .j-datos{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
                .j-dato label{display:block;font-size:.65rem;color:#64748B;font-weight:600;text-transform:uppercase;}
                .j-dato span{font-size:.82rem;font-weight:500;color:#1E293B;}
                .j-alumno{background:linear-gradient(135deg,#FEF9F0,#FFF5E6);border:1px dashed #D6A848;border-radius:8px;padding:14px 18px;margin:12px 0;display:flex;align-items:center;gap:12px;}
                .j-alumno .nombre{font-size:1.15rem;font-weight:700;color:#192A56;}
                .j-sello{text-align:center;margin:20px 0;}
                .j-sello span{display:inline-block;padding:10px 25px;background:#ECFDF5;color:#065F46;font-weight:700;border-radius:8px;border:2px solid #10B981;}
                .j-firmas{display:flex;justify-content:space-around;margin-top:35px;padding-top:22px;border-top:1px solid #E2E8F0;}
                .j-firma{text-align:center;}
                .j-firma .linea{border-top:1px solid #192A56;width:170px;margin-bottom:6px;}
                .j-firma .nombre{font-weight:600;font-size:.82rem;color:#192A56;}
                .j-firma .cargo{font-size:.68rem;color:#64748B;}
                .j-footer{text-align:center;font-size:.62rem;color:#94A3B8;padding:18px;background:#F8FAFC;border-top:1px solid #E2E8F0;}
            </style></head><body>
            <div class="justificante">
                <div class="j-header">
                    <div class="j-header-izq"><img src="${esc.logo}" alt="Logo" class="logo" onerror="this.style.display='none'"><div><h1>JUSTIFICANTE DE AUSENCIA</h1><p class="subtitulo">${esc.nombre}<br>${esc.direccion}</p></div></div>
                    <div class="j-qr"><img src="${qrURL}" alt="QR"><p>${folio}</p></div>
                </div>
                <div class="j-body">
                    <div class="j-folio"><div><strong>Folio:</strong> ${folio}</div><div><strong>Fecha:</strong> ${fh}</div></div>
                    <div class="j-seccion"><h2>DATOS DEL ALUMNO</h2><div class="j-alumno"><div class="nombre">${d.nombre}</div></div><div class="j-datos"><div class="j-dato"><label>Tutor</label><span>${d.tutor}</span></div><div class="j-dato"><label>Teléfono</label><span>${d.telefonoTutor || 'N/A'}</span></div></div></div>
                    <div class="j-seccion"><h2>DETALLE DE LA AUSENCIA</h2><div class="j-datos"><div class="j-dato"><label>Motivo</label><span>${d.motivo}</span></div><div class="j-dato"><label>Fecha</label><span>${d.fecha}</span></div><div class="j-dato"><label>Duración</label><span>${d.dias || '1 día'}</span></div><div class="j-dato"><label>Tipo</label><span>${tf}</span></div></div></div>
                    <div class="j-sello"><span>✔ AUTORIZADO</span></div>
                    <div class="j-firmas">
                        <div class="j-firma"><div class="linea"></div><div class="nombre">Mtra. Laura Hernández García</div><div class="cargo">Directora Escolar</div></div>
                        <div class="j-firma"><div class="linea"></div><div class="nombre">${d.tutor}</div><div class="cargo">Padre/Madre/Tutor</div></div>
                    </div>
                </div>
                <div class="j-footer"><p>${esc.nombre} • ${esc.direccion} • Tel: ${esc.telefono}</p></div>
            </div></body></html>`;

        var w = window.open('', '_blank', 'width=900,height=700');
        w.document.write(c); w.document.close();
        setTimeout(function () { w.print(); }, 800);
        Swal.fire({ title: '✔ Justificante Generado', icon: 'success', confirmButtonColor: '#192A56', timer: 2500 });
    }

    window.mostrarVistaPreviaAsistencia = async function () {
        const g = document.getElementById('export-grupo-asistencia').value;
        const m = document.getElementById('export-materia-asistencia').value;
        const semanaSeleccionada = document.getElementById('export-semana').value; // Formato YYYY-Www (Ej: 2026-W20)

        if (!g || !m || !semanaSeleccionada) {
            Swal.fire({ title: 'Selección Incompleta', icon: 'warning', text: 'Por favor, selecciona un grupo, una materia y una semana del calendario.', confirmButtonColor: '#192A56' });
            return;
        }

        // --- NUEVO CÁLCULO PARA TRANSFORMAR 'YYYY-Www' AL LUNES DE ESA SEMANA ---
        const [yearStr, weekStr] = semanaSeleccionada.split('-W');
        const year = parseInt(yearStr, 10);
        const week = parseInt(weekStr, 10);

        // El 4 de enero siempre cae en la semana 1 según la norma ISO
        const d = new Date(year, 0, 4);
        const day = d.getDay() || 7; // Convertir domingo (0) a 7

        // Calcular el Lunes exacto de la semana seleccionada
        d.setDate(d.getDate() - day + 1 + (week - 1) * 7);
        const lunes = d;
        // ------------------------------------------------------------------------

        const fechasSemana = [];
        const labelsSemana = [];
        const diasStr = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
        const mesesStr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        for (let i = 0; i < 5; i++) {
            let fechaDia = new Date(lunes);
            fechaDia.setDate(lunes.getDate() + i);
            fechasSemana.push(fechaDia.toISOString().split('T')[0]); // YYYY-MM-DD
            labelsSemana.push(`${diasStr[i]} ${String(fechaDia.getDate()).padStart(2, '0')}`);
        }

        const fechaInicio = fechasSemana[0];
        const fechaFin = fechasSemana[4];
        const mesActual = mesesStr[lunes.getMonth()];

        try {
            const resp = await apiPrefectura('obtener_asistencia_exportar', {
                query: { grupo: g, materia: m, fecha_inicio: fechaInicio, fecha_fin: fechaFin }
            });

            if (!resp.ok) throw new Error(resp.mensaje);

            document.getElementById('vista-previa-asistencia').classList.remove('hidden');

            // Configuración de cabeceras
            document.getElementById('titulo-vista-previa').innerHTML = `<i class="fa-solid fa-list-check"></i> Grupo ${g} | ${m} | ${labelsSemana[0]} al ${labelsSemana[4]} ${mesActual}`;

            document.getElementById('dias-semana-header').innerHTML = labelsSemana.map(label =>
                `<th><span class="dia-header">${label.split(' ')[0]}</span><span class="fecha-dia">${label.split(' ')[1]}</span></th>`
            ).join('') + '<th>Asist.</th><th>Faltas</th>';

            // Procesar datos
            const alumnosMap = {};
            resp.datos.forEach(reg => {
                if (!alumnosMap[reg.id_usuario]) {
                    alumnosMap[reg.id_usuario] = { nombre: reg.alumno, dias: {} };
                }
                alumnosMap[reg.id_usuario].dias[reg.fecha] = reg.estado_final;
            });

            let htmlCuerpo = '';
            let index = 1;
            let totalAsistenciasGral = 0;
            let totalFaltasGral = 0;

            Object.values(alumnosMap).forEach(alu => {
                let asistenciasAlu = 0;
                let faltasAlu = 0;
                let tdsDias = '';

                for (let i = 0; i < 5; i++) {
                    const estado = alu.dias[fechasSemana[i]] || 'falta'; // Cruza la fecha calculada con la de BD
                    if (estado === 'presente') {
                        tdsDias += '<td class="asistio">✓</td>';
                        asistenciasAlu++;
                    } else if (estado === 'retardo') {
                        tdsDias += '<td class="justificada">R</td>';
                        asistenciasAlu++;
                    } else {
                        tdsDias += '<td class="falta">✗</td>';
                        faltasAlu++;
                    }
                }

                totalAsistenciasGral += asistenciasAlu;
                totalFaltasGral += faltasAlu;

                htmlCuerpo += `<tr>
                <td>${index++}</td>
                <td class="alumno-nombre">${alu.nombre}</td>
                ${tdsDias}
                <td><strong>${asistenciasAlu}</strong></td>
                <td><strong>${faltasAlu}</strong></td>
            </tr>`;
            });

            document.getElementById('cuerpo-tabla-asistencia').innerHTML = htmlCuerpo;

            const pct = Math.round((totalAsistenciasGral / (totalAsistenciasGral + totalFaltasGral)) * 100) || 0;
            document.getElementById('resumen-asistencia').innerHTML = `
            <div class="resumen-item"><div class="resumen-icono green">✓</div><div><strong>${totalAsistenciasGral}</strong> Asistencias</div></div>
            <div class="resumen-item"><div class="resumen-icono red">✗</div><div><strong>${totalFaltasGral}</strong> Faltas</div></div>
            <div class="resumen-item"><div class="resumen-icono warning"><i class="fa-solid fa-chart-line"></i></div><div><strong>${pct}%</strong> Eficiencia</div></div>
        `;

            document.getElementById('vista-previa-asistencia').scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron obtener los datos de asistencia.', 'error');
        }
    };

    window.mostrarVistaPreviaAsistencia = mostrarVistaPreviaAsistencia;
    window.descargarListaPDF = function () {
        var g = document.getElementById('export-grupo-asistencia').value, m = document.getElementById('export-materia-asistencia').value, s = document.getElementById('export-semana').value;
        if (!g || !m || !s) { Swal.fire({ title: 'Sin datos', icon: 'warning', confirmButtonColor: '#192A56' }); return; }
        var th = document.getElementById('tabla-asistencia-previa').outerHTML, tit = document.getElementById('titulo-vista-previa').textContent, res = document.getElementById('resumen-asistencia').innerHTML;
        var c = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Lista</title><style>body{font-family:sans-serif;padding:30px;}table{width:100%;border-collapse:collapse;}th{background:#192A56;color:#fff;padding:8px;}td{padding:6px 8px;border:1px solid #ddd;text-align:center;}.header{text-align:center;border-bottom:2px solid #D6A848;margin-bottom:20px;}</style></head><body><div class="header"><h2>Esc.Sec.Gral. Lic. "Benito Juarez"</h2><p>' + tit + '</p></div>' + th + '<div style="margin-top:15px;padding:12px;background:#FEF9F0;">' + res + '</div></body></html>';
        var w = window.open('', '_blank'); w.document.write(c); w.document.close(); setTimeout(function () { w.print(); }, 500);
        Swal.fire({ title: '¡PDF Generado!', icon: 'success', confirmButtonColor: '#192A56', timer: 1500 });
    };

    window.descargarListaExcel = function () {
        var g = document.getElementById('export-grupo-asistencia').value, s = document.getElementById('export-semana').value;
        if (!g || !s) { Swal.fire({ title: 'Sin datos', icon: 'warning', confirmButtonColor: '#192A56' }); return; }
        var filas = document.querySelectorAll('#tabla-asistencia-previa tbody tr'), csv = '\uFEFFNo.,Alumno,';
        document.querySelectorAll('#dias-semana-header th').forEach(function (th) { csv += '"' + ((th.querySelector('.dia-header') || {}).textContent || '') + ' ' + ((th.querySelector('.fecha-dia') || {}).textContent || '') + '",'; });
        csv += 'Asistencias,Faltas\n';
        filas.forEach(function (f) { var celdas = f.querySelectorAll('td'); celdas.forEach(function (c, i) { var v = c.textContent.trim(); if (c.classList.contains('asistio')) v = 'Asistió'; if (c.classList.contains('falta')) v = 'Falta'; if (c.classList.contains('justificada')) v = 'Justificada'; csv += '"' + v + '"'; if (i < celdas.length - 1) csv += ','; }); csv += '\n'; });
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }), url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = 'Lista_' + g + '_' + s + '.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        Swal.fire({ title: '¡Excel Generado!', icon: 'success', confirmButtonColor: '#192A56', timer: 1500 });
    };

    function initHistorialLogic() {
        var sh = document.getElementById('searchHistorial'), fe = document.getElementById('filtro-estado-historial'), th = document.getElementById('tabla-historial');
        if (!th || th.getAttribute('data-init') === '1') return; th.setAttribute('data-init', '1');
        function filtrar() { var st = sh ? sh.value.toLowerCase() : '', ef = fe ? fe.value : 'todos'; th.querySelectorAll('.historial-row').forEach(function (f) { var n = (f.getAttribute('data-nombre') || '').toLowerCase(), e = f.getAttribute('data-estado') || ''; f.style.display = (!st || n.includes(st)) && (ef === 'todos' || e === ef) ? '' : 'none'; }); }
        if (sh) sh.addEventListener('input', filtrar); if (fe) fe.addEventListener('change', filtrar);
    }

    // === CARGAR ESTADÍSTICAS DESDE LA BD ===
    async function cargarEstadisticas() {
        try {
            const trimestre = document.getElementById('filtro-trimestre').value || 2;
            const anio = document.getElementById('filtro-anio').value || 2025;

            const data = await apiPrefectura('obtener_estadisticas', { query: { trimestre, anio } });
            const tbody = document.querySelector('#tabla-estadisticas-grupos tbody');

            if (!tbody) return;
            tbody.innerHTML = '';

            if (!data.estadisticas || data.estadisticas.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color: #64748B;">No hay registros de asistencia en la base de datos para el Trimestre ${trimestre} de ${anio}.</td></tr>`;
                return;
            }

            data.estadisticas.forEach(est => {
                const pct = parseFloat(est.pct_asistencia) || 0;
                let clasePct = pct >= 95 ? 'high' : (pct >= 85 ? 'medium' : 'low');
                let colorFondoLow = clasePct === 'low' ? 'background: #FEE2E2; color: #991B1B;' : '';

                const filaHTML = `
                    <tr>
                        <td><strong>${prefecturaEscapeHTML(est.grupo)}</strong></td>
                        <td>${est.total_registros}</td>
                        <td class="text-success">${est.presentes}</td>
                        <td class="text-danger">${est.faltas}</td>
                        <td><span class="text-muted-small">N/A</span></td> <td><span class="porcentaje ${clasePct}" style="${colorFondoLow}">${pct}%</span></td>
                        <td><button class="btn-link" onclick="verDetalleEstadisticas('${prefecturaEscapeAttr(est.grupo)}', ${trimestre}, ${anio})">Ver detalle</button></td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', filaHTML);
            });
        } catch (error) {
            console.error("Error al cargar estadísticas:", error);
            Swal.fire('Error', 'No se pudieron cargar las estadísticas', 'error');
        }
    }

    // Escuchar cambios en los filtros para recargar automáticamente
    const selectTrimestre = document.getElementById('filtro-trimestre');
    const selectAnio = document.getElementById('filtro-anio');
    if (selectTrimestre) selectTrimestre.addEventListener('change', cargarEstadisticas);
    if (selectAnio) selectAnio.addEventListener('change', cargarEstadisticas);

    // Placeholder para la acción "Ver Detalle"
    window.verDetalleEstadisticas = function (grupo, trimestre, anio) {
        Swal.fire({
            title: `Estadísticas Grupo ${grupo}`,
            text: `Mostrando detalles del T${trimestre} ${anio}. (Característica en desarrollo)`,
            icon: 'info',
            confirmButtonColor: '#192A56'
        });
    };

    function switchSubView(targetId) {
        sections.forEach(function (s) { s.classList.add('hidden'); });
        var target = document.getElementById(targetId);
        if (target) {
            target.classList.remove('hidden'); target.classList.remove('fade-in');
            void target.offsetWidth; target.classList.add('fade-in');
        }
        subNavItems.forEach(function (b) { b.classList.remove('active'); });
        var ab = document.querySelector('.sub-nav-item[data-target="' + targetId + '"]');
        if (ab) ab.classList.add('active');

        if (targetId === 'section-historial') initHistorialLogic();
        if (targetId === 'section-estadisticas') cargarEstadisticas();

        // AÑADIR ESTA LÍNEA AQUÍ:
        if (targetId === 'section-exportar') cargarFiltrosExportacion();
    }

    // Función para manejar el clic en las listas (Pills)
    window.seleccionarItem = function (tipo, valor, elemento) {
        document.getElementById(`export-${tipo}-asistencia`).value = valor;
        const lista = document.getElementById(`lista-${tipo}s-exportar`);
        lista.querySelectorAll('.list-item').forEach(el => el.classList.remove('active'));
        elemento.classList.add('active');
    };

    // Modificamos la carga para dibujar <span> en lugar de <option>
    async function cargarFiltrosExportacion() {
        const listaGrupos = document.getElementById('lista-grupos-exportar');
        const listaMaterias = document.getElementById('lista-materias-exportar');

        if (listaGrupos && listaGrupos.innerHTML.trim() === '') {
            try {
                const data = await apiPrefectura('obtener_filtros_exportar');
                if (data.grupos) {
                    listaGrupos.innerHTML = data.grupos.map(g =>
                        `<span class="list-item" onclick="seleccionarItem('grupo', '${prefecturaEscapeAttr(g.nombre)}', this)">${prefecturaEscapeHTML(g.nombre)}</span>`
                    ).join('');
                }
                if (data.asignaturas) {
                    listaMaterias.innerHTML = data.asignaturas.map(m =>
                        `<span class="list-item" onclick="seleccionarItem('materia', '${prefecturaEscapeAttr(m.nombre)}', this)">${prefecturaEscapeHTML(m.nombre)}</span>`
                    ).join('');
                }
            } catch (error) {
                console.error("Error al cargar filtros:", error);
            }
        }
    }
}

// ==========================================
//      SECCIÓN: CATÁLOGO DE PERSONAL
// ==========================================
function initPersonalLogic() {
    console.log('✔ Catálogo de Personal inicializado');

    var tabButtons = document.querySelectorAll('.tab-btn');
    var filterLinks = document.querySelectorAll('.filter-link');
    var searchInput = document.getElementById('searchPersona');
    var tablaAlumnos = document.getElementById('tabla-alumnos');
    var tablaDocentes = document.getElementById('tabla-docentes');

    // === CARGAR PERSONAL DESDE LA BD ===
    async function cargarPersonal() {
        try {
            // 1. Pedimos los datos UNO POR UNO (secuencial) para evitar bloqueos de sesión en PHP
            const dataAlumnos = await apiPrefectura('listar_personal', { query: { rol: 'alumno' } });
            const dataDocentes = await apiPrefectura('listar_personal', { query: { rol: 'docente' } });

            const tbodyAlumnos = document.querySelector('#tabla-alumnos tbody');
            const tbodyDocentes = document.querySelector('#tabla-docentes tbody');

            if (!tbodyAlumnos || !tbodyDocentes) return;

            tbodyAlumnos.innerHTML = '';
            tbodyDocentes.innerHTML = '';

            // 2. DIBUJAR ALUMNOS
            if (dataAlumnos && dataAlumnos.personal && dataAlumnos.personal.length > 0) {
                dataAlumnos.personal.forEach(p => {
                    const nombreCompleto = `${p.nombre} ${p.apellido}`;
                    const badgeEstado = p.estado == 1
                        ? '<span class="badge success"><i class="fa-solid fa-check"></i> Regular</span>'
                        : '<span class="badge warning">Inactivo</span>';

                    const filaHTML = `
                        <tr data-tipo="alumno" data-nombre="${nombreCompleto}" data-matricula="${p.matricula_escolar}" data-grupo="${p.grupo}">
                            <td>
                                <div class="alumno-cell">
                                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(nombreCompleto)}&background=D6A848&color=192A56&size=36">
                                    <div><span class="alumno-name">${nombreCompleto}</span></div>
                                </div>
                            </td>
                            <td>${p.matricula_escolar || 'N/A'}</td>
                            <td>${p.grupo || 'Sin asignar'}</td>
                            <td><span class="badge info">Matutino</span></td>
                            <td>${badgeEstado}</td>
                            <td>
                                <button class="btn-expediente btn-ver-expediente"><i class="fa-solid fa-folder-open"></i> Expediente</button>
                            </td>
                        </tr>
                    `;
                    tbodyAlumnos.insertAdjacentHTML('beforeend', filaHTML);
                });
            } else {
                tbodyAlumnos.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #64748B;">No hay alumnos registrados.</td></tr>';
            }

            // 3. DIBUJAR DOCENTES
            if (dataDocentes && dataDocentes.personal && dataDocentes.personal.length > 0) {
                dataDocentes.personal.forEach(p => {
                    const nombreCompleto = `${p.nombre} ${p.apellido}`;
                    const badgeEstado = p.estado == 1
                        ? '<span class="badge success"><i class="fa-solid fa-check"></i> Activo</span>'
                        : '<span class="badge warning">Inactivo</span>';

                    const filaHTML = `
                        <tr data-tipo="docente" data-nombre="${nombreCompleto}" data-id="${p.clave_docente || p.id_usuario}">
                            <td>
                                <div class="alumno-cell">
                                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(nombreCompleto)}&background=192A56&color=fff&size=36">
                                    <div><span class="alumno-name">${nombreCompleto}</span></div>
                                </div>
                            </td>
                            <td>${p.clave_docente || p.id_usuario}</td>
                            <td>Varias asignaturas</td>
                            <td><span class="badge info">Matutino</span></td>
                            <td>${badgeEstado}</td>
                            <td>
                                <button class="btn-horario btn-ver-horario"><i class="fa-solid fa-calendar-days"></i> Horario</button>
                            </td>
                        </tr>
                    `;
                    tbodyDocentes.insertAdjacentHTML('beforeend', filaHTML);
                });
            } else {
                // Si la BD no trae docentes, mostramos este mensaje en lugar de una tabla vacía
                tbodyDocentes.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #64748B;"><i class="fa-solid fa-circle-exclamation"></i> No hay docentes registrados en la base de datos.</td></tr>';
            }

            // Aplicar el filtro después de que todo se haya cargado
            filterTable();
        } catch (error) {
            console.error("Error al cargar personal:", error);
        }
    }

    cargarPersonal();

    // === NUEVO REGISTRO DE PERSONAL ===
    window.nuevoRegistro = function () {
        Swal.fire({
            title: 'Nuevo Registro de Personal',
            html: `
                <div style="text-align:left;">
                    <div style="margin-bottom:12px;">
                        <label style="font-size:0.7rem; font-weight:600;">Rol</label>
                        <select id="reg-rol" class="swal2-input" style="width:100%;">
                            <option value="alumno">Alumno</option>
                            <option value="docente">Docente</option>
                        </select>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <div>
                            <label style="font-size:0.7rem; font-weight:600;">Nombre(s)</label>
                            <input type="text" id="reg-nombre" class="swal2-input" style="width:100%;" placeholder="Ej: Juan">
                        </div>
                        <div>
                            <label style="font-size:0.7rem; font-weight:600;">Apellidos</label>
                            <input type="text" id="reg-apellido" class="swal2-input" style="width:100%;" placeholder="Ej: Pérez">
                        </div>
                    </div>
                    <div style="margin-bottom:12px; margin-top:12px;">
                        <label style="font-size:0.7rem; font-weight:600;">Correo Institucional</label>
                        <input type="email" id="reg-correo" class="swal2-input" style="width:100%;" placeholder="ejemplo@escuela.edu.mx">
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
                        <div>
                            <label style="font-size:0.7rem; font-weight:600;">Matrícula / ID</label>
                            <input type="text" id="reg-matricula" class="swal2-input" style="width:100%;">
                        </div>
                        <div>
                            <label style="font-size:0.7rem; font-weight:600;">Teléfono</label>
                            <input type="text" id="reg-telefono" class="swal2-input" style="width:100%;">
                        </div>
                    </div>
                    <div style="margin-bottom:12px;">
                        <label style="font-size:0.7rem; font-weight:600;">Contraseña Temporal</label>
                        <input type="password" id="reg-password" class="swal2-input" style="width:100%;" placeholder="Mínimo 6 caracteres">
                    </div>
                </div>
            `,
            width: 600,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-floppy-disk"></i> Registrar',
            confirmButtonColor: '#10B981',
            cancelButtonText: 'Cancelar',
            customClass: { popup: 'swal-solicitud-popup' },
            preConfirm: () => {
                const nombre = document.getElementById('reg-nombre').value.trim();
                const apellido = document.getElementById('reg-apellido').value.trim();
                const correo = document.getElementById('reg-correo').value.trim();
                const password = document.getElementById('reg-password').value;

                if (!nombre || !apellido || !correo || !password) {
                    Swal.showValidationMessage('Nombre, Apellido, Correo y Contraseña son obligatorios.');
                    return false;
                }

                return {
                    rol: document.getElementById('reg-rol').value,
                    nombre: nombre,
                    apellido: apellido,
                    correo: correo,
                    matricula: document.getElementById('reg-matricula').value.trim(),
                    telefono: document.getElementById('reg-telefono').value.trim(),
                    password: password
                };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiPrefectura('crear_usuario', {
                        method: 'POST',
                        body: result.value
                    });

                    Swal.fire('¡Registrado!', 'El usuario se ha guardado correctamente.', 'success');
                    cargarPersonal(); // Refrescar la tabla
                } catch (error) {
                    Swal.fire('Error', error.message, 'error');
                }
            }
        });
    };

    function filterTable() {
        if (!tablaAlumnos) return;
        var activeRoleEl = document.querySelector('.tab-btn.active');
        var activeRole = activeRoleEl ? activeRoleEl.getAttribute('data-role') : 'alumno';
        var activeGroupEl = document.querySelector('.filter-link.active');
        var activeGroup = activeGroupEl ? activeGroupEl.getAttribute('data-group') : 'all';
        var searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

        if (activeRole === 'alumno') {
            if (tablaAlumnos) tablaAlumnos.classList.remove('hidden');
            if (tablaDocentes) tablaDocentes.classList.add('hidden');
        } else {
            if (tablaAlumnos) tablaAlumnos.classList.add('hidden');
            if (tablaDocentes) tablaDocentes.classList.remove('hidden');
        }

        var filas = activeRole === 'alumno' ? tablaAlumnos.querySelectorAll('tbody tr') : tablaDocentes.querySelectorAll('tbody tr');
        filas.forEach(function (fila) {
            var nombre = (fila.getAttribute('data-nombre') || '').toLowerCase();
            var matricula = (fila.getAttribute('data-matricula') || fila.getAttribute('data-id') || '').toLowerCase();

            // NORMALIZACIÓN DE GRUPOS
            var grupo = (fila.getAttribute('data-grupo') || '').toLowerCase().replace(/\s/g, '').replace('º', '°');
            var activeGroupNormalizado = activeGroup.toLowerCase().replace(/\s/g, '').replace('º', '°');

            var textoFila = fila.innerText.toLowerCase();

            var matchesSearch = !searchTerm || nombre.includes(searchTerm) || matricula.includes(searchTerm) || textoFila.includes(searchTerm);
            var matchesGroup = (activeRole === 'docente') || (activeGroup === 'all') || (grupo === activeGroupNormalizado);

            if (matchesSearch && matchesGroup) { fila.style.display = ''; } else { fila.style.display = 'none'; }
        });
    }

    tabButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            tabButtons.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            if (searchInput) searchInput.value = '';
            filterTable();
        });
    });

    filterLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            filterLinks.forEach(function (l) { l.classList.remove('active'); });
            link.classList.add('active');
            filterTable();
        });
    });

    if (searchInput) searchInput.addEventListener('input', filterTable);

    function clickEnTabla(e) {
        var btnExp = e.target.closest('.btn-expediente') || e.target.closest('.btn-ver-expediente');
        if (btnExp) {
            e.stopPropagation();
            var fila = btnExp.closest('tr');
            var d = { nombre: fila.getAttribute('data-nombre'), grupo: fila.getAttribute('data-grupo') };
            Swal.fire('Expediente Escolar', 'Mostrando expediente de: ' + d.nombre, 'info');
        }
    }
    if (tablaAlumnos) tablaAlumnos.addEventListener('click', clickEnTabla);
    if (tablaDocentes) tablaDocentes.addEventListener('click', clickEnTabla);
}

// ==========================================
//      SECCIÓN: CONFIGURACIÓN DEL SISTEMA
// ==========================================
function initSistemaLogic() {
    console.log('✔ Configuración del Sistema inicializada');

    window.guardarConfiguracionSistema = function () {
        var limiteDias = document.getElementById('limite-dias') ? document.getElementById('limite-dias').value : '3';
        var cicloActivo = document.getElementById('ciclo-activo') ? document.getElementById('ciclo-activo').value : '2025-2026';

        Swal.fire({
            title: '¡Configuración Guardada!',
            html: '<div style="text-align:left;font-size:0.85rem;line-height:1.6;">' +
                '<p><strong>• Plazo para justificar:</strong> ' + limiteDias + ' días hábiles</p>' +
                '<p><strong>• Ciclo escolar:</strong> ' + cicloActivo + '</p>' +
                '<p style="color:#10B981;margin-top:10px;">✔ Los cambios se guardaron correctamente.</p></div>',
            icon: 'success',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#192A56'
        });
    }
}
