// Funcion que se llama despues de cargar el componente registro
window.inicializarRegistro = function() {
    const btnSiguiente = document.getElementById('btnSiguiente');
    const btnAtras = document.getElementById('btnAtras');
    const regForm = document.getElementById('regForm');

    // Inicializar validación dinámica
    GestorValidacion.inicializar();

    if (btnSiguiente) {
        btnSiguiente.addEventListener('click', siguiente);
    }

    if (btnAtras) {
        btnAtras.addEventListener('click', anterior);
    }

    if (regForm) {
        regForm.addEventListener('submit', function(e) {
            e.preventDefault();
            confirmarRegistro();
        });
    }
};

function siguiente() {
    // Validar que el formulario del paso 1 sea válido
    if (!GestorValidacion.validarFormularioCompleto(1)) {
        mostrarNotificacion('Por favor, completa todos los campos correctamente.', 'error');
        return;
    }

    const email = document.getElementById('email')?.value.trim();
    const nombre = document.getElementById('nombre')?.value.trim();

    if (!nombre || !email) {
        mostrarNotificacion('Por favor, llena todos los campos basicos.', 'error');
        return;
    }

    if (!email.includes('@')) {
        mostrarNotificacion('Ingresa un correo valido.', 'error');
        return;
    }

    const esAlumno = /^[0-9]/.test(email);
    const campoDinamico = document.getElementById('dynamic-field');
    const seccionTutor = document.getElementById('seccion-tutor');
    const titulo = document.getElementById('step2-title');

    if (esAlumno) {
        titulo.innerText = 'Perfil Alumno';
        campoDinamico.innerHTML = `
            <div class="input-group">
                <label>Matricula Escolar</label>
                <input type="text" id="id-valor" placeholder="Ej: 20240001" required>
                <div class="validation-feedback" id="id-valor-feedback"></div>
            </div>`;
        seccionTutor.style.display = 'block';
        
        // Inicializar validador de matrícula después de insertarlo en el DOM
        setTimeout(() => {
            GestorValidacion.agregarListenerMatricula();
        }, 0);
    } else {
        titulo.innerText = 'Perfil Docente';
        campoDinamico.innerHTML = `
            <div class="input-group">
                <label>ID de Maestro (Iniciales)</label>
                <input type="text" id="id-valor" placeholder="Ej: JPMX" required>
            </div>`;
        seccionTutor.style.display = 'none';
    }

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
    // Validar paso 2
    if (!GestorValidacion.validarFormularioCompleto(2)) {
        mostrarNotificacion('Por favor, completa todos los campos correctamente.', 'error');
        return;
    }

    const email = document.getElementById('email')?.value.trim();
    const esAlumno = /^[0-9]/.test(email);

    // Validar matrícula si es alumno
    if (esAlumno && !GestorValidacion.validarMatriculaEscolar()) {
        mostrarNotificacion('La matrícula escolar no es válida.', 'error');
        return;
    }

    // Validar tutor si es alumno
    if (esAlumno && !GestorValidacion.validarTutorCompleto()) {
        mostrarNotificacion('Completa todos los datos obligatorios del tutor.', 'error');
        return;
    }

    const pass = document.getElementById('pass')?.value;
    const confirmPass = document.getElementById('confirmPass')?.value;

    if (!pass || !confirmPass) {
        mostrarNotificacion('Por favor completa todos los campos.', 'error');
        return;
    }

    if (pass !== confirmPass) {
        mostrarNotificacion('Las contrasenas no coinciden.', 'error');
        return;
    }

    const codigoGenerado = Math.floor(1000 + Math.random() * 9000);

    mostrarNotificacion('Enviando codigo de confirmacion...', 'info');

    setTimeout(() => {
        const inputCodigo = prompt(
            `WHATSAPP SIMULADO\n\nTu codigo de confirmacion es: ${codigoGenerado}\n\nIngresa el codigo para finalizar el registro:`
        );

        if (inputCodigo == codigoGenerado) {
            enviarRegistro();
        } else {
            mostrarNotificacion('Codigo incorrecto. Intenta de nuevo.', 'error');
        }
    }, 800);
}

async function enviarRegistro() {
    const email = document.getElementById('email').value.trim().toLowerCase();
    const esAlumno = /^[0-9]/.test(email);
    const btnSubmit = document.querySelector('#regForm button[type="submit"]');
    const textoOriginal = btnSubmit.textContent;

    btnSubmit.textContent = 'Guardando...';
    btnSubmit.disabled = true;

    const payload = {
        nombre: document.getElementById('nombre').value.trim(),
        apellido: document.getElementById('apellidos').value.trim(),
        direccion: document.getElementById('direccion').value.trim(),
        correo: email,
        password: document.getElementById('pass').value,
        rol: esAlumno ? 'alumno' : 'docente',
        matricula_escolar: esAlumno ? document.getElementById('id-valor').value.trim() : null,
        telefono: document.getElementById('email')?.dataset.telefono || null,
        tutor: esAlumno
            ? {
                  nombre: document.getElementById('tutorNombres').value.trim(),
                  apellido: [
                      document.getElementById('tutorPaterno').value.trim(),
                      document.getElementById('tutorMaterno').value.trim(),
                  ]
                      .filter(Boolean)
                      .join(' '),
                  correo: document.getElementById('tutorCorreo').value.trim().toLowerCase(),
                  telefono: document.getElementById('telTutor').value.trim(),
                  password: document.getElementById('pass').value,
              }
            : null,
    };

    try {
        const response = await fetch('controlador/registro.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || 'No fue posible completar el registro');
        }

        mostrarNotificacion('Registro exitoso. Redirigiendo al login...', 'success');
        setTimeout(() => {
            const evento = new CustomEvent('cambiarVista', { detail: 'login' });
            document.dispatchEvent(evento);
        }, 1200);
    } catch (error) {
        mostrarNotificacion(error.message, 'error');
        btnSubmit.textContent = textoOriginal;
        btnSubmit.disabled = false;
    }
}

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
