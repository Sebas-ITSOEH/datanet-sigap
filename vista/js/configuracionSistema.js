(function () {
    const defaults = {
        limite_justificacion_dias: 3,
        ciclo_activo: '2025-2026',
        trim1_inicio: '2025-08-28',
        trim1_fin: '2025-11-20',
        trim2_inicio: '2025-11-21',
        trim2_fin: '2026-03-10',
        trim3_inicio: '2026-03-11',
        trim3_fin: '2026-07-15',
        nombre_director: 'Prof. Gustavo Eleazar Viveros Niño'
    };

    function endpointConfiguracion() {
        const enVista = /\/vista\//i.test(window.location.pathname.replace(/\\/g, '/'));
        return enVista ? '../controlador/configuracion.php' : 'controlador/configuracion.php';
    }

    async function obtenerConfiguracionSistema() {
        if (window.configuracionSistemaActual) return window.configuracionSistemaActual;

        try {
            const response = await fetch(endpointConfiguracion(), { headers: { Accept: 'application/json' } });
            const data = await response.json();
            if (!response.ok || !data.ok) throw new Error(data.mensaje || 'Configuración no disponible');
            window.configuracionSistemaActual = Object.assign({}, defaults, data.configuracion || {});
        } catch (error) {
            console.error('Error al cargar configuración del sistema:', error);
            window.configuracionSistemaActual = Object.assign({}, defaults);
        }

        return window.configuracionSistemaActual;
    }

    function textoCiclo(ciclo) {
        return `Ciclo Escolar ${String(ciclo || defaults.ciclo_activo).replace('-', ' - ')}`;
    }

    function aplicarConfiguracionSistema(config) {
        document.querySelectorAll('[data-config="nombre_director"]').forEach(el => {
            el.textContent = config.nombre_director || defaults.nombre_director;
        });

        document.querySelectorAll('[data-config="ciclo_activo"]').forEach(el => {
            el.textContent = config.ciclo_activo || defaults.ciclo_activo;
        });

        document.querySelectorAll('[data-config="ciclo_escolar_texto"]').forEach(el => {
            el.textContent = textoCiclo(config.ciclo_activo);
        });
    }

    window.obtenerConfiguracionSistema = obtenerConfiguracionSistema;
    window.aplicarConfiguracionSistema = aplicarConfiguracionSistema;
    window.textoCicloSistema = textoCiclo;

    document.addEventListener('DOMContentLoaded', async function () {
        const config = await obtenerConfiguracionSistema();
        aplicarConfiguracionSistema(config);
    });
})();
