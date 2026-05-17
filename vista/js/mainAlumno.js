/**
 * mainAlumno.js - Sistema de Gestión Escolar
 * Portal de Alumno/Padre con integración a base de datos
 * Incluye: Enrutador, Materias, Justificantes, Historial, Detalle de Materia
 */

// ==========================================
// CONFIGURACIÓN Y VARIABLES GLOBALES
// ==========================================
const ALUMNO_API = '../controlador/alumno.php';
const ALUMNO_SESION_API = '../controlador/sesion.php';

let estaCargando = false;
let alumnoContexto = null;
let claseEncontradaActual = null;
let justificantesCache = [];
let tramiteAEditar = null;
let tramiteAEliminar = null;
let tramitePendienteEdicion = null;
let yaInicializado = false;
let archivosPreviosActivos = [];

// ==========================================
// 1. API Y UTILIDADES
// ==========================================

async function apiAlumno(accion, opciones = {}) {
    const query = opciones.query ? `&${new URLSearchParams(opciones.query).toString()}` : '';
    const config = {
        method: opciones.method || 'GET',
        headers: {}
    };

    if (opciones.body) {
        if (opciones.body instanceof FormData) {
            config.body = opciones.body;
        } else {
            config.headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(opciones.body);
        }
    }

    try {
        const response = await fetch(`${ALUMNO_API}?accion=${accion}${query}`, config);
        const data = await response.json();

        if (!response.ok || !data.ok) {
            if (response.status === 401) {
                window.location.href = '../index.html';
                return null;
            }
            throw new Error(data.mensaje || 'No se pudo completar la operación.');
        }

        return data;
    } catch (error) {
        console.error(`Error en apiAlumno (${accion}):`, error);
        throw error;
    }
}

function alumnoEscape(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[c]));
}

function normalizarArchivosJustificante(valor) {
    if (!valor || valor === 'Sin archivos') return [];
    try {
        const parsed = JSON.parse(valor);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) { }
    return String(valor)
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .map(url => ({ nombre: url.split('/').pop(), url }));
}

