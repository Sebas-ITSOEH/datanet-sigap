/**
 * mainAlumno.js - Sistema de Gestión Escolar
 * Incluye: Enrutador, Gestión de Materias (Unirse), Justificantes e Historial.
 */

// ==========================================
// 1. ENRUTADOR DE VISTAS (GLOBAL)
// ==========================================
let estaCargando = false;

async function loadSection(sectionName) {
    if (estaCargando) return;
    estaCargando = true;

    const viewContainer = document.getElementById('view-container');

    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`alumno/${sectionName}.html?t=${timestamp}`);

        if (!response.ok) {
            throw new Error(`Error de red HTTP: ${response.status}`);
        }

        const html = await response.text();
        if (viewContainer) {
            viewContainer.innerHTML = html;

            viewContainer.classList.remove('fade-in');
            void viewContainer.offsetWidth;
            viewContainer.classList.add('fade-in');
        }

    } catch (errorRed) {
        console.error(`🚨 Error al traer vista:`, errorRed);
    } finally {
        if (sectionName === 'justificantes') {
            setTimeout(() => initJustificantesLogic(), 100);
        } else if (sectionName === 'materias') {
            initMateriasLogic();
        } else if (sectionName === 'historial') {
            initHistorialLogic();
        }
        estaCargando = false;
    }
}

// ==========================================
// 2. LÓGICA DE MODAL "UNIRSE A CLASE" (ALUMNOS)
// ==========================================
const baseDatosClasesAlumno = {
    "HIST-101": { nombre: "Historia Universal (1°B)", docente: "Prof. Carlos Aguilar", ciclo: "2025-2026" },
    "MAT-202": { nombre: "Matemáticas II (2°A)", docente: "Profa. María Bautista", ciclo: "2025-2026" },
    "FIS-301": { nombre: "Física (3°C)", docente: "Prof. Javier Castillo", ciclo: "2025-2026" }
};

function abrirModalUnirse() {
    reiniciarModalUnirse();
    const modal = document.getElementById('modal-unirse-clase');
    if (modal) modal.style.display = 'block';
}

function cerrarModalUnirse() {
    const modal = document.getElementById('modal-unirse-clase');
    if (modal) modal.style.display = 'none';
}

function verificarCodigo() {
    const input = document.getElementById('input-codigo-clase');
    const errorText = document.getElementById('error-codigo');
    if (!input || !errorText) return;
    const codigoIngresado = input.value.trim().toUpperCase();
    if (codigoIngresado === "") {
        errorText.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Por favor, ingresa un código.';
        errorText.style.display = 'block';
        input.focus();
        return;
    }
    const claseEncontrada = baseDatosClasesAlumno[codigoIngresado];
    if (claseEncontrada) {
        errorText.style.display = 'none';
        document.getElementById('confirm-nombre-clase').innerText = claseEncontrada.nombre;
        document.getElementById('confirm-docente-clase').innerText = claseEncontrada.docente;
        document.getElementById('confirm-ciclo-clase').innerText = claseEncontrada.ciclo;
        document.getElementById('step-1-codigo').style.display = 'none';
        const step2 = document.getElementById('step-2-confirmacion');
        if (step2) {
            step2.style.display = 'block';
            step2.classList.add('fade-in');
        }
    } else {
        errorText.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Código inválido. Verifica con tu profesor.';
        errorText.style.display = 'block';
        input.style.border = '2px solid var(--color-rojo-oscuro)';
        setTimeout(() => { input.style.border = '2px solid #EAEAEA'; }, 2000);
    }
}

function reiniciarModalUnirse() {
    const step2 = document.getElementById('step-2-confirmacion');
    if (step2) step2.style.display = 'none';
    const step1 = document.getElementById('step-1-codigo');
    if (step1) step1.style.display = 'block';
    const input = document.getElementById('input-codigo-clase');
    if (input) { input.value = ''; input.style.border = '2px solid #EAEAEA'; }
    const errorMsg = document.getElementById('error-codigo');
    if (errorMsg) errorMsg.style.display = 'none';
}

function inscribirseAClase() {
    const nombreClase = document.getElementById('confirm-nombre-clase').innerText;
    const docenteClase = document.getElementById('confirm-docente-clase').innerText;
    const gridPendientes = document.getElementById('grid-pendientes');
    if (gridPendientes) {
        const nuevaTarjetaHTML = `
            <div class="materia-card pending-card fade-in">
                <div class="pending-badge">Pendiente</div>
                <div class="card-body">
                    <div class="materia-icon-box gray"><i class="fa-solid fa-book"></i></div>
                    <div class="materia-main">
                        <h4>${nombreClase}</h4>
                        <p>Esperando aprobación de ${docenteClase}</p>
                    </div>
                </div>
            </div>`;
        gridPendientes.insertAdjacentHTML('afterbegin', nuevaTarjetaHTML);
        alert(`¡Solicitud enviada para ${nombreClase}!`);
        cerrarModalUnirse();
    }
}

window.onclick = function (event) {
    const modal = document.getElementById('modal-unirse-clase');
    const modalAuth = document.getElementById('modal-auth');
    const modalDetalle = document.getElementById('modal-detalle-tramite');
    const modalConfirm = document.getElementById('modal-confirm-eliminar');
    
    if (event.target === modal) cerrarModalUnirse();
    if (event.target === modalDetalle) cerrarModalDetalle();
    if (event.target === modalConfirm) cerrarModalConfirmEliminar();
};

// ==========================================
// 3. LÓGICA DE JUSTIFICANTES (COMPLETA)
// ==========================================
let tramiteAEditar = null;
let tramiteAEliminar = null;
let tramitePendienteEdicion = null;
let yaInicializado = false;

