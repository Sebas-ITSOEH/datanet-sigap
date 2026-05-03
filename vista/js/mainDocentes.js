/* =========================================
   SISTEMA DE NAVEGACIÓN Y MODALES
========================================= */

function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    if (modal.style.display === "block") {
        modal.style.display = "none";
    } else {
        modal.style.display = "block";
    }
}

// Cerrar modal si se hace clic fuera de él
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

// Lógica para cargar las vistas dinámicas
async function loadSection(sectionName) {
    const viewContainer = document.getElementById('view-container');
    
    try {
        const response = await fetch(`docente/${sectionName}.html`);
        
        if (!response.ok) {
            throw new Error(`No se encontró el archivo: ../vista/docente${sectionName}.html`);
        }
        
        const html = await response.text();
        viewContainer.innerHTML = html;
        
        // Reiniciar animación para que se vea el cambio suave
        viewContainer.classList.remove('fade-in');
        void viewContainer.offsetWidth; 
        viewContainer.classList.add('fade-in');

        console.log(`Sección ${sectionName} cargada exitosamente.`);

        // NUEVO: Si la sección que se cargó es la lista, disparamos la fecha y trimestre automático
        if (sectionName === 'lista' && typeof inicializarPaseLista === 'function') {
            setTimeout(inicializarPaseLista, 50);
        }
        
        // NUEVO: Si la sección que se cargó es misClases, inicializamos sus datos
        if (sectionName === 'misClases' && typeof inicializarMisClases === 'function') {
            setTimeout(inicializarMisClases, 100);
        }

    } catch (error) {
        console.error("Error al cargar la sección:", error);
        viewContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #EF4444;">
                <h2><i class="fa-solid fa-triangle-exclamation"></i> Error de Carga</h2>
                <p>No se pudo cargar la sección solicitada. Verifique la consola para más detalles.</p>
            </div>
        `;
    }
}

/* =========================================
   LÓGICA DEL PASE DE LISTA (AUTOMATIZACIÓN)
========================================= */

function inicializarPaseLista() {
    const dateDisplay = document.getElementById('current-date-display');
    const trimestreInput = document.getElementById('trimestre-activo');

    if (dateDisplay) {
        const ahora = new Date();
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        let fechaFormateada = ahora.toLocaleDateString('es-ES', opciones);
        fechaFormateada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
        dateDisplay.innerText = fechaFormateada;
    }

    if (trimestreInput) {
        trimestreInput.value = obtenerTrimestreActual();
    }
}

function obtenerTrimestreActual() {
    const fecha = new Date();
    const mes = fecha.getMonth() + 1;
    const dia = fecha.getDate();

    if ((mes === 9 && dia >= 1) || (mes === 10) || (mes === 11 && dia <= 21)) {
        return "1er Trimestre";
    }
    
    if ((mes === 11 && dia >= 24) || (mes === 12) || (mes === 1) || (mes === 2) || (mes === 3 && dia <= 26)) {
        return "2do Trimestre";
    }
    
    if ((mes === 4 && dia >= 13) || (mes === 5) || (mes === 6) || (mes === 7 && dia <= 17)) {
        return "3er Trimestre";
    }

    return "Periodo Vacacional / Receso";
}

/* =========================================
   LÓGICA DE ALUMNOS Y BOTONES DE ASISTENCIA
========================================= */

function cargarAlumnos(grupo) {
    const panel = document.getElementById('panel-asistencia');
    const tbody = document.getElementById('lista-alumnos-body');
    tbody.innerHTML = '';

    if (!grupo) {
        panel.style.display = 'none';
        return;
    }

    const alumnosFalsos = [
        { id: 1, nombre: "Aguilar Pérez, Carlos", estado: "pendiente" },
        { id: 2, nombre: "Bautista Gómez, María", estado: "pendiente" },
        { id: 3, nombre: "Castillo Rojas, Javier", estado: "permiso" },
        { id: 4, nombre: "Díaz Luna, Valeria", estado: "pendiente" }
    ];

    alumnosFalsos.forEach(alumno => {
        const tr = document.createElement('tr');
        
        let estadoHTML = '';
        let botonesHTML = '';

        if (alumno.estado === 'permiso') {
            estadoHTML = `
                <span class="badge badge-permiso" id="badge-${alumno.id}">
                    <i class="fa-solid fa-file-medical"></i> Permiso Justificado
                </span>
                <div class="motivo-text">Cita médica (Validado por Prefectura)</div>
            `;
            botonesHTML = `
                <div class="action-group">
                    <button class="disabled-btn" disabled>Justificado</button>
                </div>
            `;
        } else {
            estadoHTML = `
                <span class="badge badge-pendiente" id="badge-${alumno.id}">
                    <i class="fa-solid fa-minus"></i> Sin registro
                </span>
            `;
            botonesHTML = `
                <div class="action-group">
                    <button class="btn-action btn-asistencia" title="Presente" onclick="marcarAsistencia(${alumno.id}, 'asistencia')">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button class="btn-action btn-retardo" title="Retardo" onclick="marcarAsistencia(${alumno.id}, 'retardo')">
                        <i class="fa-solid fa-clock"></i>
                    </button>
                    <button class="btn-action btn-falta" title="Falta" onclick="marcarAsistencia(${alumno.id}, 'falta')">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `;
        }

        tr.innerHTML = `
            <td>
                <div class="student-info-table">
                    <img src="https://ui-avatars.com/api/?name=${alumno.nombre}&background=random&color=fff" class="avatar-table" alt="avatar">
                    <span><b>${alumno.nombre}</b><br><small>Matrícula: ALM-${2000 + alumno.id}</small></span>
                </div>
            </td>
            <td>${estadoHTML}</td>
            <td>${botonesHTML}</td>
        `;
        tbody.appendChild(tr);
    });

    panel.style.display = 'block';
    panel.classList.remove('fade-in');
    void panel.offsetWidth; 
    panel.classList.add('fade-in');
}

function marcarAsistencia(idAlumno, tipo) {
    const badge = document.getElementById(`badge-${idAlumno}`);
    if (!badge) return;

    badge.className = 'badge';

    if (tipo === 'asistencia') {
        badge.classList.add('badge-asistencia');
        badge.innerHTML = '<i class="fa-solid fa-check"></i> Presente';
    } else if (tipo === 'retardo') {
        badge.classList.add('badge-retardo');
        badge.innerHTML = '<i class="fa-solid fa-clock"></i> Retardo';
    } else if (tipo === 'falta') {
        badge.classList.add('badge-falta');
        badge.innerHTML = '<i class="fa-solid fa-xmark"></i> Falta';
    }
}

function guardarAsistencia() {
    alert("¡Registro del día guardado exitosamente en la base de datos!");
    document.getElementById('panel-asistencia').style.display = 'none';
    document.getElementById('grupo-select').value = "";
}

/* =========================================
   FUNCIONES DE EXPORTACIÓN (EXCEL / PDF)
========================================= */

function exportarExcelLista() {
    const grupo = document.getElementById('grupo-select');
    const grupoNombre = grupo ? grupo.options[grupo.selectedIndex]?.text : '';
    
    if (!grupo || !grupo.value) {
        alert("Por favor, seleccione un grupo antes de exportar.");
        return;
    }
    
    // Obtener datos de la tabla
    const filas = document.querySelectorAll('#lista-alumnos-body tr');
    
    if (filas.length === 0) {
        alert("No hay alumnos en la lista para exportar.");
        return;
    }
    
    // Obtener fecha actual
    const fecha = document.getElementById('current-date-display')?.innerText || new Date().toLocaleDateString('es-ES');
    const trimestre = document.getElementById('trimestre-activo')?.value || '';
    
    // Construir contenido CSV
    let contenido = '\uFEFF'; // BOM para UTF-8
    contenido += `CONTROL DE ASISTENCIA\n`;
    contenido += `Grupo: "${grupoNombre}"\n`;
    contenido += `Fecha: "${fecha}"\n`;
    contenido += `Periodo: "${trimestre}"\n\n`;
    contenido += `No.,Alumno,Matrícula,Estado\n`;
    
    let contador = 1;
    filas.forEach(fila => {
        const nombre = fila.querySelector('b')?.innerText || '';
        const matricula = fila.querySelector('small')?.innerText?.replace('Matrícula: ', '') || '';
        const badge = fila.querySelector('.badge');
        let estado = 'Sin registro';
        
        if (badge) {
            if (badge.classList.contains('badge-asistencia')) estado = 'Presente';
            else if (badge.classList.contains('badge-retardo')) estado = 'Retardo';
            else if (badge.classList.contains('badge-falta')) estado = 'Falta';
            else if (badge.classList.contains('badge-permiso')) estado = 'Permiso Justificado';
            else if (badge.classList.contains('badge-pendiente')) estado = 'Sin registro';
        }
        
        contenido += `${contador},"${nombre}","${matricula}","${estado}"\n`;
        contador++;
    });
    
    // Agregar resumen
    const presentes = document.getElementById('contador-presentes')?.textContent || '0';
    const retardos = document.getElementById('contador-retardos')?.textContent || '0';
    const faltas = document.getElementById('contador-faltas')?.textContent || '0';
    const justificados = document.getElementById('contador-justificados')?.textContent || '0';
    
    contenido += `\n`;
    contenido += `RESUMEN\n`;
    contenido += `"Presentes","${presentes}"\n`;
    contenido += `"Retardos","${retardos}"\n`;
    contenido += `"Faltas","${faltas}"\n`;
    contenido += `"Justificados","${justificados}"\n`;
    contenido += `\n`;
    contenido += `"Documento generado el","${new Date().toLocaleDateString('es-ES')}"\n`;
    contenido += `"Hora","${new Date().toLocaleTimeString('es-ES')}"\n`;
    
    // Crear y descargar archivo
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Nombre del archivo con fecha
    const fechaArchivo = new Date().toISOString().split('T')[0];
    const nombreGrupo = grupo.value.replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `Lista_Asistencia_${nombreGrupo}_${fechaArchivo}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Mostrar toast de confirmación
    mostrarToast('✅ Archivo Excel descargado exitosamente', 'success');
}


function exportarPDFLista() {
    const grupo = document.getElementById('grupo-select');
    const grupoNombre = grupo ? grupo.options[grupo.selectedIndex]?.text : '';
    
    if (!grupo || !grupo.value) {
        alert("Por favor, seleccione un grupo antes de exportar.");
        return;
    }
    
    // Obtener datos de la tabla
    const filas = document.querySelectorAll('#lista-alumnos-body tr');
    
    if (filas.length === 0) {
        alert("No hay alumnos en la lista para exportar.");
        return;
    }
    
    const fecha = document.getElementById('current-date-display')?.innerText || new Date().toLocaleDateString('es-ES');
    const trimestre = document.getElementById('trimestre-activo')?.value || '';
    
    // Obtener resumen
    const presentes = document.getElementById('contador-presentes')?.textContent || '0';
    const retardos = document.getElementById('contador-retardos')?.textContent || '0';
    const faltas = document.getElementById('contador-faltas')?.textContent || '0';
    const justificados = document.getElementById('contador-justificados')?.textContent || '0';
    
    // Construir tabla HTML
    let filasHTML = '';
    let contador = 1;
    
    filas.forEach(fila => {
        const nombre = fila.querySelector('b')?.innerText || '';
        const matricula = fila.querySelector('small')?.innerText?.replace('Matrícula: ', '') || '';
        const badge = fila.querySelector('.badge');
        let estado = 'Sin registro';
        let colorEstado = '#475569';
        let bgEstado = '#E2E8F0';
        
        if (badge) {
            if (badge.classList.contains('badge-asistencia')) {
                estado = 'Presente';
                colorEstado = '#059669';
                bgEstado = '#DCFCE7';
            } else if (badge.classList.contains('badge-retardo')) {
                estado = 'Retardo';
                colorEstado = '#B45309';
                bgEstado = '#FFF8E1';
            } else if (badge.classList.contains('badge-falta')) {
                estado = 'Falta';
                colorEstado = '#A1232E';
                bgEstado = '#FEE2E2';
            } else if (badge.classList.contains('badge-permiso')) {
                estado = 'Permiso Justificado';
                colorEstado = '#192A56';
                bgEstado = '#E8EDF5';
            }
        }
        
        filasHTML += `
            <tr>
                <td style="text-align: center;">${contador}</td>
                <td>${nombre}</td>
                <td>${matricula}</td>
                <td style="text-align: center;">
                    <span style="background: ${bgEstado}; color: ${colorEstado}; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 0.8rem;">
                        ${estado}
                    </span>
                </td>
            </tr>
        `;
        contador++;
    });
    
    // Abrir ventana para imprimir
    const ventana = window.open('', '_blank', 'width=900,height=700');
    
    ventana.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Lista de Asistencia - ${grupoNombre}</title>
            <style>
                @media print {
                    body { margin: 0; padding: 20px; }
                    .no-print { display: none; }
                }
                
                * { box-sizing: border-box; margin: 0; padding: 0; }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    padding: 25px;
                    color: #1E293B;
                    background: white;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #192A56;
                }
                
                .header h1 {
                    color: #192A56;
                    margin: 0 0 10px 0;
                    font-size: 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                
                .header .info-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    margin-top: 15px;
                    text-align: center;
                }
                
                .header .info-item {
                    background: #F8FAFC;
                    padding: 10px;
                    border-radius: 8px;
                    border: 1px solid #E2E8F0;
                }
                
                .header .info-label {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #64748B;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    display: block;
                }
                
                .header .info-value {
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #192A56;
                    display: block;
                    margin-top: 3px;
                }
                
                table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0 6px;
                    margin-top: 15px;
                }
                
                th {
                    background: #192A56;
                    color: white;
                    padding: 10px 12px;
                    text-align: left;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                th:first-child { border-radius: 8px 0 0 8px; }
                th:last-child { border-radius: 0 8px 8px 0; }
                
                td {
                    padding: 10px 12px;
                    background: #F8FAFC;
                    border-top: 1px solid #E2E8F0;
                    border-bottom: 1px solid #E2E8F0;
                    font-size: 0.85rem;
                }
                
                td:first-child { border-left: 1px solid #E2E8F0; border-radius: 8px 0 0 8px; }
                td:last-child { border-right: 1px solid #E2E8F0; border-radius: 0 8px 8px 0; }
                
                .resumen {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                    margin-top: 25px;
                    padding: 15px;
                    background: #F8FAFC;
                    border-radius: 12px;
                    border: 1px solid #E2E8F0;
                }
                
                .resumen-item {
                    text-align: center;
                    padding: 10px;
                    border-radius: 8px;
                }
                
                .resumen-numero {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #192A56;
                    display: block;
                }
                
                .resumen-label {
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: #64748B;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .footer {
                    margin-top: 30px;
                    text-align: center;
                    color: #94A3B8;
                    font-size: 0.7rem;
                    border-top: 1px solid #E2E8F0;
                    padding-top: 15px;
                }
                
                .btn-imprimir {
                    display: block;
                    margin: 20px auto;
                    padding: 12px 30px;
                    background: #192A56;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background 0.3s;
                }
                
                .btn-imprimir:hover {
                    background: #D6A848;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📋 Control de Asistencia</h1>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Grupo / Materia</span>
                        <span class="info-value">${grupoNombre}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Fecha de Registro</span>
                        <span class="info-value">${fecha}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Periodo</span>
                        <span class="info-value">${trimestre}</span>
                    </div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 10%;">No.</th>
                        <th style="width: 45%;">Alumno</th>
                        <th style="width: 25%;">Matrícula</th>
                        <th style="width: 20%; text-align: center;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasHTML}
                </tbody>
            </table>
            
           
            
            <div class="footer">
                <p>Documento generado el ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} a las ${new Date().toLocaleTimeString('es-ES')}</p>
                <p>Sistema de Gestión de Asistencia Docente</p>
            </div>
            
            <button class="btn-imprimir no-print" onclick="window.print()">
                🖨️ Imprimir / Guardar como PDF
            </button>
            
            <script>
                // Auto-imprimir después de cargar
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            <\/script>
        </body>
        </html>
    `);
    
    ventana.document.close();
}

/**
 * Muestra un toast de notificación
 */
function mostrarToast(mensaje, tipo) {
    const toast = document.createElement('div');
    
    const bgColor = tipo === 'success' ? 'var(--color-azul-marino, #192A56)' : 'var(--color-rojo-oscuro, #A1232E)';
    
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        font-weight: 700;
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 8px 25px rgba(25, 42, 86, 0.3);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    toast.innerHTML = mensaje;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function descargarReporteTrimestral() {
    alert("Generando reporte trimestral de asistencia...\n\nLa descarga de su archivo Excel comenzará en breve.");
}

/* =========================================
   LÓGICA DE LA SECCIÓN MIS CLASES
========================================= */

// Base de datos simulada de TODOS los alumnos del sistema
const alumnosSistema = [
    { 
        id: 1, 
        nombre: 'Luis Martínez López',
        matricula: 'MAT2024001',
        curp: 'MALL080415HDFRNLA1',
        tutor: 'María López Hernández',
        telefonoTutor: '55-1234-5678'
    },
    { 
        id: 2, 
        nombre: 'Ana García Hernández',
        matricula: 'MAT2024002',
        curp: 'GAHA090612MDFRNNA2',
        tutor: 'Roberto García Ruiz',
        telefonoTutor: '55-2345-6789'
    },
    { 
        id: 3, 
        nombre: 'Carlos Pérez Díaz',
        matricula: 'MAT2024003',
        curp: 'PEDC100723HDFRZRA3',
        tutor: 'Laura Díaz Morales',
        telefonoTutor: '55-3456-7890'
    },
    { 
        id: 4, 
        nombre: 'María Rodríguez Silva',
        matricula: 'HIST2024001',
        curp: 'ROSM110205MDFDLRA4',
        tutor: 'José Rodríguez Pérez',
        telefonoTutor: '55-4567-8901'
    },
    { 
        id: 5, 
        nombre: 'Jorge Sánchez Ruiz',
        matricula: 'HIST2024002',
        curp: 'SARJ120918HDFNZRG5',
        tutor: 'Patricia Ruiz Gómez',
        telefonoTutor: '55-5678-9012'
    },
    {
        id: 6,
        nombre: 'Fernando Castillo Morales',
        matricula: 'MAT2024004',
        curp: 'CAMF090315HDFLRRA6',
        tutor: 'Roberto Castillo López',
        telefonoTutor: '55-6789-0123'
    },
    {
        id: 7,
        nombre: 'Sofía Hernández Vega',
        matricula: 'HIST2024003',
        curp: 'HEVS100502MDFRGFA7',
        tutor: 'Carmen Vega Sánchez',
        telefonoTutor: '55-7890-1234'
    },
    {
        id: 8,
        nombre: 'Diego Ramírez Torres',
        matricula: 'MAT2024005',
        curp: 'RATD110823HDFMRGA8',
        tutor: 'Miguel Ramírez Díaz',
        telefonoTutor: '55-8901-2345'
    }
];

// Datos simulados de clases
const clasesData = [
    {
        id: 1,
        nombre: 'Matemáticas II',
        desc: 'Álgebra y razonamiento lógico.',
        codigo: 'MAT2-A',
        grado: '2',
        grupo: 'A',
        horarios: ['Lunes 7:00-8:30', 'Miércoles 7:00-8:30'],
        icono: 'fa-calculator',
        alumnos: [
            { 
                id: 1, 
                nombre: 'Luis Martínez López',
                matricula: 'MAT2024001',
                curp: 'MALL080415HDFRNLA1',
                tutor: 'María López Hernández',
                telefonoTutor: '55-1234-5678'
            },
            { 
                id: 2, 
                nombre: 'Ana García Hernández',
                matricula: 'MAT2024002',
                curp: 'GAHA090612MDFRNNA2',
                tutor: 'Roberto García Ruiz',
                telefonoTutor: '55-2345-6789'
            },
            { 
                id: 3, 
                nombre: 'Carlos Pérez Díaz',
                matricula: 'MAT2024003',
                curp: 'PEDC100723HDFRZRA3',
                tutor: 'Laura Díaz Morales',
                telefonoTutor: '55-3456-7890'
            }
        ]
    },
    {
        id: 2,
        nombre: 'Historia Universal',
        desc: 'Desde la Edad Media hasta la Moderna.',
        codigo: 'HIST-101',
        grado: '3',
        grupo: 'B',
        horarios: ['Martes 8:30-10:00', 'Jueves 8:30-10:00'],
        icono: 'fa-book-open',
        alumnos: [
            { 
                id: 4, 
                nombre: 'María Rodríguez Silva',
                matricula: 'HIST2024001',
                curp: 'ROSM110205MDFDLRA4',
                tutor: 'José Rodríguez Pérez',
                telefonoTutor: '55-4567-8901'
            },
            { 
                id: 5, 
                nombre: 'Jorge Sánchez Ruiz',
                matricula: 'HIST2024002',
                curp: 'SARJ120918HDFNZRG5',
                tutor: 'Patricia Ruiz Gómez',
                telefonoTutor: '55-5678-9012'
            }
        ]
    }
];

let claseSeleccionadaId = null;
let reporteGenerado = null;

// ==========================================
// INICIALIZACIÓN
// ==========================================

function inicializarMisClases() {
    if (document.getElementById('clases-activas-container')) {
        cargarClasesActivas();
        cargarSolicitudes();
    }
}

const observer = new MutationObserver(() => {
    if (document.getElementById('clases-activas-container') && 
        document.getElementById('clases-activas-container').children.length === 0) {
        inicializarMisClases();
    }
});

observer.observe(document.body, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', inicializarMisClases);

// ==========================================
// CARGA DE DATOS INICIALES
// ==========================================

function cargarSolicitudes() {
    const container = document.getElementById('requests-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="request-item">
            <div class="student-avatar">
                <img src="https://ui-avatars.com/api/?name=Alan+Gomez&background=F1F5F9&color=6366f1" alt="Alumno">
            </div>
            <div class="request-info">
                <h4>Alan Gómez Sánchez</h4>
                <p>Solicita unirse a: <b>Matemáticas II (2°A)</b></p>
            </div>
            <div class="request-actions">
                <button class="btn-accept" title="Aceptar" onclick="aceptarSolicitud(this, 'Alan Gómez Sánchez')">
                    <i class="fa-solid fa-check"></i>
                </button>
                <button class="btn-decline" title="Rechazar" onclick="rechazarSolicitud(this, 'Alan Gómez Sánchez')">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        </div>
        <div class="request-item">
            <div class="student-avatar">
                <img src="https://ui-avatars.com/api/?name=Diana+Reyes&background=F1F5F9&color=6366f1" alt="Alumno">
            </div>
            <div class="request-info">
                <h4>Diana Reyes Fuentes</h4>
                <p>Solicita unirse a: <b>Historia Universal (3°B)</b></p>
            </div>
            <div class="request-actions">
                <button class="btn-accept" title="Aceptar" onclick="aceptarSolicitud(this, 'Diana Reyes Fuentes')">
                    <i class="fa-solid fa-check"></i>
                </button>
                <button class="btn-decline" title="Rechazar" onclick="rechazarSolicitud(this, 'Diana Reyes Fuentes')">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        </div>
    `;
}

function aceptarSolicitud(btn, nombre) {
    const item = btn.closest('.request-item');
    item.style.transition = 'all 0.3s';
    item.style.opacity = '0';
    item.style.transform = 'translateX(50px)';
    setTimeout(() => {
        item.remove();
        actualizarContadorSolicitudes();
        alert(`Solicitud de ${nombre} aceptada. El alumno ha sido agregado a la clase.`);
    }, 300);
}

function rechazarSolicitud(btn, nombre) {
    const item = btn.closest('.request-item');
    item.style.transition = 'all 0.3s';
    item.style.opacity = '0';
    item.style.transform = 'translateX(-50px)';
    setTimeout(() => {
        item.remove();
        actualizarContadorSolicitudes();
        alert(`Solicitud de ${nombre} rechazada.`);
    }, 300);
}

function actualizarContadorSolicitudes() {
    const container = document.getElementById('requests-container');
    const badge = document.getElementById('badge-solicitudes');
    if (container && badge) {
        const count = container.querySelectorAll('.request-item').length;
        badge.textContent = `${count} Pendiente${count !== 1 ? 's' : ''}`;
    }
}

function cargarClasesActivas() {
    const container = document.getElementById('clases-activas-container');
    if (!container) return;
    
    container.innerHTML = clasesData.map(clase => `
        <div class="clase-card">
            <div class="clase-banner">
                <span class="ciclo-tag">2025-2026</span>
                <div class="clase-icon">
                    <i class="fa-solid ${clase.icono}"></i>
                </div>
            </div>
            <div class="clase-body">
                <h3>${clase.nombre}</h3>
                <p class="desc">${clase.desc}</p>
                <div class="clase-detalles">
                    <span class="detalle-item">
                        <i class="fa-solid fa-graduation-cap"></i> ${clase.grado}° "${clase.grupo}"
                    </span>
                    ${clase.horarios.map(h => `
                        <span class="detalle-item">
                            <i class="fa-regular fa-clock"></i> ${h}
                        </span>
                    `).join('')}
                </div>
                <div class="clase-meta">
                    <span><i class="fa-solid fa-users"></i> ${clase.alumnos.length} Alumnos</span>
                    <span class="code-pill">CÓDIGO: <b>${clase.codigo}</b></span>
                </div>
            </div>
            <div class="clase-footer">
                <button class="btn-manage" onclick="abrirGestionClase(${clase.id})">
                    <i class="fa-solid fa-gear"></i> Gestionar Clase
                </button>
            </div>
        </div>
    `).join('');
}

// ==========================================
// AGREGAR / ELIMINAR HORARIOS DINÁMICOS
// ==========================================

function agregarHorario() {
    const container = document.getElementById('horarios-container');
    const rows = container.querySelectorAll('.horario-row');
    
    if (rows.length >= 1) {
        rows.forEach(row => {
            row.querySelector('.btn-remove-horario').style.display = 'flex';
        });
    }
    
    const newRow = document.createElement('div');
    newRow.className = 'horario-row';
    newRow.innerHTML = `
        <select class="dia-select" required>
            <option value="">Día...</option>
            <option value="Lunes">Lunes</option>
            <option value="Martes">Martes</option>
            <option value="Miércoles">Miércoles</option>
            <option value="Jueves">Jueves</option>
            <option value="Viernes">Viernes</option>
        </select>
        <select class="hora-inicio-select" required>
            <option value="">Inicio...</option>
            <option value="7:00">7:00</option>
            <option value="8:00">8:00</option>
            <option value="8:30">8:30</option>
            <option value="9:00">9:00</option>
            <option value="10:00">10:00</option>
            <option value="11:00">11:00</option>
            <option value="12:00">12:00</option>
        </select>
        <span class="hora-separator">a</span>
        <select class="hora-fin-select" required>
            <option value="">Fin...</option>
            <option value="8:30">8:30</option>
            <option value="9:00">9:00</option>
            <option value="10:00">10:00</option>
            <option value="10:30">10:30</option>
            <option value="11:30">11:30</option>
            <option value="12:30">12:30</option>
            <option value="13:00">13:00</option>
        </select>
        <button type="button" class="btn-remove-horario" onclick="eliminarHorario(this)" title="Eliminar horario">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(newRow);
    
    newRow.style.opacity = '0';
    newRow.style.transform = 'translateY(-10px)';
    newRow.style.transition = 'all 0.3s';
    setTimeout(() => {
        newRow.style.opacity = '1';
        newRow.style.transform = 'translateY(0)';
    }, 10);
}

function eliminarHorario(btn) {
    const row = btn.closest('.horario-row');
    const container = document.getElementById('horarios-container');
    const rows = container.querySelectorAll('.horario-row');
    
    if (rows.length <= 1) {
        alert('Debe tener al menos un horario.');
        return;
    }
    
    row.style.opacity = '0';
    row.style.transform = 'translateX(30px)';
    row.style.transition = 'all 0.3s';
    setTimeout(() => {
        row.remove();
        const remainingRows = container.querySelectorAll('.horario-row');
        if (remainingRows.length === 1) {
            remainingRows[0].querySelector('.btn-remove-horario').style.display = 'none';
        }
    }, 300);
}

// ==========================================
// CREAR NUEVA CLASE
// ==========================================

function crearClase(event) {
    event.preventDefault();
    
    const nombre = document.getElementById('nombreClase').value.trim();
    const grado = document.getElementById('gradoClase').value;
    const grupo = document.getElementById('grupoClase').value;
    const codigo = document.getElementById('codigoClase').value.trim();
    const descripcion = document.getElementById('descripcionClase').value.trim();

    const horarioRows = document.querySelectorAll('#horarios-container .horario-row');
    const horarios = [];
    let horarioValido = true;

    horarioRows.forEach(row => {
        const dia = row.querySelector('.dia-select').value;
        const inicio = row.querySelector('.hora-inicio-select').value;
        const fin = row.querySelector('.hora-fin-select').value;
        
        if (!dia || !inicio || !fin) {
            horarioValido = false;
        } else {
            horarios.push(`${dia} ${inicio}-${fin}`);
        }
    });

    if (!nombre || !grado || !grupo || !codigo) {
        alert('Por favor, complete todos los campos obligatorios.');
        return;
    }

    if (!horarioValido || horarios.length === 0) {
        alert('Por favor, configure al menos un horario completo.');
        return;
    }

    const nuevaClase = {
        id: clasesData.length + 1,
        nombre: nombre,
        desc: descripcion || 'Sin descripción.',
        codigo: codigo,
        grado: grado,
        grupo: grupo,
        horarios: horarios,
        icono: 'fa-chalkboard',
        alumnos: []
    };

    clasesData.push(nuevaClase);
    cargarClasesActivas();
    
    toggleModal('modal-crear');
    document.getElementById('form-crear-clase').reset();
    
    const container = document.getElementById('horarios-container');
    container.innerHTML = `
        <div class="horario-row">
            <select class="dia-select" required>
                <option value="">Día...</option>
                <option value="Lunes">Lunes</option>
                <option value="Martes">Martes</option>
                <option value="Miércoles">Miércoles</option>
                <option value="Jueves">Jueves</option>
                <option value="Viernes">Viernes</option>
            </select>
            <select class="hora-inicio-select" required>
                <option value="">Inicio...</option>
                <option value="7:00">7:00</option>
                <option value="8:00">8:00</option>
                <option value="8:30">8:30</option>
                <option value="9:00">9:00</option>
                <option value="10:00">10:00</option>
                <option value="11:00">11:00</option>
                <option value="12:00">12:00</option>
            </select>
            <span class="hora-separator">a</span>
            <select class="hora-fin-select" required>
                <option value="">Fin...</option>
                <option value="8:30">8:30</option>
                <option value="9:00">9:00</option>
                <option value="10:00">10:00</option>
                <option value="10:30">10:30</option>
                <option value="11:30">11:30</option>
                <option value="12:30">12:30</option>
                <option value="13:00">13:00</option>
            </select>
            <button type="button" class="btn-remove-horario" style="display:none;" onclick="eliminarHorario(this)" title="Eliminar horario">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
    `;
    
    alert(`¡Clase "${nombre}" creada exitosamente!`);
}

// ==========================================
// GESTIONAR CLASE
// ==========================================

function abrirGestionClase(idClase) {
    const clase = clasesData.find(c => c.id === idClase);
    if (!clase) return;

    claseSeleccionadaId = idClase;
    reporteGenerado = null;
    
    document.getElementById('titulo-gestion-modal').innerHTML = 
        `<i class="fa-solid fa-gear"></i> ${clase.nombre} (${clase.grado}° "${clase.grupo}")`;
    
    cargarAlumnosGestion(clase);
    
    document.getElementById('resultado-reporte').innerHTML = 
        '<p class="placeholder-message">Seleccione una semana y haga clic en "Consultar" para ver el reporte de asistencias del grupo.</p>';
    document.getElementById('semana-reporte').value = '';
    document.getElementById('export-buttons').style.display = 'none';
    
    cambiarTabGestion('alumnos');
    
    toggleModal('modal-gestionar');
}

function cargarAlumnosGestion(clase) {
    const listaContainer = document.getElementById('lista-alumnos-gestion');
    const totalSpan = document.getElementById('total-alumnos-gestion');
    
    if (!listaContainer || !totalSpan) return;
    
    totalSpan.textContent = clase.alumnos.length;
    
    if (clase.alumnos.length === 0) {
        listaContainer.innerHTML = `
            <p style="color: var(--text-muted); text-align: center; padding: 20px;">
                <i class="fa-solid fa-user-slash"></i> No hay alumnos inscritos en esta clase.
            </p>`;
    } else {
        listaContainer.innerHTML = clase.alumnos.map(alumno => `
            <div class="alumno-item" onclick="verDetalleAlumno(event, ${claseSeleccionadaId}, ${alumno.id})">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(alumno.nombre)}&background=192A56&color=fff" 
                     alt="${alumno.nombre}">
                <div class="alumno-info">
                    <strong>${alumno.nombre}</strong>
                    <small>Matrícula: ${alumno.matricula}</small>
                </div>
                <button class="btn-eliminar-alumno" 
                        title="Eliminar alumno" 
                        onclick="event.stopPropagation(); eliminarAlumno(${claseSeleccionadaId}, ${alumno.id})">
                    <i class="fa-solid fa-user-minus"></i>
                </button>
            </div>
        `).join('');
    }
}

function eliminarAlumno(idClase, idAlumno) {
    if (!confirm('¿Está seguro de eliminar este alumno de la clase?')) return;
    
    const clase = clasesData.find(c => c.id === idClase);
    if (clase) {
        const alumno = clase.alumnos.find(a => a.id === idAlumno);
        clase.alumnos = clase.alumnos.filter(a => a.id !== idAlumno);
        cargarAlumnosGestion(clase);
        cargarClasesActivas();
        alert(`Alumno "${alumno.nombre}" eliminado correctamente.`);
    }
}

// ==========================================
// NUEVO: MODAL PARA AGREGAR ALUMNO EXISTENTE
// ==========================================

function abrirModalAgregarAlumno() {
    const clase = clasesData.find(c => c.id === claseSeleccionadaId);
    if (!clase) return;
    
    // Crear modal dinámicamente si no existe
    let modal = document.getElementById('modal-agregar-alumno');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-agregar-alumno';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fa-solid fa-user-plus"></i> Agregar Alumno a la Clase</h3>
                    <button class="close-modal" onclick="toggleModal('modal-agregar-alumno')">&times;</button>
                </div>
                <div class="modern-form">
                    <div class="form-group">
                        <label><i class="fa-solid fa-magnifying-glass"></i> Buscar por Matrícula</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="buscar-matricula-input" placeholder="Ej: MAT2024001" style="flex: 1;">
                            <button class="btn-submit" onclick="buscarAlumnoPorMatricula()" style="white-space: nowrap;">
                                <i class="fa-solid fa-search"></i> Buscar
                            </button>
                        </div>
                    </div>
                    <div id="resultado-busqueda-alumno" style="margin-top: 15px;">
                        <!-- Aquí se muestra el resultado de la búsqueda -->
                    </div>
                    <div id="lista-alumnos-disponibles" style="margin-top: 20px;">
                        <h4 style="color: var(--color-azul-marino); margin-bottom: 10px;">
                            <i class="fa-solid fa-list"></i> Alumnos disponibles en el sistema
                        </h4>
                        <div id="alumnos-disponibles-lista" style="max-height: 300px; overflow-y: auto;">
                            <!-- Se llena dinámicamente -->
                        </div>
                    </div>
                    <div class="form-actions" style="margin-top: 20px;">
                        <button type="button" class="btn-cancel" onclick="toggleModal('modal-agregar-alumno')">Cancelar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Cargar lista de alumnos disponibles (que no están ya en la clase)
    cargarAlumnosDisponibles(clase);
    
    // Limpiar búsqueda anterior
    document.getElementById('buscar-matricula-input').value = '';
    document.getElementById('resultado-busqueda-alumno').innerHTML = '';
    
    toggleModal('modal-agregar-alumno');
}

function cargarAlumnosDisponibles(clase) {
    const container = document.getElementById('alumnos-disponibles-lista');
    if (!container) return;
    
    // Filtrar alumnos que NO están en la clase actual
    const idsEnClase = clase.alumnos.map(a => a.id);
    const alumnosDisponibles = alumnosSistema.filter(a => !idsEnClase.includes(a.id));
    
    if (alumnosDisponibles.length === 0) {
        container.innerHTML = `
            <p style="color: var(--text-muted); text-align: center; padding: 20px;">
                <i class="fa-solid fa-circle-check"></i> Todos los alumnos del sistema ya están en esta clase.
            </p>`;
        return;
    }
    
    container.innerHTML = alumnosDisponibles.map(alumno => `
        <div class="alumno-item" style="cursor: default;">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(alumno.nombre)}&background=192A56&color=fff" 
                 alt="${alumno.nombre}">
            <div class="alumno-info">
                <strong>${alumno.nombre}</strong>
                <small>Matrícula: ${alumno.matricula}</small>
            </div>
            <button class="btn-add-alumno" 
                    onclick="agregarAlumnoAClase(${alumno.id})" 
                    style="white-space: nowrap;">
                <i class="fa-solid fa-plus"></i> Agregar
            </button>
        </div>
    `).join('');
}

function buscarAlumnoPorMatricula() {
    const input = document.getElementById('buscar-matricula-input');
    const resultadoDiv = document.getElementById('resultado-busqueda-alumno');
    const matricula = input.value.trim();
    const clase = clasesData.find(c => c.id === claseSeleccionadaId);
    
    if (!matricula) {
        alert('Por favor, ingrese una matrícula para buscar.');
        return;
    }
    
    // Buscar en el sistema
    const alumno = alumnosSistema.find(a => 
        a.matricula.toLowerCase() === matricula.toLowerCase()
    );
    
    if (!alumno) {
        resultadoDiv.innerHTML = `
            <div style="background: #FEF2F2; padding: 15px; border-radius: 10px; color: var(--danger);">
                <i class="fa-solid fa-circle-xmark"></i> 
                <strong>No encontrado:</strong> No existe ningún alumno con la matrícula "${matricula}" en el sistema.
            </div>`;
        return;
    }
    
    // Verificar si ya está en la clase
    const yaEstaEnClase = clase.alumnos.some(a => a.id === alumno.id);
    
    if (yaEstaEnClase) {
        resultadoDiv.innerHTML = `
            <div style="background: #FFFBEB; padding: 15px; border-radius: 10px; color: #92400E;">
                <i class="fa-solid fa-triangle-exclamation"></i> 
                <strong>Ya inscrito:</strong> El alumno "${alumno.nombre}" ya pertenece a esta clase.
            </div>`;
        return;
    }
    
    // Mostrar resultado exitoso con botón para agregar
    resultadoDiv.innerHTML = `
        <div style="background: #F0FDF4; padding: 15px; border-radius: 10px; border: 2px solid var(--success);">
            <div style="display: flex; align-items: center; gap: 12px;">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(alumno.nombre)}&background=192A56&color=fff" 
                     alt="${alumno.nombre}" 
                     style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid var(--color-dorado);">
                <div style="flex: 1;">
                    <strong style="color: var(--color-azul-marino); font-size: 1rem;">${alumno.nombre}</strong><br>
                    <small style="color: var(--text-muted);">Matrícula: ${alumno.matricula} | CURP: ${alumno.curp}</small>
                </div>
                <button class="btn-submit" onclick="agregarAlumnoAClase(${alumno.id})" style="white-space: nowrap;">
                    <i class="fa-solid fa-user-plus"></i> Agregar a la Clase
                </button>
            </div>
        </div>
    `;
}

function agregarAlumnoAClase(idAlumno) {
    const clase = clasesData.find(c => c.id === claseSeleccionadaId);
    if (!clase) return;
    
    // Verificar que no esté ya en la clase
    if (clase.alumnos.some(a => a.id === idAlumno)) {
        alert('Este alumno ya está inscrito en la clase.');
        return;
    }
    
    // Buscar alumno en el sistema
    const alumno = alumnosSistema.find(a => a.id === idAlumno);
    if (!alumno) {
        alert('Alumno no encontrado en el sistema.');
        return;
    }
    
    // Agregar a la clase
    clase.alumnos.push({...alumno});
    
    // Actualizar vistas
    cargarAlumnosGestion(clase);
    cargarClasesActivas();
    
    // Actualizar lista de disponibles en el modal
    const claseActualizada = clasesData.find(c => c.id === claseSeleccionadaId);
    cargarAlumnosDisponibles(claseActualizada);
    document.getElementById('resultado-busqueda-alumno').innerHTML = '';
    document.getElementById('buscar-matricula-input').value = '';
    
    alert(`¡${alumno.nombre} ha sido agregado exitosamente a la clase!`);
}

// ==========================================
// DETALLE DEL ALUMNO (FICHA COMPLETA)
// ==========================================

function verDetalleAlumno(event, idClase, idAlumno) {
    if (event.target.closest('.btn-eliminar-alumno')) return;
    
    const clase = clasesData.find(c => c.id === idClase);
    if (!clase) return;
    
    const alumno = clase.alumnos.find(a => a.id === idAlumno);
    if (!alumno) return;
    
    const detalleBody = document.getElementById('detalle-alumno-body');
    detalleBody.innerHTML = `
        <div class="detalle-alumno-card">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(alumno.nombre)}&background=192A56&color=fff&size=150" 
                 alt="${alumno.nombre}" 
                 class="detalle-avatar">
            <h3 class="detalle-nombre">${alumno.nombre}</h3>
            
            <div class="detalle-grid">
                <div class="detalle-campo">
                    <label><i class="fa-solid fa-id-card"></i> Matrícula</label>
                    <span>${alumno.matricula}</span>
                </div>
                <div class="detalle-campo">
                    <label><i class="fa-solid fa-fingerprint"></i> CURP</label>
                    <span>${alumno.curp}</span>
                </div>
                <div class="detalle-campo">
                    <label><i class="fa-solid fa-user-tie"></i> Tutor</label>
                    <span>${alumno.tutor}</span>
                </div>
                <div class="detalle-campo">
                    <label><i class="fa-solid fa-phone"></i> Teléfono Tutor</label>
                    <span>${alumno.telefonoTutor}</span>
                </div>
                <div class="detalle-campo detalle-campo-full">
                    <label><i class="fa-solid fa-building-columns"></i> Clase</label>
                    <span>${clase.nombre} - ${clase.grado}° "${clase.grupo}"</span>
                </div>
            </div>
            <button class="btn-cancel" style="margin-top: 20px;" onclick="toggleModal('modal-detalle-alumno')">
                <i class="fa-solid fa-xmark"></i> Cerrar
            </button>
        </div>
    `;
    
    toggleModal('modal-detalle-alumno');
}

// ==========================================
// TABS DE GESTIÓN
// ==========================================

function cambiarTabGestion(tabName) {
    document.querySelectorAll('#modal-gestionar .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#modal-gestionar .tab-content').forEach(content => content.classList.remove('active'));
    
    if (tabName === 'alumnos') {
        document.querySelector('#modal-gestionar .tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('tab-alumnos').classList.add('active');
    } else if (tabName === 'reporte') {
        document.querySelector('#modal-gestionar .tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('tab-reporte').classList.add('active');
    }
}

// ==========================================
// REPORTE SEMANAL
// ==========================================

function generarReporteSemanal() {
    const semanaInput = document.getElementById('semana-reporte').value;
    const resultadoDiv = document.getElementById('resultado-reporte');
    const exportButtons = document.getElementById('export-buttons');
    const clase = clasesData.find(c => c.id === claseSeleccionadaId);
    
    if (!semanaInput) {
        alert('Por favor, seleccione una semana.');
        return;
    }
    
    if (!clase || clase.alumnos.length === 0) {
        resultadoDiv.innerHTML = `
            <p style="color: var(--danger); text-align: center;">
                <i class="fa-solid fa-triangle-exclamation"></i> 
                No hay alumnos en esta clase para generar un reporte.
            </p>`;
        exportButtons.style.display = 'none';
        return;
    }

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    
    reporteGenerado = {
        semana: semanaInput,
        clase: clase.nombre,
        grado: clase.grado,
        grupo: clase.grupo,
        codigo: clase.codigo,
        dias: diasSemana,
        alumnos: []
    };
    
    let tablaHTML = `
        <h4 style="color: var(--color-azul-marino); margin-bottom: 15px;">
            <i class="fa-solid fa-calendar-week"></i> Semana del ${semanaInput}
        </h4>
        <div style="overflow-x: auto;">
        <table class="tabla-reporte" id="tabla-reporte-data">
            <thead>
                <tr>
                    <th>Alumno</th>
                    <th>Matrícula</th>
                    ${diasSemana.map(dia => `<th>${dia}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    clase.alumnos.forEach(alumno => {
        const registroAlumno = {
            nombre: alumno.nombre,
            matricula: alumno.matricula,
            asistencias: []
        };
        
        tablaHTML += `<tr>
            <td><strong>${alumno.nombre}</strong></td>
            <td><small>${alumno.matricula}</small></td>`;
        
        diasSemana.forEach(() => {
            const asistio = Math.random() > 0.2;
            registroAlumno.asistencias.push(asistio);
            tablaHTML += `
                <td style="text-align: center;">
                    <span class="${asistio ? 'badge-asistio' : 'badge-falto'}">
                        <i class="fa-solid ${asistio ? 'fa-check' : 'fa-xmark'}"></i>
                    </span>
                </td>`;
        });
        
        tablaHTML += '</tr>';
        reporteGenerado.alumnos.push(registroAlumno);
    });

    tablaHTML += '</tbody></table></div>';
    
    tablaHTML += `
        <div style="margin-top: 15px; padding: 10px; background: #F0F9FF; border-radius: 8px; font-size: 0.9rem;">
            <i class="fa-solid fa-circle-info"></i> 
            <strong>Nota:</strong> Este reporte es una simulación. Conéctelo a su base de datos para datos reales.
        </div>
    `;
    
    resultadoDiv.innerHTML = tablaHTML;
    exportButtons.style.display = 'flex';
}

// ==========================================
// EXPORTACIÓN DE REPORTES (EXCEL / PDF)
// ==========================================

function exportarReporteExcel() {
    if (!reporteGenerado) {
        alert('Primero genere un reporte semanal.');
        return;
    }
    
    const r = reporteGenerado;
    let contenido = `Reporte de Asistencia Semanal\n`;
    contenido += `Clase: ${r.clase} (${r.grado}° "${r.grupo}")\n`;
    contenido += `Código: ${r.codigo}\n`;
    contenido += `Semana: ${r.semana}\n\n`;
    contenido += `Alumno\tMatrícula\t${r.dias.join('\t')}\n`;
    
    r.alumnos.forEach(alumno => {
        contenido += `${alumno.nombre}\t${alumno.matricula}\t`;
        contenido += alumno.asistencias.map(a => a ? 'Presente' : 'Falta').join('\t');
        contenido += '\n';
    });
    
    const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Asistencia_${r.codigo}_${r.semana}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`El archivo 'Reporte_Asistencia_${r.codigo}_${r.semana}.csv' comenzará a descargarse.`);
}

function exportarReportePDF() {
    if (!reporteGenerado) {
        alert('Primero genere un reporte semanal.');
        return;
    }
    
    const r = reporteGenerado;
    const ventana = window.open('', '_blank', 'width=900,height=700');
    
    let html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Asistencia - ${r.codigo}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1E293B; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #192A56; padding-bottom: 20px; }
                .header h1 { color: #192A56; margin: 0; font-size: 1.5rem; }
                .header p { color: #64748B; margin: 5px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #192A56; color: white; padding: 10px; text-align: left; font-size: 0.85rem; }
                td, th { padding: 8px 10px; border: 1px solid #E2E8F0; font-size: 0.85rem; }
                tr:nth-child(even) { background: #F8FAFC; }
                .presente { color: #10B981; font-weight: bold; }
                .falta { color: #EF4444; font-weight: bold; }
                .footer { margin-top: 30px; text-align: center; color: #94A3B8; font-size: 0.75rem; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 Reporte de Asistencia Semanal</h1>
                <p><strong>Clase:</strong> ${r.clase} (${r.grado}° "${r.grupo}") | <strong>Código:</strong> ${r.codigo}</p>
                <p><strong>Semana:</strong> ${r.semana}</p>
                <p><strong>Fecha de generación:</strong> ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Alumno</th>
                        <th>Matrícula</th>
                        ${r.dias.map(dia => `<th>${dia}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    r.alumnos.forEach(alumno => {
        html += `<tr>
            <td><strong>${alumno.nombre}</strong></td>
            <td>${alumno.matricula}</td>`;
        alumno.asistencias.forEach(asistio => {
            html += `<td style="text-align: center;">
                <span class="${asistio ? 'presente' : 'falta'}">
                    ${asistio ? '✔ Presente' : '✘ Falta'}
                </span>
            </td>`;
        });
        html += '</tr>';
    });
    
    html += `
                </tbody>
            </table>
            <div class="footer">
                <p>Documento generado por el Sistema de Gestión de Asistencia Docente</p>
            </div>
        </body>
        </html>
    `;
    
    ventana.document.write(html);
    ventana.document.close();
    
    setTimeout(() => {
        ventana.print();
    }, 500);
}

/* =========================================
   FUNCIONES MEJORADAS PARA LISTA DE ASISTENCIA
========================================= */

/**
 * Actualiza los contadores del resumen de asistencia
 * Se llama automáticamente cada vez que se marca una asistencia
 */
function actualizarResumenAsistencia() {
    const panel = document.getElementById('panel-asistencia');
    const resumen = document.getElementById('resumen-asistencia');
    
    // Si el panel no está visible, ocultar resumen
    if (!panel || panel.style.display === 'none') {
        if (resumen) resumen.style.display = 'none';
        return;
    }
    
    // Mostrar resumen
    if (resumen) resumen.style.display = 'block';
    
    // Contar badges por tipo
    const badges = document.querySelectorAll('#lista-alumnos-body .badge');
    let presentes = 0, retardos = 0, faltas = 0, justificados = 0;
    
    badges.forEach(badge => {
        if (badge.classList.contains('badge-asistencia')) {
            presentes++;
        } else if (badge.classList.contains('badge-retardo')) {
            retardos++;
        } else if (badge.classList.contains('badge-falta')) {
            faltas++;
        } else if (badge.classList.contains('badge-permiso')) {
            justificados++;
        }
    });
    
    // Actualizar contadores en el DOM
    const contadorPresentes = document.getElementById('contador-presentes');
    const contadorRetardos = document.getElementById('contador-retardos');
    const contadorFaltas = document.getElementById('contador-faltas');
    const contadorJustificados = document.getElementById('contador-justificados');
    
    if (contadorPresentes) contadorPresentes.textContent = presentes;
    if (contadorRetardos) contadorRetardos.textContent = retardos;
    if (contadorFaltas) contadorFaltas.textContent = faltas;
    if (contadorJustificados) contadorJustificados.textContent = justificados;
    
    // Animación sutil en los números que cambiaron
    [contadorPresentes, contadorRetardos, contadorFaltas, contadorJustificados].forEach(contador => {
        if (contador) {
            contador.style.transform = 'scale(1.2)';
            contador.style.transition = 'transform 0.2s ease';
            setTimeout(() => {
                contador.style.transform = 'scale(1)';
            }, 200);
        }
    });
}

/**
 * Reinicia todas las selecciones de asistencia a estado pendiente
 */
function resetearAsistencia() {
    const badges = document.querySelectorAll('#lista-alumnos-body .badge');
    
    if (badges.length === 0) {
        alert('No hay alumnos en la lista para reiniciar.');
        return;
    }
    
    if (!confirm('¿Está seguro de reiniciar todas las selecciones de asistencia? Esta acción no se puede deshacer.')) {
        return;
    }
    
    badges.forEach(badge => {
        badge.className = 'badge badge-pendiente';
        badge.innerHTML = '<i class="fa-solid fa-minus"></i> Sin registro';
    });
    
    // Actualizar resumen
    actualizarResumenAsistencia();
    
    // Animación de feedback visual
    const panel = document.getElementById('panel-asistencia');
    if (panel) {
        panel.style.transition = 'all 0.3s ease';
        panel.style.boxShadow = '0 0 0 4px rgba(214, 168, 72, 0.5)';
        setTimeout(() => {
            panel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.04)';
        }, 600);
    }
    
    // Mostrar mensaje de confirmación
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--color-azul-marino);
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        font-weight: 700;
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 8px 25px rgba(25, 42, 86, 0.3);
    `;
    toast.innerHTML = '<i class="fa-solid fa-circle-check"></i> Asistencia reiniciada correctamente';
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

/**
 * Sobrescribe marcarAsistencia para incluir actualización de resumen
 * Esta función reemplaza a la existente en mainDocentes.js
 */
function marcarAsistencia(idAlumno, tipo) {
    const badge = document.getElementById(`badge-${idAlumno}`);
    if (!badge) return;

    // Resetear clases
    badge.className = 'badge';

    // Aplicar clase y contenido según tipo
    if (tipo === 'asistencia') {
        badge.classList.add('badge-asistencia');
        badge.innerHTML = '<i class="fa-solid fa-check"></i> Presente';
    } else if (tipo === 'retardo') {
        badge.classList.add('badge-retardo');
        badge.innerHTML = '<i class="fa-solid fa-clock"></i> Retardo';
    } else if (tipo === 'falta') {
        badge.classList.add('badge-falta');
        badge.innerHTML = '<i class="fa-solid fa-xmark"></i> Falta';
    }
    
    // Efecto de confirmación visual en el badge
    badge.style.transform = 'scale(1.1)';
    badge.style.transition = 'transform 0.2s ease';
    setTimeout(() => {
        badge.style.transform = 'scale(1)';
    }, 200);
    
    // Actualizar resumen de asistencia
    actualizarResumenAsistencia();
}

/**
 * Sobrescribe guardarAsistencia para incluir validación y feedback mejorado
 */
function guardarAsistencia() {
    const panel = document.getElementById('panel-asistencia');
    const badges = document.querySelectorAll('#lista-alumnos-body .badge');
    
    if (!panel || panel.style.display === 'none') {
        alert('No hay una lista de asistencia activa para guardar.');
        return;
    }
    
    // Verificar si hay alumnos sin registrar
    const sinRegistrar = document.querySelectorAll('#lista-alumnos-body .badge-pendiente').length;
    
    if (sinRegistrar > 0) {
        if (!confirm(`Hay ${sinRegistrar} alumno(s) sin registrar asistencia. ¿Desea continuar y guardar de todos modos?`)) {
            return;
        }
    }
    
    // Mostrar animación de carga
    const btnGuardar = document.querySelector('.btn-save-attendance');
    if (btnGuardar) {
        btnGuardar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
        btnGuardar.disabled = true;
    }
    
    // Simular guardado
    setTimeout(() => {
        alert("✅ ¡Registro del día guardado exitosamente en la base de datos!");
        
        if (btnGuardar) {
            btnGuardar.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Finalizar y Guardar Registro';
            btnGuardar.disabled = false;
        }
        
        // Ocultar panel
        document.getElementById('panel-asistencia').style.display = 'none';
        document.getElementById('grupo-select').value = '';
        
        // Ocultar resumen
        const resumen = document.getElementById('resumen-asistencia');
        if (resumen) resumen.style.display = 'none';
    }, 800);
}

/**
 * Sobrescribe cargarAlumnos para mostrar el resumen al cargar
 */
function cargarAlumnos(grupo) {
    const panel = document.getElementById('panel-asistencia');
    const tbody = document.getElementById('lista-alumnos-body');
    tbody.innerHTML = '';

    if (!grupo) {
        panel.style.display = 'none';
        const resumen = document.getElementById('resumen-asistencia');
        if (resumen) resumen.style.display = 'none';
        return;
    }

    const alumnosFalsos = [
        { id: 1, nombre: "Aguilar Pérez, Carlos", estado: "pendiente" },
        { id: 2, nombre: "Bautista Gómez, María", estado: "pendiente" },
        { id: 3, nombre: "Castillo Rojas, Javier", estado: "permiso" },
        { id: 4, nombre: "Díaz Luna, Valeria", estado: "pendiente" }
    ];

    alumnosFalsos.forEach(alumno => {
        const tr = document.createElement('tr');
        
        let estadoHTML = '';
        let botonesHTML = '';

        if (alumno.estado === 'permiso') {
            estadoHTML = `
                <span class="badge badge-permiso" id="badge-${alumno.id}">
                    <i class="fa-solid fa-file-medical"></i> Permiso Justificado
                </span>
                <div class="motivo-text">Cita médica (Validado por Prefectura)</div>
            `;
            botonesHTML = `
                <div class="action-group">
                    <button class="disabled-btn" disabled>
                        <i class="fa-solid fa-check-circle"></i> Justificado
                    </button>
                </div>
            `;
        } else {
            estadoHTML = `
                <span class="badge badge-pendiente" id="badge-${alumno.id}">
                    <i class="fa-solid fa-minus"></i> Sin registro
                </span>
            `;
            botonesHTML = `
                <div class="action-group">
                    <button class="btn-action btn-asistencia" title="Presente" onclick="marcarAsistencia(${alumno.id}, 'asistencia')">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button class="btn-action btn-retardo" title="Retardo" onclick="marcarAsistencia(${alumno.id}, 'retardo')">
                        <i class="fa-solid fa-clock"></i>
                    </button>
                    <button class="btn-action btn-falta" title="Falta" onclick="marcarAsistencia(${alumno.id}, 'falta')">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `;
        }

        tr.innerHTML = `
            <td>
                <div class="student-info-table">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(alumno.nombre)}&background=192A56&color=fff" class="avatar-table" alt="avatar">
                    <span><b>${alumno.nombre}</b><br><small>Matrícula: ALM-${2000 + alumno.id}</small></span>
                </div>
            </td>
            <td>${estadoHTML}</td>
            <td>${botonesHTML}</td>
        `;
        tbody.appendChild(tr);
    });

    // Mostrar panel con animación
    panel.style.display = 'block';
    panel.classList.remove('fade-in');
    void panel.offsetWidth; 
    panel.classList.add('fade-in');
    
    // Actualizar resumen
    actualizarResumenAsistencia();
}

// Agregar estilos de animación para el toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);