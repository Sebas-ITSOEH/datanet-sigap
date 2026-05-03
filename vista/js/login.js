// Función que se llama después de cargar el componente login
window.inicializarLogin = function() {
    const loginForm = document.getElementById('loginForm');
    const btnRegistro = document.querySelector('#vista-login .btn-register');

    // Botón "Registrarse" dentro del login -> cambia a vista registro
    if (btnRegistro) {
        btnRegistro.addEventListener('click', function(e) {
            e.preventDefault();
            // Disparar evento de navegación SPA
            const evento = new CustomEvent('cambiarVista', { detail: 'registro' });
            document.dispatchEvent(evento);
        });
    }

    // Envío del formulario de login
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const rol = document.getElementById('rol').value;

            if (!rol) {
                mostrarNotificacion('Por favor selecciona un rol de acceso', 'error');
                return;
            }

            // Animación de carga
            const btnSubmit = loginForm.querySelector('.btn-login');
            const textoOriginal = btnSubmit.textContent;
            btnSubmit.textContent = 'Verificando...';
            btnSubmit.disabled = true;
            btnSubmit.style.opacity = '0.7';

            setTimeout(() => {
                // ✅ Rutas reales de los index de cada rol
                if (rol === 'Profesor') window.location.href = 'indexDocente.html';
                else if (rol === 'Padre de familia') window.location.href = 'indexAlumno.html';
                else if (rol === 'Prefectura') window.location.href = 'indexPrefectura.html';
                
                btnSubmit.textContent = textoOriginal;
                btnSubmit.disabled = false;
                btnSubmit.style.opacity = '1';
            }, 800);
        });
    }

    // Mostrar/ocultar contraseña (mejora UX)
    const passInput = document.getElementById('pass');
    if (passInput) {
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'toggle-password';
        toggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
        
        const passContainer = passInput.parentElement;
        passContainer.style.position = 'relative';
        passContainer.appendChild(toggleBtn);

        toggleBtn.addEventListener('click', function() {
            const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passInput.setAttribute('type', type);
            toggleBtn.innerHTML = type === 'password' ? 
                '<i class="fa-solid fa-eye"></i>' : 
                '<i class="fa-solid fa-eye-slash"></i>';
        });
    }
};

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
        background: ${tipo === 'error' ? '#A1232E' : '#192A56'};
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}