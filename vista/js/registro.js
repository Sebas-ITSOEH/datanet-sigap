// Función que se llama después de cargar el componente registro
window.inicializarRegistro = function() {
    const btnSiguiente = document.getElementById('btnSiguiente');
    const btnAtras = document.getElementById('btnAtras');
    const regForm = document.getElementById('regForm');

    // Botón Siguiente (Paso 1 -> Paso 2)
    if (btnSiguiente) {
        btnSiguiente.addEventListener('click', siguiente);
    }

    // Botón Atrás (Paso 2 -> Paso 1)
    if (btnAtras) {
        btnAtras.addEventListener('click', anterior);
    }

    // Envío del formulario
    if (regForm) {
        regForm.addEventListener('submit', function(e) {
            e.preventDefault();
            confirmarRegistro();
        });
    }
};

function siguiente() {
    const email = document.getElementById('email')?.value.trim();
    const nombre = document.getElementById('nombre')?.value.trim();

    if (!nombre || !email) {
        mostrarNotificacion('Por favor, llena todos los campos básicos.', 'error');
        return;
    }

    if (!email.endsWith('@secgralbj.edu.mx')) {
        mostrarNotificacion('El correo debe ser institucional (@secgralbj.edu.mx)', 'error');
        return;
    }

    const esAlumno = /^[0-9]/.test(email);
    const campoDinamico = document.getElementById('dynamic-field');
    const seccionTutor = document.getElementById('seccion-tutor');
    const titulo = document.getElementById('step2-title');

    if (esAlumno) {
        titulo.innerText = 'Perfil Alumno';
        campoDinamico.innerHTML = `
            <label>Matrícula Escolar</label>
            <input type="text" id="id-valor" placeholder="Ej: 20240001" required>`;
        seccionTutor.style.display = 'block';
    } else {
        titulo.innerText = 'Perfil Docente';
        campoDinamico.innerHTML = `
            <label>ID de Maestro (Iniciales)</label>
            <input type="text" id="id-valor" placeholder="Ej: JPMX" required>`;
        seccionTutor.style.display = 'none';
    }

    // Transición entre pasos
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    
    step1.style.opacity = '0';
    step1.style.transform = 'translateX(-20px)';
    step1.style.transition = 'all 0.3s ease';
    
    setTimeout(() => {
        step1.style.display = 'none';
        step2.style.display = 'block';
        step2.style.opacity = '0';
        step2.style.transform = 'translateX(20px)';
        
        setTimeout(() => {
            step2.style.opacity = '1';
            step2.style.transform = 'translateX(0)';
            step2.style.transition = 'all 0.3s ease';
        }, 50);
    }, 250);

    document.getElementById('dot2').classList.add('active');
}

function anterior() {
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    
    step2.style.opacity = '0';
    step2.style.transform = 'translateX(20px)';
    step2.style.transition = 'all 0.3s ease';
    
    setTimeout(() => {
        step2.style.display = 'none';
        step1.style.display = 'block';
        step1.style.opacity = '0';
        step1.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            step1.style.opacity = '1';
            step1.style.transform = 'translateX(0)';
            step1.style.transition = 'all 0.3s ease';
        }, 50);
    }, 250);

    document.getElementById('dot2').classList.remove('active');
}

function confirmarRegistro() {
    const pass = document.getElementById('pass')?.value;
    const confirmPass = document.getElementById('confirmPass')?.value;

    if (!pass || !confirmPass) {
        mostrarNotificacion('Por favor completa todos los campos.', 'error');
        return;
    }

    if (pass !== confirmPass) {
        mostrarNotificacion('Las contraseñas no coinciden.', 'error');
        return;
    }

    if (pass.length < 6) {
        mostrarNotificacion('La contraseña debe tener al menos 6 caracteres.', 'error');
        return;
    }

    // Simulación de envío de WhatsApp
    const codigoGenerado = Math.floor(1000 + Math.random() * 9000);
    
    mostrarNotificacion('📱 Enviando código de confirmación...', 'info');
    
    setTimeout(() => {
        const inputCodigo = prompt(
            `📱 WHATSAPP SIMULADO\n\nTu código de confirmación es: ${codigoGenerado}\n\nIngresa el código para finalizar el registro:`
        );
        
        if (inputCodigo == codigoGenerado) {
            mostrarNotificacion('✅ ¡Registro exitoso! Redirigiendo al login...', 'success');
            setTimeout(() => {
                // Volver al login
                const evento = new CustomEvent('cambiarVista', { detail: 'login' });
                document.dispatchEvent(evento);
            }, 1500);
        } else {
            mostrarNotificacion('❌ Código incorrecto. Intenta de nuevo.', 'error');
        }
    }, 800);
}

// Función auxiliar para notificaciones
function mostrarNotificacion(mensaje, tipo) {
    const notif = document.createElement('div');
    notif.textContent = mensaje;
    notif.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        animation: slideInRight 0.3s ease;
        background: ${tipo === 'error' ? '#A1232E' : tipo === 'success' ? '#2d6a4f' : '#192A56'};
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => notif.remove(), 300);
    }, 3500);
}