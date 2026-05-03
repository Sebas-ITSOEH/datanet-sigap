/**
 * mainPrefectura.js - Panel de Control Unificado
 * DIVIDIDO: SECCIÓN BIENVENIDA | SECCIÓN CONTROL | SECCIÓN PERSONAL | SECCIÓN SISTEMA
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
            
            // Inicializar lógica según la sección
            if (sectionName === 'bienvenida') { initBienvenidaLogic(); }
            else if (sectionName === 'control') { initControlLogic(); }
            else if (sectionName === 'personal') { initPersonalLogic(); }
            else if (sectionName === 'sistema') { initSistemaLogic(); }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    if (navItems.length > 0) {
        navItems.forEach(function(item) {
            item.addEventListener('click', function() {
                navItems.forEach(function(i) { i.classList.remove('active'); });
                item.classList.add('active');
                loadSection(item.getAttribute('data-section'));
            });
        });
    }

    // Cargar bienvenida por defecto
    loadSection('bienvenida');
    
    // Click en logo para volver a bienvenida
    const logoBox = document.querySelector('.logo-box');
    if (logoBox) {
        logoBox.parentElement.addEventListener('click', function() {
            navItems.forEach(function(i) { i.classList.remove('active'); });
            loadSection('bienvenida');
        });
    }

    // Inicializar lógicas si ya están presentes
    if (document.querySelector('.bienvenida-layout')) { initBienvenidaLogic(); }
    if (document.querySelector('.personal-layout')) { initPersonalLogic(); }
    if (document.querySelector('.sistema-layout')) { initSistemaLogic(); }
    if (document.querySelector('.control-layout')) { initControlLogic(); }
});

// ==========================================
// ==========================================
//      FUNCIÓN GLOBAL DE NAVEGACIÓN
// ==========================================
// ==========================================
function navigateToSection(sectionName) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function(item) {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionName) {
            item.classList.add('active');
        }
    });
    
    const viewContainer = document.getElementById('view-container');
    if (viewContainer) {
        fetch('../vista/prefectura/' + sectionName + '.html')
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
// ==========================================
//      SECCIÓN: BIENVENIDA
// ==========================================
// ==========================================
function initBienvenidaLogic() {
    console.log('👋 Vista de Bienvenida inicializada');
    
    // Actualizar saludo según la hora
    updateGreeting();
    
    // Actualizar fecha
    updateDate();
}

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
    
    greetingElement.innerHTML = '<i class="fa-solid ' + icon + '"></i> ' + greeting;
}

function updateDate() {
    const dateElement = document.getElementById('fecha-actual');
    if (!dateElement) return;
    
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    dateElement.textContent = now.toLocaleDateString('es-MX', options);
}

// ==========================================
// ==========================================
//      SECCIÓN: PANEL DE CONTROL
// ==========================================
// ==========================================

function initControlLogic() {
    console.log('🟢 Panel de Control inicializado');
    
    var subNavItems = document.querySelectorAll('.sub-nav-item');
    var sections = document.querySelectorAll('.control-view');
    var searchAlumno = document.getElementById('searchAlumno');
    var filtroGrupo = document.getElementById('filtro-grupo');
    var filtroMotivo = document.getElementById('filtro-motivo');
    var tablaSolicitudes = document.getElementById('tabla-solicitudes');

    function getFilas() { return document.querySelectorAll('#tabla-solicitudes tbody .solicitud-row'); }

    function switchSubView(targetId) {
        sections.forEach(function(s) { s.classList.add('hidden'); });
        var target = document.getElementById(targetId);
        if (target) {
            target.classList.remove('hidden'); target.classList.remove('fade-in');
            void target.offsetWidth; target.classList.add('fade-in');
        }
        subNavItems.forEach(function(b) { b.classList.remove('active'); });
        var ab = document.querySelector('.sub-nav-item[data-target="' + targetId + '"]');
        if (ab) ab.classList.add('active');
        if (targetId === 'section-historial') initHistorialLogic();
    }

    subNavItems.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var tid = btn.getAttribute('data-target');
            if (tid) switchSubView(tid);
        });
    });

    function filtrar() {
        var st = searchAlumno ? searchAlumno.value.toLowerCase().trim() : '';
        var gf = filtroGrupo ? filtroGrupo.value : 'todos';
        var mf = filtroMotivo ? filtroMotivo.value : 'todos';
        getFilas().forEach(function(f) {
            var n = f.getAttribute('data-nombre') || '', m = f.getAttribute('data-matricula') || '';
            var g = f.getAttribute('data-grupo') || '', mo = f.getAttribute('data-motivo') || '';
            var ok = (!st || n.toLowerCase().includes(st) || m.includes(st)) && (gf === 'todos' || g === gf) && (mf === 'todos' || mo.toLowerCase() === mf);
            f.style.display = ok ? '' : 'none';
        });
    }

    if (searchAlumno) searchAlumno.addEventListener('input', filtrar);
    if (filtroGrupo) filtroGrupo.addEventListener('change', filtrar);
    if (filtroMotivo) filtroMotivo.addEventListener('change', filtrar);

    if (tablaSolicitudes) {
        tablaSolicitudes.addEventListener('click', function(e) {
            var fila = e.target.closest('.solicitud-row'); if (!fila) return;
            if (e.target.closest('.btn-accion.aprobar')) { e.stopPropagation(); aprobar(fila); return; }
            if (e.target.closest('.btn-accion.rechazar')) { e.stopPropagation(); rechazar(fila); return; }
            if (e.target.closest('.btn-accion.detalle') || fila) { mostrarDetalle(fila); }
        });
    }

    function aprobar(fila) {
        var nombre = fila.getAttribute('data-nombre');
        Swal.fire({
            title: '¿Aprobar Solicitud?',
            html: '<p>Estás por <strong style="color:#10B981;">aprobar</strong> la solicitud de:</p><p style="font-size:1.1rem;color:#192A56;font-weight:600;">' + nombre + '</p>',
            icon: 'question', showCancelButton: true,
            confirmButtonText: 'Sí, Aprobar', confirmButtonColor: '#10B981',
            cancelButtonText: 'Cancelar', cancelButtonColor: '#64748B'
        }).then(function(r) {
            if (r.isConfirmed) {
                var tag = fila.querySelector('.estado-tag');
                if (tag) { tag.textContent = 'Aprobada'; tag.className = 'estado-tag aprobada'; }
                var ac = fila.querySelector('.acciones-cell');
                if (ac) {
                    var ba = ac.querySelector('.btn-accion.aprobar'), br = ac.querySelector('.btn-accion.rechazar');
                    if (ba) ba.remove(); if (br) br.remove();
                }
                Swal.fire({ title: '✅ Aprobada', icon: 'success', confirmButtonColor: '#192A56', timer: 1500 });
            }
        });
    }

    function rechazar(fila) {
        var nombre = fila.getAttribute('data-nombre');
        Swal.fire({
            title: '¿Rechazar?',
            html: '<p>Estás por <strong style="color:#EF4444;">rechazar</strong> la solicitud de:</p><p style="font-size:1.1rem;color:#EF4444;">' + nombre + '</p><textarea id="motivo-rechazo" class="swal2-textarea" placeholder="Motivo del rechazo..." style="width:100%;height:60px;"></textarea>',
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Rechazar', confirmButtonColor: '#EF4444',
            cancelButtonText: 'Cancelar', cancelButtonColor: '#64748B',
            preConfirm: function() {
                var motivo = document.getElementById('motivo-rechazo').value;
                if (!motivo) Swal.showValidationMessage('Escribe un motivo');
                return motivo;
            }
        }).then(function(r) {
            if (r.isConfirmed) {
                var tag = fila.querySelector('.estado-tag');
                if (tag) { tag.textContent = 'Rechazada'; tag.className = 'estado-tag rechazada'; }
                var ac = fila.querySelector('.acciones-cell');
                if (ac) {
                    var ba = ac.querySelector('.btn-accion.aprobar'), br = ac.querySelector('.btn-accion.rechazar');
                    if (ba) ba.remove(); if (br) br.remove();
                }
                Swal.fire({ title: '❌ Rechazada', icon: 'error', confirmButtonColor: '#192A56' });
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
}

function construirModal(d) {
    var mat = [], doc = [];
    try { mat = JSON.parse(d.materiasAfectadas || '[]'); } catch(e) { mat = []; }
    try { doc = JSON.parse(d.documentos || '[]'); } catch(e) { doc = []; }
    var tf = d.tipoFalta === 'completa' ? 'Día Completo' : 'Parcial (' + d.horaInicio + ' - ' + d.horaFin + ')';
    var mh = mat.length ? mat.map(function(m) {
        return '<tr><td><div class="docente-info"><i class="fa-solid fa-user-tie"></i>' + m.docente + '</div></td><td><strong>' + m.materia + '</strong></td><td><span class="horario-badge"><i class="fa-regular fa-clock"></i> ' + m.hora + '</span></td></tr>';
    }).join('') : '<tr><td colspan="3" class="vacio">Sin materias registradas</td></tr>';
    var dh = doc.length ? doc.map(function(dc) {
        return '<div class="documento-item"><i class="fa-solid fa-file-' + (dc.tipo === 'pdf' ? 'pdf' : 'image') + '"></i><div class="documento-info"><span class="documento-nombre">' + dc.nombre + '</span><a href="#" class="documento-ver" onclick="return false;">Ver documento</a></div></div>';
    }).join('') : '<p class="vacio">Sin documentos adjuntos</p>';

    return '<div class="modal-solicitud-detalle">' +
        '<div class="modal-header-section"><div class="modal-alumno-info"><img src="https://ui-avatars.com/api/?name=' + encodeURIComponent(d.nombre) + '&background=D6A848&color=192A56&size=44"><div><h3>' + d.nombre + '</h3><span class="modal-grupo">Grupo ' + d.grupo + ' • Matrícula: ' + d.matricula + '</span></div></div><span class="modal-motivo ' + d.motivo.toLowerCase() + '">' + d.motivo + '</span></div>' +
        '<div class="modal-tutor-section"><h4><i class="fa-solid fa-user"></i> Información del Tutor</h4><div class="tutor-details"><div class="tutor-item"><label>Nombre Completo</label><span>' + d.tutor + '</span></div><div class="tutor-item"><label>Teléfono de Contacto</label><span><i class="fa-solid fa-phone"></i> ' + d.telefonoTutor + '</span></div></div></div>' +
        '<div class="modal-justificante-section"><h4><i class="fa-solid fa-file-lines"></i> Detalle del Justificante</h4><div class="justificante-info"><div class="info-row"><label>Fecha de Solicitud</label><span>' + d.fecha + '</span></div><div class="info-row"><label>Tipo de Falta</label><span class="tipo-falta-badge">' + tf + '</span></div><div class="info-row"><label>Duración</label><span>' + (d.dias || '1 día') + '</span></div><div class="info-row descripcion-row"><label>Descripción del Motivo</label><p>' + d.descripcion + '</p></div></div></div>' +
        '<div class="modal-materias-section"><h4><i class="fa-solid fa-book-open"></i> Materias y Docentes Afectados</h4><table class="materias-table"><thead><tr><th>Docente</th><th>Materia</th><th>Horario</th></tr></thead><tbody>' + mh + '</tbody></table></div>' +
        '<div class="modal-documentos-section"><h4><i class="fa-solid fa-paperclip"></i> Documentos Adjuntos</h4><div class="documentos-grid">' + dh + '</div></div></div>';
}

function abrirModalDetalle(html, d) {
    var op = { title: 'Detalle de Solicitud', html: html, width: 750, showCloseButton: true, confirmButtonText: 'Cerrar', confirmButtonColor: '#192A56', customClass: { popup: 'swal-solicitud-popup', htmlContainer: 'swal-solicitud-content' } };
    if (d.estado === 'pendiente') { op.showDenyButton = true; op.denyButtonText = 'Rechazar'; op.denyButtonColor = '#EF4444'; op.confirmButtonText = 'Aprobar'; op.confirmButtonColor = '#10B981'; }
    Swal.fire(op).then(function(r) {
        if (r.isConfirmed && d.estado === 'pendiente') Swal.fire({ title: '✅ Aprobada', icon: 'success', confirmButtonColor: '#192A56', timer: 1500 });
        else if (r.isDenied) Swal.fire({ title: '❌ Rechazada', icon: 'error', confirmButtonColor: '#192A56' });
    });
}

// ==========================================
// FUNCIONES GLOBALES DE CONTROL
// ==========================================
function mostrarVistaPreviaAsistencia() {
    var g = document.getElementById('export-grupo-asistencia').value;
    var m = document.getElementById('export-materia-asistencia').value;
    var s = document.getElementById('export-semana').value;
    if (!g || !m || !s) { Swal.fire({ title: 'Selección Incompleta', icon: 'warning', confirmButtonColor: '#192A56' }); return; }
    document.getElementById('vista-previa-asistencia').classList.remove('hidden');
    var cfg = { semana1: { d: ['Lun 01','Mar 02','Mié 03','Jue 04','Vie 05'], mes: 'Abril' }, semana2: { d: ['Lun 07','Mar 08','Mié 09','Jue 10','Vie 11'], mes: 'Abril' }, semana3: { d: ['Lun 14','Mar 15','Mié 16','Jue 17','Vie 18'], mes: 'Abril' }, semana4: { d: ['Lun 21','Mar 22','Mié 23','Jue 24','Vie 25'], mes: 'Abril' } };
    var sem = cfg[s];
    var docs = { matematicas: 'Prof. Ricardo Mendoza', historia: 'Profa. Patricia Luna', ciencias: 'Prof. Carlos Vega', espanol: 'Profa. Ana Castillo', ingles: 'Prof. Miguel Ángel', fisica: 'Prof. Carlos Vega' };
    var nm = document.getElementById('export-materia-asistencia').selectedOptions[0].text;
    var doc = docs[m] || 'Prof. Asignado';
    document.getElementById('titulo-vista-previa').innerHTML = '<i class="fa-solid fa-list-check"></i> Grupo ' + g + ' | ' + nm + ' | ' + doc + ' | ' + sem.d[0] + ' al ' + sem.d[sem.d.length-1] + ' ' + sem.mes;
    document.getElementById('dias-semana-header').innerHTML = sem.d.map(function(d) { return '<th><span class="dia-header">' + d.split(' ')[0] + '</span><span class="fecha-dia">' + d.split(' ')[1] + ' ' + sem.mes + '</span><span class="materia-header">' + nm + '</span></th>'; }).join('');
    var al = [{n:1,nom:'Ana López García'},{n:2,nom:'Carlos Ruiz'},{n:3,nom:'María Torres'},{n:4,nom:'Luis Hernández'},{n:5,nom:'Sofía Martínez'},{n:6,nom:'Diego Sánchez'},{n:7,nom:'Valentina Flores'},{n:8,nom:'Emiliano García'}];
    var ta=0,tf=0;
    document.getElementById('cuerpo-tabla-asistencia').innerHTML = al.map(function(a) {
        var as=[],ca=0,cf=0;
        sem.d.forEach(function() { var r=Math.random(); if(r>0.15){as.push('<td class="asistio">✓</td>');ca++;}else if(r>0.08){as.push('<td class="falta">✗</td>');cf++;}else{as.push('<td class="justificada">J</td>');cf++;} });
        ta+=ca;tf+=cf;
        return '<tr><td>'+a.n+'</td><td class="alumno-nombre">'+a.nom+'</td>'+as.join('')+'<td><strong>'+ca+'</strong></td><td><strong>'+cf+'</strong></td></tr>';
    }).join('');
    document.getElementById('resumen-asistencia').innerHTML = '<div class="resumen-item"><div class="resumen-icono green"><i class="fa-solid fa-check"></i></div><div><strong>'+ta+'</strong> Asistencias</div></div><div class="resumen-item"><div class="resumen-icono red"><i class="fa-solid fa-xmark"></i></div><div><strong>'+tf+'</strong> Faltas</div></div><div class="resumen-item"><div class="resumen-icono warning"><i class="fa-solid fa-chart-simple"></i></div><div><strong>'+Math.round((ta/(ta+tf))*100)+'%</strong></div></div>';
    document.getElementById('vista-previa-asistencia').scrollIntoView({behavior:'smooth'});
}

function descargarListaPDF() {
    var g=document.getElementById('export-grupo-asistencia').value,m=document.getElementById('export-materia-asistencia').value,s=document.getElementById('export-semana').value;
    if(!g||!m||!s){Swal.fire({title:'Sin datos',icon:'warning',confirmButtonColor:'#192A56'});return;}
    var th=document.getElementById('tabla-asistencia-previa').outerHTML,tit=document.getElementById('titulo-vista-previa').textContent,res=document.getElementById('resumen-asistencia').innerHTML;
    var c='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Lista</title><style>body{font-family:sans-serif;padding:30px;}table{width:100%;border-collapse:collapse;}th{background:#192A56;color:#fff;padding:8px;}td{padding:6px 8px;border:1px solid #ddd;text-align:center;}.header{text-align:center;border-bottom:2px solid #D6A848;margin-bottom:20px;}</style></head><body><div class="header"><h2>Esc.Sec.Gral. Lic. "Benito Juarez"</h2><p>'+tit+'</p></div>'+th+'<div style="margin-top:15px;padding:12px;background:#FEF9F0;">'+res+'</div></body></html>';
    var w=window.open('','_blank');w.document.write(c);w.document.close();setTimeout(function(){w.print();},500);
    Swal.fire({title:'✅ PDF Generado',icon:'success',confirmButtonColor:'#192A56',timer:1500});
}

function descargarListaExcel() {
    var g=document.getElementById('export-grupo-asistencia').value,s=document.getElementById('export-semana').value;
    if(!g||!s){Swal.fire({title:'Sin datos',icon:'warning',confirmButtonColor:'#192A56'});return;}
    var filas=document.querySelectorAll('#tabla-asistencia-previa tbody tr'),csv='\uFEFFNo.,Alumno,';
    document.querySelectorAll('#dias-semana-header th').forEach(function(th){csv+='"'+((th.querySelector('.dia-header')||{}).textContent||'')+' '+((th.querySelector('.fecha-dia')||{}).textContent||'')+'",';});
    csv+='Asistencias,Faltas\n';
    filas.forEach(function(f){var celdas=f.querySelectorAll('td');celdas.forEach(function(c,i){var v=c.textContent.trim();if(c.classList.contains('asistio'))v='Asistió';if(c.classList.contains('falta'))v='Falta';if(c.classList.contains('justificada'))v='Justificada';csv+='"'+v+'"';if(i<celdas.length-1)csv+=',';});csv+='\n';});
    var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='Lista_'+g+'_'+s+'.csv';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    Swal.fire({title:'✅ Excel Generado',icon:'success',confirmButtonColor:'#192A56',timer:1500});
}

function descargarPermisoDesdeBoton(btn) {
    var f=btn.closest('.historial-row');if(!f)return;
    descargarPermiso({
        id:f.getAttribute('data-id'),nombre:f.getAttribute('data-nombre'),grupo:f.getAttribute('data-grupo'),
        matricula:f.getAttribute('data-matricula'),tutor:f.getAttribute('data-tutor'),
        telefonoTutor:f.getAttribute('data-telefono-tutor'),motivo:f.getAttribute('data-motivo'),
        descripcion:f.getAttribute('data-descripcion'),fecha:f.getAttribute('data-fecha'),
        horaInicio:f.getAttribute('data-hora-inicio'),horaFin:f.getAttribute('data-hora-fin'),
        tipoFalta:f.getAttribute('data-tipo-falta'),dias:f.getAttribute('data-dias')
    });
}

function descargarPermiso(d) {
    var fh = new Date().toLocaleDateString('es-MX', {year: 'numeric', month: 'long', day: 'numeric'});
    var tf = d.tipoFalta === 'completa' ? 'Día Completo' : 'Parcial (' + d.horaInicio + ' - ' + d.horaFin + ' hrs)';
    var esc = {
        nombre: 'Esc.Sec.Gral. Lic. "Benito Juarez"',
        direccion: 'Miguel Hidalgo 14, Educación, 42952 Tlaxcoapan, Hgo.',
        telefono: '778 737 0111',
        logo: 'vista/vPrefectura/img/logo-escuela.png'
    };
    var folio = 'SEC-2026-' + String(d.id || '000').padStart(4, '0');
    var datosQR = encodeURIComponent('FOLIO: ' + folio + '\nALUMNO: ' + d.nombre + '\nGRUPO: ' + d.grupo + '\nTUTOR: ' + d.tutor + '\nFECHA: ' + d.fecha + '\nMOTIVO: ' + d.motivo);
    var qrURL = 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=' + datosQR + '&bgcolor=FFFFFF&color=192A56';

    var c = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Justificante - ' + d.nombre + '</title>'
        + '<style>@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap");*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Inter,sans-serif;padding:25px;color:#1E293B;background:#F8FAFC;}.justificante{max-width:800px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.1);overflow:hidden;}.j-header{background:linear-gradient(135deg,#192A56,#1E3A6E);color:#fff;padding:25px 30px;display:flex;align-items:center;justify-content:space-between;gap:20px;}.j-header-izq{display:flex;align-items:center;gap:15px;}.j-header .logo{width:70px;height:70px;object-fit:contain;background:#fff;border-radius:10px;padding:5px;}.j-header h1{font-size:1.2rem;font-weight:700;margin-bottom:3px;}.j-header .subtitulo{font-size:.7rem;opacity:.85;}.j-qr{background:#fff;padding:8px;border-radius:8px;text-align:center;}.j-qr img{width:100px;height:100px;}.j-qr p{font-size:.55rem;color:#192A56;font-weight:700;margin-top:3px;}.j-body{padding:25px 30px;}.j-folio{display:flex;justify-content:space-between;align-items:center;color:#64748B;font-size:.78rem;margin-bottom:20px;padding:12px 15px;background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;}.j-seccion{margin-bottom:22px;}.j-seccion h2{font-size:.95rem;color:#192A56;margin-bottom:10px;padding-bottom:7px;border-bottom:2px solid #D6A848;}.j-datos{display:grid;grid-template-columns:1fr 1fr;gap:10px;}.j-dato label{display:block;font-size:.65rem;color:#64748B;font-weight:600;text-transform:uppercase;}.j-dato span{font-size:.82rem;font-weight:500;color:#1E293B;}.j-alumno{background:linear-gradient(135deg,#FEF9F0,#FFF5E6);border:1px dashed #D6A848;border-radius:8px;padding:14px 18px;margin:12px 0;display:flex;align-items:center;gap:12px;}.j-alumno .nombre{font-size:1.15rem;font-weight:700;color:#192A56;}.j-sello{text-align:center;margin:20px 0;}.j-sello span{display:inline-block;padding:10px 25px;background:#ECFDF5;color:#065F46;font-weight:700;border-radius:8px;border:2px solid #10B981;}.j-firmas{display:flex;justify-content:space-around;margin-top:35px;padding-top:22px;border-top:1px solid #E2E8F0;}.j-firma{text-align:center;}.j-firma .linea{border-top:1px solid #192A56;width:170px;margin-bottom:6px;}.j-firma .nombre{font-weight:600;font-size:.82rem;color:#192A56;}.j-firma .cargo{font-size:.68rem;color:#64748B;}.j-footer{text-align:center;font-size:.62rem;color:#94A3B8;padding:18px;background:#F8FAFC;border-top:1px solid #E2E8F0;}</style></head><body><div class="justificante">'
        + '<div class="j-header"><div class="j-header-izq"><img src="' + esc.logo + '" alt="Logo" class="logo" onerror="this.style.display=\'none\'"><div><h1>JUSTIFICANTE DE AUSENCIA</h1><p class="subtitulo">' + esc.nombre + '<br>' + esc.direccion + '</p></div></div><div class="j-qr"><img src="' + qrURL + '" alt="QR"><p>' + folio + '</p></div></div>'
        + '<div class="j-body"><div class="j-folio"><div><strong>Folio:</strong> ' + folio + '</div><div><strong>Fecha:</strong> ' + fh + '</div></div>'
        + '<div class="j-seccion"><h2>DATOS DEL ALUMNO</h2><div class="j-alumno"><div class="nombre">' + d.nombre + '</div></div><div class="j-datos"><div class="j-dato"><label>Tutor</label><span>' + d.tutor + '</span></div><div class="j-dato"><label>Teléfono</label><span>' + (d.telefonoTutor || 'N/A') + '</span></div></div></div>'
        + '<div class="j-seccion"><h2>DETALLE DE LA AUSENCIA</h2><div class="j-datos"><div class="j-dato"><label>Motivo</label><span>' + d.motivo + '</span></div><div class="j-dato"><label>Fecha</label><span>' + d.fecha + '</span></div><div class="j-dato"><label>Duración</label><span>' + (d.dias || '1 día') + '</span></div><div class="j-dato"><label>Tipo</label><span>' + tf + '</span></div></div></div>'
        + '<div class="j-sello"><span>✅ AUTORIZADO</span></div>'
        + '<div class="j-firmas"><div class="j-firma"><div class="linea"></div><div class="nombre">Mtra. Laura Hernández García</div><div class="cargo">Directora Escolar</div></div><div class="j-firma"><div class="linea"></div><div class="nombre">' + d.tutor + '</div><div class="cargo">Padre/Madre/Tutor</div></div></div></div>'
        + '<div class="j-footer"><p>' + esc.nombre + ' • ' + esc.direccion + ' • Tel: ' + esc.telefono + '</p></div></div></body></html>';

    var w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(c); w.document.close();
    setTimeout(function() { w.print(); }, 800);
    Swal.fire({ title: '📄 Justificante Generado', icon: 'success', confirmButtonColor: '#192A56', timer: 2500 });
}

function initHistorialLogic() {
    var sh=document.getElementById('searchHistorial'),fe=document.getElementById('filtro-estado-historial'),th=document.getElementById('tabla-historial');
    if(!th||th.getAttribute('data-init')==='1')return;th.setAttribute('data-init','1');
    function filtrar(){var st=sh?sh.value.toLowerCase():'',ef=fe?fe.value:'todos';th.querySelectorAll('.historial-row').forEach(function(f){var n=(f.getAttribute('data-nombre')||'').toLowerCase(),e=f.getAttribute('data-estado')||'';f.style.display=(!st||n.includes(st))&&(ef==='todos'||e===ef)?'':'none';});}
    if(sh)sh.addEventListener('input',filtrar);if(fe)fe.addEventListener('change',filtrar);
}

function verDetalleEstadisticas(grupo,nombre) {
    var al=[{n:1,nom:'Ana López García',a:19,f:1,j:1},{n:2,nom:'Carlos Ruiz',a:20,f:0,j:0},{n:3,nom:'María Torres',a:17,f:3,j:2},{n:4,nom:'Luis Hernández',a:18,f:2,j:1},{n:5,nom:'Sofía Martínez',a:19,f:1,j:1}];
    var fh=al.map(function(a){return '<tr><td style="padding:8px;">'+a.n+'</td><td style="padding:8px;text-align:left;"><strong>'+a.nom+'</strong></td><td style="padding:8px;color:#10B981;font-weight:700;">'+a.a+'</td><td style="padding:8px;color:#EF4444;font-weight:700;">'+a.f+'</td><td style="padding:8px;">'+a.j+'</td><td style="padding:8px;font-weight:600;">'+Math.round((a.a/20)*100)+'%</td></tr>';}).join('');
    Swal.fire({title:'Detalle - Grupo '+nombre,html:'<table style="width:100%;border-collapse:collapse;font-size:.82rem;"><thead><tr style="background:#F8FAFC;"><th style="padding:8px;color:#192A56;">No.</th><th style="padding:8px;text-align:left;color:#192A56;">Alumno</th><th style="padding:8px;color:#192A56;">Asist.</th><th style="padding:8px;color:#192A56;">Faltas</th><th style="padding:8px;color:#192A56;">Justif.</th><th style="padding:8px;color:#192A56;">%</th></tr></thead><tbody>'+fh+'</tbody></table>',width:650,confirmButtonText:'Cerrar',confirmButtonColor:'#192A56'});
}

function guardarConfiguracion() {
    var n=(document.getElementById('config-nombre-escuela')||{}).value||'',p=(document.getElementById('config-nombre-prefecto')||{}).value||'';
    Swal.fire({title:'⚙️ Configuración Guardada',html:'<p style="color:#10B981;">✅ Guardado correctamente.</p>',icon:'success',confirmButtonColor:'#192A56'});
}

function descargarReporteGeneral() {
    Swal.fire({title:'📊 Reporte',text:'El reporte general se está descargando.',icon:'success',confirmButtonColor:'#192A56',timer:1500});
}


// ==========================================
// ==========================================
//      SECCIÓN: CATÁLOGO DE PERSONAL
// ==========================================
// ==========================================

function initPersonalLogic() {
    console.log('📋 Catálogo de Personal inicializado');
    
    var tabButtons = document.querySelectorAll('.tab-btn');
    var filterLinks = document.querySelectorAll('.filter-link');
    var searchInput = document.getElementById('searchPersona');
    var tablaAlumnos = document.getElementById('tabla-alumnos');
    var tablaDocentes = document.getElementById('tabla-docentes');
    var sidebarDocentes = document.getElementById('menu-docentes');
    var sidebarRiesgo = document.getElementById('menu-alumnos-riesgo');

    var modoTabla = (tablaAlumnos !== null && tablaDocentes !== null);
    
    function getFilasActivas() {
        if (!modoTabla) return [];
        var activeRole = (document.querySelector('.tab-btn.active') || {}).getAttribute('data-role') || 'alumno';
        if (activeRole === 'alumno' && tablaAlumnos) {
            return tablaAlumnos.querySelectorAll('tbody tr');
        } else if (activeRole === 'docente' && tablaDocentes) {
            return tablaDocentes.querySelectorAll('tbody tr');
        }
        return [];
    }

    function filterTable() {
        if (!modoTabla) return;
        
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

        var filas = getFilasActivas();
        var visibles = 0;
        
        filas.forEach(function(fila) {
            var nombre = (fila.getAttribute('data-nombre') || '').toLowerCase();
            var matricula = (fila.getAttribute('data-matricula') || fila.getAttribute('data-id') || '').toLowerCase();
            var grupo = (fila.getAttribute('data-grupo') || '').toLowerCase();
            var textoFila = fila.innerText.toLowerCase();
            
            var matchesSearch = !searchTerm || nombre.includes(searchTerm) || matricula.includes(searchTerm) || textoFila.includes(searchTerm);
            var matchesGroup = (activeRole === 'docente') || (activeGroup === 'all') || (grupo === activeGroup.toLowerCase());
            
            if (matchesSearch && matchesGroup) {
                fila.style.display = '';
                visibles++;
            } else {
                fila.style.display = 'none';
            }
        });
        
        console.log('👥 Mostrando ' + visibles + ' registros');
    }

    // Eventos de pestañas
    tabButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            tabButtons.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            if (searchInput) searchInput.value = '';
            if (btn.getAttribute('data-role') === 'docente') {
                filterLinks.forEach(function(l) { l.classList.remove('active'); });
                var allLink = document.querySelector('.filter-link[data-group="all"]');
                if (allLink) allLink.classList.add('active');
            }
            filterTable();
        });
    });

    // Eventos de filtro por grupo
    filterLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            var tabAlumno = document.querySelector('.tab-btn[data-role="alumno"]');
            if (tabAlumno && !tabAlumno.classList.contains('active')) {
                tabButtons.forEach(function(b) { b.classList.remove('active'); });
                tabAlumno.classList.add('active');
            }
            filterLinks.forEach(function(l) { l.classList.remove('active'); });
            link.classList.add('active');
            filterTable();
        });
    });

    // Ir a docentes
    if (sidebarDocentes) {
        sidebarDocentes.addEventListener('click', function(e) {
            e.preventDefault();
            var tabDocente = document.querySelector('.tab-btn[data-role="docente"]');
            if (tabDocente) tabDocente.click();
        });
    }

    // Alumnos en riesgo
    if (sidebarRiesgo) {
        sidebarRiesgo.addEventListener('click', function(e) {
            e.preventDefault();
            var tabAlumno = document.querySelector('.tab-btn[data-role="alumno"]');
            if (tabAlumno && !tabAlumno.classList.contains('active')) {
                tabButtons.forEach(function(b) { b.classList.remove('active'); });
                tabAlumno.classList.add('active');
            }
            filterLinks.forEach(function(l) { l.classList.remove('active'); });
            if (tablaAlumnos) tablaAlumnos.classList.remove('hidden');
            if (tablaDocentes) tablaDocentes.classList.add('hidden');
            if (modoTabla) {
                var filas = tablaAlumnos.querySelectorAll('tbody tr');
                filas.forEach(function(fila) {
                    fila.style.display = (fila.getAttribute('data-estado') === 'riesgo') ? '' : 'none';
                });
            }
            if (searchInput) searchInput.value = '';
        });
    }

    // Búsqueda
    if (searchInput) {
        searchInput.addEventListener('input', filterTable);
    }

    // ==========================================
    // CLICKS EN BOTONES
    // ==========================================
    function clickEnTabla(e) {
        // Botón Expediente Alumno
        var btnExp = e.target.closest('.btn-expediente') || e.target.closest('.btn-ver-expediente');
        if (btnExp) {
            e.stopPropagation();
            var fila = btnExp.closest('tr');
            if (!fila) return;
            
            var datos = {
                nombre: fila.getAttribute('data-nombre') || '',
                matricula: fila.getAttribute('data-matricula') || '',
                grupo: fila.getAttribute('data-grupo') || '',
                turno: fila.getAttribute('data-turno') || '',
                tutor: fila.getAttribute('data-tutor') || '',
                telTutor: fila.getAttribute('data-tel-tutor') || '',
                curp: fila.getAttribute('data-curp') || '',
                grado: fila.getAttribute('data-grado') || '',
                estado: fila.getAttribute('data-estado') || ''
            };
            
            abrirExpedienteCompleto(datos);
            return;
        }
        
        // Botón Horario Docente
        var btnHor = e.target.closest('.btn-horario') || e.target.closest('.btn-ver-horario');
        if (btnHor) {
            e.stopPropagation();
            var filaDoc = btnHor.closest('tr');
            if (!filaDoc) return;
            
            var datosDoc = {
                nombre: filaDoc.getAttribute('data-nombre') || '',
                id: filaDoc.getAttribute('data-id') || '',
                materias: filaDoc.getAttribute('data-materias') || '',
                turno: filaDoc.getAttribute('data-turno') || '',
                estado: filaDoc.getAttribute('data-estado') || ''
            };
            
            abrirHorarioDocenteCompleto(datosDoc);
            return;
        }
    }

    // Asignar eventos a ambas tablas
    if (tablaAlumnos) tablaAlumnos.addEventListener('click', clickEnTabla);
    if (tablaDocentes) tablaDocentes.addEventListener('click', clickEnTabla);

    // Inicializar
    filterTable();
}

// ==========================================
// EXPEDIENTE COMPLETO DEL ALUMNO
// ==========================================
function abrirExpedienteCompleto(datos) {
    if (!datos.nombre) {
        Swal.fire({ title: 'Error', text: 'No se encontraron datos del alumno.', icon: 'error', confirmButtonColor: '#192A56' });
        return;
    }
    
    var d = datos;
    var totalDias = 20;
    var faltas = Math.floor(Math.random() * 5);
    var asistencias = totalDias - faltas;
    
    var estadoBadge = d.estado === 'riesgo' 
        ? '<span style="background:#FFFBEB;color:#92400E;padding:4px 10px;border-radius:20px;font-weight:600;font-size:0.75rem;"><i class="fa-solid fa-triangle-exclamation"></i> En Riesgo</span>' 
        : '<span style="background:#D1FAE5;color:#065F46;padding:4px 10px;border-radius:20px;font-weight:600;font-size:0.75rem;"><i class="fa-solid fa-check"></i> Regular</span>';

    var jsonDatos = JSON.stringify({
        nombre: d.nombre, matricula: d.matricula, grupo: d.grupo,
        turno: d.turno, tutor: d.tutor, telTutor: d.telTutor,
        curp: d.curp, grado: d.grado, estado: d.estado
    }).replace(/'/g, "\\'").replace(/"/g, '&quot;');

    function escapar(str) { return (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

    Swal.fire({
        title: 'Expediente Escolar',
        html: '<div style="text-align:left;">' +
            '<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #D6A848;">' +
            '<img src="https://ui-avatars.com/api/?name=' + encodeURIComponent(d.nombre) + '&background=D6A848&color=192A56&size=50" style="border-radius:10px;border:2px solid #D6A848;">' +
            '<div><h3 style="margin:0;color:#192A56;font-size:1.1rem;">' + d.nombre + '</h3><p style="margin:3px 0 0;color:#64748B;font-size:0.82rem;">' + (d.grado||'') + ' • Grupo ' + (d.grupo||'') + ' • ' + (d.turno||'') + '</p></div></div>' +
            '<h4 style="color:#192A56;font-size:0.9rem;margin:0 0 10px;"><i class="fa-solid fa-address-card" style="color:#D6A848;"></i> Datos del Alumno</h4>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;background:#F8FAFC;padding:14px;border-radius:8px;border:1px solid #E2E8F0;">' +
            '<div><label style="font-size:0.7rem;color:#64748B;font-weight:600;text-transform:uppercase;">Matrícula</label><p style="margin:2px 0 0;font-weight:600;color:#1E293B;">' + (d.matricula||'N/A') + '</p></div>' +
            '<div><label style="font-size:0.7rem;color:#64748B;font-weight:600;text-transform:uppercase;">CURP</label><p style="margin:2px 0 0;font-weight:600;color:#1E293B;">' + (d.curp||'N/A') + '</p></div>' +
            '<div><label style="font-size:0.7rem;color:#64748B;font-weight:600;text-transform:uppercase;">Grado y Grupo</label><p style="margin:2px 0 0;font-weight:600;color:#1E293B;">' + (d.grado||'') + ' • ' + (d.grupo||'') + '</p></div>' +
            '<div><label style="font-size:0.7rem;color:#64748B;font-weight:600;text-transform:uppercase;">Turno</label><p style="margin:2px 0 0;font-weight:600;color:#1E293B;">' + (d.turno||'N/A') + '</p></div>' +
            '<div><label style="font-size:0.7rem;color:#64748B;font-weight:600;text-transform:uppercase;">Tutor</label><p style="margin:2px 0 0;font-weight:600;color:#1E293B;">' + (d.tutor||'N/A') + '</p></div>' +
            '<div><label style="font-size:0.7rem;color:#64748B;font-weight:600;text-transform:uppercase;">Tel. Tutor</label><p style="margin:2px 0 0;font-weight:600;color:#1E293B;"><i class="fa-solid fa-phone"></i> ' + (d.telTutor||'N/A') + '</p></div>' +
            '<div style="grid-column:span 2;"><label style="font-size:0.7rem;color:#64748B;font-weight:600;text-transform:uppercase;">Estado</label><p style="margin:2px 0 0;">' + estadoBadge + '</p></div></div>' +
            '<h4 style="color:#192A56;font-size:0.9rem;margin:0 0 10px;"><i class="fa-solid fa-chart-simple" style="color:#D6A848;"></i> Asistencia del Mes</h4>' +
            '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:18px;">' +
            '<div style="background:' + (asistencias>=18?'#D1FAE5':'#F8FAFC') + ';padding:16px;border-radius:10px;text-align:center;border:2px solid ' + (asistencias>=18?'#10B981':'#E2E8F0') + ';">' +
            '<span style="font-size:2rem;font-weight:800;color:' + (asistencias>=18?'#065F46':'#1E293B') + ';">' + asistencias + '</span>' +
            '<p style="margin:4px 0 0;font-size:0.75rem;color:#64748B;font-weight:600;">ASISTENCIAS</p><p style="margin:2px 0 0;font-size:0.65rem;color:#94A3B8;">de ' + totalDias + ' días</p></div>' +
            '<div style="background:' + (faltas>=3?'#FEE2E2':'#F8FAFC') + ';padding:16px;border-radius:10px;text-align:center;border:2px solid ' + (faltas>=3?'#EF4444':'#E2E8F0') + ';">' +
            '<span style="font-size:2rem;font-weight:800;color:' + (faltas>=3?'#EF4444':'#1E293B') + ';">' + faltas + '</span>' +
            '<p style="margin:4px 0 0;font-size:0.75rem;color:#64748B;font-weight:600;">FALTAS</p><p style="margin:2px 0 0;font-size:0.65rem;color:#94A3B8;">' + Math.round((asistencias/totalDias)*100) + '% asistencia</p></div></div>' +
            '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">' +
            '<button onclick="editarAlumno(\'' + jsonDatos + '\')" style="background:#192A56;color:#fff;border:none;padding:10px 18px;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.82rem;font-family:inherit;"><i class="fa-solid fa-pen-to-square"></i> Editar Todos los Datos</button>' +
            '<button onclick="verHorarioGrupo(\'' + escapar(d.grupo) + '\', \'' + escapar(d.grado) + '\')" style="background:#D6A848;color:#192A56;border:none;padding:10px 18px;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.82rem;font-family:inherit;"><i class="fa-solid fa-calendar-days"></i> Ver Horario del Grupo</button></div></div>',
        width: 600, showCloseButton: true,
        confirmButtonText: '<i class="fa-solid fa-xmark"></i> Cerrar Expediente', confirmButtonColor: '#192A56',
        showDenyButton: true, denyButtonText: '<i class="fa-solid fa-file-pdf"></i> Descargar Expediente', denyButtonColor: '#A1232E',
        customClass: { popup: 'swal-solicitud-popup' }
    }).then(function(result) {
        if (result.isDenied) {
            Swal.fire({ title: '📄 Descargando', text: 'El expediente se está generando...', icon: 'info', confirmButtonColor: '#192A56', timer: 1500 });
        }
    });
}

// ==========================================
// EDITAR ALUMNO (TODOS LOS DATOS)
// ==========================================
function editarAlumno(jsonDatos) {
    var d = JSON.parse(jsonDatos.replace(/&quot;/g, '"'));
    Swal.fire({
        title: 'Editar Datos del Alumno',
        html: '<div style="text-align:left;max-height:60vh;overflow-y:auto;">' +
            '<div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#64748B;font-weight:600;">Nombre Completo</label><input type="text" id="edit-nombre" class="swal2-input" value="' + (d.nombre||'') + '" style="width:100%;"></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#64748B;font-weight:600;">Matrícula</label><input type="text" id="edit-matricula" class="swal2-input" value="' + (d.matricula||'') + '" style="width:100%;"></div><div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#64748B;font-weight:600;">CURP</label><input type="text" id="edit-curp" class="swal2-input" value="' + (d.curp||'') + '" style="width:100%;"></div></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#64748B;font-weight:600;">Grado</label><input type="text" id="edit-grado" class="swal2-input" value="' + (d.grado||'') + '" style="width:100%;"></div><div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#64748B;font-weight:600;">Grupo</label><input type="text" id="edit-grupo" class="swal2-input" value="' + (d.grupo||'') + '" style="width:100%;"></div></div>' +
            '<div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#64748B;font-weight:600;">Turno</label><select id="edit-turno" class="swal2-input" style="width:100%;"><option value="Matutino" ' + (d.turno==='Matutino'?'selected':'') + '>Matutino</option><option value="Vespertino" ' + (d.turno==='Vespertino'?'selected':'') + '>Vespertino</option></select></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#64748B;font-weight:600;">Tutor</label><input type="text" id="edit-tutor" class="swal2-input" value="' + (d.tutor||'') + '" style="width:100%;"></div><div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#64748B;font-weight:600;">Tel. Tutor</label><input type="text" id="edit-tel" class="swal2-input" value="' + (d.telTutor||'') + '" style="width:100%;"></div></div>' +
            '<div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#64748B;font-weight:600;">Estado</label><select id="edit-estado" class="swal2-input" style="width:100%;"><option value="regular" ' + (d.estado==='regular'?'selected':'') + '>Regular</option><option value="riesgo" ' + (d.estado==='riesgo'?'selected':'') + '>En Riesgo</option></select></div></div>',
        showCancelButton: true, confirmButtonText: '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios', confirmButtonColor: '#10B981',
        cancelButtonText: 'Cancelar', cancelButtonColor: '#64748B', width: 600, customClass: { popup: 'swal-solicitud-popup' },
        preConfirm: function() {
            var nombre = document.getElementById('edit-nombre').value.trim();
            if (!nombre) { Swal.showValidationMessage('El nombre es requerido'); return false; }
            return { nombre: nombre, matricula: document.getElementById('edit-matricula').value.trim(), curp: document.getElementById('edit-curp').value.trim(), grado: document.getElementById('edit-grado').value.trim(), grupo: document.getElementById('edit-grupo').value.trim(), turno: document.getElementById('edit-turno').value, tutor: document.getElementById('edit-tutor').value.trim(), telTutor: document.getElementById('edit-tel').value.trim(), estado: document.getElementById('edit-estado').value };
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            var r = result.value;
            Swal.fire({ title: '✅ Datos Actualizados', html: '<div style="text-align:left;font-size:0.85rem;"><p><strong>Nombre:</strong> ' + r.nombre + '</p><p><strong>Matrícula:</strong> ' + r.matricula + '</p><p><strong>CURP:</strong> ' + r.curp + '</p><p><strong>Grado/Grupo:</strong> ' + r.grado + ' • ' + r.grupo + '</p><p><strong>Turno:</strong> ' + r.turno + '</p><p><strong>Tutor:</strong> ' + r.tutor + '</p><p><strong>Tel. Tutor:</strong> ' + r.telTutor + '</p><p><strong>Estado:</strong> ' + r.estado + '</p><p style="color:#10B981;margin-top:8px;">✅ Todos los datos se han actualizado.</p></div>', icon: 'success', confirmButtonColor: '#192A56' });
        }
    });
}

// ==========================================
// VER Y EDITAR HORARIO DEL GRUPO
// ==========================================
function verHorarioGrupo(grupo, grado) {
    var dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    var horas = ['07:00-08:40', '08:40-10:20', '10:50-12:30'];
    var horarios = {
        '1°A': [['Matemáticas I', 'Historia', 'Ciencias', 'Español', 'Inglés'],['Historia', 'Español', 'Ed. Física', 'Matemáticas I', 'Artes'],['Ciencias', 'Inglés', 'Matemáticas I', 'Civismo', 'Español']],
        '1°B': [['Español', 'Matemáticas I', 'Inglés', 'Historia', 'Ciencias'],['Ciencias', 'Inglés', 'Matemáticas I', 'Español', 'Ed. Física'],['Historia', 'Ciencias', 'Español', 'Matemáticas I', 'Inglés']],
        '2°A': [['Matemáticas II', 'Español Av.', 'Física', 'Inglés', 'Civismo'],['Física', 'Matemáticas II', 'Español Av.', 'Civismo', 'Inglés'],['Inglés', 'Física', 'Civismo', 'Matemáticas II', 'Español Av.']],
        '2°B': [['Español Av.', 'Matemáticas II', 'Física', 'Historia', 'Artes'],['Matemáticas II', 'Física', 'Español Av.', 'Artes', 'Historia'],['Física', 'Español Av.', 'Matemáticas II', 'Historia', 'Artes']],
        '3°A': [['Matemáticas III', 'Literatura', 'Química', 'Filosofía', 'Inglés'],['Química', 'Matemáticas III', 'Literatura', 'Inglés', 'Filosofía'],['Literatura', 'Química', 'Filosofía', 'Matemáticas III', 'Inglés']],
        '3°B': [['Filosofía', 'Matemáticas III', 'Literatura', 'Química', 'Informática'],['Matemáticas III', 'Informática', 'Química', 'Literatura', 'Filosofía'],['Química', 'Filosofía', 'Informática', 'Matemáticas III', 'Literatura']],
        '1A': [['Matemáticas I', 'Historia', 'Ciencias', 'Español', 'Inglés'],['Historia', 'Español', 'Ed. Física', 'Matemáticas I', 'Artes'],['Ciencias', 'Inglés', 'Matemáticas I', 'Civismo', 'Español']],
        '1B': [['Español', 'Matemáticas I', 'Inglés', 'Historia', 'Ciencias'],['Ciencias', 'Inglés', 'Matemáticas I', 'Español', 'Ed. Física'],['Historia', 'Ciencias', 'Español', 'Matemáticas I', 'Inglés']],
        '2A': [['Matemáticas II', 'Español Av.', 'Física', 'Inglés', 'Civismo'],['Física', 'Matemáticas II', 'Español Av.', 'Civismo', 'Inglés'],['Inglés', 'Física', 'Civismo', 'Matemáticas II', 'Español Av.']],
        '2B': [['Español Av.', 'Matemáticas II', 'Física', 'Historia', 'Artes'],['Matemáticas II', 'Física', 'Español Av.', 'Artes', 'Historia'],['Física', 'Español Av.', 'Matemáticas II', 'Historia', 'Artes']],
        '3A': [['Matemáticas III', 'Literatura', 'Química', 'Filosofía', 'Inglés'],['Química', 'Matemáticas III', 'Literatura', 'Inglés', 'Filosofía'],['Literatura', 'Química', 'Filosofía', 'Matemáticas III', 'Inglés']],
        '3B': [['Filosofía', 'Matemáticas III', 'Literatura', 'Química', 'Informática'],['Matemáticas III', 'Informática', 'Química', 'Literatura', 'Filosofía'],['Química', 'Filosofía', 'Informática', 'Matemáticas III', 'Literatura']]
    };
    var horarioGrupo = horarios[grupo] || horarios['1°A'];
    var docentes = ['Prof. Mendoza', 'Profa. Luna', 'Prof. Vega', 'Profa. Castillo', 'Prof. Ángel'];
    var filasHTML = horas.map(function(hora, i) {
        var celdas = dias.map(function(dia, j) {
            var materia = horarioGrupo[i][j];
            var docente = docentes[j];
            return '<td style="padding:10px;background:#EFF6FF;text-align:center;font-size:0.8rem;border:1px solid #E2E8F0;"><strong>' + materia + '</strong><br><small style="color:#64748B;">' + docente + '</small></td>';
        }).join('');
        return '<tr><td style="padding:10px;font-weight:600;background:#F8FAFC;border:1px solid #E2E8F0;font-size:0.8rem;">' + hora + '</td>' + celdas + '</tr>';
    }).join('');
    Swal.fire({
        title: 'Horario del Grupo ' + (grupo || ''),
        html: '<div style="text-align:left;"><p style="color:#64748B;margin-bottom:15px;">' + (grado||'') + ' • Grupo ' + (grupo||'') + ' • Ciclo 2025-2026</p><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr><th style="padding:10px;background:#192A56;color:#fff;border:1px solid #192A56;font-size:0.75rem;">Hora</th>' + dias.map(function(d) { return '<th style="padding:10px;background:#192A56;color:#fff;border:1px solid #192A56;font-size:0.75rem;">' + d + '</th>'; }).join('') + '</tr></thead><tbody>' + filasHTML + '</tbody></table></div><div style="text-align:center;margin-top:15px;"><button onclick="editarHorarioGrupo(\'' + (grupo||'').replace(/'/g, "\\'") + '\')" style="background:#D6A848;color:#192A56;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.8rem;font-family:inherit;"><i class="fa-solid fa-pen-to-square"></i> Editar Horario del Grupo</button></div></div>',
        width: 800, showCloseButton: true, confirmButtonText: '<i class="fa-solid fa-xmark"></i> Cerrar', confirmButtonColor: '#192A56', customClass: { popup: 'swal-solicitud-popup' }
    });
}

function editarHorarioGrupo(grupo) {
    var dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    var horas = ['07:00-08:40', '08:40-10:20', '10:50-12:30'];
    var materias = ['Libre', 'Matemáticas', 'Español', 'Ciencias', 'Historia', 'Inglés', 'Física', 'Química', 'Ed. Física', 'Artes', 'Civismo', 'Filosofía', 'Literatura', 'Informática'];
    var selectsHTML = horas.map(function(hora, i) {
        return '<p style="font-weight:600;color:#192A56;margin:8px 0 4px;">' + hora + '</p><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:12px;">' + dias.map(function(dia, j) {
            var id = 'h' + i + 'd' + j;
            return '<div><label style="font-size:0.65rem;color:#64748B;display:block;">' + dia + '</label><select id="' + id + '" style="width:100%;padding:6px;border:1px solid #E2E8F0;border-radius:4px;font-size:0.7rem;font-family:inherit;">' + materias.map(function(m) { return '<option value="' + m + '">' + m + '</option>'; }).join('') + '</select></div>';
        }).join('') + '</div>';
    }).join('');
    Swal.fire({
        title: 'Editar Horario - Grupo ' + (grupo || ''),
        html: '<div style="text-align:left;max-height:55vh;overflow-y:auto;">' + selectsHTML + '</div>',
        width: 750, showCancelButton: true, confirmButtonText: '<i class="fa-solid fa-floppy-disk"></i> Guardar Horario', confirmButtonColor: '#10B981',
        cancelButtonText: 'Cancelar', cancelButtonColor: '#64748B', customClass: { popup: 'swal-solicitud-popup' }
    }).then(function(result) {
        if (result.isConfirmed) {
            Swal.fire({ title: '✅ Horario Actualizado', text: 'El horario del grupo ' + (grupo||'') + ' se ha actualizado.', icon: 'success', confirmButtonColor: '#192A56' });
        }
    });
}

// ==========================================
// HORARIO COMPLETO DEL DOCENTE
// ==========================================
function abrirHorarioDocenteCompleto(datos) {
    if (!datos.nombre) {
        Swal.fire({ title: 'Error', text: 'No se encontraron datos del docente.', icon: 'error', confirmButtonColor: '#192A56' });
        return;
    }
    var d = datos;
    var dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    var horas = ['07:00-08:40', '08:40-10:20', '10:50-12:30'];
    var listaMaterias = d.materias ? d.materias.split(', ') : ['Matemáticas'];
    var grupos = ['1°A', '2°B', '3°A', '1°B', '2°A'];
    function escapar(str) { return (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
    var jsonDocente = JSON.stringify({ nombre: d.nombre, id: d.id, materias: d.materias, turno: d.turno, estado: d.estado }).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    var filasHTML = horas.map(function(hora) {
        var celdas = dias.map(function() {
            if (Math.random() > 0.4) {
                var g = grupos[Math.floor(Math.random() * grupos.length)];
                var m = listaMaterias[Math.floor(Math.random() * listaMaterias.length)];
                return '<td style="padding:8px;background:#EFF6FF;text-align:center;font-size:0.78rem;border:1px solid #E2E8F0;"><strong>' + g + '</strong><br><small style="color:#64748B;">' + m + '</small></td>';
            }
            return '<td style="padding:8px;text-align:center;font-size:0.78rem;color:#94A3B8;border:1px solid #E2E8F0;">Libre</td>';
        }).join('');
        return '<tr><td style="padding:8px;font-weight:600;background:#F8FAFC;border:1px solid #E2E8F0;">' + hora + '</td>' + celdas + '</tr>';
    }).join('');
    Swal.fire({
        title: 'Horario del Docente',
        html: '<div style="text-align:left;"><div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #D6A848;"><img src="https://ui-avatars.com/api/?name=' + encodeURIComponent(d.nombre) + '&background=192A56&color=fff&size=44" style="border-radius:10px;border:2px solid #D6A848;"><div><h3 style="margin:0;color:#192A56;">' + d.nombre + '</h3><p style="margin:3px 0 0;color:#64748B;font-size:0.8rem;">ID: ' + (d.id||'N/A') + ' • ' + (d.turno||'') + ' • ' + (d.materias||'') + '</p></div></div><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr><th style="padding:10px;background:#192A56;color:#fff;border:1px solid #192A56;font-size:0.75rem;">Hora</th>' + dias.map(function(dd) { return '<th style="padding:10px;background:#192A56;color:#fff;border:1px solid #192A56;font-size:0.75rem;">' + dd + '</th>'; }).join('') + '</tr></thead><tbody>' + filasHTML + '</tbody></table></div><div style="display:flex;gap:10px;justify-content:center;margin-top:15px;flex-wrap:wrap;"><button onclick="editarDocente(\'' + jsonDocente + '\')" style="background:#192A56;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.8rem;font-family:inherit;"><i class="fa-solid fa-pen-to-square"></i> Editar Datos del Docente</button><button onclick="editarHorarioDocente(\'' + escapar(d.nombre) + '\')" style="background:#D6A848;color:#192A56;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.8rem;font-family:inherit;"><i class="fa-solid fa-calendar-pen"></i> Editar Horario</button></div></div>',
        width: 800, showCloseButton: true, confirmButtonText: '<i class="fa-solid fa-xmark"></i> Cerrar', confirmButtonColor: '#192A56', customClass: { popup: 'swal-solicitud-popup' }
    });
}

// ==========================================
// EDITAR DOCENTE (TODOS LOS DATOS)
// ==========================================
function editarDocente(jsonDatos) {
    var d = JSON.parse(jsonDatos.replace(/&quot;/g, '"'));
    Swal.fire({
        title: 'Editar Datos del Docente',
        html: '<div style="text-align:left;"><div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#64748B;font-weight:600;">Nombre Completo</label><input type="text" id="edit-doc-nombre" class="swal2-input" value="' + (d.nombre||'') + '" style="width:100%;"></div><div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#64748B;font-weight:600;">ID Docente</label><input type="text" id="edit-doc-id" class="swal2-input" value="' + (d.id||'') + '" style="width:100%;"></div><div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#64748B;font-weight:600;">Materias (separadas por coma)</label><input type="text" id="edit-doc-materias" class="swal2-input" value="' + (d.materias||'') + '" style="width:100%;"></div><div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#64748B;font-weight:600;">Turno</label><select id="edit-doc-turno" class="swal2-input" style="width:100%;"><option value="Matutino" ' + (d.turno==='Matutino'?'selected':'') + '>Matutino</option><option value="Vespertino" ' + (d.turno==='Vespertino'?'selected':'') + '>Vespertino</option></select></div><div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#64748B;font-weight:600;">Estado</label><select id="edit-doc-estado" class="swal2-input" style="width:100%;"><option value="activo" ' + (d.estado==='activo'?'selected':'') + '>Activo</option><option value="inactivo" ' + (d.estado==='inactivo'?'selected':'') + '>Inactivo</option></select></div></div>',
        showCancelButton: true, confirmButtonText: '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios', confirmButtonColor: '#10B981',
        cancelButtonText: 'Cancelar', cancelButtonColor: '#64748B', customClass: { popup: 'swal-solicitud-popup' },
        preConfirm: function() {
            var nombre = document.getElementById('edit-doc-nombre').value.trim();
            if (!nombre) { Swal.showValidationMessage('El nombre es requerido'); return false; }
            return { nombre: nombre, id: document.getElementById('edit-doc-id').value.trim(), materias: document.getElementById('edit-doc-materias').value.trim(), turno: document.getElementById('edit-doc-turno').value, estado: document.getElementById('edit-doc-estado').value };
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            var r = result.value;
            Swal.fire({ title: '✅ Docente Actualizado', html: '<p><strong>Nombre:</strong> ' + r.nombre + '</p><p><strong>ID:</strong> ' + r.id + '</p><p><strong>Materias:</strong> ' + r.materias + '</p><p><strong>Turno:</strong> ' + r.turno + '</p><p style="color:#10B981;">✅ Datos actualizados.</p>', icon: 'success', confirmButtonColor: '#192A56' });
        }
    });
}

// ==========================================
// EDITAR HORARIO DEL DOCENTE
// ==========================================
function editarHorarioDocente(nombre) {
    var dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    var horas = ['07:00-08:40', '08:40-10:20', '10:50-12:30'];
    var grupos = ['Libre', '1°A', '1°B', '2°A', '2°B', '3°A', '3°B'];
    var selectsHTML = horas.map(function(hora, i) {
        return '<p style="font-weight:600;color:#192A56;margin:8px 0 4px;">' + hora + '</p><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:12px;">' + dias.map(function(dia, j) {
            var id = 'dh' + i + 'd' + j;
            return '<div><label style="font-size:0.65rem;color:#64748B;display:block;">' + dia + '</label><select id="' + id + '" style="width:100%;padding:6px;border:1px solid #E2E8F0;border-radius:4px;font-size:0.7rem;font-family:inherit;">' + grupos.map(function(g) { return '<option value="' + g + '">' + g + '</option>'; }).join('') + '</select></div>';
        }).join('') + '</div>';
    }).join('');
    Swal.fire({
        title: 'Editar Horario - ' + (nombre || 'Docente'),
        html: '<div style="text-align:left;max-height:55vh;overflow-y:auto;">' + selectsHTML + '</div>',
        width: 750, showCancelButton: true, confirmButtonText: '<i class="fa-solid fa-floppy-disk"></i> Guardar Horario', confirmButtonColor: '#10B981',
        cancelButtonText: 'Cancelar', cancelButtonColor: '#64748B', customClass: { popup: 'swal-solicitud-popup' }
    }).then(function(result) {
        if (result.isConfirmed) {
            Swal.fire({ title: '✅ Horario Actualizado', text: 'El horario se ha actualizado.', icon: 'success', confirmButtonColor: '#192A56' });
        }
    });
}

// ==========================================
// ==========================================
//      SECCIÓN: CONFIGURACIÓN DEL SISTEMA
// ==========================================
// ==========================================

function initSistemaLogic() {
    console.log('⚙️ Configuración del Sistema inicializada');
}

// ==========================================
// GUARDAR CONFIGURACIÓN DEL SISTEMA
// ==========================================
function guardarConfiguracionSistema() {
    // Obtener valores
    var limiteDias = document.getElementById('limite-dias') ? document.getElementById('limite-dias').value : '3';
    var cicloActivo = document.getElementById('ciclo-activo') ? document.getElementById('ciclo-activo').value : '2025-2026';
    var trim1Inicio = document.getElementById('trim1-inicio') ? document.getElementById('trim1-inicio').value : '---';
    var trim1Fin = document.getElementById('trim1-fin') ? document.getElementById('trim1-fin').value : '---';
    var trim2Inicio = document.getElementById('trim2-inicio') ? document.getElementById('trim2-inicio').value : '---';
    var trim2Fin = document.getElementById('trim2-fin') ? document.getElementById('trim2-fin').value : '---';
    var trim3Inicio = document.getElementById('trim3-inicio') ? document.getElementById('trim3-inicio').value : '---';
    var trim3Fin = document.getElementById('trim3-fin') ? document.getElementById('trim3-fin').value : '---';
    
    Swal.fire({
        title: '✅ Configuración Guardada',
        html: '<div style="text-align:left;font-size:0.85rem;line-height:1.6;">' +
            '<p><strong>📅 Plazo para justificar:</strong> ' + limiteDias + ' días hábiles</p>' +
            '<p><strong>📚 Ciclo escolar:</strong> ' + cicloActivo + '</p>' +
            '<hr style="border-color:#E2E8F0;margin:10px 0;">' +
            '<p><strong>1° Trimestre:</strong> ' + trim1Inicio + ' → ' + trim1Fin + '</p>' +
            '<p><strong>2° Trimestre:</strong> ' + trim2Inicio + ' → ' + trim2Fin + '</p>' +
            '<p><strong>3° Trimestre:</strong> ' + trim3Inicio + ' → ' + trim3Fin + '</p>' +
            '<p style="color:#10B981;margin-top:10px;">✅ Los cambios se guardaron correctamente.</p></div>',
        icon: 'success',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#192A56'
    });
}