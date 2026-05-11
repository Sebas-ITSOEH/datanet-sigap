<?php

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../modelo/alumnoM.php';

if (empty($_SESSION['usuario']) || !in_array($_SESSION['usuario']['rol'] ?? '', ['alumno', 'padre'], true)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'mensaje' => 'Sesion de alumno/padre no activa.']);
    exit;
}

$accion = $_GET['accion'] ?? '';
$input = [];
if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false) {
    $input = $_POST;
    if (isset($input['materias']) && is_string($input['materias'])) {
        $materias = json_decode($input['materias'], true);
        $input['materias'] = is_array($materias) ? $materias : [];
    }
} else {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        $input = [];
    }
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

        case 'detalle_materia':
            $idCurso = (int) ($_GET['id_curso'] ?? 0);
            if (!$idCurso) {
                throw new RuntimeException('ID de curso requerido.');
            }
            responder($modelo->detalleMateria($usuario, $idCurso));
            break;

        case 'verificar_codigo':
            $codigo = trim($_GET['codigo'] ?? '');
            if (empty($codigo)) {
                throw new RuntimeException('El código de clase es requerido.');
            }
            responder(['clase' => $modelo->verificarCodigo($usuario, $codigo)]);
            break;

        case 'solicitar_inscripcion':
            requerirPost();
            $idCurso = (int) ($input['id_curso'] ?? 0);
            if (!$idCurso) {
                throw new RuntimeException('ID de curso requerido.');
            }
            responder(['solicitudes' => $modelo->solicitarInscripcion($usuario, $idCurso)]);
            break;

        case 'abandonar_materia':
            requerirPost();
            $idCurso = (int) ($input['id_curso'] ?? 0);
            if (!$idCurso) {
                throw new RuntimeException('ID de curso requerido.');
            }
            responder(['materias' => $modelo->abandonarMateria($usuario, $idCurso)]);
            break;

        case 'historial':
            responder($modelo->historial($usuario));
            break;

        case 'historial_materia':
            $idCurso = (int) ($_GET['id_curso'] ?? 0);
            if (!$idCurso) {
                throw new RuntimeException('ID de curso requerido.');
            }
            responder(['historial' => $modelo->historialPorMateria($usuario, $idCurso)]);
            break;

        case 'beacons_materia':
            $idCurso = (int) ($_GET['id_curso'] ?? 0);
            if (!$idCurso) {
                throw new RuntimeException('ID de curso requerido.');
            }
            responder(['beacons' => $modelo->beaconsPorMateria($usuario, $idCurso)]);
            break;

        case 'registrar_asistencia_qr':
            requerirPost();
            $token = trim($input['token'] ?? '');
            $beaconUuid = trim($input['beacon_uuid'] ?? '');
            if ($token === '') {
                throw new RuntimeException('El token QR es requerido.');
            }
            responder($modelo->registrarAsistenciaQr($usuario, $token, $beaconUuid), 201);
            break;

        case 'justificantes':
            responder($modelo->justificantes($usuario));
            break;

        case 'crear_justificante':
            requerirPost();
            if (empty($input['fecha_inicio']) && empty($input['fecha'])) {
                throw new RuntimeException('La fecha del justificante es obligatoria.');
            }
            $input['archivo_url'] = combinarArchivosJustificante($input['archivo_url'] ?? '', guardarArchivosJustificante($usuario));
            responder(['justificantes' => $modelo->crearJustificante($usuario, $input)], 201);
            break;

        case 'actualizar_justificante':
            requerirPost();
            $idJustificante = (int) ($input['id_justificante'] ?? 0);
            if (!$idJustificante) {
                throw new RuntimeException('ID de justificante requerido.');
            }
            if (empty($input['fecha_inicio']) && empty($input['fecha'])) {
                throw new RuntimeException('La fecha del justificante es obligatoria.');
            }
            $input['archivo_url'] = combinarArchivosJustificante($input['archivo_url'] ?? '', guardarArchivosJustificante($usuario));
            responder(['justificantes' => $modelo->actualizarJustificante($usuario, $idJustificante, $input)]);
            break;

        case 'eliminar_justificante':
            requerirPost();
            $idJustificante = (int) ($input['id_justificante'] ?? 0);
            if (!$idJustificante) {
                throw new RuntimeException('ID de justificante requerido.');
            }
            responder(['justificantes' => $modelo->eliminarJustificante($usuario, $idJustificante)]);
            break;

        // ═══════════════════════════════════
        // NUEVOS CASOS PARA PIN
        // ═══════════════════════════════════
        case 'verificar_pin':
            responder($modelo->verificarPin($usuario));
            break;

        case 'validar_pin':
            requerirPost();
            $pin = trim($input['pin'] ?? '');
            if (empty($pin)) {
                throw new RuntimeException('El PIN es requerido.');
            }
            responder($modelo->validarPin($usuario, $pin));
            break;

        case 'registrar_pin':
            requerirPost();
            $pin = trim($input['pin'] ?? '');
            if (empty($pin)) {
                throw new RuntimeException('El PIN es requerido.');
            }
            responder($modelo->registrarPin($usuario, $pin), 201);
            break;

        case 'cambiar_pin':
            requerirPost();
            $pinActual = trim($input['pin_actual'] ?? '');
            $pinNuevo = trim($input['pin_nuevo'] ?? '');
            if (empty($pinActual) || empty($pinNuevo)) {
                throw new RuntimeException('PIN actual y nuevo son requeridos.');
            }
            responder($modelo->cambiarPin($usuario, $pinActual, $pinNuevo));
            break;

        // ═══════════════════════════════════
        // NUEVOS CASOS PARA HORARIO
        // ═══════════════════════════════════
        case 'horario':
            responder(['horario' => $modelo->horarioAlumno($usuario)]);
            break;

        case 'horario_materia':
            $idCurso = (int) ($_GET['id_curso'] ?? 0);
            if (!$idCurso) {
                throw new RuntimeException('ID de curso requerido.');
            }
            responder(['horario' => $modelo->horarioPorMateria($usuario, $idCurso)]);
            break;
        case 'materias_por_dia':
         $fecha = $_GET['fecha'] ?? date('Y-m-d');
         responder(['materias' => $modelo->materiasPorDia($usuario, $fecha)]);
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

