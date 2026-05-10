<?php
header('Content-Type: application/json; charset=utf-8');
error_reporting(0);

require_once __DIR__ . '/../modelo/usuario.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'mensaje' => 'Metodo no permitido.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'mensaje' => 'Solicitud invalida.']);
    exit;
}

$errores = validarRegistro($input);
if (!empty($errores)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'mensaje' => implode(' ', $errores)]);
    exit;
}

try {
    $modelo = new Usuario();
    $idUsuario = $modelo->registrar([
        'nombre'           => trim($input['nombre']),
        'apellido'         => trim($input['apellido']),
        'curp'             => strtoupper(trim($input['curp'] ?? '')),
        'correo'           => strtolower(trim($input['correo'])),
        'password'         => (string) $input['password'],
        'rol'              => $input['rol'],
        'matricula_escolar'=> trim($input['matricula_escolar'] ?? ''),
        'telefono'         => trim($input['telefono'] ?? ''),
        'clave_docente'    => trim($input['clave_docente'] ?? ''),
        'nss'              => trim($input['nss'] ?? ''),
        'rfc'              => strtoupper(trim($input['rfc'] ?? '')),
    ]);

    http_response_code(201);
    echo json_encode(['ok' => true, 'mensaje' => 'Registro creado correctamente.', 'id_usuario' => $idUsuario]);
} catch (RuntimeException $e) {
    http_response_code(409);
    echo json_encode(['ok' => false, 'mensaje' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'mensaje' => 'Error de servidor']);
}

function validarRegistro(array $input): array {
    $errores = [];
    $rol = trim($input['rol'] ?? '');
    
    $regexNombre   = '/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*$/u';
    $regexAlumno   = '/^\d{8}@secgralbj\.edu\.mx$/';
    $regexDocente  = '/^[a-záéíóúñ]+\.[a-záéíóúñ]+@secgralbj\.edu\.mx$/u';
    $regexTelefono = '/^\d{10}$/';
    $regexMatricula= '/^\d{8}$/';
    $regexPassword = '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,12}$/';
    $regexCURP     = '/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/';
    $regexNSS      = '/^\d{11}$/';
    $regexRFC      = '/^[A-Z]{4}\d{6}[A-Z0-9]{3}$/';

    foreach (['nombre', 'apellido', 'curp', 'correo', 'password', 'rol'] as $campo) {
        if (trim((string)($input[$campo] ?? '')) === '') {
            $errores[] = "El campo {$campo} es obligatorio.";
        }
    }

    $nombre = trim($input['nombre'] ?? '');
    if ($nombre !== '' && !preg_match($regexNombre, $nombre)) $errores[] = 'El nombre debe iniciar con mayúscula.';

    $apellido = trim($input['apellido'] ?? '');
    if ($apellido !== '' && !preg_match($regexNombre, $apellido)) $errores[] = 'El apellido debe iniciar con mayúscula.';

    $curp = strtoupper(trim($input['curp'] ?? ''));
    if ($curp !== '' && !preg_match($regexCURP, $curp)) $errores[] = 'La CURP no tiene un formato válido.';

    if (!in_array($rol, ['alumno', 'docente'], true)) $errores[] = 'El rol no es válido.';

    $correo = strtolower(trim($input['correo'] ?? ''));
    if ($correo !== '' && !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        $errores[] = 'El correo no es válido.';
    } elseif ($rol === 'alumno' && !preg_match($regexAlumno, $correo)) {
        $errores[] = 'El correo de alumno debe ser: matricula@secgralbj.edu.mx';
    } elseif ($rol === 'docente' && !preg_match($regexDocente, $correo)) {
        $errores[] = 'El correo de docente debe ser: nombre.apellido@secgralbj.edu.mx';
    }

    $password = (string)($input['password'] ?? '');
    if (!preg_match($regexPassword, $password)) $errores[] = 'La contraseña debe tener 8-12 caracteres, mayúscula, minúscula, número y especial.';

    if ($rol === 'alumno') {
        if (trim($input['matricula_escolar'] ?? '') === '') $errores[] = 'La matrícula escolar es obligatoria.';
        elseif (!preg_match($regexMatricula, trim($input['matricula_escolar'] ?? ''))) $errores[] = 'La matrícula debe tener 8 dígitos.';
        if (trim($input['telefono'] ?? '') === '') $errores[] = 'El teléfono del tutor es obligatorio.';
        elseif (!preg_match($regexTelefono, trim($input['telefono'] ?? ''))) $errores[] = 'El teléfono debe tener 10 dígitos.';
    }

    if ($rol === 'docente') {
        if (trim($input['clave_docente'] ?? '') === '') $errores[] = 'La clave docente es obligatoria.';
        if (trim($input['nss'] ?? '') === '') $errores[] = 'El NSS es obligatorio.';
        elseif (!preg_match($regexNSS, trim($input['nss'] ?? ''))) $errores[] = 'El NSS debe tener 11 dígitos.';
        if (trim($input['rfc'] ?? '') === '') $errores[] = 'El RFC es obligatorio.';
        elseif (!preg_match($regexRFC, strtoupper(trim($input['rfc'] ?? '')))) $errores[] = 'El RFC no es válido.';
    }

    return $errores;
}