function urlArchivoJustificante(url) {
    if (!url) return '#';
    if (/^https?:\/\//i.test(url) || url.startsWith('../')) return url;
    return `../${url.replace(/^\/+/, '')}`;
}

function renderLinksArchivosJustificante(valor) {
    const archivos = normalizarArchivosJustificante(valor);
    if (!archivos.length) return 'Sin archivos';
    return archivos.map(archivo => {
        const url = archivo.url || archivo.ruta || archivo.nombre || '';
        const nombre = archivo.nombre || url.split('/').pop();
        return `<a href="${alumnoEscape(urlArchivoJustificante(url))}" target="_blank" rel="noopener">${alumnoEscape(nombre)}</a>`;
    }).join(', ');
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return 'No especificada';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    const [anio, mes, dia] = partes;
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${parseInt(dia)} de ${meses[parseInt(mes) - 1]}, ${anio}`;
}

// ==========================================
// 2. INICIALIZACIÓN DEL PORTAL
// ==========================================

async function inicializarPortalAlumno() {
    try {
        alumnoContexto = await apiAlumno('perfil');
        actualizarHeaderAlumno(alumnoContexto);
    } catch (error) {
        console.error('Error al inicializar portal:', error);
    }

    document.querySelectorAll('.btn-logout').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('modal-logout');
            if (modal) modal.classList.remove('hidden');
        });
    });
}

function actualizarHeaderAlumno(ctx) {
    if (!ctx) return;
    const nombre = ctx.alumno?.nombre || `${ctx.usuario?.nombre || ''} ${ctx.usuario?.apellido || ''}`.trim() || 'Usuario';
    const rol = ctx.usuario?.rol === 'padre' ? 'Padre/Tutor' : 'Alumno';

    const nombreEl = document.getElementById('alumno-nombre-header');
    const rolEl = document.getElementById('alumno-rol-header');
    const avatar = document.getElementById('alumno-avatar-header');

    if (nombreEl) nombreEl.textContent = nombre;
    if (rolEl) rolEl.textContent = rol;
    if (avatar) avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=C7A03D&color=fff`;
}

function setupLogoHome() {
    const logo = document.querySelector('.logotipo');
    if (logo) {
        logo.onclick = e => {
            e.preventDefault();
            showWelcomeView();
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        };
    }
}

function descargarHorarioDemo() {
    alert('📅 El horario se genera a partir de tus materias inscritas.\nPróximamente disponible para descarga.');
}

// ==========================================
// 3. ENRUTADOR DE VISTAS
// ==========================================

async function loadSection(sectionName) {
    if (estaCargando) return;
    estaCargando = true;

    const viewContainer = document.getElementById('view-container');

    try {
        // Vistas que se renderizan dinámicamente desde la API
        if (sectionName === 'resumen' || sectionName === 'bienvenida' || sectionName === 'perfil') {
            await renderResumenAlumno();
            estaCargando = false;
            return;
        }

        // Vistas que cargan HTML estático
        const response = await fetch(`alumno/${sectionName}.html?t=${Date.now()}`);
        if (!response.ok) throw new Error(`Error de red HTTP: ${response.status}`);

        if (viewContainer) {
            viewContainer.innerHTML = await response.text();
            viewContainer.classList.remove('fade-in');
            void viewContainer.offsetWidth;
            viewContainer.classList.add('fade-in');
        }

        // Inicializar lógica específica según la vista
        if (sectionName === 'materias') {
            await initMateriasLogic();
        } else if (sectionName === 'historial') {
            await initHistorialLogic();
        } else if (sectionName === 'justificantes') {
            yaInicializado = false;
            await initJustificantesLogic();
            await renderJustificantesAlumno();
        }
    } catch (error) {
        console.error('Error al cargar vista:', error);
        if (viewContainer) {
            viewContainer.innerHTML = `<div style="padding:2rem;text-align:center;color:#A1232E;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;"></i>
                <p>${alumnoEscape(error.message)}</p>
            </div>`;
        }
    } finally {
        estaCargando = false;
    }
}

async function showWelcomeView() {
    await loadSection('bienvenida');
}

// ==========================================
// 4. VISTA DE RESUMEN / BIENVENIDA
// ==========================================

async function renderResumenAlumno() {
    try {
        const data = await apiAlumno('resumen');
        alumnoContexto = data;
        actualizarHeaderAlumno(data);

        const alumno = data.alumno;
        const resumen = data.resumen;
        const container = document.getElementById('view-container');
        if (!container) return;

        if (!alumno) {
            container.innerHTML = `
                <div class="welcome-container">
                    <div class="welcome-hero" style="text-align:center; padding:3rem;">
                        <i class="fa-solid fa-user-slash" style="font-size:3rem; color:#94A3B8;"></i>
                        <h2>No hay alumno asociado</h2>
                        <p style="color:#64748B;">Contacta al administrador para vincular tu cuenta.</p>
                    </div>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="welcome-container">
                <div class="welcome-hero">
                    <div class="welcome-badge">
                        <i class="fa-solid fa-calendar-check"></i>
                        <span>Bienvenido de vuelta</span>
                    </div>
                    <div class="welcome-title">Hola, <span>${alumnoEscape(alumno.nombre)}</span></div>
                    <div class="welcome-description">
                        ${data.usuario.rol === 'padre'
                ? 'Consulta el avance escolar, asistencias y justificantes de tu hijo(a).'
                : 'Revisa tus materias, solicita justificantes y mantente al día.'}
                    </div>
                    <div class="stats-row">
                        <div class="stat-card-welcome">
                            <div class="stat-icon"><i class="fa-solid fa-chart-line"></i></div>
                            <div class="stat-info">
                                <h4>Asistencia General</h4>
                                <p>${resumen.asistencia_general}%</p>
                            </div>
                        </div>
                        <div class="stat-card-welcome">
                            <div class="stat-icon"><i class="fa-solid fa-book"></i></div>
                            <div class="stat-info">
                                <h4>Materias Cursando</h4>
                                <p>${resumen.materias}</p>
                            </div>
                        </div>
                        <div class="stat-card-welcome">
                            <div class="stat-icon"><i class="fa-solid fa-check-circle"></i></div>
                            <div class="stat-info">
                                <h4>Presentes</h4>
                                <p>${resumen.presentes}</p>
                            </div>
                        </div>
                        <div class="stat-card-welcome">
                            <div class="stat-icon"><i class="fa-solid fa-file-lines"></i></div>
                            <div class="stat-info">
                                <h4>Trámites Activos</h4>
                                <p>${resumen.tramites_activos}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section-title-welcome">
                    <i class="fa-solid fa-bolt"></i>
                    <span>Accesos directos</span>
                </div>
                <div class="quick-links-grid">
                    <div class="quick-link-card" onclick="loadSection('materias')">
                        <div class="quick-icon"><i class="fa-solid fa-book-open"></i></div>
                        <div class="quick-info">
                            <h4>Mis Materias</h4>
                            <p>Ver asistencia por clase</p>
                        </div>
                    </div>
                    <div class="quick-link-card" onclick="loadSection('justificantes')">
                        <div class="quick-icon"><i class="fa-solid fa-pen-to-square"></i></div>
                        <div class="quick-info">
                            <h4>Solicitar Justificante</h4>
                            <p>Inasistencias y permisos</p>
                        </div>
                    </div>
                    <div class="quick-link-card" onclick="loadSection('historial')">
                        <div class="quick-icon"><i class="fa-solid fa-timeline"></i></div>
                        <div class="quick-info">
                            <h4>Historial</h4>
                            <p>Asistencias y retardos</p>
                        </div>
                    </div>
                    <div class="quick-link-card" onclick="descargarHorarioDemo()">
                        <div class="quick-icon"><i class="fa-solid fa-download"></i></div>
                        <div class="quick-info">
                            <h4>Descargar Horario</h4>
                            <p>Resumen de materias</p>
                        </div>
                    </div>
                </div>

                <div class="section-title-welcome">
                    <i class="fa-solid fa-megaphone"></i>
                    <span>Avisos recientes</span>
                </div>
                <div class="notice-board">
                    ${(data.avisos || []).map(a => `
                        <div class="notice-item">
                            <div class="notice-icon"><i class="${alumnoEscape(a.icono)}"></i></div>
                            <div class="notice-text">${alumnoEscape(a.texto)}</div>
                            <div class="notice-date">${alumnoEscape(a.fecha)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    } catch (error) {
        console.error('Error al renderizar resumen:', error);
        const container = document.getElementById('view-container');
        if (container) {
            container.innerHTML = `<div style="padding:2rem;text-align:center;color:#A1232E;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;"></i>
                <p>Error al cargar el resumen: ${alumnoEscape(error.message)}</p>
            </div>`;
        }
    }
}

// ==========================================
// 5. LÓGICA DE MATERIAS
// ==========================================

async function initMateriasLogic() {
    try {
        const data = await apiAlumno('materias');
        const gridActivas = document.getElementById('grid-activas');
        const gridPendientes = document.getElementById('grid-pendientes');
        if (!gridActivas || !gridPendientes) return;

        gridActivas.innerHTML = `
            <div class="materia-card add-materia" onclick="abrirModalUnirse()">
                <div class="add-content">
                    <div class="add-icon"><i class="fa-solid fa-plus"></i></div>
                    <h4>Unirse a clase</h4>
                    <span>Ingresa el código</span>
                </div>
            </div>
            ${(data.materias || []).map(m => `
                <div class="materia-card active-card clickable" 
                     data-status="${m.estado}" 
                     data-id="${m.id}"
                     onclick="abrirDetalleMateria(${m.id})">
                    <div class="card-status-line ${m.estado}"></div>
                    <div class="card-body">
                        <div class="materia-icon-box ${m.estado === 'risk' ? 'gray' : ''}">
                            <i class="fa-solid ${alumnoEscape(m.icono)}"></i>
                        </div>
                        <div class="materia-main">
                            <h4>${alumnoEscape(m.materia)}</h4>
                            <p><i class="fa-solid fa-user-tie"></i> ${alumnoEscape(m.docente)}</p>
                        </div>
                        <button class="btn-info-profe" 
                                title="${alumnoEscape(m.correo_docente)}"
                                onclick="event.stopPropagation();">
                            <i class="fa-solid fa-circle-info"></i>
                        </button>
                    </div>
                    <div class="attendance-visual">
                        <div class="progress-container">
                            <div class="progress-bar ${m.estado === 'risk' ? 'risk' : ''}" 
                                 style="width:${m.porcentaje_asistencia}%;"></div>
                        </div>
                        <div class="attendance-stats">
                            <span class="percentage ${m.estado === 'risk' ? 'risk-text' : ''}">
                                ${m.porcentaje_asistencia}% de Asistencia
                            </span>
                            <span class="count">${m.faltas || 0} faltas registradas</span>
                        </div>
                    </div>
                    ${m.estado === 'risk' ? `
                        <button class="btn-action-risk" 
                                onclick="event.stopPropagation(); loadSection('justificantes')">
                            <i class="fa-solid fa-file-circle-plus"></i> Justificar ahora
                        </button>` : ''}
                </div>
            `).join('')}`;

        gridPendientes.innerHTML = (data.solicitudes || []).length
            ? data.solicitudes.map(s => `
                <div class="materia-card pending-card">
                    <div class="pending-badge">Pendiente</div>
                    <div class="card-body">
                        <div class="materia-icon-box gray">
                            <i class="fa-solid fa-hourglass-half"></i>
                        </div>
                        <div class="materia-main">
                            <h4>${alumnoEscape(s.materia)} (${alumnoEscape(s.grupo)})</h4>
                            <p>Esperando aprobación de ${alumnoEscape(s.docente)}</p>
                        </div>
                    </div>
                </div>
            `).join('')
            : `<p style="color:#64748B;padding:1rem;">No tienes solicitudes pendientes.</p>`;
    } catch (error) {
        console.error('Error al cargar materias:', error);
    }
}

// ==========================================
// 6. MODAL DETALLE DE MATERIA (NUEVO)
// ==========================================

// Variable para guardar el ID del curso actual en el modal
let cursoActualDetalle = null;

async function abrirDetalleMateria(idCurso) {
    cursoActualDetalle = idCurso;
    const modal = document.getElementById('modal-detalle-materia');
    if (!modal) {
        console.error('Modal de detalle de materia no encontrado en el DOM');
        return;
    }

    // Mostrar modal con estado de carga
    modal.classList.remove('hidden');
    document.getElementById('detalle-materia-nombre').textContent = 'Cargando...';
    document.getElementById('detalle-materia-grupo').textContent = '';
    document.getElementById('detalle-horario').innerHTML = `
        <p class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Cargando detalles...</p>`;

    try {
        const data = await apiAlumno('detalle_materia', { query: { id_curso: idCurso } });
        const d = data.detalle;

        // Llenar encabezado
        document.getElementById('detalle-materia-nombre').textContent = d.materia;
        document.getElementById('detalle-materia-grupo').textContent = `Grupo: ${d.grupo} | ${d.periodo}`;
        document.getElementById('detalle-materia-icono').innerHTML = `<i class="fa-solid ${d.icono}"></i>`;

        // Datos generales
        document.getElementById('detalle-codigo-clase').textContent = d.codigo;
        document.getElementById('detalle-docente-nombre').textContent = d.docente;
        document.getElementById('detalle-docente-correo').textContent = d.correo_docente;
        document.getElementById('detalle-periodo').textContent = d.periodo;

        // Barra de progreso
        const progressBar = document.getElementById('detalle-progress-bar');
        progressBar.style.width = `${d.porcentaje_asistencia}%`;
        progressBar.className = `progress-bar-large ${d.estado === 'risk' ? 'risk' : ''}`;
        document.getElementById('detalle-porcentaje').textContent = `${d.porcentaje_asistencia}% de Asistencia`;

        // Estadísticas
        document.getElementById('detalle-presentes').textContent = d.presentes;
        document.getElementById('detalle-retardos').textContent = d.retardos;
        document.getElementById('detalle-faltas').textContent = d.faltas;

        // Horario
        const horarioContainer = document.getElementById('detalle-horario');
        if (horarioContainer && d.horario && d.horario.length > 0) {
            horarioContainer.innerHTML = d.horario.map(h => `
                <div class="registro-item">
                    <i class="fa-solid fa-calendar-day text-muted"></i>
                    <span><strong>${h.dia_semana}</strong></span>
                    <span>${h.hora_inicio} - ${h.hora_fin}</span>
                </div>
            `).join('');
        } else if (horarioContainer) {
            horarioContainer.innerHTML = '<p class="text-muted">Sin horario registrado.</p>';
        }

    } catch (error) {
        console.error('Error al cargar detalle de materia:', error);
        document.getElementById('detalle-materia-nombre').textContent = 'Error';
        document.getElementById('detalle-horario').innerHTML = `
            <p class="text-muted" style="color:#A1232E;">
                <i class="fa-solid fa-circle-exclamation"></i> 
                Error: ${alumnoEscape(error.message)}
            </p>`;
    }
}

function cerrarModalDetalleMateria() {
    const modal = document.getElementById('modal-detalle-materia');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function escanearQrAlumno() {
    const status = document.getElementById('qr-scan-status');
    const input = document.getElementById('input-token-qr');

    if (!('BarcodeDetector' in window)) {
        if (status) status.textContent = 'Tu navegador no permite escanear QR desde aqui. Escribe o pega el token.';
        return;
    }

    let stream = null;
    try {
        if (status) status.textContent = 'Abriendo camara para leer el QR...';
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play();

        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const inicio = Date.now();

        while (Date.now() - inicio < 20000) {
            const codigos = await detector.detect(video);
            if (codigos.length > 0) {
                const token = codigos[0].rawValue || '';
                if (input) input.value = token.trim();
                if (status) status.textContent = 'QR leido. Ahora valida Bluetooth y registra.';
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 400));
        }

        if (status) status.textContent = 'No se detecto un QR. Intenta de nuevo o pega el token.';
    } catch (error) {
        if (status) status.textContent = `No se pudo usar la camara: ${error.message}`;
    } finally {
        if (stream) stream.getTracks().forEach(track => track.stop());
    }
}

async function detectarBeaconAlumno(idCurso) {
    const data = await apiAlumno('beacons_materia', { query: { id_curso: idCurso } });
    const beacons = (data.beacons || []).filter(b => b.uuid);
    if (beacons.length === 0) {
        throw new Error('No hay beacons configurados para el grupo de esta materia.');
    }

    if (!navigator.bluetooth) {
        throw new Error('Este navegador no soporta Web Bluetooth. Usa Chrome o Edge en HTTPS/local.');
    }

    const uuids = beacons.map(b => String(b.uuid).toLowerCase());
    console.log('🔍 Buscando beacons con UUIDs:', uuids);

    try {
        // Intento 1: Con filtro específico de manufacturer data (iBeacon Apple)
        console.log('Intento 1: Escaneo con manufacturer data (iBeacon)...');
        await navigator.bluetooth.requestDevice({
            filters: [{
                manufacturerData: {
                    0x004C: {} // Apple manufacturer ID para iBeacon
                }
            }]
        });
        console.log('✅ Beacon detectado por manufacturer data');
    } catch (error1) {
        console.warn('⚠️ No se encontró por manufacturer data:', error1.message);
        
        try {
            // Intento 2: Escaneo más abierto - cualquier dispositivo BLE
            console.log('Intento 2: Escaneo abierto (cualquier dispositivo BLE)...');
            await navigator.bluetooth.requestDevice({
                acceptAllDevices: true
            });
            console.log('✅ Dispositivo detectado (escaneo abierto)');
        } catch (error2) {
            console.error('❌ Error en ambos intentos:', error2.message);
            throw new Error('No se pudo detectar ningún dispositivo Bluetooth. Asegúrate que:\n1. El teléfono tiene Bluetooth activado\n2. El beacon simulado está transmitiendo\n3. Chrome/Edge tiene permiso para Bluetooth\n\nDetalles: ' + error2.message);
        }
    }

    return uuids[0];
}

async function registrarAsistenciaQrAlumno() {
    if (!cursoActualDetalle) return;

    const input = document.getElementById('input-token-qr');
    const status = document.getElementById('qr-scan-status');
    const token = input?.value.trim();

    if (!token) {
        if (status) status.textContent = 'Primero escanea o pega el token del QR.';
        return;
    }

    try {
        if (status) status.textContent = 'Buscando beacon Bluetooth del grupo...';
        let beaconUuid = '';
        let avisoBluetooth = '';
        try {
            beaconUuid = await detectarBeaconAlumno(cursoActualDetalle);
        } catch (bluetoothError) {
            avisoBluetooth = bluetoothError.message;
        }

        if (status) {
            status.textContent = beaconUuid
                ? 'Beacon detectado. Registrando asistencia...'
                : 'No se pudo validar Bluetooth. Registrando como sospechosa...';
        }
        const data = await apiAlumno('registrar_asistencia_qr', {
            method: 'POST',
            body: { token, beacon_uuid: beaconUuid }
        });

        const mensaje = data.requiere_revision
            ? `Asistencia sospechosa registrada para ${data.materia}. El docente debera verificarla. ${avisoBluetooth}`
            : `Asistencia registrada para ${data.materia} (${data.fecha} ${data.hora_inicio}).`;
        if (status) status.textContent = mensaje;
        await abrirDetalleMateria(cursoActualDetalle);
        const nuevoStatus = document.getElementById('qr-scan-status');
        if (nuevoStatus) nuevoStatus.textContent = mensaje;
    } catch (error) {
        if (status) status.textContent = error.message;
    }
}

// ==========================================
// 7. MODAL UNIRSE A CLASE
// ==========================================

function abrirModalUnirse() {
    reiniciarModalUnirse();
    const modal = document.getElementById('modal-unirse-clase');
    if (modal) modal.style.display = 'block';
}

function cerrarModalUnirse() {
    const modal = document.getElementById('modal-unirse-clase');
    if (modal) modal.style.display = 'none';
}

async function verificarCodigo() {
    const input = document.getElementById('input-codigo-clase');
    const errorText = document.getElementById('error-codigo');
    const codigo = input?.value.trim().toUpperCase();

    if (!codigo) {
        if (errorText) {
            errorText.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Por favor, ingresa un código.';
            errorText.style.display = 'block';
        }
        return;
    }

    try {
        const data = await apiAlumno('verificar_codigo', { query: { codigo } });
        claseEncontradaActual = data.clase;

        if (!claseEncontradaActual) throw new Error('Código inválido. Verifica con tu profesor.');

        if (errorText) errorText.style.display = 'none';
        document.getElementById('confirm-nombre-clase').innerText =
            `${claseEncontradaActual.materia} (${claseEncontradaActual.grupo})`;
        document.getElementById('confirm-docente-clase').innerText =
            `Prof. ${claseEncontradaActual.docente}`;
        document.getElementById('confirm-ciclo-clase').innerText =
            claseEncontradaActual.periodo || 'Actual';
        document.getElementById('step-1-codigo').style.display = 'none';

        const step2 = document.getElementById('step-2-confirmacion');
        if (step2) {
            step2.style.display = 'block';
            step2.classList.add('fade-in');
        }
    } catch (error) {
        if (errorText) {
            errorText.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${alumnoEscape(error.message)}`;
            errorText.style.display = 'block';
        }
        if (input) {
            input.style.border = '2px solid var(--color-rojo-oscuro)';
            setTimeout(() => { input.style.border = '2px solid #EAEAEA'; }, 2000);
        }
    }
}

function reiniciarModalUnirse() {
    const step2 = document.getElementById('step-2-confirmacion');
    if (step2) step2.style.display = 'none';
    const step1 = document.getElementById('step-1-codigo');
    if (step1) step1.style.display = 'block';
    const input = document.getElementById('input-codigo-clase');
    if (input) {
        input.value = '';
        input.style.border = '2px solid #EAEAEA';
    }
    const errorMsg = document.getElementById('error-codigo');
    if (errorMsg) errorMsg.style.display = 'none';
    claseEncontradaActual = null;
}

async function inscribirseAClase() {
    if (!claseEncontradaActual) return;

    try {
        await apiAlumno('solicitar_inscripcion', {
            method: 'POST',
            body: { id_curso: claseEncontradaActual.id }
        });
        alert(`✅ ¡Solicitud enviada para ${claseEncontradaActual.materia}!`);
        cerrarModalUnirse();
        await initMateriasLogic();
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

// ==========================================
// 8. HISTORIAL
// ==========================================

async function initHistorialLogic() {
    try {
        const data = await apiAlumno('historial');
        const stats = document.querySelector('.historial-stats-brief');
        const timeline = document.querySelector('.timeline-container');
        if (!stats || !timeline) return;

        stats.innerHTML = `
            <div class="stat-mini">
                <span class="label">Asistencias</span>
                <span class="value text-success">${data.resumen.presentes}</span>
            </div>
            <div class="stat-mini">
                <span class="label">Retardos</span>
                <span class="value text-warning">${data.resumen.retardos}</span>
            </div>
            <div class="stat-mini">
                <span class="label">Faltas</span>
                <span class="value text-danger">${data.resumen.faltas}</span>
            </div>`;

        const eventos = data.eventos || [];
        timeline.innerHTML = eventos.length ? `
            <div class="timeline-group">
                <span class="group-date">Registros recientes</span>
                ${eventos.map(e => {
            const tipo = e.estado === 'presente' ? 'presente' :
                e.estado === 'retardo' ? 'retardo' : 'falta';
            const badge = tipo === 'presente' ? 'success' :
                tipo === 'retardo' ? 'warning' : 'danger';
            const icon = tipo === 'presente' ? 'fa-check' :
                tipo === 'retardo' ? 'fa-clock' : 'fa-xmark';
            return `
                        <div class="timeline-item status-${tipo}" data-status="${tipo}">
                            <div class="item-icon"><i class="fa-solid ${icon}"></i></div>
                            <div class="item-content">
                                <div class="item-main">
                                    <h4>${alumnoEscape(e.materia)}</h4>
                                    <span class="time">${alumnoEscape(e.fecha)} ${alumnoEscape(e.hora)}</span>
                                </div>
                                <p>${alumnoEscape(e.docente)}</p>
                            </div>
                            <div class="item-badge ${badge}">
                                ${tipo === 'falta' ? 'Inasistencia' : alumnoEscape(e.estado)}
                            </div>
                        </div>`;
        }).join('')}
            </div>` : `<p style="padding:2rem;color:#64748B;">No hay registros de asistencia todavía.</p>`;

        // Filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                document.querySelectorAll('.timeline-item').forEach(item => {
                    item.style.display = filter === 'all' || item.dataset.status === filter ? '' : 'none';
                });
            };
        });
    } catch (error) {
        console.error('Error al cargar historial:', error);
    }
}

// ==========================================
// 9. JUSTIFICANTES
// ==========================================

async function initJustificantesLogic() {
    if (yaInicializado) return;
    yaInicializado = true;

    console.log("🧩 Inicializando lógica de Justificantes");

    try {
        const data = await apiAlumno('justificantes');
        alumnoContexto = data;
        justificantesCache = data.justificantes || [];

        const btnHam = document.getElementById('btn-hamburger');
        const drop = document.getElementById('j-dropdown');
        const menuSol = document.getElementById('menu-solicitud');
        const menuHis = document.getElementById('menu-historial');
        const vistaLista = document.getElementById('vista-lista');
        const vistaForm = document.getElementById('vista-formulario');
        const modal = document.getElementById('modal-auth');
        const inputPin = document.getElementById('pin-tutor');
        const btnValidarPin = document.getElementById('btn-validar-pin');
        const btnCerrarAuth = document.getElementById('btn-cerrar-auth');
        const errorPin = document.getElementById('error-pin');
        const buscarTramite = document.getElementById('buscar-tramite');
        const filtroEstatus = document.getElementById('filtro-estatus');
        const btnEnviar = document.getElementById('btn-enviar-solicitud');

        // Dropdown hamburguesa
        if (btnHam && drop) {
            btnHam.onclick = e => {
                e.stopPropagation();
                drop.classList.toggle('hidden');
            };
        }

        // Cambio a historial
        if (menuHis) {
            menuHis.onclick = () => {
                if (drop) drop.classList.add('hidden');
                if (vistaForm) vistaForm.classList.add('hidden');
                if (vistaLista) vistaLista.classList.remove('hidden');
                menuHis.classList.add('active');
                if (menuSol) menuSol.classList.remove('active');
                resetearFormularioJustificante();
            };
        }

        // Cambio a nueva solicitud
        if (menuSol && modal && inputPin) {
            menuSol.onclick = () => {
                if (drop) drop.classList.add('hidden');
                tramitePendienteEdicion = null;
                tramiteAEditar = null;
                restaurarTextosModalPin();
                modal.classList.remove('hidden');
                inputPin.value = '';
                if (errorPin) errorPin.classList.add('hidden');
                setTimeout(() => inputPin.focus(), 100);
                menuSol.classList.add('active');
                if (menuHis) menuHis.classList.remove('active');
            };
        }

        // Cerrar modal PIN
        if (btnCerrarAuth && modal) {
            btnCerrarAuth.onclick = () => {
                modal.classList.add('hidden');
                tramitePendienteEdicion = null;
            };
        }

        // Validar PIN
        if (btnValidarPin && inputPin && modal) {
            btnValidarPin.onclick = () => {
                if (inputPin.value !== '1234') {
                    if (errorPin) errorPin.classList.remove('hidden');
                    inputPin.value = '';
                    inputPin.focus();
                    return;
                }

                modal.classList.add('hidden');
                if (errorPin) errorPin.classList.add('hidden');
                if (vistaLista) vistaLista.classList.add('hidden');
                if (vistaForm) vistaForm.classList.remove('hidden');
                const idEdicion = tramitePendienteEdicion;
                prepararFormularioJustificante(data);
                if (idEdicion) {
                    cargarDatosEdicionTramite(idEdicion);
                }
            };

            inputPin.onkeypress = e => {
                if (e.key === 'Enter') btnValidarPin.click();
            };
        }

        // Configurar campos del formulario
        configurarCamposJustificante();

        // Botón enviar
        if (btnEnviar) btnEnviar.onclick = validarYEnviarSolicitud;

        // Búsqueda y filtros
        if (buscarTramite) buscarTramite.oninput = filtrarTramites;
        if (filtroEstatus) filtroEstatus.onchange = filtrarTramites;

        // Renderizar lista
        renderListaJustificantes(justificantesCache);

        console.log('✅ Justificantes inicializado correctamente');
    } catch (error) {
        console.error('Error al inicializar justificantes:', error);
    }
}

function prepararFormularioJustificante(data) {
    const alumno = data.alumno;
    if (alumno) {
        llenarDatosAlumno({
            nombre: alumno.nombre || '',
            numero: alumno.numero || alumno.matricula || '',
            grado: alumno.grado || extraerGrado(alumno.grupo) || '',
            grupo: alumno.grupo_formateado || alumno.grupo || '',
            tutor: alumno.tutor || alumno.nombre || '',
            telefonoTutor: alumno.telefonoTutor || alumno.telefono || ''
        });
    }
    // Cargar materias reales del alumno
    generarCheckboxesMaterias(data.materias || []);
    resetearFormularioJustificante();
}

function configurarCamposJustificante() {
    const radioCompleto = document.querySelector('input[name="tipo-justificacion"][value="completo"]');
    const radioMaterias = document.querySelector('input[name="tipo-justificacion"][value="materias"]');
    const radioRango = document.querySelector('input[name="tipo-justificacion"][value="rango"]');
    const contenedorMaterias = document.getElementById('contenedor-materias');
    const contenedorRangoFechas = document.getElementById('contenedor-rango-fechas');
    const contenedorFechaUnica = document.getElementById('contenedor-fecha-unica');
    const selectPermiso = document.getElementById('tipo-permiso');
    const contenedorDocumentos = document.getElementById('contenedor-documentos');
    const uploadZone = document.getElementById('upload-zone-dinamica');
    const infoBanner = document.getElementById('info-banner');
    const documentosDescripcion = document.getElementById('documentos-descripcion');

    if (radioCompleto) {
        radioCompleto.onchange = () => {
            if (contenedorMaterias) contenedorMaterias.classList.add('hidden');
            if (contenedorRangoFechas) contenedorRangoFechas.classList.add('hidden');
            if (contenedorFechaUnica) contenedorFechaUnica.classList.remove('hidden');
        };
    }

    if (radioMaterias) {
        radioMaterias.onchange = () => {
            if (contenedorMaterias) contenedorMaterias.classList.remove('hidden');
            if (contenedorRangoFechas) contenedorRangoFechas.classList.add('hidden');
            if (contenedorFechaUnica) contenedorFechaUnica.classList.remove('hidden');

            // Cargar materias del día si ya hay una fecha seleccionada
            cargarMateriasPorDia();
        };
    }

    if (radioRango) {
        radioRango.onchange = () => {
            if (contenedorMaterias) contenedorMaterias.classList.add('hidden');
            if (contenedorRangoFechas) contenedorRangoFechas.classList.remove('hidden');
            if (contenedorFechaUnica) contenedorFechaUnica.classList.add('hidden');
        };
    }

    if (selectPermiso) {
        selectPermiso.onchange = function () {
            if (uploadZone) uploadZone.innerHTML = '';
            if (contenedorDocumentos) contenedorDocumentos.classList.add('hidden');
            if (infoBanner) infoBanner.classList.add('hidden');

            const config = {
                salud: {
                    info: '<i class="fa-solid fa-circle-info"></i> <b>Motivo de Salud:</b> Adjunta receta médica o comprobante de consulta.',
                    desc: 'Sube tu receta médica o comprobante de consulta.',
                    inputs: crearInputFile('Receta Médica', 'receta', 'Formato: PDF, JPG o PNG')
                },
                personal: {
                    info: '<i class="fa-solid fa-circle-info"></i> <b>Asuntos Familiares:</b> Adjunta carta firmada por el tutor.',
                    desc: 'Sube la carta firmada por el tutor.',
                    inputs: crearInputFile('Carta Firmada por el Tutor', 'carta-familiar', 'Formato: PDF, JPG o PNG')
                },
                viaje: {
                    info: '<i class="fa-solid fa-circle-info"></i> <b>Viaje Escolar:</b> Adjunta oficio e identificación del tutor.',
                    desc: 'Sube los documentos para validar el viaje escolar.',
                    inputs: crearInputFile('Oficio de Comisión', 'oficio', 'PDF') +
                        crearInputFile('INE del Tutor', 'ine', 'PDF, JPG o PNG')
                }
            }[this.value];

            if (!config) return;
            if (infoBanner) {
                infoBanner.classList.remove('hidden');
                infoBanner.innerHTML = config.info;
            }
            if (contenedorDocumentos) contenedorDocumentos.classList.remove('hidden');
            if (documentosDescripcion) documentosDescripcion.textContent = config.desc;
            if (uploadZone) uploadZone.innerHTML = config.inputs;
            vincularEventosArchivosJustificante();
        };
    }
}

async function renderJustificantesAlumno() {
    try {
        const data = await apiAlumno('justificantes');
        alumnoContexto = data;
        justificantesCache = data.justificantes || [];

        if (data.alumno) {
            llenarDatosAlumno({
                nombre: data.alumno.nombre,
                numero: data.alumno.matricula || '',
                grado: extraerGrado(data.alumno.grupo),
                grupo: data.alumno.grupo || '',
                tutor: data.alumno.tutor || '',
                telefonoTutor: data.alumno.telefonoTutor || ''
            });
        }
        generarCheckboxesMaterias(data.materias || []);
        renderListaJustificantes(justificantesCache);
    } catch (error) {
        console.error('Error al renderizar justificantes:', error);
    }
}

function renderListaJustificantes(items) {
    const lista = document.getElementById('lista-tramites');
    const sinTramites = document.getElementById('sin-tramites');
    if (!lista) return;

    if (!items.length) {
        lista.innerHTML = '';
        if (sinTramites) sinTramites.classList.remove('hidden');
        return;
    }
    if (sinTramites) sinTramites.classList.add('hidden');

    lista.innerHTML = items.map(j => {
        const motivo = motivoDesdeAsunto(j.asunto);
        const tipo = j.tipo_justificacion || (j.fecha_inicio === j.fecha_fin ? 'completo' : 'rango');
        const materiasArray = Array.isArray(j.materias) ? j.materias : [];
        const materias = materiasArray.join(', ');
        const materiasJSON = JSON.stringify(materiasArray);
        const archivos = j.archivo_url || '';

        return `
            <div class="j-card fade-in" data-estatus="${alumnoEscape(j.estado)}" data-id="${alumnoEscape(j.id)}"
                 data-motivo="${alumnoEscape(motivo)}" 
                 data-fecha="${alumnoEscape(j.fecha_inicio)}" 
                 data-tipo="${alumnoEscape(tipo)}"
                 data-descripcion="${alumnoEscape(j.descripcion)}" 
                 data-archivos="${alumnoEscape(archivos || 'Sin archivos')}" 
                  data-archivos-json="[]"
                  data-fecha-inicio="${alumnoEscape(j.fecha_inicio)}"
                  data-fecha-fin="${alumnoEscape(j.fecha_fin || j.fecha_inicio)}"
                  data-materias-json="${alumnoEscape(materiasJSON)}"
                  data-materias="${alumnoEscape(materias)}">
                <div class="j-card-header">
                    <div class="j-title">
                        <i class="fa-solid ${iconoJustificante(motivo)}"></i>
                        <h4>${alumnoEscape(j.asunto)}</h4>
                    </div>
                    <div class="j-card-actions">
                        <span class="badge-status ${alumnoEscape(j.estado)}">${estadoJustificante(j.estado)}</span>
                        <button class="btn-icon-action btn-ver" title="Ver detalles" onclick="verDetallesTramite('${j.id}')">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        ${j.estado === 'pendiente' ? `
                            <button class="btn-icon-action btn-editar" title="Editar trámite" onclick="abrirEdicionTramite('${j.id}')">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button class="btn-icon-action btn-eliminar" title="Eliminar trámite" onclick="confirmarEliminarTramite('${j.id}')">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>` : ''}
                    </div>
                </div>
                <div class="j-card-body">
                    <p><strong>${j.fecha_inicio === j.fecha_fin ? 'Fecha' : 'Periodo'}:</strong> 
                        ${alumnoEscape(j.fecha_inicio)}${j.fecha_inicio !== j.fecha_fin ? ' al ' + alumnoEscape(j.fecha_fin) : ''}</p>
                    <p><strong>Tipo:</strong> ${tipo === 'completo' ? 'Día Completo' : tipo === 'materias' ? 'Materias Específicas' : 'Rango de Fechas'}</p>
                    ${materias ? `<p><strong>Materias:</strong> ${alumnoEscape(materias)}</p>` : ''}
                    <p><strong>Descripción:</strong> ${alumnoEscape(j.descripcion)}</p>
                    <p><strong>Archivos:</strong> ${renderLinksArchivosJustificante(archivos)}</p>
                </div>
                <div class="j-card-footer">
                    <button class="btn-detalles" onclick="verDetallesTramite('${j.id}')">
                        <i class="fa-solid fa-circle-info"></i> Ver Todos los Detalles
                    </button>
                </div>
            </div>`;
    }).join('');
}

async function validarYEnviarSolicitud() {
    const motivo = document.getElementById('tipo-permiso');
    const descripcion = document.getElementById('descripcion-motivo');
    const tipoJustificacion = document.querySelector('input[name="tipo-justificacion"]:checked')?.value || 'completo';
    const fecha = document.getElementById('fecha-inasistencia')?.value;
    const fechaInicio = document.getElementById('fecha-inicio-rango')?.value;
    const fechaFin = document.getElementById('fecha-fin-rango')?.value;

    if (!motivo?.value || !descripcion?.value.trim()) {
        alert('⚠️ Completa motivo y descripción.');
        return;
    }

    // Validar fechas según el tipo
    if (tipoJustificacion === 'rango') {
        if (!fechaInicio || !fechaFin) {
            alert('⚠️ Selecciona la fecha de inicio y fin para el rango.');
            return;
        }
        if (fechaFin < fechaInicio) {
            alert('⚠️ La fecha de fin no puede ser anterior a la fecha de inicio.');
            return;
        }
    } else {
        if (!fecha) {
            alert('⚠️ Selecciona la fecha de inasistencia.');
            return;
        }
    }

    // Obtener materias seleccionadas si es tipo "materias"
    let materiasSeleccionadas = [];
    if (tipoJustificacion === 'materias') {
        const checkboxes = document.querySelectorAll('#lista-materias input[type="checkbox"]:checked');
        if (checkboxes.length === 0) {
            alert('⚠️ Debes seleccionar al menos una materia a justificar.');
            return;
        }
        materiasSeleccionadas = Array.from(checkboxes).map(cb => cb.value);
    }

    const archivosSubidosInputs = Array.from(document.querySelectorAll('.doc-upload'))
        .filter(input => input.files && input.files.length > 0);
    const archivosPrevios = tramiteAEditar ? archivosPreviosActivos.join(',') : '';

    const payload = {
        id_justificante: tramiteAEditar,
        motivo: motivo.value,
        asunto: asuntoJustificante(motivo.value),
        descripcion: descripcion.value.trim(),
        tipo_justificacion: tipoJustificacion, // Guardar el tipo
        fecha_inicio: tipoJustificacion === 'rango' ? fechaInicio : fecha,
        fecha_fin: tipoJustificacion === 'rango' ? fechaFin : fecha,
        materias: materiasSeleccionadas, // Guardar materias seleccionadas
        archivo_url: archivosPrevios
    };

    console.log('📤 Enviando solicitud:', payload);
    const body = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            body.append(key, JSON.stringify(value));
        } else if (value !== null && value !== undefined) {
            body.append(key, value);
        }
    });
    archivosSubidosInputs.forEach(input => {
        Array.from(input.files).forEach(file => {
            body.append('documentos[]', file);
        });
    });

    try {
        const accion = tramiteAEditar ? 'actualizar_justificante' : 'crear_justificante';
        const data = await apiAlumno(accion, { method: 'POST', body });
        justificantesCache = data.justificantes || [];
        renderListaJustificantes(justificantesCache);
        alert(tramiteAEditar ? '✅ Trámite actualizado correctamente.' : '✅ Solicitud enviada correctamente.');

        document.getElementById('vista-formulario')?.classList.add('hidden');
        document.getElementById('vista-lista')?.classList.remove('hidden');
        resetearFormularioJustificante();
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

async function eliminarTramite() {
    if (!tramiteAEliminar) return;

    try {
        const data = await apiAlumno('eliminar_justificante', {
            method: 'POST',
            body: { id_justificante: tramiteAEliminar }
        });
        justificantesCache = data.justificantes || [];
        renderListaJustificantes(justificantesCache);
        cerrarModalConfirmEliminar();
        alert('🗑️ Trámite eliminado exitosamente.');
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
        cerrarModalConfirmEliminar();
    }
}

// ==========================================
// 10. FUNCIONES AUXILIARES DE JUSTIFICANTES
// ==========================================

function restaurarTextosModalPin() {
    const modal = document.getElementById('modal-auth');
    if (!modal) return;

    const modalTitle = modal.querySelector('h3');
    const modalText = modal.querySelector('p');
    const btnValidar = document.getElementById('btn-validar-pin');

    if (modalTitle) modalTitle.textContent = 'Firma Digital Requerida';
    if (modalText) modalText.textContent = 'Ingresa el PIN de padre o tutor para autorizar la creación de este trámite.';
    if (btnValidar) btnValidar.textContent = 'Autorizar Trámite';
}

function llenarDatosAlumno(datos) {
    const campos = {
        'dato-nombre-alumno': datos.nombre || '',
        'dato-numero-alumno': datos.numero || datos.matricula || '',
        'dato-grado': datos.grado || extraerGrado(datos.grupo) || '',
        'dato-grupo': datos.grupo_formateado || datos.grupo || '',
        // 'dato-tutor': datos.tutor || datos.nombre || '',  // ← ELIMINAR ESTA LÍNEA
        'dato-telefono-tutor': datos.telefonoTutor || datos.telefono || ''
    };

    for (const [id, valor] of Object.entries(campos)) {
        const campo = document.getElementById(id);
        if (campo) campo.value = valor || '';
    }
}

// ═══════════════════════════════════════
// CARGAR MATERIAS POR DÍA
// ═══════════════════════════════════════

async function cargarMateriasPorDia() {
    const fechaInput = document.getElementById('fecha-inasistencia');
    const radioMaterias = document.querySelector('input[name="tipo-justificacion"][value="materias"]');

    // Solo ejecutar si la opción "Solo algunas materias" está seleccionada
    if (!radioMaterias || !radioMaterias.checked) return;

    const listaMaterias = document.getElementById('lista-materias');
    if (!listaMaterias) return;

    const fecha = fechaInput?.value;

    // --- 1. SI AÚN NO HAY FECHA SELECCIONADA ---
    if (!fecha) {
        listaMaterias.innerHTML = `
            <div style="grid-column: 1/-1; background: #FFFBEB; border: 1px solid #FDE68A; padding: 14px 20px; border-radius: 10px; color: #D97706; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 4px rgba(217, 119, 6, 0.05);">
                <i class="fa-solid fa-calendar-day" style="font-size: 1.5rem;"></i>
                <span style="font-size: 0.95rem; line-height: 1.4;">
                    Por favor, <strong>selecciona la fecha de inasistencia</strong> en el campo de arriba para mostrarte las materias que te tocan ese día.
                </span>
            </div>`;
        return;
    }

    // --- 2. MOSTRAR SPINNER MIENTRAS CARGA ---
    listaMaterias.innerHTML = `
        <div style="grid-column: 1/-1; padding: 20px; text-align: center; color: #64748B;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--color-dorado); margin-bottom: 10px;"></i>
            <p>Buscando tu horario para este día...</p>
        </div>`;

    try {
        const data = await apiAlumno('materias_por_dia', { query: { fecha } });
        const materias = data.materias?.materias || [];
        const diaSemana = data.materias?.dia_semana || '';

        // --- 3. SI ESE DÍA NO HAY CLASES (EJ: FIN DE SEMANA) ---
        if (materias.length === 0) {
            listaMaterias.innerHTML = `
                <div style="grid-column: 1/-1; background: #F8FAFC; border: 1px dashed #CBD5E1; padding: 15px 20px; border-radius: 10px; color: #64748B; display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-mug-hot" style="font-size: 1.2rem;"></i> 
                    <span>No tienes clases programadas para el <strong>${diaSemana}</strong> (${formatearFecha(fecha)}).</span>
                </div>`;
            return;
        }

        // --- 4. DIBUJAR LOS CHECKBOXES DE LAS MATERIAS DEL DÍA ---
        let html = `
            <div style="grid-column: 1/-1; color: var(--color-azul-marino); font-weight: 800; font-size: 1.05rem; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #E2E8F0; display:flex; align-items:center; gap:8px;">
                <i class="fa-regular fa-calendar-check" style="color:var(--color-dorado);"></i> Clases del ${diaSemana} ${formatearFecha(fecha)}
            </div>
        `;

        materias.forEach(materia => {
            const idMateria = 'mat-' + materia.materia.toLowerCase()
                .replace(/\s+/g, '-')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

            html += `
                <label class="checkbox-item" style="display:flex; align-items:center; gap:12px; padding:14px 16px; border:1px solid #CBD5E1; border-radius:12px; cursor:pointer; transition:all 0.2s; background:white; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                    <input type="checkbox" value="${materia.materia}" id="${idMateria}" data-id-curso="${materia.id}" style="width:20px; height:20px; accent-color:var(--color-dorado); cursor: pointer; flex-shrink: 0;">
                    <div style="display:flex; flex-direction:column; gap: 4px;">
                        <span style="font-weight:700; color:var(--color-azul-marino); font-size:0.95rem; line-height: 1.2;">${alumnoEscape(materia.materia)}</span>
                        <span style="color:#64748B; font-size:0.8rem; display:flex; align-items:center; gap:5px;">
                            <i class="fa-regular fa-clock" style="color:#94A3B8;"></i> ${materia.hora_inicio} - ${materia.hora_fin}
                        </span>
                    </div>
                </label>
            `;
        });
        listaMaterias.innerHTML = html;

    } catch (error) {
        console.error('Error al cargar materias por día:', error);
        listaMaterias.innerHTML = `
            <div style="grid-column: 1/-1; background: #FEF2F2; border: 1px solid #FECACA; padding: 15px 20px; border-radius: 10px; color: var(--color-rojo-oscuro); display: flex; align-items: center; gap: 10px;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.2rem;"></i> 
                <span>Error de conexión al cargar tu horario. Intenta nuevamente.</span>
            </div>`;
    }
}

// Apagamos la precarga masiva de materias para que se encargue la función de arriba
function generarCheckboxesMaterias(materias) {
    const listaMaterias = document.getElementById('lista-materias');
    if (listaMaterias) listaMaterias.innerHTML = '';
}

function resetearFormularioJustificante() {
    const fechaInput = document.getElementById('fecha-inasistencia');
    const fechaInicioRango = document.getElementById('fecha-inicio-rango');
    const fechaFinRango = document.getElementById('fecha-fin-rango');
    const selectPermiso = document.getElementById('tipo-permiso');
    const descripcion = document.getElementById('descripcion-motivo');
    const contenedorDocumentos = document.getElementById('contenedor-documentos');
    const uploadZone = document.getElementById('upload-zone-dinamica');
    const infoBanner = document.getElementById('info-banner');
    const errorArchivos = document.getElementById('error-archivos');
    const contenedorMaterias = document.getElementById('contenedor-materias');
    const contenedorRangoFechas = document.getElementById('contenedor-rango-fechas');
    const contenedorFechaUnica = document.getElementById('contenedor-fecha-unica');

    if (fechaInput) fechaInput.value = '';
    if (fechaInicioRango) fechaInicioRango.value = '';
    if (fechaFinRango) fechaFinRango.value = '';
    if (selectPermiso) selectPermiso.value = '';
    if (descripcion) descripcion.value = '';
    if (contenedorDocumentos) contenedorDocumentos.classList.add('hidden');
    if (uploadZone) uploadZone.innerHTML = '';
    if (infoBanner) { infoBanner.classList.add('hidden'); infoBanner.innerHTML = ''; }
    if (errorArchivos) errorArchivos.classList.add('hidden');
    if (contenedorMaterias) contenedorMaterias.classList.add('hidden');
    if (contenedorRangoFechas) contenedorRangoFechas.classList.add('hidden');
    if (contenedorFechaUnica) contenedorFechaUnica.classList.remove('hidden');

    const radioCompleto = document.querySelector('input[name="tipo-justificacion"][value="completo"]');
    if (radioCompleto) radioCompleto.checked = true;

    document.querySelectorAll('#lista-materias input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('.input-modern').forEach(input => input.classList.remove('input-error'));
    document.querySelectorAll('.custom-file-upload').forEach(label => label.classList.remove('file-uploaded', 'file-error'));

    const editandoId = document.getElementById('editando-tramite-id');
    if (editandoId) editandoId.value = '';

    const btnCancelar = document.getElementById('btn-cancelar-edicion');
    if (btnCancelar) btnCancelar.classList.add('hidden');

    const textoBoton = document.getElementById('texto-boton-enviar');
    if (textoBoton) textoBoton.textContent = 'Enviar Solicitud a Prefectura';

    const tituloForm = document.getElementById('titulo-formulario');
    if (tituloForm) tituloForm.textContent = 'Nuevo Justificante';

    const subtituloForm = document.getElementById('subtitulo-formulario');
    if (subtituloForm) subtituloForm.textContent = 'Llena los datos para solicitar la justificación de inasistencia.';

    tramiteAEditar = null;
    tramitePendienteEdicion = null;
    archivosPreviosActivos = [];
}

async function cargarDatosEdicionTramite(id) {
    const card = document.querySelector(`.j-card[data-id="${id}"]`);
    if (!card) return;

    tramiteAEditar = id;
    tramitePendienteEdicion = id;

    const tipo = card.dataset.tipo || 'completo';
    const fecha = card.dataset.fecha || card.dataset.fechaInicio || card.dataset.fechainicio || '';
    const fechaInicio = card.dataset.fechaInicio || card.dataset.fechainicio || fecha;
    const fechaFin = card.dataset.fechaFin || card.dataset.fechafin || fechaInicio;
    const motivo = card.dataset.motivo || '';

    const radio = document.querySelector(`input[name="tipo-justificacion"][value="${tipo}"]`);
    if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
    }

    const fechaInput = document.getElementById('fecha-inasistencia');
    const fechaInicioRango = document.getElementById('fecha-inicio-rango');
    const fechaFinRango = document.getElementById('fecha-fin-rango');
    const selectPermiso = document.getElementById('tipo-permiso');
    const descripcion = document.getElementById('descripcion-motivo');

    if (tipo === 'rango') {
        if (fechaInicioRango) fechaInicioRango.value = fechaInicio;
        if (fechaFinRango) fechaFinRango.value = fechaFin;
    } else if (fechaInput) {
        fechaInput.value = fecha;
    }

    if (selectPermiso) {
        selectPermiso.value = motivo;
        selectPermiso.dispatchEvent(new Event('change'));
    }
    if (descripcion) descripcion.value = card.dataset.descripcion || '';

    const uploadZone = document.getElementById('upload-zone-dinamica');
    if (uploadZone && card.dataset.archivos && card.dataset.archivos !== 'Sin archivos') {
        archivosPreviosActivos = card.dataset.archivos.split(',').map(f => f.trim()).filter(Boolean);
        renderArchivosPreviosEdicion();
    } else {
        archivosPreviosActivos = [];
    }

    if (tipo === 'materias') {
        await cargarMateriasPorDia();
        let materias = [];
        try {
            materias = JSON.parse(card.dataset.materiasJson || '[]');
        } catch (e) {
            materias = (card.dataset.materias || '').split(',').map(m => m.trim()).filter(Boolean);
        }

        document.querySelectorAll('#lista-materias input[type="checkbox"]').forEach(cb => {
            cb.checked = materias.includes(cb.value);
        });
    }

    const editandoId = document.getElementById('editando-tramite-id');
    if (editandoId) editandoId.value = id;

    const btnCancelar = document.getElementById('btn-cancelar-edicion');
    if (btnCancelar) btnCancelar.classList.remove('hidden');

    const textoBoton = document.getElementById('texto-boton-enviar');
    if (textoBoton) textoBoton.textContent = 'Guardar Cambios';

    const tituloForm = document.getElementById('titulo-formulario');
    if (tituloForm) tituloForm.textContent = 'Editar Justificante';

    const subtituloForm = document.getElementById('subtitulo-formulario');
    if (subtituloForm) subtituloForm.textContent = 'Actualiza los datos de tu solicitud pendiente.';
}

function cancelarEdicion() {
    if (tramiteAEditar) {
        if (confirm('¿Cancelar la edición? Los cambios no se guardarán.')) {
            resetearFormularioJustificante();
            tramitePendienteEdicion = null;

            const vistaForm = document.getElementById('vista-formulario');
            const vistaLista = document.getElementById('vista-lista');
            if (vistaForm) vistaForm.classList.add('hidden');
            if (vistaLista) vistaLista.classList.remove('hidden');
        }
    }
}

function crearInputFile(label, id, descripcion = '') {
    return `
        <div style="position: relative; width: 100%; height: 100%;">
            <label class="custom-file-upload" id="label_${id}" for="${id}">
                <i class="fa-solid fa-cloud-arrow-up"></i>
                <span>${label}</span>
                <small>${descripcion ? descripcion + ' ' : ''}<strong>(Máx. 3 archivos)</strong></small>
                <div class="file-name-display" id="name_${id}" style="text-align: center; margin-top: 10px; line-height: 1.5;"></div>
                <input type="file" id="${id}" class="doc-upload" accept=".pdf,.jpg,.jpeg,.png" multiple>
            </label>
            <button type="button" id="btn_remove_${id}" class="hidden" 
                    onclick="removerArchivoSubido('${id}', event)" 
                    title="Quitar archivos seleccionados"
                    style="position: absolute; top: 10px; right: 10px; background: var(--color-rojo-oscuro); color: white; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(161, 35, 46, 0.3); z-index: 10; transition: transform 0.2s;">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>`;
}

function vincularEventosArchivosJustificante() {
    const uploadZone = document.getElementById('upload-zone-dinamica');
    if (!uploadZone) return;

    uploadZone.querySelectorAll('.doc-upload').forEach(input => {
        input.onchange = handleFileChangeJustificante;
    });
}

function handleFileChangeJustificante(e) {
    const input = e.target;
    const id = input.id;
    const label = document.getElementById(`label_${id}`);

    if (!label) return;
    label.classList.remove('file-error');

    if (!input.dt) input.dt = new DataTransfer();

    // 1. Agregar los archivos recién seleccionados a la canasta
    if (input.files && input.files.length > 0) {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

        Array.from(input.files).forEach(file => {
            if (!validTypes.includes(file.type)) {
                alert(`❌ El archivo "${file.name}" no es válido. Solo PDF, JPG o PNG.`);
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert(`❌ El archivo "${file.name}" supera los 10MB.`);
                return;
            }
            const yaExiste = Array.from(input.dt.files).some(f => f.name === file.name);
            if (!yaExiste) input.dt.items.add(file);
        });
    }

    // 2. Validar límite total
    const totalPrevios = typeof archivosPreviosActivos !== 'undefined' ? archivosPreviosActivos.length : 0;
    let sePasoDeLimite = false;

    while (input.dt.files.length + totalPrevios > 3) {
        input.dt.items.remove(input.dt.files.length - 1);
        sePasoDeLimite = true;
    }

    if (sePasoDeLimite) {
        alert(`⚠️ Límite alcanzado: Solo puedes tener un máximo de 3 archivos en total (tienes ${totalPrevios} ya guardados). Se ignoraron los archivos extra.`);
    }

    // 3. Sincronizar input y pintar las cajitas
    input.files = input.dt.files;
    renderArchivosNuevos(id);
}

// Función para pintar las cajitas individuales de los archivos nuevos (Versión Premium)
function renderArchivosNuevos(inputId) {
    const input = document.getElementById(inputId);
    const nameDisplay = document.getElementById(`name_${inputId}`);
    const label = document.getElementById(`label_${inputId}`);
    const btnRemoveGlobal = document.getElementById(`btn_remove_${inputId}`);

    if (!input || !nameDisplay || !label) return;

    if (input.files && input.files.length > 0) {
        label.classList.remove('file-error');
        label.classList.add('file-uploaded');
        if (btnRemoveGlobal) btnRemoveGlobal.classList.add('hidden');

        // Dibujar tarjetas limpias, forzando los estilos de los iconos con !important para que tu CSS no los haga gigantes
        const nombresHTML = Array.from(input.files).map((f, index) => {
            // Asignar un ícono y color dependiendo del tipo de archivo
            let iconClass = 'fa-file-lines';
            let iconColor = '#64748B'; // Gris por defecto
            if (f.type === 'application/pdf') {
                iconClass = 'fa-file-pdf';
                iconColor = '#E11D48'; // Rojo PDF
            } else if (f.type.startsWith('image/')) {
                iconClass = 'fa-image';
                iconColor = '#2563EB'; // Azul Imagen
            }

            return `
            <div style="display: flex; align-items: center; justify-content: space-between; background: white; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; margin-bottom: 8px; width: 100%; max-width: 280px; box-shadow: 0 2px 4px rgba(0,0,0,0.03); cursor: default;" onclick="event.preventDefault(); event.stopPropagation();">
                <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; width: calc(100% - 24px);">
                    <i class="fa-solid ${iconClass}" style="font-size: 1.2rem !important; color: ${iconColor} !important; margin: 0 !important; line-height: 1 !important;"></i>
                    <span style="font-size: 0.85rem; color: var(--color-azul-marino); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; width: 100%;" title="${alumnoEscape(f.name)}">
                        ${alumnoEscape(f.name)}
                    </span>
                </div>
                <button type="button" onclick="quitarArchivoIndividual('${inputId}', ${index}, event)" title="Quitar archivo" style="background: none; border: none; padding: 2px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
                    <i class="fa-solid fa-circle-xmark" style="font-size: 1.1rem !important; color: #94A3B8 !important; margin: 0 !important; line-height: 1 !important; transition: color 0.2s;" onmouseover="this.style.color='var(--color-rojo-oscuro)'" onmouseout="this.style.color='#94A3B8'"></i>
                </button>
            </div>
            `;
        }).join('');

        nameDisplay.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; margin-top: 15px; width: 100%;">${nombresHTML}</div>`;
    } else {
        label.classList.remove('file-uploaded', 'file-error');
        if (btnRemoveGlobal) btnRemoveGlobal.classList.add('hidden');
        nameDisplay.innerHTML = '';
        input.value = '';
        if (input.dt) input.dt = new DataTransfer();
    }
}

// Función que elimina UN SOLO archivo de la canasta usando su índice
function quitarArchivoIndividual(inputId, fileIndex, event) {
    // Evitamos que al darle clic a la tachita se abra el buscador de Windows/Mac
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const input = document.getElementById(inputId);
    if (!input || !input.dt) return;

    // Quitamos exactamente el archivo que el usuario quiere
    input.dt.items.remove(fileIndex);

    // Sincronizamos y volvemos a pintar
    input.files = input.dt.files;
    renderArchivosNuevos(inputId);
}

function renderArchivosPreviosEdicion() {
    const uploadZone = document.getElementById('upload-zone-dinamica');
    if (!uploadZone) return;

    // Quitamos la alerta anterior si existe para no duplicarla
    const existingAlert = uploadZone.querySelector('.archivos-previos-container');
    if (existingAlert) existingAlert.remove();

    if (archivosPreviosActivos.length > 0) {
        const linksHTML = archivosPreviosActivos.map(url => {
            const nombre = url.split('/').pop();
            return `
                <div style="display: inline-flex; align-items: center; background: white; padding: 4px 10px; border-radius: 6px; border: 1px solid #CBD5E1; margin: 4px 8px 4px 0; gap: 8px;">
                    <a href="${alumnoEscape(urlArchivoJustificante(url))}" target="_blank" rel="noopener" style="font-size: 0.9rem; text-decoration: none; color: var(--color-azul-marino);">
                        <i class="fa-solid fa-paperclip"></i> ${alumnoEscape(nombre)}
                    </a>
                    <button type="button" onclick="quitarArchivoPrevio('${url}')" title="Eliminar archivo" style="background: none; border: none; color: var(--color-rojo-oscuro); cursor: pointer; padding: 2px;">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `;
        }).join('');

        uploadZone.insertAdjacentHTML('afterbegin', `
            <div class="alert-info archivos-previos-container" style="grid-column:1/-1;margin-bottom:12px; display: block;">
                <strong>Archivos ya subidos:</strong><br>
                <div style="margin-top: 8px;">${linksHTML}</div>
                <small style="display: block; margin-top: 8px;">Puedes eliminar los archivos anteriores dando clic en la tachita si te equivocaste.</small>
            </div>
        `);
    }
}

function quitarArchivoPrevio(urlToRemove) {
    // Filtramos el arreglo para quitar la url que coincide
    archivosPreviosActivos = archivosPreviosActivos.filter(url => url !== urlToRemove);
    // Volvemos a pintar la lista
    renderArchivosPreviosEdicion();
}

function removerArchivoSubido(id, e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    const input = document.getElementById(id);
    const nameDisplay = document.getElementById(`name_${id}`);
    const label = document.getElementById(`label_${id}`);
    const btnRemove = document.getElementById(`btn_remove_${id}`);

    if (input) {
        input.value = '';
        input.dt = new DataTransfer(); // Vaciamos la canasta acumuladora
    }
    if (nameDisplay) nameDisplay.textContent = '';
    if (label) label.classList.remove('file-uploaded', 'file-error');
    if (btnRemove) btnRemove.classList.add('hidden');

    console.log(`🗑️ Archivos vaciados de la caja [${id}]`);
}

async function verDetallesTramite(id) {
    const card = document.querySelector(`.j-card[data-id="${id}"]`);
    if (!card) return;

    const modal = document.getElementById('modal-detalle-tramite');
    if (!modal) return;

    modal.classList.remove('hidden');

    const contenido = document.getElementById('detalle-contenido');
    const footer = document.getElementById('detalle-footer');
    const estatus = document.getElementById('detalle-estatus');

    const motivo = card.dataset.motivo || 'salud';
    const estatusVal = card.dataset.estatus || 'pendiente';
    const tipo = card.dataset.tipo || 'completo';
    const fechaInicio = card.dataset.fecha || card.dataset.fechaInicio || card.dataset.fechainicio || new Date().toISOString().split('T')[0];
    const fechaFin = card.dataset.fechaFin || card.dataset.fechafin || fechaInicio;
    const descripcion = card.dataset.descripcion || 'Sin descripción';
    const archivos = card.dataset.archivos || '';
    const tituloTarjeta = card.querySelector('h4')?.textContent || 'Enfermedad / Cita Médica';

    const tipoTexto = { 'completo': 'Día Completo', 'materias': 'Materias Específicas', 'rango': 'Rango de Fechas' };

    // Loader temporal
    if (contenido) {
        contenido.innerHTML = `
            <div style="text-align:center; padding: 3rem;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--color-dorado);"></i>
                <p style="margin-top: 10px; color: #64748B;">Analizando calendario de materias...</p>
            </div>`;
    }

    let materiasHTML = '';

    if (tipo === 'materias' && card.dataset.materias && card.dataset.materias !== 'undefined') {
        const materiasArray = card.dataset.materias.split(',').map(m => m.trim());
        const badgesHTML = materiasArray.map(m => `
            <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(25, 42, 86, 0.05); border: 1px solid rgba(25, 42, 86, 0.15); color: var(--color-azul-marino); padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; margin: 4px 4px 0 0;">
                <i class="fa-solid fa-book-bookmark" style="color: var(--color-dorado);"></i>
                <strong>${alumnoEscape(m)}</strong>
            </span>
        `).join('');

        materiasHTML = `
        <div class="detalle-item detalle-item-full">
            <label>Materias Afectadas</label>
            <div style="display: flex; flex-wrap: wrap; margin-top: 6px;">
                ${badgesHTML}
            </div>
        </div>`;
    } else {
        try {
            // --- MAGIA NUEVA: CALCULAR MÚLTIPLES DÍAS ---
            const datesToFetch = [];

            // Si es un rango de fechas, calculamos los días intermedios
            if (tipo === 'rango' && fechaInicio !== fechaFin) {
                const start = new Date(fechaInicio + 'T00:00:00');
                const end = new Date(fechaFin + 'T00:00:00');
                let curr = new Date(start);
                let maxDays = 30; // Límite de seguridad por si ponen fechas irreales

                while (curr <= end && maxDays > 0) {
                    // Omitir fines de semana (0 = Domingo, 6 = Sábado)
                    if (curr.getDay() !== 0 && curr.getDay() !== 6) {
                        datesToFetch.push(curr.toISOString().split('T')[0]);
                    }
                    curr.setDate(curr.getDate() + 1);
                    maxDays--;
                }
            } else {
                datesToFetch.push(fechaInicio); // Si es un solo día
            }

            // Consultar todos los días de golpe (en paralelo) para no trabar el sistema
            const promises = datesToFetch.map(d => apiAlumno('materias_por_dia', { query: { fecha: d } }));
            const results = await Promise.all(promises);

            let allBadges = '';
            let hasSubjects = false;

            results.forEach((dataMat, index) => {
                if (dataMat?.materias?.materias?.length > 0) {
                    hasSubjects = true;
                    const diaSemana = dataMat.materias.dia_semana;
                    const fechaStr = datesToFetch[index];

                    const badgesHTML = dataMat.materias.materias.map(m => `
                        <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(25, 42, 86, 0.05); border: 1px solid rgba(25, 42, 86, 0.15); color: var(--color-azul-marino); padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; margin: 4px 4px 0 0;">
                            <i class="fa-solid fa-book-bookmark" style="color: var(--color-dorado);"></i>
                            <strong>${alumnoEscape(m.materia)}</strong>
                            <span style="color: #64748B; border-left: 1px solid #CBD5E1; padding-left: 8px; margin-left: 2px; display: flex; align-items: center; gap: 4px;">
                                <i class="fa-regular fa-clock" style="font-size: 0.8rem;"></i> ${m.hora_inicio}
                            </span>
                        </span>
                    `).join('');

                    // Si son varios días, los agrupamos poniéndoles un título
                    if (datesToFetch.length > 1) {
                        allBadges += `
                            <div style="margin-top: ${index === 0 ? '0' : '12px'}; width: 100%; border-bottom: 1px dashed #E2E8F0; padding-bottom: 10px;">
                                <div style="font-size: 0.75rem; color: #64748B; margin-bottom: 8px; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; gap: 5px;">
                                    <i class="fa-regular fa-calendar-day" style="color: var(--color-dorado);"></i> ${diaSemana} - ${fechaStr}
                                </div>
                                <div style="display: flex; flex-wrap: wrap;">
                                    ${badgesHTML}
                                </div>
                            </div>
                         `;
                    } else {
                        allBadges += badgesHTML;
                    }
                }
            });

            if (hasSubjects) {
                materiasHTML = `
                <div class="detalle-item detalle-item-full">
                    <label>Materias Afectadas ${datesToFetch.length > 1 ? '(Desglose por día)' : ''}</label>
                    <div style="${datesToFetch.length > 1 ? 'display: flex; flex-direction: column; margin-top: 10px;' : 'display: flex; flex-wrap: wrap; margin-top: 6px;'}">
                        ${allBadges}
                    </div>
                </div>`;
            } else {
                materiasHTML = `
                <div class="detalle-item detalle-item-full">
                    <label>Materias Afectadas</label>
                    <span style="display: inline-block; padding: 6px 12px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px; color: #64748B; font-size: 0.9rem; margin-top: 4px;">
                        <i class="fa-solid fa-mug-hot" style="margin-right: 5px;"></i> Ninguna materia programada para ${datesToFetch.length > 1 ? 'estas fechas' : 'esta fecha'}.
                    </span>
                </div>`;
            }
        } catch (error) {
            materiasHTML = `
            <div class="detalle-item detalle-item-full">
                <label>Materias Afectadas</label>
                <span style="display: inline-block; padding: 6px 12px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; color: var(--color-rojo-oscuro); font-size: 0.9rem; margin-top: 4px;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Error al cargar el horario.
                </span>
            </div>`;
        }
    }

    if (contenido) {
        contenido.innerHTML = `
            <div class="detalle-grid">
                <div class="detalle-item">
                    <label>${tipo === 'rango' ? 'Período' : 'Fecha'}</label>
                    <span>${fechaInicio}${tipo === 'rango' && fechaInicio !== fechaFin ? ' al ' + fechaFin : ''}</span>
                </div>
                <div class="detalle-item">
                    <label>Tipo de Justificación</label>
                    <span>${tipoTexto[tipo] || tipo}</span>
                </div>
                
                ${materiasHTML}
                
                <div class="detalle-item detalle-item-full">
                    <label>Motivo</label>
                    <span>${tituloTarjeta}</span>
                </div>
                <div class="detalle-item detalle-item-full">
                    <label>Descripción</label>
                    <span>${descripcion}</span>
                </div>
                <div class="detalle-item detalle-item-full">
                    <label>Documentos Adjuntos</label>
                    <span>${renderLinksArchivosJustificante(archivos)}</span>
                </div>
                <div class="detalle-item">
                    <label>Estatus Actual</label>
                    <span class="badge-status ${estatusVal}" style="display:inline-block; margin-top:5px;">${estatusVal === 'pendiente' ? 'EN REVISIÓN' : estatusVal.toUpperCase()}</span>
                </div>
            </div>`;
    }

    if (footer) {
        let footerHTML = `<button class="btn-mega btn-cerrar-detalle" onclick="cerrarModalDetalle()">
            <i class="fa-solid fa-xmark"></i> Cerrar</button>`;
        if (estatusVal === 'pendiente') {
            footerHTML += `<button class="btn-mega" onclick="cerrarModalDetalle(); abrirEdicionTramite('${id}')">
                <i class="fa-solid fa-lock"></i> Editar Trámite (Requiere PIN)</button>`;
        }
        footer.innerHTML = footerHTML;
    }
}

function cerrarModalDetalle() {
    const modal = document.getElementById('modal-detalle-tramite');
    if (modal) modal.classList.add('hidden');
}

function abrirEdicionTramite(id) {
    const card = document.querySelector(`.j-card[data-id="${id}"]`);
    if (!card || card.dataset.estatus !== 'pendiente') {
        alert('⚠️ Solo se pueden editar trámites pendientes.');
        return;
    }

    tramitePendienteEdicion = id;

    const modal = document.getElementById('modal-auth');
    const inputPin = document.getElementById('pin-tutor');
    const errorPin = document.getElementById('error-pin');

    if (!modal || !inputPin) return;

    const modalTitle = modal.querySelector('h3');
    const modalText = modal.querySelector('p');
    const btnValidar = document.getElementById('btn-validar-pin');

    if (modalTitle) modalTitle.textContent = 'Autorización para Editar';
    if (modalText) modalText.textContent = 'Ingresa el PIN de padre o tutor para autorizar la edición de este trámite.';
    if (btnValidar) btnValidar.textContent = 'Autorizar Edición';

    modal.classList.remove('hidden');
    inputPin.value = '';
    if (errorPin) errorPin.classList.add('hidden');
    setTimeout(() => inputPin.focus(), 200);
}

function confirmarEliminarTramite(id) {
    const card = document.querySelector(`.j-card[data-id="${id}"]`);
    if (!card || card.dataset.estatus !== 'pendiente') {
        alert('⚠️ Solo se pueden eliminar trámites pendientes.');
        return;
    }
    tramiteAEliminar = id;
    const modal = document.getElementById('modal-confirm-eliminar');
    if (modal) modal.classList.remove('hidden');
}

function cerrarModalConfirmEliminar() {
    const modal = document.getElementById('modal-confirm-eliminar');
    if (modal) modal.classList.add('hidden');
    tramiteAEliminar = null;
}

function filtrarTramites() {
    const buscarTramite = document.getElementById('buscar-tramite');
    const filtroEstatus = document.getElementById('filtro-estatus');

    const busqueda = buscarTramite ? buscarTramite.value.toLowerCase() : '';
    const filtro = filtroEstatus ? filtroEstatus.value : 'todos';
    const cards = document.querySelectorAll('.j-card');
    let visibles = 0;

    cards.forEach(card => {
        const texto = card.textContent.toLowerCase();
        const estatus = card.dataset.estatus;
        const coincideBusqueda = busqueda === '' || texto.includes(busqueda);
        const coincideFiltro = filtro === 'todos' || estatus === filtro;
        if (coincideBusqueda && coincideFiltro) {
            card.classList.remove('hidden');
            visibles++;
        } else {
            card.classList.add('hidden');
        }
    });

    const sinTramites = document.getElementById('sin-tramites');
    if (sinTramites) {
        sinTramites.classList.toggle('hidden', visibles > 0);
    }
}

function extraerGrado(grupo) {
    const match = String(grupo || '').match(/[0-9]+/);
    return match ? `${match[0]}°` : '';
}

function motivoDesdeAsunto(asunto) {
    const texto = String(asunto || '').toLowerCase();
    if (texto.includes('méd') || texto.includes('med') || texto.includes('enfer')) return 'salud';
    if (texto.includes('viaje') || texto.includes('congreso')) return 'viaje';
    return 'personal';
}

function iconoJustificante(motivo) {
    return { salud: 'fa-notes-medical', personal: 'fa-users', viaje: 'fa-bus' }[motivo] || 'fa-file-lines';
}

function estadoJustificante(estado) {
    return estado === 'aprobado' ? 'Aprobado' : estado === 'rechazado' ? 'Rechazado' : 'En Revisión';
}

function asuntoJustificante(motivo) {
    return {
        salud: 'Enfermedad / Cita Médica',
        personal: 'Asuntos Familiares / Personales',
        viaje: 'Viaje Escolar / Congreso'
    }[motivo] || 'Justificante';
}

// ==========================================
// ABANDONAR MATERIA
// ==========================================

function confirmarAbandonarMateria() {
    if (!cursoActualDetalle) return;

    const nombreMateria = document.getElementById('detalle-materia-nombre').textContent;
    document.getElementById('nombre-materia-abandono').textContent = nombreMateria;

    const modal = document.getElementById('modal-confirm-abandono');
    if (modal) modal.classList.remove('hidden');
}

function cerrarModalConfirmAbandono() {
    const modal = document.getElementById('modal-confirm-abandono');
    if (modal) modal.classList.add('hidden');
}

async function ejecutarAbandonarMateria() {
    if (!cursoActualDetalle) return;

    try {
        await apiAlumno('abandonar_materia', {
            method: 'POST',
            body: { id_curso: cursoActualDetalle }
        });

        alert('✅ Has abandonado la clase exitosamente.');
        cerrarModalConfirmAbandono();
        cerrarModalDetalleMateria();

        // Recargar la vista de materias
        await initMateriasLogic();
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
        cerrarModalConfirmAbandono();
    }
}


// ==========================================
// 12. INICIALIZACIÓN AL CARGAR LA PÁGINA
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Asignar funciones globales
    window.loadSection = loadSection;
    window.showWelcomeView = showWelcomeView;
    window.descargarHorarioDemo = descargarHorarioDemo;

    // Inicializar portal
    inicializarPortalAlumno();
    setupLogoHome();

    // Configurar navegación
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            loadSection(item.getAttribute('data-section'));
        });
    });

    // Cargar vista inicial
    loadSection('bienvenida');
});

console.log('🚀 mainAlumno.js cargado correctamente - Todas las funcionalidades listas.');

// ==========================================
// CERRAR SESIÓN (LOGOUT)
// ==========================================
function cerrarModalLogout() {
    const modal = document.getElementById('modal-logout');
    if (modal) modal.classList.add('hidden');
}

async function ejecutarLogout() {
    try {
        await fetch(`${ALUMNO_SESION_API}?accion=logout`);
    } catch (e) {
        console.error("Error al cerrar sesión", e);
    } finally {
        window.location.href = '../index.html';
    }
}
