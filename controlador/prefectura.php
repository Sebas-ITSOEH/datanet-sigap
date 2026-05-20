<?php
header('Content-Type: application/json; charset=utf-8');
session_start();

require_once __DIR__ . '/../modelo/prefecturaM.php';

$accion = $_GET['accion'] ?? '';
$metodo = $_SERVER['REQUEST_METHOD'];

$respuesta = [
    'ok' => false,
    'mensaje' => 'Acción no válida'
];

try {
    $id_admin = $_SESSION['usuario']['id_usuario'] ?? 1;

    if ($accion === 'actualizar_solicitud' && $metodo === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $id_solicitud = $input['id_solicitud'] ?? null;
        $estado_frontend = $input['estado'] ?? null;
        $motivo_rechazo = $input['motivo_rechazo'] ?? 'Revisado por Prefectura';
        
        if (!$id_solicitud || !$estado_frontend) {
            throw new Exception('Faltan datos para procesar la solicitud.');
        }

        $estado_bd = ($estado_frontend === 'aprobada') ? 'aprobado' : 'rechazado';
        $resJustificante = ModeloPrefectura::mdlActualizarJustificante($id_solicitud, $estado_bd);
        $resLog = ModeloPrefectura::mdlRegistrarValidacion($id_solicitud, $id_admin, $estado_bd, $motivo_rechazo);

        if($resJustificante == "ok" && $resLog == "ok"){
            $respuesta = ['ok' => true, 'mensaje' => "El justificante fue $estado_bd correctamente."];
        } else {
            throw new Exception('Error al guardar en la base de datos.');
        }
    }
    elseif ($accion === 'listar_solicitudes' && $metodo === 'GET') {
        $grupo = $_GET['grupo'] ?? 'todos';
        $respuesta = ['ok' => true, 'solicitudes' => ModeloPrefectura::mdlListarSolicitudes($grupo)];
    }
    elseif ($accion === 'listar_personal' && $metodo === 'GET') {
        $rol = $_GET['rol'] ?? 'alumno';
        $grupo = $_GET['grupo'] ?? 'todos';
        $respuesta = ['ok' => true, 'personal' => ModeloPrefectura::mdlListarPersonal($rol, $grupo)];
    }
    elseif ($accion === 'listar_grupos' && $metodo === 'GET') {
        $respuesta = ['ok' => true, 'grupos' => ModeloPrefectura::mdlListarGrupos()];
    }
    elseif ($accion === 'crear_usuario' && $metodo === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['nombre']) || empty($input['correo']) || empty($input['password'])) {
            throw new Exception('Nombre, correo y contraseña son obligatorios.');
        }
        if (ModeloPrefectura::mdlCrearUsuario($input) === "ok") {
            $respuesta = ['ok' => true, 'mensaje' => "El usuario ha sido registrado con éxito."];
        } else {
            throw new Exception('Error al registrar el usuario en la base de datos.');
        }
    }
    elseif ($accion === 'obtener_prefecto' && $metodo === 'GET') {
        $respuesta = ['ok' => true, 'prefecto' => ModeloPrefectura::mdlObtenerPrefecto($id_admin)];
    }
    elseif ($accion === 'actualizar_prefecto' && $metodo === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['nombre']) || empty($input['correo'])) {
            throw new Exception('El nombre y el correo son obligatorios.');
        }
        if (ModeloPrefectura::mdlActualizarPrefecto($id_admin, $input['nombre'], $input['apellido'], $input['correo']) === "ok") {
            $respuesta = ['ok' => true, 'mensaje' => "Datos del prefecto actualizados."];
        } else {
            throw new Exception('Error al actualizar en la base de datos.');
        }
    }
    elseif ($accion === 'obtener_estadisticas' && $metodo === 'GET') {
        $trimestre = isset($_GET['trimestre']) ? (int)$_GET['trimestre'] : 3;
        $anio = isset($_GET['anio']) ? (int)$_GET['anio'] : (int)date('Y');
        $respuesta = [
            'ok' => true, 
            'estadisticas' => ModeloPrefectura::mdlObtenerEstadisticasGrupos($trimestre, $anio)
        ];
    }
    elseif ($accion === 'obtener_asistencia_exportar' && $metodo === 'GET') {
        $grupo = $_GET['grupo'] ?? '';
        $materia = $_GET['materia'] ?? '';
        $f_inicio = $_GET['fecha_inicio'] ?? '';
        $f_fin = $_GET['fecha_fin'] ?? '';

        if (!$grupo || !$materia || !$f_inicio || !$f_fin) {
            throw new Exception('Faltan parámetros para la búsqueda.');
        }

        $asistencia = ModeloPrefectura::mdlObtenerAsistenciaSemanal($grupo, $materia, $f_inicio, $f_fin);
        $respuesta = ['ok' => true, 'datos' => $asistencia];
    }
    elseif ($accion === 'obtener_filtros_exportar' && $metodo === 'GET') {
        $grupos = ModeloPrefectura::mdlListarGrupos();
        $asignaturas = ModeloPrefectura::mdlListarAsignaturas();
        $respuesta = [
            'ok' => true, 
            'grupos' => $grupos, 
            'asignaturas' => $asignaturas
        ];
    }
    elseif ($accion === 'obtener_expediente_alumno' && $metodo === 'GET') {
        $matricula = $_GET['matricula'] ?? '';
        $fecha_inicio = $_GET['fecha_inicio'] ?? null;
        $fecha_fin = $_GET['fecha_fin'] ?? null;
        $materia = $_GET['materia'] ?? null;

        if(empty($matricula)) throw new Exception('No se proporcionó la matrícula del alumno.');
        
        $respuesta = [
            'ok' => true, 
            'historial' => ModeloPrefectura::mdlObtenerExpedienteAlumno($matricula, $fecha_inicio, $fecha_fin, $materia)
        ];
    }
    elseif ($accion === 'obtener_horario_docente' && $metodo === 'GET') {
        $id_docente = $_GET['id_docente'] ?? null;
        if (!$id_docente) throw new Exception('No se proporcionó el ID del docente.');
        
        $respuesta = [
            'ok' => true, 
            'horario' => ModeloPrefectura::mdlObtenerHorarioDocente($id_docente)
        ];
    }
    elseif ($accion === 'obtener_riesgo_grupo' && $metodo === 'GET') {
        $trimestre = isset($_GET['trimestre']) ? (int)$_GET['trimestre'] : 3;
        $anio = isset($_GET['anio']) ? (int)$_GET['anio'] : (int)date('Y');
        $grupo = $_GET['grupo'] ?? '';

        if (!$grupo) throw new Exception('No se especificó el grupo.');

        $respuesta = [
            'ok' => true,
            'alumnos' => ModeloPrefectura::mdlObtenerRiesgoPorGrupo($trimestre, $anio, $grupo)
        ];
    }
    elseif ($accion === 'crear_grupo' && $metodo === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $nombre = trim($input['nombre'] ?? '');
        if (empty($nombre)) throw new Exception('El nombre del grupo es obligatorio.');
        
        $res = ModeloPrefectura::mdlCrearGrupo($nombre);
        if ($res === "ok") {
            $respuesta = ['ok' => true, 'mensaje' => "Grupo creado exitosamente."];
        } elseif ($res === "existe") {
            throw new Exception('Ese grupo ya existe en la base de datos.');
        } else {
            throw new Exception('Error al crear el grupo.');
        }
    }
    elseif ($accion === 'eliminar_grupo' && $metodo === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id_grupo = $input['id_grupo'] ?? null;
        if (!$id_grupo) throw new Exception('ID de grupo no proporcionado.');
        
        $res = ModeloPrefectura::mdlEliminarGrupo($id_grupo);
        if ($res === "ok") {
            $respuesta = ['ok' => true, 'mensaje' => "Grupo eliminado exitosamente."];
        } elseif ($res === "en_uso") {
            throw new Exception('No puedes eliminar este grupo porque tiene alumnos, cursos o asistencias registradas.');
        } else {
            throw new Exception('Error al eliminar el grupo.');
        }
    }
    elseif ($accion === 'obtener_configuracion' && $metodo === 'GET') {
        $respuesta = ['ok' => true, 'configuracion' => ModeloPrefectura::mdlObtenerConfiguracion()];
    }
    elseif ($accion === 'actualizar_configuracion' && $metodo === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (ModeloPrefectura::mdlActualizarConfiguracion($input) === "ok") {
            $respuesta = ['ok' => true, 'mensaje' => "Configuración del sistema actualizada correctamente."];
        } else {
            throw new Exception('Error al actualizar la configuración en la base de datos.');
        }
    }
    // AQUÍ ESTÁ LA NUEVA ACCIÓN DE CERRAR SESIÓN
    elseif ($accion === 'logout' && $metodo === 'POST') {
        session_unset();
        session_destroy();
        $respuesta = ['ok' => true, 'mensaje' => "Sesión cerrada correctamente."];
    } 
    else {
        throw new Exception('Endpoint no encontrado.');
    }
} catch (Exception $e) {
    $respuesta['mensaje'] = $e->getMessage();
}

echo json_encode($respuesta);
?>
