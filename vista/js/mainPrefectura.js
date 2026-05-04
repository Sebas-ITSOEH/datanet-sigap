/**
 * mainPrefectura.js - Panel de Prefectura con conexión a backend
 */

document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    const viewContainer = document.getElementById('view-container');

    async function loadSection(sectionName) {
        if (!sectionName) return;
        try {
            const response = await fetch('../vista/prefectura/' + sectionName + '.html');
            if (!response.ok) throw new Error('No se encontró: ' + sectionName + '.html');
            const html = await response.text();
            viewContainer.innerHTML = html;
            viewContainer.classList.remove('fade-in');
            void viewContainer.offsetWidth;
            viewContainer.classList.add('fade-in');
            
            if (sectionName === 'bienvenida') initBienvenidaLogic();
            else if (sectionName === 'control') initControlLogic();
            else if (sectionName === 'personal') initPersonalLogic();
            else if (sectionName === 'sistema') initSistemaLogic();
        } catch (error) {
            console.error('Error:', error);
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            loadSection(this.getAttribute('data-section'));
        });
    });

    loadSection('bienvenida');

    const logoBox = document.querySelector('.logo-box');
    if (logoBox) {
        logoBox.parentElement.addEventListener('click', function() {
            navItems.forEach(i => i.classList.remove('active'));
            loadSection('bienvenida');
        });
    }
});

// ==========================================
// Navegación global
// ==========================================
function navigateToSection(sectionName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionName) item.classList.add('active');
    });
    const viewContainer = document.getElementById('view-container');
    if (viewContainer) {
        fetch('../vista/prefectura/' + sectionName + '.html')
            .then(r => r.text())
            .then(html => {
                viewContainer.innerHTML = html;
                viewContainer.classList.add('fade-in');
                if (sectionName === 'bienvenida') initBienvenidaLogic();
                else if (sectionName === 'control') initControlLogic();
                else if (sectionName === 'personal') initPersonalLogic();
                else if (sectionName === 'sistema') initSistemaLogic();
            });
    }
}

// ==========================================
// SECCIÓN BIENVENIDA
// ==========================================
function initBienvenidaLogic() {
    updateGreeting();
    updateDate();
}

function updateGreeting() {
    const greetingElement = document.getElementById('saludo-horario');
    if (!greetingElement) return;
    const hour = new Date().getHours();
    let greeting, icon;
    if (hour >= 6 && hour < 12) { greeting = '¡Buenos días!'; icon = 'fa-sun'; }
    else if (hour >= 12 && hour < 18) { greeting = '¡Buenas tardes!'; icon = 'fa-cloud-sun'; }
    else { greeting = '¡Buenas noches!'; icon = 'fa-moon'; }
    greetingElement.innerHTML = `<i class="fa-solid ${icon}"></i> ${greeting}`;
}

function updateDate() {
    const dateElement = document.getElementById('fecha-actual');
    if (!dateElement) return;
    const now = new Date();
    dateElement.textContent = now.toLocaleDateString('es-MX', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
}

// ==========================================
// SECCIÓN CONTROL (JUSTIFICANTES)
// ==========================================
function initControlLogic() {
    console.log('Panel de Control inicializado');
    const subNavItems = document.querySelectorAll('.sub-nav-item');
    const sections = document.querySelectorAll('.control-view');
    const searchAlumno = document.getElementById('searchAlumno');
    const filtroGrupo = document.getElementById('filtro-grupo');
    const filtroMotivo = document.getElementById('filtro-motivo');

    // Cambio de subvista
    function switchSubView(targetId) {
        sections.forEach(s => s.classList.add('hidden'));
        const target = document.getElementById(targetId);
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('fade-in');
        }
        subNavItems.forEach(b => b.classList.remove('active'));
        document.querySelector(`.sub-nav-item[data-target="${targetId}"]`)?.classList.add('active');
        if (targetId === 'section-historial') cargarHistorial();
    }

    subNavItems.forEach(btn => {
        btn.addEventListener('click', () => switchSubView(btn.getAttribute('data-target')));
    });

    // Cargar bandeja pendientes
    cargarBandeja();

    // Búsqueda y filtros locales
    if (searchAlumno) searchAlumno.addEventListener('input', aplicarFiltrosLocales);
    if (filtroGrupo) filtroGrupo.addEventListener('change', aplicarFiltrosLocales);
    if (filtroMotivo) filtroMotivo.addEventListener('change', aplicarFiltrosLocales);
}