function guardarArchivosJustificante(array $usuario): array
{
    if (empty($_FILES['documentos'])) {
        return [];
    }

    $permitidas = [
        'pdf' => 'application/pdf',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
    ];
    $maxBytes = 10 * 1024 * 1024;
    $baseDir = realpath(__DIR__ . '/..');
    $uploadDir = $baseDir . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'justificantes';

    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true)) {
        throw new RuntimeException('No se pudo crear la carpeta de documentos.');
    }

    $archivos = normalizarFilesArray($_FILES['documentos']);
    $rutas = [];
    $idUsuario = (int)($usuario['id_usuario'] ?? 0);

    foreach ($archivos as $archivo) {
        if (($archivo['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            continue;
        }
        if (($archivo['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
            throw new RuntimeException('No se pudo subir uno de los archivos.');
        }
        if (($archivo['size'] ?? 0) > $maxBytes) {
            throw new RuntimeException('Cada archivo debe pesar máximo 10MB.');
        }

        $nombreOriginal = $archivo['name'] ?? 'documento';
        $extension = strtolower(pathinfo($nombreOriginal, PATHINFO_EXTENSION));
        if (!isset($permitidas[$extension])) {
            throw new RuntimeException('Solo se aceptan archivos PDF, JPG o PNG.');
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($archivo['tmp_name']);
        if ($mime !== $permitidas[$extension]) {
            throw new RuntimeException('El tipo de archivo no coincide con su extensión.');
        }

        $nombreSeguro = preg_replace('/[^a-zA-Z0-9._-]+/', '_', pathinfo($nombreOriginal, PATHINFO_FILENAME));
        $sufijo = bin2hex(random_bytes(4));
        $nombreFinal = sprintf('%s_%s_%s.%s', $idUsuario, date('YmdHis'), $sufijo, $extension);
        if ($nombreSeguro) {
            $nombreFinal = sprintf('%s_%s_%s_%s.%s', $idUsuario, date('YmdHis'), substr($nombreSeguro, 0, 40), $sufijo, $extension);
        }

        $destino = $uploadDir . DIRECTORY_SEPARATOR . $nombreFinal;
        if (!move_uploaded_file($archivo['tmp_name'], $destino)) {
            throw new RuntimeException('No se pudo guardar uno de los archivos.');
        }

        $rutas[] = 'uploads/justificantes/' . $nombreFinal;
    }

    return $rutas;
}

function normalizarFilesArray(array $files): array
{
    if (!is_array($files['name'])) {
        return [$files];
    }

    $normalizados = [];
    foreach ($files['name'] as $i => $name) {
        $normalizados[] = [
            'name' => $name,
            'type' => $files['type'][$i] ?? '',
            'tmp_name' => $files['tmp_name'][$i] ?? '',
            'error' => $files['error'][$i] ?? UPLOAD_ERR_NO_FILE,
            'size' => $files['size'][$i] ?? 0,
        ];
    }
    return $normalizados;
}

function combinarArchivosJustificante($archivosPrevios, array $archivosNuevos): string
{
    $previos = array_filter(array_map('trim', explode(',', (string)$archivosPrevios)));
    return implode(', ', array_values(array_unique(array_merge($previos, $archivosNuevos))));
}
