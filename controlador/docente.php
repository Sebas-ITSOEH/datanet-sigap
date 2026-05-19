<?php

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../modelo/docenteM.php';

if (empty($_SESSION['usuario']) || ($_SESSION['usuario']['rol'] ?? '') !== 'docente') {
    http_response_code(401);
    echo json_encode(['ok' => false, 'mensaje' => 'Sesion de docente no activa.']);
    exit;
}

$accion = $_GET['accion'] ?? '';
$idDocente = (int) $_SESSION['usuario']['id_usuario'];
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = [];
}

try {
    $modelo = new Docente();

    switch ($accion) {
        case 'perfil':
            responder([
                'perfil' => $modelo->obtenerPerfil($idDocente),
            ]);
            break;

        case 'cursos':
            responder([
                'cursos' => $modelo->listarCursos($idDocente),
                'solicitudes' => $modelo->listarSolicitudes($idDocente),
            ]);
            break;

        case 'obtener_grupos':
            responder([
                'grupos' => $modelo->obtenerGrupos(),
            ]);
            break;

        case 'crear_curso':
            requerirPost();
            validarCampos($input, ['nombre', 'grado', 'grupo', 'codigo']);
            responder([
                'curso' => $modelo->crearCurso($idDocente, $input),
            ], 201);
            break;

        case 'alumnos_curso':
            $idCurso = (int) ($_GET['id_curso'] ?? $input['id_curso'] ?? 0);
            responder([
                'alumnos' => $modelo->listarAlumnosCurso($idDocente, $idCurso),
            ]);
            break;

        case 'alumnos_disponibles':
            $idCurso = (int) ($_GET['id_curso'] ?? $input['id_curso'] ?? 0);
            responder([
                'alumnos' => $modelo->listarAlumnosDisponibles($idDocente, $idCurso),
            ]);
            break;

        case 'buscar_alumno':
            $idCurso = (int) ($_GET['id_curso'] ?? 0);
            $matricula = trim($_GET['matricula'] ?? '');
            responder([
                'alumno' => $modelo->buscarAlumnoPorMatricula($idDocente, $idCurso, $matricula),
            ]);
            break;

        case 'agregar_alumno':
            requerirPost();
            responder([
                'alumnos' => $modelo->agregarAlumno(
                    $idDocente,
                    (int) ($input['id_curso'] ?? 0),
                    (int) ($input['id_alumno'] ?? 0)
                ),
            ]);
            break;

        case 'eliminar_alumno':
            requerirPost();
            responder([
                'alumnos' => $modelo->eliminarAlumno(
                    $idDocente,
                    (int) ($input['id_curso'] ?? 0),
                    (int) ($input['id_alumno'] ?? 0)
                ),
            ]);
            break;

        case 'cursos_lista':
            responder([
                'cursos' => $modelo->listarCursosParaLista($idDocente),
            ]);
            break;

        case 'lista_asistencia':
            $idCurso = (int) ($_GET['id_curso'] ?? 0);
            $fecha = $_GET['fecha'] ?? date('Y-m-d');
            responder($modelo->obtenerListaAsistencia($idDocente, $idCurso, $fecha));
            break;

        case 'generar_qr_token':
            requerirPost();
            validarCampos($input, ['id_curso']);
            responder([
                'qr' => $modelo->generarQrToken(
                    $idDocente,
                    (int) $input['id_curso'],
                    $input['fecha'] ?? date('Y-m-d'),
                    (int) ($input['segundos_vigencia'] ?? 30)
                ),
            ], 201);
            break;

        case 'guardar_asistencia':
            requerirPost();
            validarCampos($input, ['id_curso', 'fecha']);
            if (!isset($input['registros']) || !is_array($input['registros'])) {
                http_response_code(422);
                echo json_encode(['ok' => false, 'mensaje' => 'El campo registros debe ser una lista.']);
                exit;
            }
            responder($modelo->guardarAsistencia(
                $idDocente,
                (int) $input['id_curso'],
                $input['fecha'],
                $input['registros']
            ));
            break;

        case 'reporte_semanal':
            $idCurso = (int) ($_GET['id_curso'] ?? 0);
            $inicio = $_GET['inicio'] ?? date('Y-m-d');
            responder($modelo->generarReporteSemanal($idDocente, $idCurso, $inicio));
            break;

        case 'responder_solicitud':
            requerirPost();
            validarCampos($input, ['id_solicitud', 'decision']);
            responder([
                'solicitudes' => $modelo->responderSolicitud(
                    $idDocente,
                    (int) $input['id_solicitud'],
                    $input['decision']
                ),
            ]);
            break;

        // ===========================================
        // BLOQUE DE CERRAR SESIÓN (ADAPTADO)
        // ===========================================
        case 'logout':
            requerirPost();
            session_unset();
            session_destroy();
            responder(['mensaje' => "Sesión cerrada correctamente."]);
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

function validarCampos(array $input, array $campos)
{
    foreach ($campos as $campo) {
        if (!isset($input[$campo]) || $input[$campo] === '' || $input[$campo] === []) {
            http_response_code(422);
            echo json_encode(['ok' => false, 'mensaje' => "El campo {$campo} es obligatorio."]);
            exit;
        }
    }
}