async function cargarBandeja() {
    try {
        const response = await fetch('../controlador/prefecto.php?accion=justificantes_pendientes');
        const data = await response.json();
        if (!data.ok) throw new Error(data.mensaje);
        renderizarBandeja(data.pendientes);
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudieron cargar las solicitudes.', 'error');
    }
}

function renderizarBandeja(solicitudes) {
    const tbody = document.querySelector('#tabla-solicitudes tbody');
    if (!tbody) return;
    tbody.innerHTML = solicitudes.map(s => {
        const estadoTag = s.estado;
        return `
        <tr class="solicitud-row" 
            data-id="${s.id_justificante}"
            data-nombre="${s.alumno}"
            data-grupo="${s.grupo ?? ''}"
            data-matricula="${s.matricula_escolar ?? ''}"
            data-tutor="${s.tutor ?? ''}"
            data-telefono-tutor="${s.telefono_tutor ?? ''}"
            data-motivo="${s.asunto}"
            data-descripcion="${s.descripcion ?? ''}"
            data-fecha="${s.fecha_solicitud?.split(' ')[0] ?? ''}"
            data-estado="${s.estado}">
            <td>
                <div class="alumno-cell">
                    <div class="avatar-wrapper">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(s.alumno)}&background=D6A848&color=192A56&size=36">
                    </div>
                    <div class="alumno-details">
                        <span class="alumno-name">${s.alumno}</span>
                        <span class="alumno-matricula">Matrícula: ${s.matricula_escolar ?? 'N/A'}</span>
                    </div>
                </div>
            </td>
            <td><span class="grupo-tag">${s.grupo ?? '-'}</span></td>
            <td><span class="motivo-tag salud">${s.asunto}</span></td>
            <td><div class="fecha-cell"><span class="fecha">${s.fecha_solicitud?.split(' ')[0] ?? ''}</span></div></td>
            <td><span class="estado-tag ${s.estado}">${s.estado.charAt(0).toUpperCase()+s.estado.slice(1)}</span></td>
            <td>
                <div class="acciones-cell">
                    ${s.estado === 'pendiente' ? `
                        <button class="btn-accion aprobar" onclick="responderJustificante(event, ${s.id_justificante}, 'aprobado')"><i class="fa-solid fa-check"></i></button>
                        <button class="btn-accion rechazar" onclick="responderJustificante(event, ${s.id_justificante}, 'rechazado')"><i class="fa-solid fa-xmark"></i></button>
                    ` : ''}
                    <button class="btn-accion detalle" onclick="mostrarDetalleJustificante(${s.id_justificante})"><i class="fa-solid fa-eye"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
    aplicarFiltrosLocales();
}

function aplicarFiltrosLocales() {
    const search = (document.getElementById('searchAlumno')?.value || '').toLowerCase();
    const grupo = document.getElementById('filtro-grupo')?.value || 'todos';
    const motivo = document.getElementById('filtro-motivo')?.value || 'todos';

    document.querySelectorAll('#tabla-solicitudes tbody .solicitud-row').forEach(row => {
        const nombre = (row.getAttribute('data-nombre') || '').toLowerCase();
        const mat = (row.getAttribute('data-matricula') || '').toLowerCase();
        const g = row.getAttribute('data-grupo') || '';
        const m = row.getAttribute('data-motivo') || '';
        const visible = (!search || nombre.includes(search) || mat.includes(search))
            && (grupo === 'todos' || g === grupo)
            && (motivo === 'todos' || m.toLowerCase() === motivo.toLowerCase());
        row.style.display = visible ? '' : 'none';
    });
}

async function responderJustificante(event, idJustificante, estado) {
    event.stopPropagation();
    try {
        const res = await fetch('../controlador/prefecto.php?accion=responder_justificante', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id_justificante: idJustificante, estado})
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        Swal.fire('Éxito', `Justificante ${estado}`, 'success');
        cargarBandeja();
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

function mostrarDetalleJustificante(id) {
    // Se puede implementar una llamada para obtener el detalle completo (aún no existe endpoint, se deja como ejemplo)
    Swal.fire('Detalle', 'Funcionalidad en desarrollo.', 'info');
}

// ==========================================
// HISTORIAL
// ==========================================
async function cargarHistorial() {
    try {
        const res = await fetch('../controlador/prefecto.php?accion=historial_justificantes');
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        renderizarHistorial(data.historial);
    } catch (error) {
        console.error(error);
    }
}

function renderizarHistorial(historial) {
    const tbody = document.querySelector('#tabla-historial tbody');
    if (!tbody) return;
    tbody.innerHTML = historial.map(h => `
        <tr class="solicitud-row historial-row" data-id="${h.id_justificante}" data-estado="${h.estado}">
            <td>
                <div class="alumno-cell">
                    <div class="avatar-wrapper">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(h.alumno)}&background=192A56&color=fff&size=36">
                    </div>
                    <div class="alumno-details">
                        <span class="alumno-name">${h.alumno}</span>
                        <span class="alumno-matricula">Matrícula: ${h.matricula_escolar ?? ''}</span>
                    </div>
                </div>
            </td>
            <td><span class="grupo-tag">${h.grupo ?? '-'}</span></td>
            <td><span class="motivo-tag">${h.asunto}</span></td>
            <td><div class="fecha-cell"><span class="fecha">${h.fecha_solicitud?.split(' ')[0] ?? ''}</span></div></td>
            <td><span class="estado-tag ${h.estado}">${h.estado.charAt(0).toUpperCase()+h.estado.slice(1)}</span></td>
            <td>${h.resuelto_por ?? '—'}</td>
            <td>${h.estado === 'aprobado' ? '<button class="btn-descargar-permiso" onclick="descargarPermisoDesdeBoton(this)"><i class="fa-solid fa-file-pdf"></i> PDF</button>' : 'N/A'}</td>
        </tr>
    `).join('');
    document.getElementById('tabla-historial')?.setAttribute('data-init', '1');
}

// ==========================================
// SECCIÓN PERSONAL (ALUMNOS Y DOCENTES)
// ==========================================
function initPersonalLogic() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const filterLinks = document.querySelectorAll('.filter-link');
    const searchInput = document.getElementById('searchPersona');
    let rolActual = 'alumno'; // 'alumno' o 'docente'

    async function cargarLista(grupo = 'all') {
        try {
            const endpoint = rolActual === 'alumno' 
                ? `../controlador/prefecto.php?accion=listar_alumnos&grupo=${grupo}`
                : `../controlador/prefecto.php?accion=listar_docentes`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (!data.ok) throw new Error(data.mensaje);
            if (rolActual === 'alumno') renderizarAlumnos(data.alumnos);
            else renderizarDocentes(data.docentes);
            aplicarFiltroLocalPersonal();
        } catch (error) {
            console.error(error);
        }
    }

    function renderizarAlumnos(alumnos) {
        const tbody = document.querySelector('#tabla-alumnos tbody');
        if (!tbody) return;
        tbody.innerHTML = alumnos.map(a => `
            <tr data-tipo="alumno" data-grupo="${a.grupo ?? ''}" data-nombre="${a.nombre_completo}" data-matricula="${a.matricula_escolar}" data-estado="${a.estado}">
                <td>
                    <div class="alumno-cell">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(a.nombre_completo)}&background=D6A848&color=192A56&size=36">
                        <div><span class="alumno-name">${a.nombre_completo}</span></div>
                    </div>
                </td>
                <td>${a.matricula_escolar ?? ''}</td>
                <td>${a.grupo ?? '-'}</td>
                <td><span class="badge info">Matutino</span></td>
                <td><span class="badge ${a.estado === 'riesgo'?'warning':'success'}">${a.estado === 'riesgo'?'Riesgo':'Regular'}</span></td>
                <td><button class="btn-expediente btn-ver-expediente"><i class="fa-solid fa-folder-open"></i> Expediente</button></td>
            </tr>
        `).join('');
    }

    function renderizarDocentes(docentes) {
        const tbody = document.querySelector('#tabla-docentes tbody');
        if (!tbody) return;
        tbody.innerHTML = docentes.map(d => `
            <tr data-tipo="docente" data-nombre="${d.nombre_completo}" data-id="${d.id_usuario}" data-estado="${d.estado}">
                <td>
                    <div class="alumno-cell">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(d.nombre_completo)}&background=192A56&color=fff&size=36">
                        <div><span class="alumno-name">${d.nombre_completo}</span></div>
                    </div>
                </td>
                <td>DOC-${d.id_usuario.toString().padStart(4,'0')}</td>
                <td>—</td>
                <td><span class="badge info">—</span></td>
                <td><span class="badge success">Activo</span></td>
                <td><button class="btn-horario btn-ver-horario"><i class="fa-solid fa-calendar-days"></i> Horario</button></td>
            </tr>
        `).join('');
    }

    function aplicarFiltroLocalPersonal() {
        const search = (searchInput?.value || '').toLowerCase();
        const tabla = rolActual === 'alumno' ? '#tabla-alumnos' : '#tabla-docentes';
        document.querySelectorAll(`${tabla} tbody tr`).forEach(row => {
            const nombre = (row.getAttribute('data-nombre') || '').toLowerCase();
            const matricula = (row.getAttribute('data-matricula') || row.getAttribute('data-id') || '').toLowerCase();
            const visible = !search || nombre.includes(search) || matricula.includes(search);
            row.style.display = visible ? '' : 'none';
        });
        // Aplicar filtro de grupo en alumnos
        if (rolActual === 'alumno') {
            const grupoActivo = document.querySelector('.filter-link.active')?.getAttribute('data-group') || 'all';
            document.querySelectorAll('#tabla-alumnos tbody tr').forEach(row => {
                if (grupoActivo !== 'all' && row.getAttribute('data-grupo') !== grupoActivo) {
                    row.style.display = 'none';
                }
            });
        }
    }

    // Eventos de pestañas
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            rolActual = btn.getAttribute('data-role');
            // Mostrar/ocultar tablas
            document.getElementById('tabla-alumnos').classList.toggle('hidden', rolActual !== 'alumno');
            document.getElementById('tabla-docentes').classList.toggle('hidden', rolActual !== 'docente');
            if (rolActual === 'alumno') cargarLista();
            else cargarLista();
        });
    });

    filterLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            filterLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            if (rolActual !== 'alumno') {
                tabButtons.forEach(b => b.classList.remove('active'));
                document.querySelector('.tab-btn[data-role="alumno"]').classList.add('active');
                rolActual = 'alumno';
                document.getElementById('tabla-alumnos').classList.remove('hidden');
                document.getElementById('tabla-docentes').classList.add('hidden');
            }
            cargarLista(this.getAttribute('data-group'));
        });
    });

    if (searchInput) searchInput.addEventListener('input', aplicarFiltroLocalPersonal);

    // Carga inicial
    cargarLista();
}

// ==========================================
// SECCIÓN SISTEMA (CONFIGURACIÓN)
// ==========================================
function initSistemaLogic() {
    cargarConfiguracion();
}

async function cargarConfiguracion() {
    try {
        const res = await fetch('../controlador/prefecto.php?accion=obtener_configuracion');
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        const cfg = data.configuracion;
        setValor('limite-dias', cfg.limite_dias_justificar ?? 3);
        setValor('ciclo-activo', cfg.ciclo_escolar ?? '2025-2026');
        setValor('trim1-inicio', cfg.trim1_inicio ?? '');
        setValor('trim1-fin', cfg.trim1_fin ?? '');
        setValor('trim2-inicio', cfg.trim2_inicio ?? '');
        setValor('trim2-fin', cfg.trim2_fin ?? '');
        setValor('trim3-inicio', cfg.trim3_inicio ?? '');
        setValor('trim3-fin', cfg.trim3_fin ?? '');
    } catch (error) {
        console.error(error);
    }
}

function setValor(id, valor) {
    const el = document.getElementById(id);
    if (el) el.value = valor;
}

async function guardarConfiguracionSistema() {
    const configuraciones = {
        limite_dias_justificar: document.getElementById('limite-dias')?.value,
        ciclo_escolar: document.getElementById('ciclo-activo')?.value,
        trim1_inicio: document.getElementById('trim1-inicio')?.value,
        trim1_fin: document.getElementById('trim1-fin')?.value,
        trim2_inicio: document.getElementById('trim2-inicio')?.value,
        trim2_fin: document.getElementById('trim2-fin')?.value,
        trim3_inicio: document.getElementById('trim3-inicio')?.value,
        trim3_fin: document.getElementById('trim3-fin')?.value
    };

    try {
        const res = await fetch('../controlador/prefecto.php?accion=guardar_configuracion', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({configuraciones})
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        Swal.fire('Configuración guardada', '', 'success');
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

// ==========================================
// Funciones de exportación y otras (se mantienen como ejemplo)
// ==========================================
function mostrarVistaPreviaAsistencia() {
    // Simulación – se puede reemplazar con llamada a backend
    const g = document.getElementById('export-grupo-asistencia').value;
    const m = document.getElementById('export-materia-asistencia').value;
    const s = document.getElementById('export-semana').value;
    if (!g || !m || !s) {
        Swal.fire('Selección incompleta', '', 'warning');
        return;
    }
    document.getElementById('vista-previa-asistencia').classList.remove('hidden');
    // ... (código simulado existente)
}

function descargarListaPDF() { /* ... código simulado ... */ }
function descargarListaExcel() { /* ... código simulado ... */ }
function descargarPermisoDesdeBoton(btn) { /* ... */ }
function descargarPermiso(d) { /* ... */ }
