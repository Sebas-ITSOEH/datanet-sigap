let rolSeleccionado = null;

window.inicializarRegistro = function() {
    document.getElementById('btnSeleccionarRol')?.addEventListener('click', irAPaso2);
    document.getElementById('btnSiguiente')?.addEventListener('click', irAPaso3);
    document.getElementById('btnAtrasPaso2')?.addEventListener('click', volverAPaso1);
    document.getElementById('btnAtrasPaso3')?.addEventListener('click', volverAPaso2);
    document.getElementById('rol-alumno')?.addEventListener('click', () => seleccionarRol('alumno'));
    document.getElementById('rol-docente')?.addEventListener('click', () => seleccionarRol('docente'));
    document.getElementById('regForm')?.addEventListener('submit', e => { e.preventDefault(); confirmarRegistro(); });
    document.getElementById('pass')?.addEventListener('input', validarRequisitosPassword);
    document.getElementById('curp')?.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
};

function seleccionarRol(rol) {
    rolSeleccionado = rol;
    document.getElementById('rol-alumno').classList.toggle('selected', rol === 'alumno');
    document.getElementById('rol-docente').classList.toggle('selected', rol === 'docente');
    const btn = document.getElementById('btnSeleccionarRol');
    btn.disabled = false;
    btn.style.background = '#192A56';
}

function irAPaso2() {
    if (!rolSeleccionado) return mostrarNotificacion('Selecciona un perfil.', 'error');
    actualizarIlustracion();
    navegar('step1', 'step2');
    document.getElementById('dot1').className = 'step completed';
    document.getElementById('dot2').className = 'step active';
}

function volverAPaso1() {
    document.getElementById('icono-rol').textContent = '🎓';
    document.getElementById('titulo-rol').textContent = 'Selecciona tu perfil';
    document.getElementById('descripcion-rol').textContent = 'Elige si eres alumno o docente.';
    navegar('step2', 'step1');
    document.getElementById('dot1').className = 'step active';
    document.getElementById('dot2').className = 'step';
}

function irAPaso3() {
    const n = document.getElementById('nombre')?.value.trim();
    const a = document.getElementById('apellidos')?.value.trim();
    const c = document.getElementById('curp')?.value.trim().toUpperCase();
    const e = document.getElementById('email')?.value.trim().toLowerCase();
    
    if (!n || !a || !c || !e) return mostrarNotificacion('Completa todos los campos.', 'error');
    if (!/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*$/.test(n)) return mostrarNotificacion('Nombre inválido.', 'error');
    if (!/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*$/.test(a)) return mostrarNotificacion('Apellidos inválidos.', 'error');
    if (!/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(c)) return mostrarNotificacion('CURP inválida.', 'error');
    if (rolSeleccionado === 'alumno' && !/^\d{8}@secgralbj\.edu\.mx$/.test(e)) return mostrarNotificacion('Correo de alumno: 8digitos@secgralbj.edu.mx', 'error');
    if (rolSeleccionado === 'docente' && !/^[a-záéíóúñ]+\.[a-záéíóúñ]+@secgralbj\.edu\.mx$/.test(e)) return mostrarNotificacion('Correo de docente: nombre.apellido@secgralbj.edu.mx', 'error');
    
    configurarPaso3();
    navegar('step2', 'step3');
    document.getElementById('dot2').className = 'step completed';
    document.getElementById('dot3').className = 'step active';
}

function volverAPaso2() {
    navegar('step3', 'step2');
    document.getElementById('dot2').className = 'step active';
    document.getElementById('dot3').className = 'step';
}

function configurarPaso3() {
    const campo = document.getElementById('dynamic-field');
    if (rolSeleccionado === 'alumno') {
        document.getElementById('step3-title').innerText = 'Perfil Alumno';
        campo.innerHTML = '<div class="input-group"><label>Matrícula Escolar</label><input type="text" id="id-valor" placeholder="Ej: 20240001" maxlength="8" required></div>';
        document.getElementById('seccion-alumno').style.display = 'block';
        document.getElementById('seccion-docente').style.display = 'none';
    } else {
        document.getElementById('step3-title').innerText = 'Perfil Docente';
        campo.innerHTML = '<div class="input-group"><label>Clave Docente</label><input type="text" id="id-valor" placeholder="Ej: AMRJ" maxlength="20" required></div>';
        document.getElementById('seccion-alumno').style.display = 'none';
        document.getElementById('seccion-docente').style.display = 'block';
    }
}

function actualizarIlustracion() {
    if (rolSeleccionado === 'alumno') {
        document.getElementById('icono-rol').textContent = '👨‍🎓';
        document.getElementById('titulo-rol').textContent = 'Registro de Alumno';
        document.getElementById('descripcion-rol').textContent = 'Completa tus datos personales y tu matrícula escolar.';
    } else {
        document.getElementById('icono-rol').textContent = '👩‍🏫';
        document.getElementById('titulo-rol').textContent = 'Registro de Docente';
        document.getElementById('descripcion-rol').textContent = 'Completa tus datos personales y tu información laboral.';
    }
}

