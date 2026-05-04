<?php

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../modelo/prefecto.php';

if (empty($_SESSION['usuario']) || !in_array($_SESSION['usuario']['rol'] ?? '', ['admin', 'prefecto'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'mensaje' => 'Sesión de prefectura no activa.']);
    exit;
}

$accion = $_GET['accion'] ?? '';
$idPrefecto = (int) $_SESSION['usuario']['id_usuario'];
$input = json_decode(file_get_contents('php://input'), true) ?: [];

try {
    $modelo = new Prefecto();

    switch ($accion) {
        // PERFIL
        case 'perfil':
            responder($modelo->obtenerPerfil($idPrefecto), 'perfil');
            break;

        // CONTROL - BANDEJA
        case 'justificantes_pendientes':
            responder($modelo->listarJustificantesPendientes(), 'pendientes');
            break;

        // CONTROL - HISTORIAL
        case 'historial_justificantes':
            responder($modelo->listarHistorialJustificantes(), 'historial');
            break;

        // CONTROL - RESPONDER
        case 'responder_justificante':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new RuntimeException('Método no permitido.');
            }
            if (empty($input['id_justificante']) || empty($input['estado'])) {
                throw new RuntimeException('Faltan campos: id_justificante y estado.');
            }
            if (!in_array($input['estado'], ['aprobado', 'rechazado'])) {
                throw new RuntimeException('Estado no válido.');
            }
            responder(
                $modelo->responderJustificante((int)$input['id_justificante'], $input['estado'], $idPrefecto),
                'resultado'
            );
            break;

        // PERSONAL
        case 'listar_alumnos':
            $grupo = $_GET['grupo'] ?? 'all';
            responder($modelo->listarAlumnos($grupo), 'alumnos');
            break;

        case 'listar_docentes':
            responder($modelo->listarDocentes(), 'docentes');
            break;

        // SISTEMA
        case 'obtener_configuracion':
            responder($modelo->obtenerConfiguracionSistema(), 'configuracion');
            break;

        case 'guardar_configuracion':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new RuntimeException('Método no permitido.');
            }
            if (empty($input['configuraciones']) || !is_array($input['configuraciones'])) {
                throw new RuntimeException('Formato de configuraciones inválido.');
            }
            responder(
                $modelo->guardarConfiguracionSistema($input['configuraciones']),
                'configuracion'
            );
            break;

        default:
            http_response_code(404);
            echo json_encode(['ok' => false, 'mensaje' => 'Acción no encontrada.']);
    }
} catch (RuntimeException $e) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'mensaje' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'mensaje' => 'Error de servidor: ' . $e->getMessage()]);
}

function responder($datos, $clave = null)
{
    $respuesta = ['ok' => true];
    if ($clave) {
        $respuesta[$clave] = $datos;
    } else {
        $respuesta = array_merge($respuesta, $datos);
    }
    echo json_encode($respuesta);
    exit;
}