<?php
header('Content-Type: application/json; charset=utf-8');
session_start();

require_once '../modelo/prefectura.php';

$accion = $_GET['accion'] ?? '';
$metodo = $_SERVER['REQUEST_METHOD'];

$respuesta = [
    'ok' => false,
    'mensaje' => 'Acción no válida'
];

try {
    $id_admin = $_SESSION['id_usuario'] ?? 1;

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
        $respuesta = ['ok' => true, 'solicitudes' => ModeloPrefectura::mdlListarSolicitudes()];
    }
    elseif ($accion === 'listar_personal' && $metodo === 'GET') {
        $respuesta = ['ok' => true, 'personal' => ModeloPrefectura::mdlListarPersonal()];
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
        // Pasamos nombre y apellido al modelo
        if (ModeloPrefectura::mdlActualizarPrefecto($id_admin, $input['nombre'], $input['apellido'], $input['correo']) === "ok") {
            $respuesta = ['ok' => true, 'mensaje' => "Datos del prefecto actualizados."];
        } else {
            throw new Exception('Error al actualizar en la base de datos.');
        }
    } else {
        throw new Exception('Endpoint no encontrado.');
    }
} catch (Exception $e) {
    $respuesta['mensaje'] = $e->getMessage();
}

echo json_encode($respuesta);
?>
