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

window.abrirExpedienteAlumno = async function (matricula, nombre, grupo, pctHtml) {
    if (!matricula || matricula === 'N/A') {
        Swal.fire('Sin matricula', 'No se encontro la matricula del alumno para abrir el expediente.', 'warning');
        return;
    }

    Swal.fire({
        title: 'Cargando Expediente...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const resFiltros = await apiPrefectura('obtener_filtros_exportar');
        let optionsMateria = '<option value="">Todas las materias</option>';
        if (resFiltros.asignaturas) {
            resFiltros.asignaturas.forEach(m => {
                optionsMateria += `<option value="${prefecturaEscapeAttr(m.nombre)}">${prefecturaEscapeHTML(m.nombre)}</option>`;
            });
        }

        function cargarTablaExpediente(f_inicio = '', f_fin = '', mat = '') {
            const tbody = document.getElementById('tbody-expediente');
            if (!tbody) return;

            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</td></tr>';

            apiPrefectura('obtener_expediente_alumno', { query: { matricula, fecha_inicio: f_inicio, fecha_fin: f_fin, materia: mat } })
                .then(data => {
                    let trs = '';
                    if (!data.historial || data.historial.length === 0) {
                        trs = '<tr><td colspan="4" style="text-align:center; padding: 20px; color:#64748B;">No hay registros para este filtro.</td></tr>';
                    } else {
                        data.historial.forEach(h => {
                            let badge = '';
                            if (h.estado_final === 'presente') badge = '<span class="badge success">Presente</span>';
                            else if (h.estado_final === 'falta') badge = '<span class="badge danger">Falta</span>';
                            else if (h.estado_final === 'retardo') badge = '<span class="badge warning">Retardo</span>';
                            else badge = `<span class="badge info" style="text-transform: capitalize;">${prefecturaEscapeHTML(h.estado_final)}</span>`;

                            trs += `<tr>
                                <td><i class="fa-regular fa-calendar" style="color:#64748B;"></i> ${prefecturaEscapeHTML(h.fecha_fmt)}</td>
                                <td><strong>${prefecturaEscapeHTML(h.materia)}</strong></td>
                                <td><i class="fa-regular fa-clock" style="color:#64748B;"></i> ${prefecturaEscapeHTML(h.hora)}</td>
                                <td>${badge}</td>
                            </tr>`;
                        });
                    }
                    tbody.innerHTML = trs;
                })
                .catch(err => {
                    console.error(err);
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Error al cargar datos.</td></tr>';
                });
        }

        const modalHtml = `
            <div class="expediente-header">
                <div class="expediente-info">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=D6A848&color=192A56&size=54">
                    <div>
                        <h3>${prefecturaEscapeHTML(nombre)}</h3>
                        <p>Grupo: <strong>${prefecturaEscapeHTML(grupo)}</strong> | Matricula: <strong>${prefecturaEscapeHTML(matricula)}</strong></p>
                    </div>
                </div>
                <div class="expediente-badge">${pctHtml || ''}</div>
            </div>

            <div class="expediente-filtros">
                <div class="filtro-fecha">
                    <label>Materia:</label>
                    <select id="exp-materia">${optionsMateria}</select>
                </div>
                <div class="filtro-fecha"><label>Desde:</label><input type="date" id="exp-fecha-inicio"></div>
                <div class="filtro-fecha"><label>Hasta:</label><input type="date" id="exp-fecha-fin"></div>
                <button id="btn-filtrar-exp" class="btn-filtrar-mini"><i class="fa-solid fa-filter"></i> Filtrar</button>
                <button id="btn-limpiar-exp" class="btn-limpiar-mini" title="Limpiar"><i class="fa-solid fa-rotate-right"></i></button>
            </div>

            <h4 class="expediente-subtitle"><i class="fa-solid fa-list-check"></i> Registros de Asistencia</h4>

            <div class="expediente-table-container">
                <table class="expediente-table">
                    <thead><tr><th>Fecha</th><th>Materia</th><th>Hora</th><th>Estado</th></tr></thead>
                    <tbody id="tbody-expediente"></tbody>
                </table>
            </div>
        `;

        Swal.fire({
            title: '',
            html: modalHtml,
            width: 750,
            showCloseButton: true,
            confirmButtonText: '<i class="fa-solid fa-check"></i> Entendido',
            confirmButtonColor: '#192A56',
            customClass: { popup: 'swal-solicitud-popup modal-expediente-fix', closeButton: 'btn-close-fix' },
            didOpen: () => {
                cargarTablaExpediente();
                document.getElementById('btn-filtrar-exp').addEventListener('click', () => {
                    cargarTablaExpediente(document.getElementById('exp-fecha-inicio').value, document.getElementById('exp-fecha-fin').value, document.getElementById('exp-materia').value);
                });
                document.getElementById('btn-limpiar-exp').addEventListener('click', () => {
                    document.getElementById('exp-fecha-inicio').value = '';
                    document.getElementById('exp-fecha-fin').value = '';
                    document.getElementById('exp-materia').value = '';
                    cargarTablaExpediente();
                });
            }
        });
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo cargar el expediente.', 'error');
    }
};
// ===================================

document.addEventListener('DOMContentLoaded', function () {

    async function cargarDatosHeader() {
        try {
            const data = await apiPrefectura('obtener_prefecto');
            if (data && data.prefecto) {
                const prefecto = data.prefecto;
                const nombreCompleto = `${prefecto.nombre} ${prefecto.apellido}`;

                const elNombreTop = document.getElementById('top-user-name');
                const elRolTop = document.getElementById('top-user-role');
                const elAvatarTop = document.getElementById('top-user-avatar');

                if (elNombreTop) elNombreTop.textContent = nombreCompleto;
                if (elRolTop) elRolTop.textContent = prefecto.rol || 'Administrador';

                if (elAvatarTop) {
                    elAvatarTop.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombreCompleto)}&background=D6A848&color=192A56&bold=true`;
                }
            }
        } catch (error) {
            console.error("Error al cargar usuario del header:", error);
        }
    }

    cargarDatosHeader(); // Se ejecuta de inmediato al abrir la página
    // -------------------------------------------------------------

    const navItems = document.querySelectorAll('.nav-item');
    const viewContainer = document.getElementById('view-container');

    async function loadSection(sectionName) {
        if (!sectionName) return;

        // --- NUEVO: Actualizar visualmente el menú SUPERIOR ---
        document.querySelectorAll('.header-nav .nav-item').forEach(item => {
            if (item.getAttribute('data-section') === sectionName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        // ------------------------------------------------------

        const viewContainer = document.getElementById('view-container');

        if (!sectionName) return;
        try {
            const response = await fetch('prefectura/' + sectionName + '.html?t=' + Date.now());
            if (!response.ok) throw new Error('No se encontró: ' + sectionName + '.html');
            const html = await response.text();

            viewContainer.innerHTML = html;
            if (typeof window.aplicarConfiguracionSistema === 'function') {
                window.aplicarConfiguracionSistema(await window.obtenerConfiguracionSistema());
            }
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
                if (typeof window.aplicarConfiguracionSistema === 'function') {
                    window.obtenerConfiguracionSistema().then(window.aplicarConfiguracionSistema);
                }
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

    async function cargarDatosSidebar() {
        try {
            const data = await apiPrefectura('obtener_prefecto');
            if (data && data.prefecto) {
                const prefecto = data.prefecto;
                const nombreCompleto = `${prefecto.nombre} ${prefecto.apellido}`;

                const elNombre = document.getElementById('sidebar-user-name');
                const elRol = document.getElementById('sidebar-user-role');
                const elAvatar = document.getElementById('sidebar-user-avatar');

                if (elNombre) elNombre.textContent = nombreCompleto;
                if (elRol) elRol.textContent = prefecto.rol || 'Administrador';

                // Actualizamos también el avatar dinámico con las iniciales del usuario
                if (elAvatar) {
                    elAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombreCompleto)}&background=D6A848&color=192A56&size=32`;
                }
            }
        } catch (error) {
            console.error("Error al cargar usuario del sidebar:", error);
        }
    }

    // Ejecutamos la función inmediatamente al cargar la vista
    cargarDatosSidebar();
    // -------------------------------------------------------------

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

    async function descargarPermiso(d) {
        const configSistema = typeof window.obtenerConfiguracionSistema === 'function'
            ? await window.obtenerConfiguracionSistema()
            : {};
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
        var director = prefecturaEscapeHTML(configSistema.nombre_director || 'Prof. Gustavo Eleazar Viveros Niño');
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
                        <div class="j-firma"><div class="linea"></div><div class="nombre">${director}</div><div class="cargo">Dirección Escolar</div></div>
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
            ).join('');

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

        var th = document.getElementById('tabla-asistencia-previa').outerHTML;
        var tit = document.getElementById('titulo-vista-previa').textContent;
        var res = document.getElementById('resumen-asistencia').innerHTML;

        var c = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Lista de Asistencia</title>
        <style>
            /* REGLA MAESTRA PARA FORZAR LA IMPRESIÓN DE COLORES Y FONDOS */
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            body { font-family: 'Inter', sans-serif, Arial; padding: 20px; color: #1E293B; background: #fff; }
            
            /* Estilos de la tabla idénticos a la vista web */
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #E2E8F0; }
            th { 
                background-color: #192A56 !important; 
                color: #ffffff !important; 
                padding: 10px 8px; 
                font-size: 11px; 
                text-transform: uppercase; 
                border: 1px solid #334155; 
            }
            td { padding: 8px; border: 1px solid #E2E8F0; text-align: center; font-size: 12px; }
            td:nth-child(2) { text-align: left; font-weight: 500; } /* Nombre del alumno a la izquierda */
            
            /* Colores de los íconos de asistencia */
            .asistio { color: #10B981 !important; font-weight: bold; font-size: 14px; }
            .falta { color: #EF4444 !important; font-weight: bold; font-size: 14px; }
            .justificada { color: #F59E0B !important; font-weight: bold; font-size: 14px; }
            
            /* Encabezado del documento */
            .header { text-align: center; border-bottom: 2px solid #D6A848; margin-bottom: 20px; padding-bottom: 10px; }
            .header h2 { margin: 0 0 5px 0; color: #192A56; }
            .header p { margin: 0; color: #64748B; font-size: 14px; }
            
            /* Contenedor de resumen */
            .resumen-contenedor { display: flex; justify-content: center; gap: 25px; margin-top: 15px; padding: 12px; background-color: #FEF9F0 !important; border-radius: 8px; border: 1px solid #f3e8d6; }
            .resumen-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #1E293B; }
            .resumen-icono { font-weight: bold; }
            .resumen-icono.green { color: #10B981 !important; }
            .resumen-icono.red { color: #EF4444 !important; }
            .resumen-icono.warning { color: #F59E0B !important; }
            
            /* Ajustes exclusivos para el cuadro de impresión */
            @media print {
                body { padding: 0; margin: 0; }
                @page { margin: 1cm; } /* Reduce los márgenes de impresión por defecto */
            }
        </style></head><body>
        <div class="header">
            <h2>Esc.Sec.Gral. Lic. "Benito Juarez"</h2>
            <p>${tit}</p>
        </div>
        ${th}
        <div class="resumen-contenedor">${res}</div>
        </body></html>`;

        Swal.fire({
            title: 'Vista Previa del Documento',
            html: `<iframe id="frame-impresion-pdf" style="width:100%; height:450px; border:1px solid #E2E8F0; border-radius:8px; background:#fff;"></iframe>`,
            width: 850,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-print"></i> Imprimir / Guardar PDF',
            cancelButtonText: 'Cerrar',
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#64748B',
            customClass: { popup: 'swal-solicitud-popup' },
            didOpen: () => {
                const iframe = document.getElementById('frame-impresion-pdf');
                const doc = iframe.contentWindow.document;
                doc.open();
                doc.write(c);
                doc.close();
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const iframe = document.getElementById('frame-impresion-pdf');
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }
        });
    };

    window.descargarListaExcel = function () {
        var g = document.getElementById('export-grupo-asistencia').value,
            m = document.getElementById('export-materia-asistencia').value,
            s = document.getElementById('export-semana').value;

        if (!g || !m || !s) {
            Swal.fire({ title: 'Sin datos', icon: 'warning', confirmButtonColor: '#192A56' });
            return;
        }

        var tit = document.getElementById('titulo-vista-previa').textContent;
        var tablaHTML = document.getElementById('tabla-asistencia-previa').outerHTML;

        // 1. Limpiamos los IDs para evitar conflictos en el Excel
        tablaHTML = tablaHTML.replace(/id="[^"]*"/g, '');

        // 2. INYECTAMOS EL DISEÑO EN LÍNEA PARA QUE EXCEL NO LO IGNORE
        // Forzamos el fondo azul marino y texto blanco en los encabezados <th>
        tablaHTML = tablaHTML.replace(/<th\b([^>]*)>/gi, '<th$1 style="background-color: #192A56; color: #FFFFFF; font-weight: bold; border: 1px solid #000000; text-align: center; padding: 5px;">');

        // Forzamos los bordes y el centrado en las celdas normales <td>
        tablaHTML = tablaHTML.replace(/<td\b([^>]*)>/gi, '<td$1 style="border: 1px solid #DDDDDD; text-align: center; padding: 5px; vertical-align: middle;">');

        Swal.fire({
            title: 'Exportar a Excel',
            html: `<p>Se generará un archivo Excel del grupo <strong>${g}</strong>.</p>`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-file-excel"></i> Descargar Excel',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#64748B',
            customClass: { popup: 'swal-solicitud-popup' }
        }).then((result) => {
            if (result.isConfirmed) {

                var html = `
                    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            /* Mantenemos los colores de los textos (X y ✓) */
                            .asistio { color: #10B981; font-weight: bold; }
                            .falta { color: #EF4444; font-weight: bold; }
                            .justificada { color: #F59E0B; font-weight: bold; }
                            .alumno-nombre { text-align: left !important; }
                        </style>
                        </head>
                    <body>
                        <table>
                            <tr>
                                <th colspan="9" style="font-size: 18px; text-align:center; background-color:#ffffff; color:#192A56; border:none;">Esc.Sec.Gral. Lic. "Benito Juarez"</th>
                            </tr>
                            <tr>
                                <th colspan="9" style="font-size: 14px; text-align:center; background-color:#ffffff; color:#64748B; border:none;">${tit}</th>
                            </tr>
                            <tr><td colspan="9" style="border:none;"></td></tr>
                        </table>
                        
                        ${tablaHTML}
                        
                    </body>
                    </html>
                `;

                var blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = `Asistencia_${g.replace(/\s/g, '')}_${s}.xls`;

                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                Swal.fire({ title: '¡Excel Descargado!', text: 'Revisa tu carpeta de descargas.', icon: 'success', confirmButtonColor: '#192A56', timer: 2000 });
            }
        });
    };

    // ==========================================
    // FUNCIÓN GLOBAL: ABRIR EXPEDIENTE DE ALUMNO
    // ==========================================
    if (!window.abrirExpedienteAlumno) {
    window.abrirExpedienteAlumno = async function (matricula, nombre, grupo, pctHtml) {
        Swal.fire({
            title: 'Cargando Expediente...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const resFiltros = await apiPrefectura('obtener_filtros_exportar');
            let optionsMateria = '<option value="">Todas las materias</option>';
            if (resFiltros.asignaturas) {
                resFiltros.asignaturas.forEach(m => {
                    optionsMateria += `<option value="${prefecturaEscapeAttr(m.nombre)}">${prefecturaEscapeHTML(m.nombre)}</option>`;
                });
            }

            function cargarTablaExpediente(f_inicio = '', f_fin = '', mat = '') {
                const tbody = document.getElementById('tbody-expediente');
                if (!tbody) return;

                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</td></tr>';

                apiPrefectura('obtener_expediente_alumno', { query: { matricula: matricula, fecha_inicio: f_inicio, fecha_fin: f_fin, materia: mat } })
                    .then(data => {
                        let trs = '';
                        if (data.historial.length === 0) {
                            trs = '<tr><td colspan="4" style="text-align:center; padding: 20px; color:#64748B;">No hay registros para este filtro.</td></tr>';
                        } else {
                            data.historial.forEach(h => {
                                let badge = '';
                                if (h.estado_final === 'presente') badge = '<span class="badge success">Presente</span>';
                                else if (h.estado_final === 'falta') badge = '<span class="badge danger">Falta</span>';
                                else if (h.estado_final === 'retardo') badge = '<span class="badge warning">Retardo</span>';
                                else badge = `<span class="badge info" style="text-transform: capitalize;">${h.estado_final}</span>`;

                                trs += `<tr>
                                        <td><i class="fa-regular fa-calendar" style="color:#64748B;"></i> ${h.fecha_fmt}</td>
                                        <td><strong>${h.materia}</strong></td>
                                        <td><i class="fa-regular fa-clock" style="color:#64748B;"></i> ${h.hora}</td>
                                        <td>${badge}</td>
                                    </tr>`;
                            });
                        }
                        tbody.innerHTML = trs;
                    })
                    .catch(err => {
                        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Error al cargar datos.</td></tr>';
                    });
            }

            const modalHtml = `
            <div class="expediente-header">
                <div class="expediente-info">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=D6A848&color=192A56&size=54">
                    <div>
                        <h3>${nombre}</h3>
                        <p>Grupo: <strong>${grupo}</strong> | Matrícula: <strong>${matricula}</strong></p>
                    </div>
                </div>
                <div class="expediente-badge">${pctHtml}</div>
            </div>
            
            <div class="expediente-filtros">
                <div class="filtro-fecha">
                    <label>Materia:</label>
                    <select id="exp-materia">${optionsMateria}</select>
                </div>
                <div class="filtro-fecha"><label>Desde:</label><input type="date" id="exp-fecha-inicio"></div>
                <div class="filtro-fecha"><label>Hasta:</label><input type="date" id="exp-fecha-fin"></div>
                <button id="btn-filtrar-exp" class="btn-filtrar-mini"><i class="fa-solid fa-filter"></i> Filtrar</button>
                <button id="btn-limpiar-exp" class="btn-limpiar-mini" title="Limpiar"><i class="fa-solid fa-rotate-right"></i></button>
            </div>
            
            <h4 class="expediente-subtitle"><i class="fa-solid fa-list-check"></i> Registros de Asistencia</h4>
            
            <div class="expediente-table-container">
                <table class="expediente-table">
                    <thead><tr><th>Fecha</th><th>Materia</th><th>Hora</th><th>Estado</th></tr></thead>
                    <tbody id="tbody-expediente"></tbody>
                </table>
            </div>
        `;

            Swal.fire({
                title: '', html: modalHtml, width: 750, showCloseButton: true, confirmButtonText: '<i class="fa-solid fa-check"></i> Entendido', confirmButtonColor: '#192A56',
                customClass: { popup: 'swal-solicitud-popup modal-expediente-fix', closeButton: 'btn-close-fix' },
                didOpen: () => {
                    cargarTablaExpediente();
                    document.getElementById('btn-filtrar-exp').addEventListener('click', () => {
                        cargarTablaExpediente(document.getElementById('exp-fecha-inicio').value, document.getElementById('exp-fecha-fin').value, document.getElementById('exp-materia').value);
                    });
                    document.getElementById('btn-limpiar-exp').addEventListener('click', () => {
                        document.getElementById('exp-fecha-inicio').value = ''; document.getElementById('exp-fecha-fin').value = ''; document.getElementById('exp-materia').value = '';
                        cargarTablaExpediente();
                    });
                }
            });

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo cargar el expediente.', 'error');
        }
    };
    }

    function initHistorialLogic() {
        var sh = document.getElementById('searchHistorial'), fe = document.getElementById('filtro-estado-historial'), th = document.getElementById('tabla-historial');
        if (!th || th.getAttribute('data-init') === '1') return; th.setAttribute('data-init', '1');
        function filtrar() { var st = sh ? sh.value.toLowerCase() : '', ef = fe ? fe.value : 'todos'; th.querySelectorAll('.historial-row').forEach(function (f) { var n = (f.getAttribute('data-nombre') || '').toLowerCase(), e = f.getAttribute('data-estado') || ''; f.style.display = (!st || n.includes(st)) && (ef === 'todos' || e === ef) ? '' : 'none'; }); }
        if (sh) sh.addEventListener('input', filtrar); if (fe) fe.addEventListener('change', filtrar);
    }

    let filtrosEstadisticasListos = false;

    async function configurarFiltrosEstadisticas() {
        if (filtrosEstadisticasListos) return;

        const selectTrimestre = document.getElementById('filtro-trimestre');
        const selectAnio = document.getElementById('filtro-anio');
        if (!selectTrimestre || !selectAnio) return;

        try {
            const data = await apiPrefectura('obtener_configuracion');
            const conf = data.configuracion || {};
            const periodos = [
                { valor: '1', inicio: conf.trim1_inicio, fin: conf.trim1_fin },
                { valor: '2', inicio: conf.trim2_inicio, fin: conf.trim2_fin },
                { valor: '3', inicio: conf.trim3_inicio, fin: conf.trim3_fin }
            ];
            const hoy = new Date();
            let trimestreActivo = '3';
            let anioActivo = hoy.getFullYear();

            selectTrimestre.innerHTML = periodos.map(p => {
                const inicio = p.inicio ? new Date(`${p.inicio}T00:00:00`) : null;
                const fin = p.fin ? new Date(`${p.fin}T23:59:59`) : null;
                if (inicio && fin && hoy >= inicio && hoy <= fin) {
                    trimestreActivo = p.valor;
                    anioActivo = fin.getFullYear();
                }
                const etiquetaRango = p.inicio && p.fin ? ` (${p.inicio} al ${p.fin})` : '';
                return `<option value="${p.valor}">${p.valor}° Trimestre${etiquetaRango}</option>`;
            }).join('');

            selectTrimestre.value = trimestreActivo;
            if (![...selectAnio.options].some(opt => opt.value === String(anioActivo))) {
                selectAnio.insertAdjacentHTML('beforeend', `<option value="${anioActivo}">${anioActivo}</option>`);
            }
            selectAnio.value = String(anioActivo);
        } catch (error) {
            console.error('Error al configurar filtros de estadisticas:', error);
        } finally {
            filtrosEstadisticasListos = true;
        }
    }

    // === CARGAR ESTADÍSTICAS DESDE LA BD ===
    async function cargarEstadisticas() {
        try {
            await configurarFiltrosEstadisticas();
            const trimestre = document.getElementById('filtro-trimestre').value || 3;
            const anio = document.getElementById('filtro-anio').value || new Date().getFullYear();

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

    window.verDetalleEstadisticas = async function (grupo, trimestre, anio) {
        // Mostrar modal de carga mientras buscamos en la BD
        Swal.fire({
            title: 'Analizando registros...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            // Petición real al backend
            const data = await apiPrefectura('obtener_riesgo_grupo', {
                query: { grupo: grupo, trimestre: trimestre, anio: anio }
            });

            let trs = '';

            // Si no hay alumnos en riesgo (todos tienen más de 85%)
            if (!data.alumnos || data.alumnos.length === 0) {
                trs = `<tr><td colspan="4" style="text-align:center; padding:25px; color:#10B981; font-weight:bold;"><i class="fa-solid fa-check-circle"></i> ¡Excelente! No hay alumnos en riesgo crítico en este grupo.</td></tr>`;
            } else {
                // Dibujamos las filas dinámicamente con los datos de la BD
                data.alumnos.forEach(a => {
                    const pct = parseFloat(a.pct_asistencia);
                    const colorPill = pct < 80 ? 'danger' : 'warning';
                    const colorBg = pct < 80 ? 'background:#FEE2E2; color:#991B1B;' : 'background:#FEF3C7; color:#92400E;';

                    trs += `
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                        <td style="padding: 8px;">
                            <strong>${prefecturaEscapeHTML(a.alumno)}</strong><br>
                            <span style="color:#64748B; font-size:11px;">Tutor: ${prefecturaEscapeHTML(a.telefono_tutor || 'No registrado')}</span>
                        </td>
                        <td style="padding: 8px; text-align:center; color:#EF4444; font-weight:bold;">${a.total_faltas}</td>
                        <td style="padding: 8px; text-align:center;">
                            <span style="${colorBg} padding:2px 6px; border-radius:4px;">${pct}%</span>
                        </td>
                        <td style="padding: 8px; text-align:center;">
                            <button onclick="abrirExpedienteAlumno('${a.matricula_escolar}', '${prefecturaEscapeAttr(a.alumno)}', '${grupo}', '<span class=\\'badge ${colorPill}\\'>${pct}%</span>')" class="btn-link" style="color:#192A56; text-decoration:underline; border:none; background:none; cursor:pointer;">
                                Ver Expediente
                            </button>
                        </td>
                    </tr>`;
                });
            }

            const modalHtml = `
                <div style="text-align: left;">
                    <div style="background: #FEF9F0; border-left: 4px solid #F59E0B; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                        <h4 style="margin:0 0 5px 0; color: #92400E; font-size:14px;"><i class="fa-solid fa-triangle-exclamation"></i> Alerta Académica</h4>
                        <p style="margin:0; font-size:13px; color: #B45309;">
                            Se muestran los alumnos con un porcentaje de asistencia inferior al 85% en el ${trimestre}º Trimestre.
                        </p>
                    </div>
                    
                    <h4 style="margin-bottom: 10px; color:#192A56;"><i class="fa-solid fa-users"></i> Alumnos en Riesgo</h4>
                    
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size:13px;">
                        <thead>
                            <tr style="background: #192A56; color: white;">
                                <th style="padding: 8px;">Alumno</th>
                                <th style="padding: 8px; text-align:center;">Faltas</th>
                                <th style="padding: 8px; text-align:center;">% Asist.</th>
                                <th style="padding: 8px; text-align:center;">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${trs}
                        </tbody>
                    </table>
                </div>
            `;

            Swal.fire({
                title: `Análisis de Asistencia - ${grupo}`,
                html: modalHtml,
                width: 700,
                showCloseButton: true,
                confirmButtonText: 'Cerrar Panel',
                confirmButtonColor: '#192A56',
                customClass: { popup: 'swal-solicitud-popup' }
            });

        } catch (error) {
            console.error("Error al obtener alumnos en riesgo:", error);
            Swal.fire('Error', 'No se pudieron cargar los datos de riesgo.', 'error');
        }
    };

    // =========================================================
    // EXPORTAR ESTADÍSTICAS A PDF
    // =========================================================
    window.descargarReporteGeneral = function () {
        const selectTrim = document.getElementById('filtro-trimestre');
        const trimestreStr = selectTrim.options[selectTrim.selectedIndex].text;
        const anio = document.getElementById('filtro-anio').value;
        const tbody = document.querySelector('#tabla-estadisticas-grupos tbody');

        if (!tbody || tbody.querySelectorAll('tr').length === 0 || tbody.innerText.includes('No hay registros')) {
            Swal.fire({ title: 'Sin datos', text: 'No hay estadísticas para exportar en este periodo.', icon: 'warning', confirmButtonColor: '#192A56' });
            return;
        }

        // 1. Clonar la tabla para manipularla sin alterar la vista original
        const tablaClon = document.getElementById('tabla-estadisticas-grupos').cloneNode(true);

        // 2. Limpiar la tabla clonada (quitar la última columna de "Acción")
        const ths = tablaClon.querySelectorAll('th');
        if (ths.length > 0) ths[ths.length - 1].remove(); // Quita el TH "Acción"

        const trs = tablaClon.querySelectorAll('tr');
        trs.forEach(tr => {
            if (tr.children.length > 0) {
                tr.removeChild(tr.lastElementChild); // Quita el TD del botón "Ver detalle"
            }
        });

        const tablaHTML = tablaClon.outerHTML;

        // 3. Crear el formato del documento de impresión
        const c = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte de Asistencia</title>
        <style>
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: 'Inter', sans-serif, Arial; padding: 20px; color: #1E293B; background: #fff; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #E2E8F0; }
            th { background-color: #192A56 !important; color: #ffffff !important; padding: 10px; font-size: 12px; text-transform: uppercase; border: 1px solid #334155; }
            td { padding: 8px; border: 1px solid #E2E8F0; text-align: center; font-size: 12px; }
            .header { text-align: center; border-bottom: 2px solid #D6A848; margin-bottom: 20px; padding-bottom: 10px; }
            .header h2 { margin: 0 0 5px 0; color: #192A56; }
            .header p { margin: 0; color: #64748B; font-size: 14px; font-weight: bold; }
            .text-success { color: #10B981 !important; font-weight: bold; }
            .text-danger { color: #EF4444 !important; font-weight: bold; }
            .porcentaje.high { background-color: #D1FAE5 !important; color: #065F46 !important; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
            .porcentaje.medium { background-color: #FEF3C7 !important; color: #92400E !important; padding: 2px 6px; border-radius: 4px; font-weight: bold;}
            .porcentaje.low { background-color: #FEE2E2 !important; color: #991B1B !important; padding: 2px 6px; border-radius: 4px; font-weight: bold;}
            .text-muted-small { color: #94A3B8; font-size: 11px; }
            @media print {
                body { padding: 0; margin: 0; }
                @page { margin: 1.5cm; }
            }
        </style></head><body>
        <div class="header">
            <h2>Esc.Sec.Gral. Lic. "Benito Juarez"</h2>
            <p>Reporte Estadístico de Asistencia Escolar</p>
            <p style="font-weight: normal; margin-top:5px;">Periodo evaluado: ${trimestreStr} del ${anio}</p>
        </div>
        ${tablaHTML}
        </body></html>`;

        // 4. Lanzar el modal de pre-visualización
        Swal.fire({
            title: 'Vista Previa del Reporte',
            html: `<iframe id="frame-reporte-pdf" style="width:100%; height:450px; border:1px solid #E2E8F0; border-radius:8px; background:#fff;"></iframe>`,
            width: 850,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-print"></i> Imprimir / Guardar PDF',
            cancelButtonText: 'Cerrar',
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#64748B',
            customClass: { popup: 'swal-solicitud-popup' },
            didOpen: () => {
                const iframe = document.getElementById('frame-reporte-pdf');
                const doc = iframe.contentWindow.document;
                doc.open();
                doc.write(c);
                doc.close();
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const iframe = document.getElementById('frame-reporte-pdf');
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }
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
    var btnRiesgo = document.getElementById('menu-alumnos-riesgo');
    var searchInput = document.getElementById('searchPersona');
    var tablaAlumnos = document.getElementById('tabla-alumnos');
    var tablaDocentes = document.getElementById('tabla-docentes');
    var isRiesgoFilter = false; // Variable para saber si estamos viendo solo riesgos

    // --- NUEVO CÓDIGO: Cargar grupos dinámicamente y Gestionarlos ---
    async function cargarGruposSidebar() {
        try {
            const data = await apiPrefectura('listar_grupos');
            const listaGrupos = document.getElementById('filtro-grupos');

            if (listaGrupos && data && data.grupos) {
                // Guardamos el botón de "Todos los grupos" (el primero)
                const todosLi = listaGrupos.firstElementChild.outerHTML;

                // --- NUEVA LÓGICA DE ORDENAMIENTO ---
                // Normalizamos los símbolos (º y °) en el aire para que JS los ordene perfectamente
                const gruposOrdenados = data.grupos.sort((a, b) => {
                    const nombreA = a.nombre.replace(/º/g, '°').toLowerCase().trim();
                    const nombreB = b.nombre.replace(/º/g, '°').toLowerCase().trim();
                    return nombreA.localeCompare(nombreB);
                });

                // Generamos los botones <li> usando el arreglo ya ordenado
                const gruposHTML = gruposOrdenados.map(g => {
                    const grupoLimpio = prefecturaEscapeHTML(g.nombre);
                    const idGrupo = g.id_grupo;
                    return `
                    <li style="display: flex; align-items: center; justify-content: space-between; padding-right: 5px;">
                        <a href="#" data-group="${prefecturaEscapeAttr(g.nombre)}" class="filter-link" style="flex: 1;">Grupo ${grupoLimpio}</a>
                        <button class="btn-eliminar-grupo" data-id="${idGrupo}" data-nombre="${grupoLimpio}" title="Eliminar Grupo" style="background: none; border: none; color: #EF4444; cursor: pointer; padding: 5px; opacity: 0.7; transition: 0.2s;">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </li>`;
                }).join('');

                // Botón para crear un nuevo grupo
                const btnAgregarHTML = `
                    <li style="margin-top: 15px; padding: 0 10px;">
                        <button id="btn-agregar-grupo" style="background: #D6A848; color: #192A56; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 700; width: 100%; transition: all 0.2s;">
                            <i class="fa-solid fa-plus"></i> Nuevo Grupo
                        </button>
                    </li>
                `;

                // Insertamos todo en el UL
                listaGrupos.innerHTML = todosLi + gruposHTML + btnAgregarHTML;

                // Asignamos los eventos
                asignarEventosFiltrosGrupos();
                asignarEventosGestionGrupos();
            }
        } catch (error) {
            console.error("Error al cargar grupos en el sidebar:", error);
        }
    }

    // --- FUNCIÓN PARA AGREGAR Y ELIMINAR GRUPOS ---
    function asignarEventosGestionGrupos() {
        // Evento: Crear Grupo
        const btnAgregar = document.getElementById('btn-agregar-grupo');
        if (btnAgregar) {
            btnAgregar.addEventListener('click', async function (e) {
                e.preventDefault();
                const { value: nombreGrupo } = await Swal.fire({
                    title: 'Crear Nuevo Grupo',
                    input: 'text',
                    inputLabel: 'Nombre del grupo (Ej. 1º C)',
                    inputPlaceholder: 'Escribe el nombre...',
                    showCancelButton: true,
                    confirmButtonText: 'Crear Grupo',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#192A56',
                    cancelButtonColor: '#64748B',
                    customClass: { popup: 'swal-solicitud-popup' },
                    inputValidator: (value) => {
                        if (!value) return 'El nombre no puede estar vacío';
                    }
                });

                if (nombreGrupo) {
                    try {
                        await apiPrefectura('crear_grupo', { method: 'POST', body: { nombre: nombreGrupo } });
                        Swal.fire({ title: '¡Creado!', text: 'El grupo fue añadido exitosamente.', icon: 'success', confirmButtonColor: '#192A56', timer: 1500 });
                        cargarGruposSidebar(); // Refrescar la lista
                        cargarFiltrosExportacion(); // Refrescar filtros en Exportar
                    } catch (error) {
                        Swal.fire({ title: 'Error', text: error.message, icon: 'error', confirmButtonColor: '#192A56' });
                    }
                }
            });
        }

        // Eventos: Eliminar Grupo
        const btnsEliminar = document.querySelectorAll('.btn-eliminar-grupo');
        btnsEliminar.forEach(btn => {
            // Efecto hover sutil
            btn.addEventListener('mouseenter', function () { this.style.opacity = '1'; this.style.transform = 'scale(1.1)'; });
            btn.addEventListener('mouseleave', function () { this.style.opacity = '0.7'; this.style.transform = 'scale(1)'; });

            btn.addEventListener('click', function (e) {
                e.stopPropagation(); // Evita que se seleccione el filtro del grupo
                const idGrupo = this.getAttribute('data-id');
                const nombreGrupo = this.getAttribute('data-nombre');

                Swal.fire({
                    title: '¿Eliminar Grupo?',
                    text: `Estás a punto de eliminar el Grupo ${nombreGrupo}. Esta acción no se puede deshacer.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#EF4444',
                    cancelButtonColor: '#64748B',
                    confirmButtonText: '<i class="fa-solid fa-trash"></i> Sí, eliminar',
                    cancelButtonText: 'Cancelar',
                    customClass: { popup: 'swal-solicitud-popup' }
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            await apiPrefectura('eliminar_grupo', { method: 'POST', body: { id_grupo: idGrupo } });
                            Swal.fire({ title: '¡Eliminado!', text: 'El grupo ha sido borrado.', icon: 'success', confirmButtonColor: '#192A56', timer: 1500 });

                            // Si el grupo eliminado era el que estaba activo, volvemos a "Todos los grupos"
                            const linkActivo = document.querySelector('.filter-link.active');
                            if (linkActivo && linkActivo.getAttribute('data-group') === nombreGrupo) {
                                document.querySelector('.filter-link[data-group="all"]').click();
                            }

                            cargarGruposSidebar(); // Refrescar la lista
                            cargarFiltrosExportacion(); // Refrescar filtros en Exportar
                        } catch (error) {
                            Swal.fire({ title: 'No se puede eliminar', text: error.message, icon: 'error', confirmButtonColor: '#192A56' });
                        }
                    }
                });
            });
        });
    }

    // --- FUNCIÓN PARA AGREGAR Y ELIMINAR GRUPOS ---
    function asignarEventosGestionGrupos() {
        // Evento: Crear Grupo
        const btnAgregar = document.getElementById('btn-agregar-grupo');
        if (btnAgregar) {
            btnAgregar.addEventListener('click', async function (e) {
                e.preventDefault();
                const { value: nombreGrupo } = await Swal.fire({
                    title: 'Crear Nuevo Grupo',
                    input: 'text',
                    inputLabel: 'Nombre del grupo (Ej. 1º C)',
                    inputPlaceholder: 'Escribe el nombre...',
                    showCancelButton: true,
                    confirmButtonText: 'Crear Grupo',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#192A56',
                    cancelButtonColor: '#64748B',
                    customClass: { popup: 'swal-solicitud-popup' },
                    inputValidator: (value) => {
                        if (!value) return 'El nombre no puede estar vacío';
                    }
                });

                if (nombreGrupo) {
                    try {
                        await apiPrefectura('crear_grupo', { method: 'POST', body: { nombre: nombreGrupo } });
                        Swal.fire({ title: '¡Creado!', text: 'El grupo fue añadido exitosamente.', icon: 'success', confirmButtonColor: '#192A56', timer: 1500 });

                        cargarGruposSidebar(); // Refrescar la lista de grupos lateral

                        // Vaciar la lista de Exportar para obligar a que se recargue cuando el usuario vaya allá
                        const exportGrupos = document.getElementById('lista-grupos-exportar');
                        if (exportGrupos) exportGrupos.innerHTML = '';

                    } catch (error) {
                        Swal.fire({ title: 'Error', text: error.message, icon: 'error', confirmButtonColor: '#192A56' });
                    }
                }
            });
        }

        // Eventos: Eliminar Grupo
        const btnsEliminar = document.querySelectorAll('.btn-eliminar-grupo');
        btnsEliminar.forEach(btn => {
            // Efecto hover sutil
            btn.addEventListener('mouseenter', function () { this.style.opacity = '1'; this.style.transform = 'scale(1.1)'; });
            btn.addEventListener('mouseleave', function () { this.style.opacity = '0.7'; this.style.transform = 'scale(1)'; });

            btn.addEventListener('click', function (e) {
                e.stopPropagation(); // Evita que se seleccione el filtro del grupo
                const idGrupo = this.getAttribute('data-id');
                const nombreGrupo = this.getAttribute('data-nombre');

                Swal.fire({
                    title: '¿Eliminar Grupo?',
                    text: `Estás a punto de eliminar el Grupo ${nombreGrupo}. Esta acción no se puede deshacer.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#EF4444',
                    cancelButtonColor: '#64748B',
                    confirmButtonText: '<i class="fa-solid fa-trash"></i> Sí, eliminar',
                    cancelButtonText: 'Cancelar',
                    customClass: { popup: 'swal-solicitud-popup' }
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            await apiPrefectura('eliminar_grupo', { method: 'POST', body: { id_grupo: idGrupo } });
                            Swal.fire({ title: '¡Eliminado!', text: 'El grupo ha sido borrado.', icon: 'success', confirmButtonColor: '#192A56', timer: 1500 });

                            // Si el grupo eliminado era el que estaba activo, volvemos a "Todos los grupos"
                            const linkActivo = document.querySelector('.filter-link.active');
                            if (linkActivo && linkActivo.getAttribute('data-group') === nombreGrupo) {
                                document.querySelector('.filter-link[data-group="all"]').click();
                            }

                            cargarGruposSidebar(); // Refrescar la lista de grupos lateral

                            // Vaciar la lista de Exportar para obligar a que se recargue
                            const exportGrupos = document.getElementById('lista-grupos-exportar');
                            if (exportGrupos) exportGrupos.innerHTML = '';

                        } catch (error) {
                            Swal.fire({ title: 'No se puede eliminar', text: error.message, icon: 'error', confirmButtonColor: '#192A56' });
                        }
                    }
                });
            });
        });
    }

    cargarGruposSidebar();

    // === CARGAR PERSONAL DESDE LA BD ===
    async function cargarPersonal() {
        try {
            const dataAlumnos = await apiPrefectura('listar_personal', { query: { rol: 'alumno' } });
            const dataDocentes = await apiPrefectura('listar_personal', { query: { rol: 'docente' } });

            const tbodyAlumnos = document.querySelector('#tabla-alumnos tbody');
            const tbodyDocentes = document.querySelector('#tabla-docentes tbody');

            if (!tbodyAlumnos || !tbodyDocentes) return;
            tbodyAlumnos.innerHTML = '';
            tbodyDocentes.innerHTML = '';

            // 2. DIBUJAR ALUMNOS CON CÁLCULO DE ASISTENCIA
            if (dataAlumnos && dataAlumnos.personal && dataAlumnos.personal.length > 0) {
                dataAlumnos.personal.forEach(p => {
                    const nombreCompleto = `${p.nombre} ${p.apellido}`;

                    // LÓGICA DE ASISTENCIA
                    let estadoEscolar = 'regular';
                    let badgeAsistencia = '';
                    const registros = parseInt(p.total_registros) || 0;
                    const asistencias = parseInt(p.total_asistencias) || 0;

                    if (registros === 0) {
                        estadoEscolar = 'sin_registro';
                        badgeAsistencia = '<span class="badge" style="background:#E2E8F0; color:#475569;"><i class="fa-solid fa-minus"></i> Sin registro</span>';
                    } else {
                        const pct = (asistencias / registros) * 100;
                        if (pct < 80) {
                            estadoEscolar = 'riesgo';
                            badgeAsistencia = `<span class="badge danger" title="${pct.toFixed(1)}% de asistencia"><i class="fa-solid fa-triangle-exclamation"></i> Riesgo (${pct.toFixed(0)}%)</span>`;
                        } else {
                            estadoEscolar = 'regular';
                            badgeAsistencia = `<span class="badge success" title="${pct.toFixed(1)}% de asistencia"><i class="fa-solid fa-check"></i> Regular (${pct.toFixed(0)}%)</span>`;
                        }
                    }

                    const filaHTML = `
                        <tr data-tipo="alumno" data-nombre="${nombreCompleto}" data-matricula="${p.matricula_escolar}" data-grupo="${p.grupo}" data-estado-escolar="${estadoEscolar}">
                            <td>
                                <div class="alumno-cell">
                                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(nombreCompleto)}&background=D6A848&color=192A56&size=36">
                                    <div><span class="alumno-name">${nombreCompleto}</span></div>
                                </div>
                            </td>
                            <td>${p.matricula_escolar || 'N/A'}</td>
                            <td>${p.grupo || 'Sin asignar'}</td>
                            <td><span class="badge info">Matutino</span></td>
                            <td>${badgeAsistencia}</td>
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
                        <tr data-tipo="docente" data-nombre="${nombreCompleto}" data-id="${p.clave_docente || p.id_usuario}" data-id-usuario="${p.id_usuario}">
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
                tbodyDocentes.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #64748B;"><i class="fa-solid fa-circle-exclamation"></i> No hay docentes registrados en la base de datos.</td></tr>';
            }

            filterTable();
        } catch (error) {
            console.error("Error al cargar personal:", error);
        }
    }

    cargarPersonal();

    function filterTable() {
        if (!tablaAlumnos) return;
        var activeRoleEl = document.querySelector('.tab-btn.active');
        var activeRole = activeRoleEl ? activeRoleEl.getAttribute('data-role') : 'alumno';
        var activeGroupEl = document.querySelector('.filter-link.active');
        var activeGroup = activeGroupEl ? activeGroupEl.getAttribute('data-group') : 'all';
        var searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

        // Forzar vista de alumnos si estamos buscando "En Riesgo"
        if (isRiesgoFilter) {
            activeRole = 'alumno';
            document.querySelector('.tab-btn[data-role="alumno"]').classList.add('active');
            document.querySelector('.tab-btn[data-role="docente"]').classList.remove('active');
        }

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
            var grupo = (fila.getAttribute('data-grupo') || '').toLowerCase().replace(/\s/g, '').replace('º', '°');
            var estadoEscolar = fila.getAttribute('data-estado-escolar') || '';
            var activeGroupNormalizado = activeGroup.toLowerCase().replace(/\s/g, '').replace('º', '°');

            var textoFila = fila.innerText.toLowerCase();
            var matchesSearch = !searchTerm || nombre.includes(searchTerm) || matricula.includes(searchTerm) || textoFila.includes(searchTerm);
            var matchesGroup = (activeRole === 'docente') || (activeGroup === 'all') || (grupo === activeGroupNormalizado);

            // Si el filtro de riesgo está activo, ignoramos el filtro de grupo y solo mostramos a los de riesgo
            var matchesRiesgo = !isRiesgoFilter || estadoEscolar === 'riesgo';

            if (matchesSearch && (isRiesgoFilter ? true : matchesGroup) && matchesRiesgo) {
                fila.style.display = '';
            } else {
                fila.style.display = 'none';
            }
        });
    }

    // --- EVENTOS DE CLIC PARA FILTROS ---

    // Clic en Pestañas (Alumnos/Docentes)
    tabButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            isRiesgoFilter = false; // Apagar filtro de riesgo
            if (btnRiesgo) btnRiesgo.classList.remove('active-danger'); // Quitar estilo rojo al botón de riesgo

            tabButtons.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            if (searchInput) searchInput.value = '';
            filterTable();
        });
    });

    // --- Clic en Grupos Laterales (Dinámicos) ---
    function asignarEventosFiltrosGrupos() {
        const filterLinksList = document.querySelectorAll('.filter-link');

        filterLinksList.forEach(function (link) {
            // Clona y reemplaza para limpiar eventos viejos y evitar duplicados
            link.replaceWith(link.cloneNode(true));
        });

        // Seleccionamos los nuevos links ya limpios
        const nuevosLinks = document.querySelectorAll('.filter-link');

        nuevosLinks.forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                isRiesgoFilter = false; // Apagar filtro de riesgo
                if (btnRiesgo) btnRiesgo.classList.remove('active-danger');

                nuevosLinks.forEach(function (l) { l.classList.remove('active'); });
                this.classList.add('active');
                filterTable();
            });
        });
    }

    // Clic en "Alumnos en Riesgo"
    if (btnRiesgo) {
        btnRiesgo.addEventListener('click', function (e) {
            e.preventDefault();
            isRiesgoFilter = true; // Activar bandera de riesgo

            // Quitar selecciones normales
            filterLinks.forEach(function (l) { l.classList.remove('active'); });

            // Añadir un estilo temporal al botón para saber que está seleccionado
            btnRiesgo.classList.add('active-danger');

            filterTable();
        });
    }

    if (searchInput) searchInput.addEventListener('input', filterTable);

    async function clickEnTabla(e) {
        var btnExp = e.target.closest('.btn-expediente') || e.target.closest('.btn-ver-expediente');

        if (btnExp) {
            e.stopPropagation();
            var fila = btnExp.closest('tr');
            var matricula = fila.getAttribute('data-matricula');
            var nombre = fila.getAttribute('data-nombre');
            var grupo = fila.getAttribute('data-grupo');
            var pctHtml = fila.querySelector('td:nth-child(5)').innerHTML;

            // ¡Mira qué limpio queda ahora! Llamamos a la función global
            abrirExpedienteAlumno(matricula, nombre, grupo, pctHtml);
        }

        // (AQUÍ TERMINA EL IF DE btnExp QUE YA TIENES)

        // --- NUEVO: Clic en el botón "Horario" del Docente ---
        var btnHorario = e.target.closest('.btn-horario') || e.target.closest('.btn-ver-horario');
        if (btnHorario) {
            e.stopPropagation();
            var fila = btnHorario.closest('tr');
            var idDocente = fila.getAttribute('data-id-usuario');
            var nombreDocente = fila.getAttribute('data-nombre');

            // Mostrar estado de carga
            Swal.fire({
                title: 'Cargando Horario...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            apiPrefectura('obtener_horario_docente', { query: { id_docente: idDocente } })
                .then(data => {
                    let trs = '';
                    if (!data.horario || data.horario.length === 0) {
                        trs = '<tr><td colspan="4" style="text-align:center; padding: 20px; color:#64748B;">No hay clases asignadas para este docente.</td></tr>';
                    } else {
                        data.horario.forEach(h => {
                            trs += `
                            <tr>
                                <td><strong><i class="fa-regular fa-calendar-days" style="color:#64748B;"></i> ${h.dia_semana}</strong></td>
                                <td><i class="fa-regular fa-clock" style="color:#64748B;"></i> ${h.hora_inicio} - ${h.hora_fin}</td>
                                <td>${h.asignatura}</td>
                                <td><span class="badge info">Grupo ${h.grupo}</span></td>
                            </tr>
                        `;
                        });
                    }

                    const modalHtml = `
                    <div class="expediente-header">
                        <div class="expediente-info">
                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(nombreDocente)}&background=192A56&color=fff&size=54">
                            <div>
                                <h3>${nombreDocente}</h3>
                                <p>Horario de Clases Asignado</p>
                            </div>
                        </div>
                    </div>
                    
                    <h4 class="expediente-subtitle" style="margin-top: 15px;"><i class="fa-solid fa-list-check"></i> Materias Asignadas</h4>
                    
                    <div class="expediente-table-container">
                        <table class="expediente-table">
                            <thead>
                                <tr><th>Día</th><th>Horario</th><th>Materia</th><th>Grupo</th></tr>
                            </thead>
                            <tbody>
                                ${trs}
                            </tbody>
                        </table>
                    </div>
                `;

                    Swal.fire({
                        title: '',
                        html: modalHtml,
                        width: 750,
                        showCloseButton: true,
                        confirmButtonText: '<i class="fa-solid fa-check"></i> Cerrar',
                        confirmButtonColor: '#192A56',
                        customClass: {
                            popup: 'swal-solicitud-popup modal-expediente-fix',
                            closeButton: 'btn-close-fix'
                        }
                    });
                })
                .catch(err => {
                    console.error(err);
                    Swal.fire('Error', 'No se pudo cargar el horario del docente.', 'error');
                });
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

    // 1. Cargar configuración actual al abrir la pestaña
    async function cargarConfiguracion() {
        try {
            const data = await apiPrefectura('obtener_configuracion');
            if (data && data.configuracion) {
                const conf = data.configuracion;
                if (document.getElementById('limite-dias')) document.getElementById('limite-dias').value = conf.limite_justificacion_dias;
                if (document.getElementById('nombre-director')) document.getElementById('nombre-director').value = conf.nombre_director || '';
                if (document.getElementById('ciclo-activo')) document.getElementById('ciclo-activo').value = conf.ciclo_activo;

                if (document.getElementById('trim1-inicio')) document.getElementById('trim1-inicio').value = conf.trim1_inicio;
                if (document.getElementById('trim1-fin')) document.getElementById('trim1-fin').value = conf.trim1_fin;
                if (document.getElementById('trim2-inicio')) document.getElementById('trim2-inicio').value = conf.trim2_inicio;
                if (document.getElementById('trim2-fin')) document.getElementById('trim2-fin').value = conf.trim2_fin;
                if (document.getElementById('trim3-inicio')) document.getElementById('trim3-inicio').value = conf.trim3_inicio;
                if (document.getElementById('trim3-fin')) document.getElementById('trim3-fin').value = conf.trim3_fin;
            }
        } catch (error) {
            console.error("Error al cargar configuración:", error);
        }
    }

    cargarConfiguracion();

    // 2. Guardar la configuración en la base de datos
    window.guardarConfiguracionSistema = async function () {
        const datos = {
            limite_dias: document.getElementById('limite-dias') ? document.getElementById('limite-dias').value : '3',
            nombre_director: document.getElementById('nombre-director') ? document.getElementById('nombre-director').value.trim() : '',
            ciclo_activo: document.getElementById('ciclo-activo') ? document.getElementById('ciclo-activo').value : '2025-2026',
            trim1_inicio: document.getElementById('trim1-inicio') ? document.getElementById('trim1-inicio').value : '',
            trim1_fin: document.getElementById('trim1-fin') ? document.getElementById('trim1-fin').value : '',
            trim2_inicio: document.getElementById('trim2-inicio') ? document.getElementById('trim2-inicio').value : '',
            trim2_fin: document.getElementById('trim2-fin') ? document.getElementById('trim2-fin').value : '',
            trim3_inicio: document.getElementById('trim3-inicio') ? document.getElementById('trim3-inicio').value : '',
            trim3_fin: document.getElementById('trim3-fin') ? document.getElementById('trim3-fin').value : ''
        };

        try {
            Swal.fire({
                title: 'Guardando...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            await apiPrefectura('actualizar_configuracion', { method: 'POST', body: datos });
            window.configuracionSistemaActual = null;
            if (typeof window.obtenerConfiguracionSistema === 'function') {
                const config = await window.obtenerConfiguracionSistema();
                if (typeof window.aplicarConfiguracionSistema === 'function') window.aplicarConfiguracionSistema(config);
            }

            Swal.fire({
                title: '¡Configuración Guardada!',
                text: 'Los cambios se han aplicado exitosamente en la base de datos.',
                icon: 'success',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#192A56'
            });
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    }
}

// ==========================================================
// CONFIGURACIÓN DE LA NAVEGACIÓN SUPERIOR (PREFECTURA)
// ==========================================================
const navItemsTop = document.querySelectorAll('.header-nav .nav-item');
navItemsTop.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault(); // Evita saltos en la página
        const seccion = item.getAttribute('data-section');
        if (seccion) {
            loadSection(seccion);
        }
    });
});
