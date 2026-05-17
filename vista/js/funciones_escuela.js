// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function () {

    // --- Referencias a vistas ---
    const vistaInicio = document.getElementById('vista-inicio');
    const vistaLogin = document.getElementById('vista-login');
    const vistaRegistro = document.getElementById('vista-registro');
    const vistaSensores = document.getElementById('vista-sensores');

    // --- Smooth Scrolling ---
    const menuEnlaces = document.querySelectorAll('.menu-enlaces a[href^="#"]');

    menuEnlaces.forEach(enlace => {
        enlace.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            // Validar que targetId sea válido (no solo '#')
            if (targetId && targetId !== '#' && targetId.length > 1) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // --- Navegación SPA (Single Page Application) ---
    function cambiarVista(vista) {
        // Ocultar todas las vistas
        vistaInicio.style.display = 'none';
        vistaLogin.style.display = 'none';
        vistaRegistro.style.display = 'none';
        vistaSensores.style.display = 'none';

        // Mostrar la vista seleccionada
        switch (vista) {
            case 'inicio':
                vistaInicio.style.display = 'block';
                actualizarEnlaceActivo('inicio');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                break;

            case 'login':
                vistaLogin.style.display = 'flex';
                vistaLogin.style.justifyContent = 'center';
                vistaLogin.style.alignItems = 'center';
                vistaLogin.style.minHeight = '70vh';
                vistaLogin.style.padding = '2rem 5%';
                actualizarEnlaceActivo('login');
                // ✅ RUTA CORREGIDA
                cargarComponente('vista/login.html', vistaLogin, iniciarLogin);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                break;

            case 'registro':
                vistaRegistro.style.display = 'flex';
                vistaRegistro.style.justifyContent = 'center';
                vistaRegistro.style.alignItems = 'center';
                vistaRegistro.style.minHeight = '70vh';
                vistaRegistro.style.padding = '2rem 5%';
                actualizarEnlaceActivo('registro');
                // ✅ RUTA CORREGIDA
                cargarComponente('vista/registro.html', vistaRegistro, iniciarRegistro);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                break;

            case 'sensores':
                vistaSensores.style.display = 'block';
                actualizarEnlaceActivo('sensores');
                window.location.href = 'http://localhost:5173/';
                break;
        }
    }

    // --- Función para cargar componentes HTML dinámicamente ---
    function cargarComponente(url, contenedor, callback) {
        // Evitar cargar múltiples veces
        if (contenedor.dataset.cargado === 'true') {
            if (callback) callback();
            return;
        }

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('No se pudo cargar el componente: ' + url);
                return response.text();
            })
            .then(html => {
                contenedor.innerHTML = html;
                contenedor.dataset.cargado = 'true';
                if (callback) callback();
            })
            .catch(error => {
                console.error('Error al cargar:', url, error);
                contenedor.innerHTML = `
                    <div style="text-align:center; padding:2rem; color:#A1232E;">
                        <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;"></i>
                        <p>Error al cargar el contenido.</p>
                        <p style="font-size:0.8rem; color:#777;">Ruta: ${url}</p>
                        <button onclick="location.reload()" style="margin-top:1rem; padding:0.5rem 1.5rem; background:#192A56; color:white; border:none; border-radius:8px; cursor:pointer;">
                            Recargar página
                        </button>
                    </div>`;
            });
    }

    // --- Actualizar clase activa en el menú ---
    function actualizarEnlaceActivo(vista) {
        document.querySelectorAll('.menu-enlaces a').forEach(enlace => {
            enlace.classList.remove('enlace-activo');
            if (enlace.dataset.vista === vista) {
                enlace.classList.add('enlace-activo');
            }
        });
    }

    // --- Delegación de eventos para navegación SPA ---
    document.addEventListener('click', function (e) {
        const target = e.target.closest('[data-vista]');
        if (target) {
            e.preventDefault();
            const vista = target.dataset.vista;
            cambiarVista(vista);
        }
    });

    // --- Escuchar evento personalizado para cambio de vista ---
    document.addEventListener('cambiarVista', function(e) {
        cambiarVista(e.detail);
    });

    // --- Callback para iniciar scripts del login ---
    function iniciarLogin() {
        if (typeof window.inicializarLogin === 'function') {
            window.inicializarLogin();
        }
    }

    // --- Callback para iniciar scripts del registro ---
    function iniciarRegistro() {
        if (typeof window.inicializarRegistro === 'function') {
            window.inicializarRegistro();
        }
    }

    // --- Efecto simple de hover en tarjetas ---
    const tarjetas = document.querySelectorAll('.tarjeta-informativa');
    tarjetas.forEach(tarjeta => {
        tarjeta.addEventListener('mouseenter', () => {
            // El efecto CSS de translateY ya se aplica
        });
    });

});