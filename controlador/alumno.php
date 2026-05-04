<?php

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../modelo/alumno.php';

if (empty($_SESSION['usuario']) || !in_array($_SESSION['usuario']['rol'] ?? '', ['alumno', 'padre'], true)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'mensaje' => 'Sesion de alumno/padre no activa.']);
    exit;
}

$accion = $_GET['accion'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = [];
}

try {
    $modelo = new Alumno();
    $usuario = $_SESSION['usuario'];

    switch ($accion) {
        case 'perfil':
            responder($modelo->contextoUsuario($usuario));
            break;

        case 'resumen':
            responder($modelo->resumen($usuario));
            break;

        case 'materias':
            responder($modelo->materias($usuario));
            break;

        case 'verificar_codigo':
            $codigo = trim($_GET['codigo'] ?? '');
            responder(['clase' => $modelo->verificarCodigo($usuario, $codigo)]);
            break;

        case 'solicitar_inscripcion':
            requerirPost();
            responder(['solicitudes' => $modelo->solicitarInscripcion($usuario, (int) ($input['id_curso'] ?? 0))]);
            break;

        case 'historial':
            responder($modelo->historial($usuario));
            break;

        case 'justificantes':
            responder($modelo->justificantes($usuario));
            break;

        case 'crear_justificante':
            requerirPost();
            responder(['justificantes' => $modelo->crearJustificante($usuario, $input)], 201);
            break;

        case 'eliminar_justificante':
            requerirPost();
            responder(['justificantes' => $modelo->eliminarJustificante($usuario, (int) ($input['id_justificante'] ?? 0))]);
            break;

        default:
            http_response_code(404);
            echo json_encode(['ok' => false, 'mensaje' => 'Accion no encontrada.']);
    }
} catch (RuntimeException $e) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'mensaje' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'mensaje' => 'Error de servidor: ' . $e->getMessage()]);
}

function responder(array $data, $status = 200)
{
    http_response_code($status);
    echo json_encode(array_merge(['ok' => true], $data));
    exit;
}

function requerirPost()
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['ok' => false, 'mensaje' => 'Metodo no permitido.']);
        exit;
    }
}