function initJustificantesLogic() {
    if (yaInicializado) return;
    yaInicializado = true;
    
    console.log("🧩 Inicializando lógica de Justificantes");

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

    const datosAlumno = {
        nombre: "Luis Ángel Hernández López",
        numero: "A202410378",
        grado: "2°",
        grupo: "B",
        tutor: "María Guadalupe López Sánchez",
        telefonoTutor: "555-123-4567"
    };

    const materiasAlumno = [
        "Matemáticas II", "Historia Universal", "Física", "Literatura",
        "Inglés II", "Educación Física", "Química", "Formación Cívica"
    ];

    // ==========================================
    // 1. DROPDOWN HAMBURGUESA
    // ==========================================
    if (btnHam && drop) {
        btnHam.onclick = function(e) {
            e.stopPropagation();
            drop.classList.toggle('hidden');
        };
        
        document.addEventListener('click', function(e) {
            if (drop && !drop.contains(e.target) && e.target !== btnHam && !btnHam.contains(e.target)) {
                drop.classList.add('hidden');
            }
        });
    }

    // ==========================================
    // 2. CAMBIO A HISTORIAL
    // ==========================================
    if (menuHis) {
        menuHis.onclick = function() {
            if (drop) drop.classList.add('hidden');
            if (vistaForm) vistaForm.classList.add('hidden');
            if (vistaLista) vistaLista.classList.remove('hidden');
            menuHis.classList.add('active');
            if (menuSol) menuSol.classList.remove('active');
            cancelarEdicion();
            tramitePendienteEdicion = null;
        };
    }

    // ==========================================
    // 3. CAMBIO A NUEVA SOLICITUD (PIN)
    // ==========================================
    if (menuSol && modal && inputPin) {
        menuSol.onclick = function() {
            if (drop) drop.classList.add('hidden');
            
            // Limpiar edición pendiente
            tramitePendienteEdicion = null;
            tramiteAEditar = null;
            
            // Restaurar textos del modal para nueva solicitud
            restaurarTextosModalPin();
            
            modal.classList.remove('hidden');
            inputPin.value = '';
            if (errorPin) errorPin.classList.add('hidden');
            setTimeout(() => inputPin.focus(), 200);
            
            menuSol.classList.add('active');
            if (menuHis) menuHis.classList.remove('active');
        };
    }

    // ==========================================
    // 4. VALIDACIÓN PIN (CORREGIDA)
    // ==========================================
    if (btnValidarPin && inputPin && modal) {
        btnValidarPin.onclick = function() {
            console.log('🔑 Validando PIN:', inputPin.value);
            
            if (inputPin.value === '1234') {
                console.log('✅ PIN correcto');
                modal.classList.add('hidden');
                if (errorPin) errorPin.classList.add('hidden');
                
                // Verificar si es para editar o para nueva solicitud
                if (tramitePendienteEdicion) {
                    console.log('✏️ Modo edición para:', tramitePendienteEdicion);
                    cargarDatosParaEdicion(tramitePendienteEdicion);
                } else {
                    console.log('🆕 Nueva solicitud');
                    if (vistaLista) vistaLista.classList.add('hidden');
                    if (vistaForm) vistaForm.classList.remove('hidden');
                    llenarDatosAlumno(datosAlumno);
                    generarCheckboxesMaterias(materiasAlumno);
                    resetearFormularioJustificante();
                }
                
                // Restaurar textos del modal
                restaurarTextosModalPin();
            } else {
                console.log('❌ PIN incorrecto');
                if (errorPin) errorPin.classList.remove('hidden');
                inputPin.value = '';
                inputPin.focus();
            }
        };
        
        // Validar con Enter
        inputPin.onkeypress = function(e) {
            if (e.key === 'Enter') {
                btnValidarPin.click();
            }
        };
    }

    // ==========================================
    // 5. CERRAR MODAL PIN
    // ==========================================
    if (btnCerrarAuth && modal) {
        btnCerrarAuth.onclick = function() {
            modal.classList.add('hidden');
            tramitePendienteEdicion = null;
            restaurarTextosModalPin();
        };
    }

    // ==========================================
    // 6. RADIO BUTTONS
    // ==========================================
    const radioCompleto = document.querySelector('input[name="tipo-justificacion"][value="completo"]');
    const radioMaterias = document.querySelector('input[name="tipo-justificacion"][value="materias"]');
    const radioRango = document.querySelector('input[name="tipo-justificacion"][value="rango"]');
    const contenedorMaterias = document.getElementById('contenedor-materias');
    const contenedorRangoFechas = document.getElementById('contenedor-rango-fechas');
    const contenedorFechaUnica = document.getElementById('contenedor-fecha-unica');

    if (radioCompleto) {
        radioCompleto.onchange = function() {
            if (contenedorMaterias) contenedorMaterias.classList.add('hidden');
            if (contenedorRangoFechas) contenedorRangoFechas.classList.add('hidden');
            if (contenedorFechaUnica) contenedorFechaUnica.classList.remove('hidden');
            document.querySelectorAll('#lista-materias input[type="checkbox"]').forEach(cb => cb.checked = false);
            const fi = document.getElementById('fecha-inicio-rango');
            const ff = document.getElementById('fecha-fin-rango');
            if (fi) fi.value = '';
            if (ff) ff.value = '';
        };
    }
    
    if (radioMaterias) {
        radioMaterias.onchange = function() {
            if (contenedorMaterias) contenedorMaterias.classList.remove('hidden');
            if (contenedorRangoFechas) contenedorRangoFechas.classList.add('hidden');
            if (contenedorFechaUnica) contenedorFechaUnica.classList.remove('hidden');
            const fi = document.getElementById('fecha-inicio-rango');
            const ff = document.getElementById('fecha-fin-rango');
            if (fi) fi.value = '';
            if (ff) ff.value = '';
        };
    }
    
    if (radioRango) {
        radioRango.onchange = function() {
            if (contenedorMaterias) contenedorMaterias.classList.add('hidden');
            if (contenedorRangoFechas) contenedorRangoFechas.classList.remove('hidden');
            if (contenedorFechaUnica) contenedorFechaUnica.classList.add('hidden');
            document.querySelectorAll('#lista-materias input[type="checkbox"]').forEach(cb => cb.checked = false);
            const fu = document.getElementById('fecha-inasistencia');
            if (fu) fu.value = '';
        };
    }

    // ==========================================
    // 7. LÓGICA DE DOCUMENTOS SEGÚN MOTIVO
    // ==========================================
    const selectPermiso = document.getElementById('tipo-permiso');
    const contenedorDocumentos = document.getElementById('contenedor-documentos');
    const uploadZone = document.getElementById('upload-zone-dinamica');
    const infoBanner = document.getElementById('info-banner');
    const documentosDescripcion = document.getElementById('documentos-descripcion');

    if (selectPermiso) {
        selectPermiso.onchange = function() {
            if (uploadZone) uploadZone.innerHTML = '';
            if (contenedorDocumentos) contenedorDocumentos.classList.add('hidden');
            if (infoBanner) infoBanner.classList.add('hidden');
            
            const tipo = this.value;

            if (tipo === 'salud') {
                if (infoBanner) {
                    infoBanner.classList.remove('hidden');
                    infoBanner.innerHTML = '<i class="fa-solid fa-circle-info"></i> <b>Motivo de Salud:</b> Adjunta la receta médica o comprobante de consulta (PDF, JPG o PNG).';
                }
                if (contenedorDocumentos) contenedorDocumentos.classList.remove('hidden');
                if (documentosDescripcion) documentosDescripcion.textContent = 'Sube tu receta médica o comprobante de consulta.';
                if (uploadZone) uploadZone.innerHTML = crearInputFile('Receta Médica', 'receta', 'Formato: PDF, JPG o PNG');
            } else if (tipo === 'personal') {
                if (infoBanner) {
                    infoBanner.classList.remove('hidden');
                    infoBanner.innerHTML = '<i class="fa-solid fa-circle-info"></i> <b>Asuntos Familiares:</b> Adjunta la carta de justificación firmada por el tutor en formato PDF.';
                }
                if (contenedorDocumentos) contenedorDocumentos.classList.remove('hidden');
                if (documentosDescripcion) documentosDescripcion.textContent = 'Sube la carta firmada por el tutor explicando el motivo familiar.';
                if (uploadZone) uploadZone.innerHTML = crearInputFile('Carta Firmada por el Tutor', 'carta-familiar', 'Formato: PDF (obligatorio)');
            } else if (tipo === 'viaje') {
                if (infoBanner) {
                    infoBanner.classList.remove('hidden');
                    infoBanner.innerHTML = '<i class="fa-solid fa-circle-info"></i> <b>Viaje Escolar:</b> Adjunta el oficio de comisión y la identificación oficial del tutor (INE).';
                }
                if (contenedorDocumentos) contenedorDocumentos.classList.remove('hidden');
                if (documentosDescripcion) documentosDescripcion.textContent = 'Sube ambos documentos para validar el viaje escolar.';
                if (uploadZone) uploadZone.innerHTML = 
                    crearInputFile('Oficio de Comisión', 'oficio', 'Documento oficial del viaje (PDF)') + 
                    crearInputFile('INE del Tutor', 'ine', 'Identificación oficial vigente (PDF, JPG o PNG)');
            }

            vincularEventosArchivosJustificante();
        };
    }

    // ==========================================
    // 8. BOTÓN ENVIAR / GUARDAR CAMBIOS
    // ==========================================
    const btnEnviar = document.getElementById('btn-enviar-solicitud');
    if (btnEnviar) {
        btnEnviar.onclick = function() {
            validarYEnviarSolicitud();
        };
    }

    // ==========================================
    // 9. BÚSQUEDA Y FILTROS
    // ==========================================
    const buscarTramite = document.getElementById('buscar-tramite');
    const filtroEstatus = document.getElementById('filtro-estatus');
    
    if (buscarTramite) {
        buscarTramite.oninput = filtrarTramites;
    }
    if (filtroEstatus) {
        filtroEstatus.onchange = filtrarTramites;
    }

    vincularEventosArchivosJustificante();
    
    console.log('✅ Justificantes inicializado correctamente');
}

// ==========================================
// FUNCIÓN PARA RESTAURAR TEXTOS DEL MODAL PIN
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

// ==========================================
// 4. FUNCIONES AUXILIARES DE JUSTIFICANTES
// ==========================================

function llenarDatosAlumno(datos) {
    const campos = {
        'dato-nombre-alumno': datos.nombre,
        'dato-numero-alumno': datos.numero,
        'dato-grado': datos.grado,
        'dato-grupo': datos.grupo,
        'dato-tutor': datos.tutor,
        'dato-telefono-tutor': datos.telefonoTutor
    };
    
    for (const [id, valor] of Object.entries(campos)) {
        const campo = document.getElementById(id);
        if (campo) campo.value = valor;
    }
}

