// Funcion que se llama despues de cargar el componente login
window.inicializarLogin = function() {
    const loginForm = document.getElementById('loginForm');
    const btnRegistro = document.querySelector('#vista-login .btn-register');

    if (btnRegistro) {
        btnRegistro.addEventListener('click', function(e) {
            e.preventDefault();
            const evento = new CustomEvent('cambiarVista', { detail: 'registro' });
            document.dispatchEvent(evento);
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const correo = document.getElementById('user').value.trim();
            const password = document.getElementById('pass').value;
            const rol = document.getElementById('rol').value;

            if (!correo || !password || !rol) {
                mostrarNotificacion('Por favor completa tus credenciales y selecciona un rol', 'error');
                return;
            }

            const btnSubmit = loginForm.querySelector('.btn-login');
            const textoOriginal = btnSubmit.textContent;
            btnSubmit.textContent = 'Verificando...';
            btnSubmit.disabled = true;
            btnSubmit.style.opacity = '0.7';

            try {
                const response = await fetch('controlador/login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo, password, rol })
                });
                const data = await response.json();

                if (!response.ok || !data.ok) {
                    throw new Error(data.mensaje || 'No fue posible iniciar sesion');
                }

                mostrarNotificacion('Acceso correcto. Redirigiendo...', 'success');
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 500);
            } catch (error) {
                mostrarNotificacion(error.message, 'error');
                btnSubmit.textContent = textoOriginal;
                btnSubmit.disabled = false;
                btnSubmit.style.opacity = '1';
            }
        });
    }

   const passInput = document.getElementById('pass');
const togglePassword = document.getElementById('togglePassword');
const passwordMessage = document.getElementById('passwordMessage');

// =============================
// OJO PASSWORD
// =============================
if (togglePassword && !togglePassword.dataset.active) {

    togglePassword.dataset.active = 'true';

    togglePassword.addEventListener('click', () => {

        if (passInput.type === 'password') {

            passInput.type = 'text';

            togglePassword.innerHTML =
                '<i class="fa-solid fa-eye-slash"></i>';

                 } else {

            passInput.type = 'password';

            togglePassword.innerHTML =
                '<i class="fa-solid fa-eye"></i>';
        }
    });
}

// =============================
// VALIDACION PASSWORD
// =============================
if (passInput && !passInput.dataset.validation) {

    passInput.dataset.validation = 'true';

    passInput.addEventListener('input', function () {

        // MAXIMO 15
        if (this.value.length > 15) {

             this.value = this.value.slice(0, 15);

            passwordMessage.textContent =
                'Ya llegaste al límite de 15 caracteres';

            passwordMessage.style.color = '#C7A03D';

            return;
        }

        // MENOS DE 8
        if (
            this.value.length > 0 &&
            this.value.length < 8
        ) {

            passwordMessage.textContent =
                'La contraseña debe tener mínimo 8 caracteres';

            passwordMessage.style.color = '#A1232E';
        }

          else {
            passwordMessage.textContent = '';
        }
    });
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
    }, 3000);
}
