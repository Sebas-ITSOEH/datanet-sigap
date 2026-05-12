// Funcion que se llama despues de cargar el componente login
window.inicializarLogin = function() {

    const loginForm = document.getElementById('loginForm');
    const btnRegistro = document.querySelector('#vista-login .btn-register');

    if (btnRegistro) {
        btnRegistro.addEventListener('click', function(e) {

            e.preventDefault();

            const evento = new CustomEvent('cambiarVista', {
                detail: 'registro'
            });

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

                mostrarNotificacion(
                    'Por favor completa tus credenciales y selecciona un rol',
                    'error'
                );

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

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        correo,
                        password,
                        rol
                    })

                });

                const data = await response.json();

                if (!response.ok || !data.ok) {

                    throw new Error(
                        data.mensaje || 'No fue posible iniciar sesion'
                    );

                }

                mostrarNotificacion(
                    'Acceso correcto. Redirigiendo...',
                    'success'
                );

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

};

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
        background: ${
            tipo === 'error'
                ? '#A1232E'
                : tipo === 'success'
                ? '#2d6a4f'
                : '#192A56'
        };
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(notif);

    setTimeout(() => {

        notif.style.animation =
            'slideOutRight 0.3s ease forwards';

        setTimeout(() => notif.remove(), 300);

    }, 3000);

}