function generarCheckboxesMaterias(materias) {
    const listaMaterias = document.getElementById('lista-materias');
    if (!listaMaterias) return;
    
    listaMaterias.innerHTML = '';
    materias.forEach(materia => {
        const idMateria = 'mat-' + materia.toLowerCase()
            .replace(/\s+/g, '-')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        listaMaterias.insertAdjacentHTML('beforeend', `
            <label class="checkbox-item">
                <input type="checkbox" value="${materia}" id="${idMateria}">
                <span>${materia}</span>
            </label>
        `);
    });
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
    document.querySelectorAll('.input-modern').forEach(input => {
        input.classList.remove('input-error');
    });
    document.querySelectorAll('.custom-file-upload').forEach(label => {
        label.classList.remove('file-uploaded', 'file-error');
    });

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
}

function cancelarEdicion() {
    if (tramiteAEditar) {
        if (confirm('¿Cancelar la edición? Los cambios no se guardarán.')) {
            resetearFormularioJustificante();
            tramitePendienteEdicion = null;
            
            // Regresar a vista lista
            const vistaForm = document.getElementById('vista-formulario');
            const vistaLista = document.getElementById('vista-lista');
            if (vistaForm) vistaForm.classList.add('hidden');
            if (vistaLista) vistaLista.classList.remove('hidden');
        }
    }
}

function crearInputFile(label, id, descripcion = '') {
    return `
        <label class="custom-file-upload" id="label_${id}" for="${id}">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <span>${label}</span>
            ${descripcion ? `<small>${descripcion}</small>` : ''}
            <div class="file-name-display" id="name_${id}"></div>
            <input type="file" id="${id}" class="doc-upload" accept=".pdf,.jpg,.jpeg,.png">
        </label>`;
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
    const nameDisplay = document.getElementById(`name_${id}`);
    const label = document.getElementById(`label_${id}`);
    
    if (!nameDisplay || !label) return;
    
    label.classList.remove('file-uploaded', 'file-error');
    
    if (input.files && input.files.length > 0) {
        const file = input.files[0];
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        
        if (!validTypes.includes(file.type)) {
            nameDisplay.textContent = '❌ Formato no válido';
            label.classList.add('file-error');
            alert('❌ Error: Solo se aceptan archivos PDF, JPG o PNG.');
            input.value = '';
            setTimeout(() => {
                label.classList.remove('file-error');
                nameDisplay.textContent = '';
            }, 3000);
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            nameDisplay.textContent = '❌ Archivo muy grande';
            label.classList.add('file-error');
            alert('❌ Error: El archivo no debe superar los 10MB.');
            input.value = '';
            setTimeout(() => {
                label.classList.remove('file-error');
                nameDisplay.textContent = '';
            }, 3000);
            return;
        }
        
        nameDisplay.textContent = '📎 ' + file.name;
        label.classList.add('file-uploaded');
        console.log(`✅ Archivo subido [${id}]: ${file.name}`);
    } else {
        nameDisplay.textContent = '';
    }
}

function verificarArchivosSubidos() {
    const uploadZone = document.getElementById('upload-zone-dinamica');
    if (!uploadZone) return true;
    
    const inputs = uploadZone.querySelectorAll('.doc-upload');
    if (inputs.length === 0) return true;
    
    let todosSubidos = true;
    inputs.forEach(input => {
        const label = document.getElementById(`label_${input.id}`);
        if (!input.files || input.files.length === 0) {
            todosSubidos = false;
            if (label) {
                label.classList.add('file-error');
                label.style.animation = 'shake 0.5s';
                setTimeout(() => {
                    label.style.animation = '';
                    if (!input.files || input.files.length === 0) {
                        label.classList.remove('file-error');
                    }
                }, 600);
            }
        }
    });
    
    return todosSubidos;
}