function validarRequisitosPassword() {
    const p = document.getElementById('pass').value;
    document.getElementById('req-length').className = 'requirement ' + (p.length >= 8 && p.length <= 12 ? 'met' : 'unmet');
    document.getElementById('req-upper').className = 'requirement ' + (/[A-Z]/.test(p) ? 'met' : 'unmet');
    document.getElementById('req-lower').className = 'requirement ' + (/[a-z]/.test(p) ? 'met' : 'unmet');
    document.getElementById('req-number').className = 'requirement ' + (/\d/.test(p) ? 'met' : 'unmet');
    document.getElementById('req-special').className = 'requirement ' + (/[^A-Za-z0-9]/.test(p) ? 'met' : 'unmet');
}

function navegar(desde, hacia) {
    const d = document.getElementById(desde);
    const h = document.getElementById(hacia);
    d.style.opacity = '0'; d.style.transform = 'translateX(-20px)'; d.style.transition = 'all 0.3s ease';
    setTimeout(() => {
        d.style.display = 'none';
        h.style.display = 'block';
        h.style.opacity = '0'; h.style.transform = 'translateX(20px)';
        setTimeout(() => { h.style.opacity = '1'; h.style.transform = 'translateX(0)'; h.style.transition = 'all 0.3s ease'; }, 50);
    }, 250);
}

function confirmarRegistro() {
    const idValor = document.getElementById('id-valor')?.value.trim();
    const pass = document.getElementById('pass')?.value;
    const confirmPass = document.getElementById('confirmPass')?.value;
    
    if (rolSeleccionado === 'alumno') {
        if (!idValor || !/^\d{8}$/.test(idValor)) return mostrarNotificacion('Matrícula inválida (8 dígitos).', 'error');
        const tel = document.getElementById('telTutor')?.value.trim();
        if (!tel || !/^\d{10}$/.test(tel)) return mostrarNotificacion('Teléfono inválido (10 dígitos).', 'error');
    }
    if (rolSeleccionado === 'docente') {
        if (!idValor) return mostrarNotificacion('Clave docente obligatoria.', 'error');
        const nss = document.getElementById('nss')?.value.trim();
        const rfc = document.getElementById('rfc')?.value.trim().toUpperCase();
        if (!nss || !/^\d{11}$/.test(nss)) return mostrarNotificacion('NSS inválido (11 dígitos).', 'error');
        if (!rfc || !/^[A-Z]{4}\d{6}[A-Z0-9]{3}$/.test(rfc)) return mostrarNotificacion('RFC inválido.', 'error');
    }
    if (!pass || pass.length < 8 || pass.length > 12 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,12}$/.test(pass)) return mostrarNotificacion('Contraseña: 8-12 caracteres, mayúscula, minúscula, número y especial.', 'error');
    if (pass !== confirmPass) return mostrarNotificacion('Las contraseñas no coinciden.', 'error');
    
    const codigo = Math.floor(1000 + Math.random() * 9000);
    mostrarNotificacion('Enviando código...', 'info');
    setTimeout(() => {
        if (prompt('WHATSAPP SIMULADO\n\nCódigo: ' + codigo + '\n\nIngresa el código:') == codigo) enviarRegistro();
        else mostrarNotificacion('Código incorrecto.', 'error');
    }, 800);
}

async function enviarRegistro() {
    const btn = document.querySelector('#regForm button[type="submit"]');
    const txt = btn.textContent;
    btn.textContent = 'Guardando...';
    btn.disabled = true;
    
    const payload = {
        nombre: document.getElementById('nombre').value.trim(),
        apellido: document.getElementById('apellidos').value.trim(),
        curp: document.getElementById('curp').value.trim().toUpperCase(),
        correo: document.getElementById('email').value.trim().toLowerCase(),
        password: document.getElementById('pass').value,
        rol: rolSeleccionado,
        matricula_escolar: rolSeleccionado === 'alumno' ? document.getElementById('id-valor').value.trim() : null,
        telefono: rolSeleccionado === 'alumno' ? document.getElementById('telTutor').value.trim() : null,
        clave_docente: rolSeleccionado === 'docente' ? document.getElementById('id-valor').value.trim() : null,
        nss: rolSeleccionado === 'docente' ? document.getElementById('nss').value.trim() : null,
        rfc: rolSeleccionado === 'docente' ? document.getElementById('rfc').value.trim().toUpperCase() : null,
    };
    
    try {
        const response = await fetch('controlador/registro.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.mensaje || 'Error');
        mostrarNotificacion('¡Registro exitoso!', 'success');
        setTimeout(() => document.dispatchEvent(new CustomEvent('cambiarVista', { detail: 'login' })), 1200);
    } catch (e) {
        mostrarNotificacion(e.message, 'error');
        btn.textContent = txt;
        btn.disabled = false;
    }
}

function mostrarNotificacion(mensaje, tipo) {
    const n = document.createElement('div');
    n.textContent = mensaje;
    n.style.cssText = 'position:fixed;top:100px;right:20px;padding:15px 25px;border-radius:10px;color:white;font-weight:600;z-index:1000;animation:slideInRight 0.3s ease;background:' + (tipo === 'error' ? '#A1232E' : tipo === 'success' ? '#2d6a4f' : '#192A56') + ';box-shadow:0 10px 30px rgba(0,0,0,0.2);';
    document.body.appendChild(n);
    setTimeout(() => { n.style.animation = 'slideOutRight 0.3s ease forwards'; setTimeout(() => n.remove(), 300); }, 3500);
}