function validarYEnviarSolicitud() {
    const fecha = document.getElementById('fecha-inasistencia');
    const fechaInicioRango = document.getElementById('fecha-inicio-rango');
    const fechaFinRango = document.getElementById('fecha-fin-rango');
    const motivo = document.getElementById('tipo-permiso');
    const descripcion = document.getElementById('descripcion-motivo');
    const errorArchivos = document.getElementById('error-archivos');

    if (errorArchivos) errorArchivos.classList.add('hidden');
    document.querySelectorAll('.input-modern').forEach(input => input.classList.remove('input-error'));
    document.querySelectorAll('.custom-file-upload').forEach(label => label.classList.remove('file-error'));

    let esValido = true;
    const tipoJustificacion = document.querySelector('input[name="tipo-justificacion"]:checked');
    const tipoValor = tipoJustificacion ? tipoJustificacion.value : 'completo';

    if (tipoValor === 'rango') {
        if (!fechaInicioRango || !fechaInicioRango.value) {
            if (fechaInicioRango) fechaInicioRango.classList.add('input-error');
            esValido = false;
        }
        if (!fechaFinRango || !fechaFinRango.value) {
            if (fechaFinRango) fechaFinRango.classList.add('input-error');
            esValido = false;
        }
        if (fechaInicioRango && fechaFinRango && fechaInicioRango.value && fechaFinRango.value) {
            if (fechaFinRango.value < fechaInicioRango.value) {
                if (fechaFinRango) fechaFinRango.classList.add('input-error');
                alert('⚠️ La fecha de fin debe ser igual o posterior a la fecha de inicio.');
                esValido = false;
            }
        }
    } else {
        if (!fecha || !fecha.value) {
            if (fecha) fecha.classList.add('input-error');
            esValido = false;
        }
    }

    if (!motivo || !motivo.value) {
        if (motivo) motivo.classList.add('input-error');
        esValido = false;
    }

    if (!descripcion || descripcion.value.trim() === '') {
        if (descripcion) descripcion.classList.add('input-error');
        esValido = false;
    }

    if (tipoValor === 'materias') {
        const materiasSeleccionadas = document.querySelectorAll('#lista-materias input[type="checkbox"]:checked');
        if (materiasSeleccionadas.length === 0) {
            alert('⚠️ Debes seleccionar al menos una materia a justificar.');
            esValido = false;
        }
    }

    if (motivo && motivo.value) {
        if (!verificarArchivosSubidos()) {
            if (errorArchivos) errorArchivos.classList.remove('hidden');
            esValido = false;
        }
    }

    if (!esValido) {
        const primerError = document.querySelector('.input-error, .file-error, .alert-danger:not(.hidden)');
        if (primerError) {
            primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    const datosSolicitud = {
        motivo: motivo.value,
        tipoJustificacion: tipoValor,
        descripcion: descripcion.value.trim(),
        materias: [],
        archivos: []
    };

    if (tipoValor === 'rango') {
        datosSolicitud.fechaInicio = fechaInicioRango.value;
        datosSolicitud.fechaFin = fechaFinRango.value;
        datosSolicitud.fecha = `${fechaInicioRango.value} al ${fechaFinRango.value}`;
    } else {
        datosSolicitud.fecha = fecha.value;
    }

    if (tipoValor === 'materias') {
        document.querySelectorAll('#lista-materias input[type="checkbox"]:checked').forEach(cb => {
            datosSolicitud.materias.push(cb.value);
        });
    }

    const uploadZone = document.getElementById('upload-zone-dinamica');
    if (uploadZone) {
        uploadZone.querySelectorAll('.doc-upload').forEach(input => {
            if (input.files && input.files.length > 0) {
                datosSolicitud.archivos.push({
                    tipo: input.id,
                    nombre: input.files[0].name,
                    tamaño: (input.files[0].size / 1024).toFixed(1) + ' KB'
                });
            }
        });
    }

    console.log('✅ Solicitud procesada:', datosSolicitud);

    const editandoId = document.getElementById('editando-tramite-id');
    const idEdicion = editandoId ? editandoId.value : '';

    if (idEdicion) {
        actualizarTramiteEnHistorial(idEdicion, datosSolicitud);
        alert('✅ Trámite actualizado exitosamente.');
    } else {
        mostrarResumenEnvio(datosSolicitud);
        agregarAlHistorial(datosSolicitud);
    }

    setTimeout(() => {
        const vistaForm = document.getElementById('vista-formulario');
        const vistaLista = document.getElementById('vista-lista');
        const menuHis = document.getElementById('menu-historial');
        const menuSol = document.getElementById('menu-solicitud');

        if (vistaForm) vistaForm.classList.add('hidden');
        if (vistaLista) vistaLista.classList.remove('hidden');
        if (menuHis) menuHis.classList.add('active');
        if (menuSol) menuSol.classList.remove('active');
        
        resetearFormularioJustificante();
    }, 500);
}

function mostrarResumenEnvio(datos) {
    const motivos = {
        'salud': '🩺 Enfermedad / Cita Médica',
        'personal': '👨‍👩‍👧 Asuntos Familiares',
        'viaje': '🚌 Viaje Escolar / Congreso'
    };
    
    const tipoTexto = {
        'completo': 'Día Completo',
        'materias': 'Materias Específicas',
        'rango': 'Rango de Fechas'
    };
    
    let mensaje = `✅ ¡Solicitud Enviada Exitosamente!\n\n`;
    
    if (datos.tipoJustificacion === 'rango') {
        mensaje += `📅 Período: ${formatearFecha(datos.fechaInicio)} al ${formatearFecha(datos.fechaFin)}\n`;
    } else {
        mensaje += `📅 Fecha: ${formatearFecha(datos.fecha)}\n`;
    }
    
    mensaje += `📋 Motivo: ${motivos[datos.motivo] || datos.motivo}\n`;
    mensaje += `⏰ Tipo: ${tipoTexto[datos.tipoJustificacion]}\n`;
    
    if (datos.materias.length > 0) {
        mensaje += `📚 Materias: ${datos.materias.join(', ')}\n`;
    }
    
    if (datos.archivos.length > 0) {
        mensaje += `\n📎 Documentos adjuntos:\n`;
        datos.archivos.forEach(archivo => {
            mensaje += `   • ${archivo.nombre} (${archivo.tamaño})\n`;
        });
    }
    
    mensaje += `\n📌 Estatus: Pendiente de revisión`;
    alert(mensaje);
}

function agregarAlHistorial(datos) {
    const lista = document.getElementById('lista-tramites');
    if (!lista) return;

    const id = 'tramite-' + Date.now();
    const iconos = { 'salud': 'fa-notes-medical', 'personal': 'fa-users', 'viaje': 'fa-bus' };
    const textos = { 'salud': 'Enfermedad (Cita Médica)', 'personal': 'Asuntos Familiares', 'viaje': 'Viaje Escolar' };
    const tipoTexto = { 'completo': 'Día Completo', 'materias': 'Materias Específicas', 'rango': 'Rango de Fechas' };
    
    let fechaMostrar = '';
    if (datos.tipoJustificacion === 'rango') {
        fechaMostrar = `${formatearFecha(datos.fechaInicio)} al ${formatearFecha(datos.fechaFin)}`;
    } else {
        fechaMostrar = formatearFecha(datos.fecha);
    }
    
    const archivosAdjuntos = datos.archivos.length > 0 
        ? datos.archivos.map(a => a.nombre).join(', ') 
        : 'Ninguno';

    const card = document.createElement('div');
    card.className = 'j-card fade-in';
    card.dataset.estatus = 'pendiente';
    card.dataset.id = id;
    card.dataset.motivo = datos.motivo;
    card.dataset.fecha = fechaMostrar;
    card.dataset.tipo = datos.tipoJustificacion;
    card.dataset.descripcion = datos.descripcion;
    card.dataset.archivos = archivosAdjuntos;
    card.dataset.materias = datos.materias.join(', ');
    card.dataset.fechaInicio = datos.fechaInicio || '';
    card.dataset.fechaFin = datos.fechaFin || '';
    card.dataset.archivosJson = JSON.stringify(datos.archivos);

    card.innerHTML = `
        <div class="j-card-header">
            <div class="j-title">
                <i class="fa-solid ${iconos[datos.motivo] || 'fa-file'}"></i>
                <h4>${textos[datos.motivo] || datos.motivo}</h4>
            </div>
            <div class="j-card-actions">
                <span class="badge-status pendiente">En Revisión</span>
                <button class="btn-icon-action btn-ver" title="Ver detalles" onclick="verDetallesTramite('${id}')">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button class="btn-icon-action btn-editar" title="Editar trámite" onclick="abrirEdicionTramite('${id}')">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-icon-action btn-eliminar" title="Eliminar trámite" onclick="confirmarEliminarTramite('${id}')">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
        <div class="j-card-body">
            <p><strong>${datos.tipoJustificacion === 'rango' ? 'Período' : 'Fecha'}:</strong> ${fechaMostrar}</p>
            <p><strong>Tipo:</strong> ${tipoTexto[datos.tipoJustificacion]}</p>
            <p><strong>Descripción:</strong> ${datos.descripcion}</p>
            <p><strong>Archivos:</strong> ${archivosAdjuntos}</p>
        </div>
        <div class="j-card-footer">
            <button class="btn-detalles" onclick="verDetallesTramite('${id}')">
                <i class="fa-solid fa-circle-info"></i> Ver Todos los Detalles
            </button>
        </div>`;
    
    lista.insertBefore(card, lista.firstChild);
    const sinTramites = document.getElementById('sin-tramites');
    if (sinTramites) sinTramites.classList.add('hidden');
}

function actualizarTramiteEnHistorial(id, datos) {
    const card = document.querySelector(`.j-card[data-id="${id}"]`);
    if (!card) return;

    const iconos = { 'salud': 'fa-notes-medical', 'personal': 'fa-users', 'viaje': 'fa-bus' };
    const textos = { 'salud': 'Enfermedad (Cita Médica)', 'personal': 'Asuntos Familiares', 'viaje': 'Viaje Escolar' };
    const tipoTexto = { 'completo': 'Día Completo', 'materias': 'Materias Específicas', 'rango': 'Rango de Fechas' };
    
    let fechaMostrar = '';
    if (datos.tipoJustificacion === 'rango') {
        fechaMostrar = `${formatearFecha(datos.fechaInicio)} al ${formatearFecha(datos.fechaFin)}`;
    } else {
        fechaMostrar = formatearFecha(datos.fecha);
    }
    
    const archivosAdjuntos = datos.archivos.length > 0 
        ? datos.archivos.map(a => a.nombre).join(', ') 
        : 'Ninguno';

    card.dataset.motivo = datos.motivo;
    card.dataset.fecha = fechaMostrar;
    card.dataset.tipo = datos.tipoJustificacion;
    card.dataset.descripcion = datos.descripcion;
    card.dataset.archivos = archivosAdjuntos;
    card.dataset.materias = datos.materias.join(', ');
    card.dataset.fechaInicio = datos.fechaInicio || '';
    card.dataset.fechaFin = datos.fechaFin || '';
    card.dataset.archivosJson = JSON.stringify(datos.archivos);

    const titulo = card.querySelector('h4');
    if (titulo) titulo.textContent = textos[datos.motivo] || datos.motivo;
    
    const icono = card.querySelector('.j-title i');
    if (icono) icono.className = `fa-solid ${iconos[datos.motivo] || 'fa-file'}`;
    
    const body = card.querySelector('.j-card-body');
    if (body) {
        body.innerHTML = `
            <p><strong>${datos.tipoJustificacion === 'rango' ? 'Período' : 'Fecha'}:</strong> ${fechaMostrar}</p>
            <p><strong>Tipo:</strong> ${tipoTexto[datos.tipoJustificacion]}</p>
            <p><strong>Descripción:</strong> ${datos.descripcion}</p>
            <p><strong>Archivos:</strong> ${archivosAdjuntos}</p>`;
    }
    
    card.classList.add('fade-in');
}

// ==========================================
// 5. FUNCIONES DE DETALLES, EDICIÓN Y ELIMINACIÓN
// ==========================================

function verDetallesTramite(id) {
    const card = document.querySelector(`.j-card[data-id="${id}"]`);
    if (!card) return;
    
    const modal = document.getElementById('modal-detalle-tramite');
    if (!modal) return;
    
    const icono = document.getElementById('detalle-icono');
    const titulo = document.getElementById('detalle-titulo');
    const estatus = document.getElementById('detalle-estatus');
    const contenido = document.getElementById('detalle-contenido');
    const footer = document.getElementById('detalle-footer');

    const iconos = { 'salud': 'fa-notes-medical', 'personal': 'fa-users', 'viaje': 'fa-bus' };
    const motivo = card.dataset.motivo;
    const estatusVal = card.dataset.estatus;

    if (icono) icono.innerHTML = `<i class="fa-solid ${iconos[motivo] || 'fa-file'}"></i>`;
    if (titulo) titulo.textContent = card.querySelector('h4')?.textContent || 'Trámite';
    
    if (estatus) {
        estatus.textContent = estatusVal === 'pendiente' ? 'En Revisión' : estatusVal === 'aprobado' ? 'Aprobado' : 'Rechazado';
        estatus.className = `badge-status ${estatusVal}`;
    }

    const tipoTexto = { 'completo': 'Día Completo', 'materias': 'Materias Específicas', 'rango': 'Rango de Fechas' };

    let archivosHTML = '';
    try {
        const archivos = JSON.parse(card.dataset.archivosJson || '[]');
        archivosHTML = archivos.length 
            ? archivos.map(a => `<p style="margin:5px 0;">📎 <strong>${a.nombre}</strong> (${a.tamaño || 'N/A'})</p>`).join('') 
            : '<p style="margin:5px 0; color:#64748B;">Sin archivos adjuntos</p>';
    } catch (e) {
        archivosHTML = '<p style="margin:5px 0;">' + (card.dataset.archivos || 'Sin archivos adjuntos') + '</p>';
    }

    if (contenido) {
        contenido.innerHTML = `
            <div class="detalle-grid">
                <div class="detalle-item">
                    <label>${card.dataset.tipo === 'rango' ? 'Período' : 'Fecha'}</label>
                    <span>${card.dataset.fecha}</span>
                </div>
                <div class="detalle-item">
                    <label>Tipo de Justificación</label>
                    <span>${tipoTexto[card.dataset.tipo] || card.dataset.tipo}</span>
                </div>
                <div class="detalle-item detalle-item-full">
                    <label>Motivo</label>
                    <span>${card.querySelector('h4')?.textContent || 'No especificado'}</span>
                </div>
                <div class="detalle-item detalle-item-full">
                    <label>Descripción</label>
                    <span>${card.dataset.descripcion || 'Sin descripción'}</span>
                </div>
                ${card.dataset.materias ? `
                <div class="detalle-item detalle-item-full">
                    <label>Materias a Justificar</label>
                    <span>${card.dataset.materias}</span>
                </div>` : ''}
                <div class="detalle-item detalle-item-full">
                    <label>Documentos Adjuntos</label>
                    ${archivosHTML}
                </div>
                <div class="detalle-item">
                    <label>Estatus Actual</label>
                    <span class="badge-status ${estatusVal}" style="display:inline-block;">${estatus?.textContent || 'En Revisión'}</span>
                </div>
                <div class="detalle-item">
                    <label>Solicitado por</label>
                    <span>${document.getElementById('dato-nombre-alumno')?.value || 'Luis Ángel Hernández López'}</span>
                </div>
            </div>`;
    }

    if (footer) {
        let footerHTML = `<button class="btn-mega btn-cerrar-detalle" onclick="cerrarModalDetalle()"><i class="fa-solid fa-xmark"></i> Cerrar</button>`;
        if (estatusVal === 'pendiente') {
            footerHTML += `<button class="btn-mega" onclick="cerrarModalDetalle(); abrirEdicionTramite('${id}')"><i class="fa-solid fa-lock"></i> Editar Trámite (Requiere PIN)</button>`;
        }
        footer.innerHTML = footerHTML;
    }
    
    modal.classList.remove('hidden');
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

function cargarDatosParaEdicion(id) {
    const card = document.querySelector(`.j-card[data-id="${id}"]`);
    if (!card) return;
    
    tramiteAEditar = id;
    tramitePendienteEdicion = null;

    const vistaLista = document.getElementById('vista-lista');
    const vistaForm = document.getElementById('vista-formulario');
    if (vistaLista) vistaLista.classList.add('hidden');
    if (vistaForm) vistaForm.classList.remove('hidden');

    const tituloForm = document.getElementById('titulo-formulario');
    const subtituloForm = document.getElementById('subtitulo-formulario');
    const editandoId = document.getElementById('editando-tramite-id');
    const btnCancelar = document.getElementById('btn-cancelar-edicion');
    const textoBoton = document.getElementById('texto-boton-enviar');

    if (tituloForm) tituloForm.textContent = 'Editar Justificante';
    if (subtituloForm) subtituloForm.textContent = 'Modifica los datos del trámite pendiente.';
    if (editandoId) editandoId.value = id;
    if (btnCancelar) btnCancelar.classList.remove('hidden');
    if (textoBoton) textoBoton.textContent = 'Guardar Cambios';

    const datosAlumno = {
        nombre: "Luis Ángel Hernández López",
        numero: "A202410378",
        grado: "2°",
        grupo: "B",
        tutor: "María Guadalupe López Sánchez",
        telefonoTutor: "555-123-4567"
    };
    llenarDatosAlumno(datosAlumno);
    
    generarCheckboxesMaterias([
        "Matemáticas II", "Historia Universal", "Física", "Literatura",
        "Inglés II", "Educación Física", "Química", "Formación Cívica"
    ]);

    const selectPermiso = document.getElementById('tipo-permiso');
    const descripcion = document.getElementById('descripcion-motivo');
    
    if (selectPermiso) selectPermiso.value = card.dataset.motivo;
    if (descripcion) descripcion.value = card.dataset.descripcion;

    const tipoJust = card.dataset.tipo;
    const radioSeleccionado = document.querySelector(`input[name="tipo-justificacion"][value="${tipoJust}"]`);
    if (radioSeleccionado) radioSeleccionado.checked = true;
    
    const contMaterias = document.getElementById('contenedor-materias');
    const contRango = document.getElementById('contenedor-rango-fechas');
    const contFechaUnica = document.getElementById('contenedor-fecha-unica');
    
    if (contMaterias) contMaterias.classList.toggle('hidden', tipoJust !== 'materias');
    if (contRango) contRango.classList.toggle('hidden', tipoJust !== 'rango');
    if (contFechaUnica) contFechaUnica.classList.toggle('hidden', tipoJust === 'rango');

    if (tipoJust === 'rango') {
        const fi = document.getElementById('fecha-inicio-rango');
        const ff = document.getElementById('fecha-fin-rango');
        if (fi) fi.value = card.dataset.fechaInicio || '';
        if (ff) ff.value = card.dataset.fechaFin || '';
        const fu = document.getElementById('fecha-inasistencia');
        if (fu) fu.value = '';
    } else {
        const fu = document.getElementById('fecha-inasistencia');
        if (fu) fu.value = card.dataset.fecha || '';
        const fi = document.getElementById('fecha-inicio-rango');
        const ff = document.getElementById('fecha-fin-rango');
        if (fi) fi.value = '';
        if (ff) ff.value = '';
    }

    if (tipoJust === 'materias' && card.dataset.materias) {
        const mats = card.dataset.materias.split(', ');
        document.querySelectorAll('#lista-materias input[type="checkbox"]').forEach(cb => {
            cb.checked = mats.includes(cb.value);
        });
    }

    if (selectPermiso) selectPermiso.dispatchEvent(new Event('change'));
    restaurarTextosModalPin();
    
    console.log('✏️ Modo edición activado para trámite:', id);
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

function eliminarTramite() {
    if (!tramiteAEliminar) return;
    const card = document.querySelector(`.j-card[data-id="${tramiteAEliminar}"]`);
    if (card) {
        card.style.transition = 'all 0.3s';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => {
            card.remove();
            if (document.querySelectorAll('.j-card:not(.hidden)').length === 0) {
                const sinTramites = document.getElementById('sin-tramites');
                if (sinTramites) sinTramites.classList.remove('hidden');
            }
        }, 300);
    }
    cerrarModalConfirmEliminar();
    alert('🗑️ Trámite eliminado exitosamente.');
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

function formatearFecha(fechaStr) {
    if (!fechaStr) return 'No especificada';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    const [anio, mes, dia] = partes;
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${parseInt(dia)} de ${meses[parseInt(mes)-1]}, ${anio}`;
}

// ==========================================
// 6. FUNCIONES COMPARTIDAS
// ==========================================
function crearInputFileGlobal(label, id) {
    return crearInputFile(label, id, '');
}

function vincularEventosArchivos() {
    document.querySelectorAll('.doc-upload').forEach(input => {
        input.onchange = handleFileChangeGlobal;
    });
}

function handleFileChangeGlobal() {
    const nameDisplay = document.getElementById(`name_${this.id}`);
    if (this.files.length > 0) {
        nameDisplay.textContent = this.files[0].name;
        const label = document.getElementById(`label_${this.id}`);
        if (label) label.classList.add('file-uploaded');
    }
}

// ==========================================
// 7. INICIALIZACIÓN DE OTRAS VISTAS
// ==========================================
function initMateriasLogic() { console.log("📚 Módulo Materias Activo"); }
function initHistorialLogic() { console.log("📜 Módulo Historial Activo"); }

// ==========================================
// 8. EVENTOS GLOBALES AL CARGAR LA PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadSection('resumen');
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            loadSection(item.getAttribute('data-section'));
        });
    });
    
    vincularEventosArchivos();
});

// ==========================================
// 9. FUNCIONES DE BIENVENIDA Y LOGO
// ==========================================

// Función para mostrar la vista de bienvenida
function showWelcomeView() {
    const viewContainer = document.getElementById('view-container');
    if (!viewContainer) return;
    
    fetch('../vista/alumnobienvenida.html?t=' + Date.now())
        .then(response => {
            if (!response.ok) throw new Error('No se pudo cargar la vista de bienvenida');
            return response.text();
        })
        .then(html => {
            viewContainer.innerHTML = html;
            viewContainer.classList.remove('fade-in');
            void viewContainer.offsetWidth;
            viewContainer.classList.add('fade-in');
            
            // Actualizar clase activa del menú (ningún item activo para bienvenida)
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
        })
        .catch(error => {
            console.error('Error cargando bienvenida:', error);
            // Fallback: mostrar mensaje simple
            viewContainer.innerHTML = `
                <div class="welcome-hero" style="text-align:center; padding:3rem;">
                    <i class="fa-solid fa-school-circle-check" style="font-size:3rem; color:#C7A03D;"></i>
                    <h2>¡Bienvenido, Juan Pérez!</h2>
                    <p>Bienvenido al portal del alumno de la Secundaria General "Lic. Benito Juárez".</p>
                </div>
            `;
        });
}

// Función demo para descargar horario
window.descargarHorarioDemo = function() {
    alert("📅 Descargando horario semanal...\nEl sistema generará el documento en breve.");
};

// Sobrescribir loadSection para manejar 'bienvenida' y 'resumen'
const loadSectionOriginal = window.loadSection;

window.loadSection = function(sectionName) {
    // Si es bienvenida o resumen, mostrar la vista personalizada
    if (sectionName === 'bienvenida' || sectionName === 'resumen') {
        showWelcomeView();
        return;
    }
    
    // Para las demás secciones, llamar la función original
    if (typeof loadSectionOriginal === 'function') {
        loadSectionOriginal(sectionName);
    }
};

// Función para manejar el clic en el logo
function setupLogoHome() {
    const logo = document.querySelector('.logotipo');
    if (logo) {
        logo.addEventListener('click', function(e) {
            e.preventDefault();
            showWelcomeView();
            
            // Limpiar clase activa del menú
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
        });
    }
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar bienvenida como primera vista
    showWelcomeView();
    
    // Configurar clic en el logo
    setupLogoHome();
});

/* ==========================================
   INTEGRACION ALUMNO/PADRE CON BASE DE DATOS
========================================== */

const ALUMNO_API = '../controlador/alumno.php';
const ALUMNO_SESION_API = '../controlador/sesion.php';
let alumnoContexto = null;
let claseEncontradaActual = null;
let justificantesCache = [];

async function apiAlumno(accion, opciones = {}) {
    const query = opciones.query ? `&${new URLSearchParams(opciones.query).toString()}` : '';
    const config = {
        method: opciones.method || 'GET',
        headers: { 'Content-Type': 'application/json' }
    };

    if (opciones.body) {
        config.body = JSON.stringify(opciones.body);
    }

    const response = await fetch(`${ALUMNO_API}?accion=${accion}${query}`, config);
    const data = await response.json();

    if (!response.ok || !data.ok) {
        if (response.status === 401) {
            window.location.href = '../index.html';
            return null;
        }
        throw new Error(data.mensaje || 'No se pudo completar la operacion.');
    }

    return data;
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

async function inicializarPortalAlumno() {
    try {
        alumnoContexto = await apiAlumno('perfil');
        actualizarHeaderAlumno(alumnoContexto);
    } catch (error) {
        console.error(error);
    }

    document.querySelectorAll('.btn-logout').forEach(btn => {
        btn.addEventListener('click', async () => {
            await fetch(`${ALUMNO_SESION_API}?accion=logout`);
            window.location.href = '../index.html';
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

async function loadSection(sectionName) {
    if (estaCargando) return;
    estaCargando = true;

    const viewContainer = document.getElementById('view-container');

    try {
        const response = await fetch(`alumno/${sectionName}.html?t=${Date.now()}`);
        if (!response.ok) throw new Error(`Error de red HTTP: ${response.status}`);
        const html = await response.text();

        if (viewContainer) {
            viewContainer.innerHTML = html;
            viewContainer.classList.remove('fade-in');
            void viewContainer.offsetWidth;
            viewContainer.classList.add('fade-in');
        }

        if (sectionName === 'resumen' || sectionName === 'bienvenida') {
            await renderResumenAlumno();
        } else if (sectionName === 'materias') {
            await initMateriasLogic();
        } else if (sectionName === 'historial') {
            await initHistorialLogic();
        } else if (sectionName === 'justificantes') {
            yaInicializado = false;
            initJustificantesLogic();
            await renderJustificantesAlumno();
        }
    } catch (error) {
        console.error('Error al cargar vista:', error);
        if (viewContainer) {
            viewContainer.innerHTML = `<div style="padding:2rem;text-align:center;color:#A1232E;">${alumnoEscape(error.message)}</div>`;
        }
    } finally {
        estaCargando = false;
    }
}

async function showWelcomeView() {
    await loadSection('bienvenida');
}

async function renderResumenAlumno() {
    const data = await apiAlumno('resumen');
    alumnoContexto = data;
    actualizarHeaderAlumno(data);

    const alumno = data.alumno;
    const resumen = data.resumen;
    const container = document.getElementById('view-container');
    if (!container) return;
    if (!container || !alumno) {
        container.innerHTML = `<div class="welcome-container"><div class="welcome-hero"><h2>No hay alumno asociado a esta cuenta.</h2></div></div>`;
        return;
    }

    container.innerHTML = `
        <div class="welcome-container">
            <div class="welcome-hero">
                <div class="welcome-badge"><i class="fa-solid fa-calendar-check"></i><span>Bienvenido de vuelta</span></div>
                <div class="welcome-title">Hola, <span>${alumnoEscape(alumno.nombre)}</span></div>
                <div class="welcome-description">
                    ${data.usuario.rol === 'padre' ? 'Consulta el avance escolar, asistencias y justificantes de tu hijo(a).' : 'Revisa tus materias, solicita justificantes y mantente al dia.'}
                </div>
                <div class="stats-row">
                    <div class="stat-card-welcome"><div class="stat-icon"><i class="fa-solid fa-chart-line"></i></div><div class="stat-info"><h4>Asistencia General</h4><p>${resumen.asistencia_general}%</p></div></div>
                    <div class="stat-card-welcome"><div class="stat-icon"><i class="fa-solid fa-book"></i></div><div class="stat-info"><h4>Materias Cursando</h4><p>${resumen.materias}</p></div></div>
                    <div class="stat-card-welcome"><div class="stat-icon"><i class="fa-solid fa-check-circle"></i></div><div class="stat-info"><h4>Presentes</h4><p>${resumen.presentes}</p></div></div>
                    <div class="stat-card-welcome"><div class="stat-icon"><i class="fa-solid fa-file-lines"></i></div><div class="stat-info"><h4>Tramites Activos</h4><p>${resumen.tramites_activos}</p></div></div>
                </div>
            </div>
            <div class="section-title-welcome"><i class="fa-solid fa-bolt"></i><span>Accesos directos</span></div>
            <div class="quick-links-grid">
                <div class="quick-link-card" onclick="loadSection('materias')"><div class="quick-icon"><i class="fa-solid fa-book-open"></i></div><div class="quick-info"><h4>Mis Materias</h4><p>Ver asistencia por clase</p></div></div>
                <div class="quick-link-card" onclick="loadSection('justificantes')"><div class="quick-icon"><i class="fa-solid fa-pen-to-square"></i></div><div class="quick-info"><h4>Solicitar Justificante</h4><p>Inasistencias y permisos</p></div></div>
                <div class="quick-link-card" onclick="loadSection('historial')"><div class="quick-icon"><i class="fa-solid fa-timeline"></i></div><div class="quick-info"><h4>Historial</h4><p>Asistencias y retardos</p></div></div>
                <div class="quick-link-card" onclick="descargarHorarioDemo()"><div class="quick-icon"><i class="fa-solid fa-download"></i></div><div class="quick-info"><h4>Descargar Horario</h4><p>Resumen de materias</p></div></div>
            </div>
            <div class="section-title-welcome"><i class="fa-solid fa-megaphone"></i><span>Avisos recientes</span></div>
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
}

async function initMateriasLogic() {
    const data = await apiAlumno('materias');
    const gridActivas = document.getElementById('grid-activas');
    const gridPendientes = document.getElementById('grid-pendientes');
    if (!gridActivas || !gridPendientes) return;

    gridActivas.innerHTML = `
        <div class="materia-card add-materia" onclick="abrirModalUnirse()">
            <div class="add-content">
                <div class="add-icon"><i class="fa-solid fa-plus"></i></div>
                <h4>Unirse a clase</h4>
                <span>Ingresa el codigo</span>
            </div>
        </div>
        ${(data.materias || []).map(m => `
            <div class="materia-card active-card" data-status="${m.estado}">
                <div class="card-status-line ${m.estado}"></div>
                <div class="card-body">
                    <div class="materia-icon-box ${m.estado === 'risk' ? 'gray' : ''}"><i class="fa-solid ${alumnoEscape(m.icono)}"></i></div>
                    <div class="materia-main">
                        <h4>${alumnoEscape(m.materia)}</h4>
                        <p><i class="fa-solid fa-user-tie"></i> ${alumnoEscape(m.docente)}</p>
                    </div>
                    <button class="btn-info-profe" title="${alumnoEscape(m.correo_docente)}"><i class="fa-solid fa-circle-info"></i></button>
                </div>
                <div class="attendance-visual">
                    <div class="progress-container"><div class="progress-bar ${m.estado === 'risk' ? 'risk' : ''}" style="width:${m.porcentaje_asistencia}%;"></div></div>
                    <div class="attendance-stats">
                        <span class="percentage ${m.estado === 'risk' ? 'risk-text' : ''}">${m.porcentaje_asistencia}% de Asistencia</span>
                        <span class="count">${m.faltas || 0} faltas registradas</span>
                    </div>
                </div>
                ${m.estado === 'risk' ? `<button class="btn-action-risk" onclick="loadSection('justificantes')"><i class="fa-solid fa-file-circle-plus"></i> Justificar ahora</button>` : ''}
            </div>
        `).join('')}`;

    gridPendientes.innerHTML = (data.solicitudes || []).length
        ? data.solicitudes.map(s => `
            <div class="materia-card pending-card">
                <div class="pending-badge">Pendiente</div>
                <div class="card-body">
                    <div class="materia-icon-box gray"><i class="fa-solid fa-hourglass-half"></i></div>
                    <div class="materia-main">
                        <h4>${alumnoEscape(s.materia)} (${alumnoEscape(s.grupo)})</h4>
                        <p>Esperando aprobacion de ${alumnoEscape(s.docente)}</p>
                    </div>
                </div>
            </div>
        `).join('')
        : `<p style="color:#64748B;padding:1rem;">No tienes solicitudes pendientes.</p>`;
}

async function verificarCodigo() {
    const input = document.getElementById('input-codigo-clase');
    const errorText = document.getElementById('error-codigo');
    const codigo = input?.value.trim().toUpperCase();
    if (!codigo) {
        errorText.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Por favor, ingresa un codigo.';
        errorText.style.display = 'block';
        return;
    }

    try {
        const data = await apiAlumno('verificar_codigo', { query: { codigo } });
        claseEncontradaActual = data.clase;
        if (!claseEncontradaActual) throw new Error('Codigo invalido. Verifica con tu profesor.');
        if (Number(claseEncontradaActual.inscrito) === 1) throw new Error('Ya estas inscrito en esta clase.');
        if (Number(claseEncontradaActual.pendiente) === 1) throw new Error('Ya tienes una solicitud pendiente para esta clase.');

        errorText.style.display = 'none';
        document.getElementById('confirm-nombre-clase').innerText = `${claseEncontradaActual.materia} (${claseEncontradaActual.grupo})`;
        document.getElementById('confirm-docente-clase').innerText = `Prof. ${claseEncontradaActual.docente}`;
        document.getElementById('confirm-ciclo-clase').innerText = claseEncontradaActual.periodo || 'Actual';
        document.getElementById('step-1-codigo').style.display = 'none';
        document.getElementById('step-2-confirmacion').style.display = 'block';
    } catch (error) {
        errorText.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${alumnoEscape(error.message)}`;
        errorText.style.display = 'block';
    }
}

async function inscribirseAClase() {
    if (!claseEncontradaActual) return;
    await apiAlumno('solicitar_inscripcion', {
        method: 'POST',
        body: { id_curso: claseEncontradaActual.id }
    });
    alert(`Solicitud enviada para ${claseEncontradaActual.materia}.`);
    cerrarModalUnirse();
    await initMateriasLogic();
}

async function initHistorialLogic() {
    const data = await apiAlumno('historial');
    const stats = document.querySelector('.historial-stats-brief');
    const timeline = document.querySelector('.timeline-container');
    if (!stats || !timeline) return;

    stats.innerHTML = `
        <div class="stat-mini"><span class="label">Asistencias</span><span class="value text-success">${data.resumen.presentes}</span></div>
        <div class="stat-mini"><span class="label">Retardos</span><span class="value text-warning">${data.resumen.retardos}</span></div>
        <div class="stat-mini"><span class="label">Faltas</span><span class="value text-danger">${data.resumen.faltas}</span></div>`;

    const eventos = data.eventos || [];
    timeline.innerHTML = eventos.length ? `
        <div class="timeline-group">
            <span class="group-date">Registros recientes</span>
            ${eventos.map(e => {
                const tipo = e.estado === 'presente' ? 'presente' : e.estado === 'retardo' ? 'retardo' : 'falta';
                const badge = tipo === 'presente' ? 'success' : tipo === 'retardo' ? 'warning' : 'danger';
                const icon = tipo === 'presente' ? 'fa-check' : tipo === 'retardo' ? 'fa-clock' : 'fa-xmark';
                return `
                    <div class="timeline-item status-${tipo}" data-status="${tipo}">
                        <div class="item-icon"><i class="fa-solid ${icon}"></i></div>
                        <div class="item-content">
                            <div class="item-main"><h4>${alumnoEscape(e.materia)}</h4><span class="time">${alumnoEscape(e.fecha)} ${alumnoEscape(e.hora)}</span></div>
                            <p>${alumnoEscape(e.docente)}</p>
                        </div>
                        <div class="item-badge ${badge}">${tipo === 'falta' ? 'Inasistencia' : alumnoEscape(e.estado)}</div>
                    </div>`;
            }).join('')}
        </div>` : `<p style="padding:2rem;color:#64748B;">No hay registros de asistencia todavia.</p>`;

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
}

async function renderJustificantesAlumno() {
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
        return `
            <div class="j-card fade-in" data-estatus="${alumnoEscape(j.estado)}" data-id="${j.id}"
                 data-motivo="${motivo}" data-fecha="${alumnoEscape(j.fecha_inicio)}" data-tipo="${j.fecha_inicio === j.fecha_fin ? 'completo' : 'rango'}"
                 data-descripcion="${alumnoEscape(j.descripcion)}" data-archivos="${alumnoEscape(j.archivo_url || 'Sin archivos')}" data-archivos-json="[]">
                <div class="j-card-header">
                    <div class="j-title"><i class="fa-solid ${iconoJustificante(motivo)}"></i><h4>${alumnoEscape(j.asunto)}</h4></div>
                    <div class="j-card-actions">
                        <span class="badge-status ${alumnoEscape(j.estado)}">${estadoJustificante(j.estado)}</span>
                        <button class="btn-icon-action btn-ver" title="Ver detalles" onclick="verDetallesTramite('${j.id}')"><i class="fa-solid fa-eye"></i></button>
                        ${j.estado === 'pendiente' ? `<button class="btn-icon-action btn-eliminar" title="Eliminar tramite" onclick="confirmarEliminarTramite('${j.id}')"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                    </div>
                </div>
                <div class="j-card-body">
                    <p><strong>${j.fecha_inicio === j.fecha_fin ? 'Fecha' : 'Periodo'}:</strong> ${alumnoEscape(j.fecha_inicio)}${j.fecha_inicio !== j.fecha_fin ? ' al ' + alumnoEscape(j.fecha_fin) : ''}</p>
                    <p><strong>Descripcion:</strong> ${alumnoEscape(j.descripcion)}</p>
                    <p><strong>Archivos:</strong> ${alumnoEscape(j.archivo_url || 'Sin archivos registrados')}</p>
                </div>
                <div class="j-card-footer"><button class="btn-detalles" onclick="verDetallesTramite('${j.id}')"><i class="fa-solid fa-circle-info"></i> Ver Todos los Detalles</button></div>
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
        alert('Completa motivo y descripcion.');
        return;
    }

    const payload = {
        motivo: motivo.value,
        asunto: asuntoJustificante(motivo.value),
        descripcion: descripcion.value.trim(),
        fecha_inicio: tipoJustificacion === 'rango' ? fechaInicio : fecha,
        fecha_fin: tipoJustificacion === 'rango' ? fechaFin : fecha,
        archivo_url: Array.from(document.querySelectorAll('.doc-upload'))
            .filter(input => input.files && input.files[0])
            .map(input => input.files[0].name)
            .join(', ')
    };

    if (!payload.fecha_inicio || !payload.fecha_fin) {
        alert('Selecciona la fecha del justificante.');
        return;
    }

    const data = await apiAlumno('crear_justificante', { method: 'POST', body: payload });
    justificantesCache = data.justificantes || [];
    renderListaJustificantes(justificantesCache);
    alert('Solicitud enviada correctamente.');

    document.getElementById('vista-formulario')?.classList.add('hidden');
    document.getElementById('vista-lista')?.classList.remove('hidden');
    resetearFormularioJustificante();
}

async function eliminarTramite() {
    if (!tramiteAEliminar) return;
    const data = await apiAlumno('eliminar_justificante', {
        method: 'POST',
        body: { id_justificante: tramiteAEliminar }
    });
    justificantesCache = data.justificantes || [];
    renderListaJustificantes(justificantesCache);
    cerrarModalConfirmEliminar();
    alert('Tramite eliminado correctamente.');
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
    return estado === 'aprobado' ? 'Aprobado' : estado === 'rechazado' ? 'Rechazado' : 'En Revision';
}

function asuntoJustificante(motivo) {
    return {
        salud: 'Enfermedad / Cita Medica',
        personal: 'Asuntos Familiares / Personales',
        viaje: 'Viaje Escolar / Congreso'
    }[motivo] || 'Justificante';
}

function descargarHorarioDemo() {
    alert('El horario se genera a partir de tus materias inscritas. Esta descarga quedara disponible en la siguiente etapa.');
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarPortalAlumno();
    loadSection('resumen');
    setupLogoHome();
});

window.loadSection = loadSection;
window.showWelcomeView = showWelcomeView;
window.descargarHorarioDemo = descargarHorarioDemo;

/* ==========================================
   AJUSTES FINALES DE COHERENCIA ALUMNO/PADRE
========================================== */

async function loadSectionAlumnoFinal(sectionName) {
    if (estaCargando) return;
    estaCargando = true;

    const viewContainer = document.getElementById('view-container');

    try {
        if (sectionName === 'resumen' || sectionName === 'bienvenida' || sectionName === 'perfil') {
            await renderResumenAlumno();
            return;
        }

        const response = await fetch(`alumno/${sectionName}.html?t=${Date.now()}`);
        if (!response.ok) throw new Error(`Error de red HTTP: ${response.status}`);

        if (viewContainer) {
            viewContainer.innerHTML = await response.text();
            viewContainer.classList.remove('fade-in');
            void viewContainer.offsetWidth;
            viewContainer.classList.add('fade-in');
        }

        if (sectionName === 'materias') {
            await initMateriasLogic();
        } else if (sectionName === 'historial') {
            await initHistorialLogic();
        } else if (sectionName === 'justificantes') {
            await initJustificantesLogic();
        }
    } catch (error) {
        console.error('Error al cargar vista:', error);
        if (viewContainer) {
            viewContainer.innerHTML = `<div style="padding:2rem;text-align:center;color:#A1232E;">${alumnoEscape(error.message)}</div>`;
        }
    } finally {
        estaCargando = false;
    }
}

async function showWelcomeViewAlumnoFinal() {
    await loadSectionAlumnoFinal('bienvenida');
}

async function initJustificantesLogic() {
    yaInicializado = true;

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

    if (btnHam && drop) {
        btnHam.onclick = e => {
            e.stopPropagation();
            drop.classList.toggle('hidden');
        };
    }

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

    if (menuSol && modal && inputPin) {
        menuSol.onclick = () => {
            if (drop) drop.classList.add('hidden');
            restaurarTextosModalPin();
            modal.classList.remove('hidden');
            inputPin.value = '';
            if (errorPin) errorPin.classList.add('hidden');
            setTimeout(() => inputPin.focus(), 100);
            menuSol.classList.add('active');
            if (menuHis) menuHis.classList.remove('active');
        };
    }

    if (btnCerrarAuth && modal) {
        btnCerrarAuth.onclick = () => {
            modal.classList.add('hidden');
            tramitePendienteEdicion = null;
        };
    }

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
            prepararFormularioJustificante(data);
        };

        inputPin.onkeypress = e => {
            if (e.key === 'Enter') btnValidarPin.click();
        };
    }

    configurarCamposJustificante();

    if (btnEnviar) btnEnviar.onclick = validarYEnviarSolicitud;
    if (buscarTramite) buscarTramite.oninput = filtrarTramites;
    if (filtroEstatus) filtroEstatus.onchange = filtrarTramites;

    renderListaJustificantes(justificantesCache);
}

function prepararFormularioJustificante(data) {
    const alumno = data.alumno;
    if (alumno) {
        llenarDatosAlumno({
            nombre: alumno.nombre,
            numero: alumno.matricula || '',
            grado: extraerGrado(alumno.grupo),
            grupo: alumno.grupo || '',
            tutor: alumno.tutor || '',
            telefonoTutor: alumno.telefonoTutor || ''
        });
    }

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
        selectPermiso.onchange = function() {
            if (uploadZone) uploadZone.innerHTML = '';
            if (contenedorDocumentos) contenedorDocumentos.classList.add('hidden');
            if (infoBanner) infoBanner.classList.add('hidden');

            const config = {
                salud: {
                    info: '<i class="fa-solid fa-circle-info"></i> <b>Motivo de Salud:</b> Adjunta receta medica o comprobante de consulta.',
                    desc: 'Sube tu receta medica o comprobante de consulta.',
                    inputs: crearInputFile('Receta Medica', 'receta', 'Formato: PDF, JPG o PNG')
                },
                personal: {
                    info: '<i class="fa-solid fa-circle-info"></i> <b>Asuntos Familiares:</b> Adjunta carta firmada por el tutor.',
                    desc: 'Sube la carta firmada por el tutor.',
                    inputs: crearInputFile('Carta Firmada por el Tutor', 'carta-familiar', 'Formato: PDF, JPG o PNG')
                },
                viaje: {
                    info: '<i class="fa-solid fa-circle-info"></i> <b>Viaje Escolar:</b> Adjunta oficio e identificacion del tutor.',
                    desc: 'Sube los documentos para validar el viaje escolar.',
                    inputs: crearInputFile('Oficio de Comision', 'oficio', 'PDF') + crearInputFile('INE del Tutor', 'ine', 'PDF, JPG o PNG')
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

function setupLogoHome() {
    const logo = document.querySelector('.logotipo');
    if (logo) {
        logo.onclick = e => {
            e.preventDefault();
            showWelcomeViewAlumnoFinal();
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.loadSection = loadSectionAlumnoFinal;
    window.showWelcomeView = showWelcomeViewAlumnoFinal;
    inicializarPortalAlumno();
    setupLogoHome();
    loadSectionAlumnoFinal('bienvenida');
});

window.loadSection = loadSectionAlumnoFinal;
window.showWelcomeView = showWelcomeViewAlumnoFinal;
