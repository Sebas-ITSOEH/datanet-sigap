<?php

header('Content-Type: application/json; charset=utf-8');

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
if ($errores !== []) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'mensaje' => implode(' ', $errores)]);
    exit;
}

try {
    $modelo = new Usuario();
    $idUsuario = $modelo->registrar([
        'nombre' => trim($input['nombre']),
        'apellido' => trim($input['apellido']),
        'direccion' => trim($input['direccion'] ?? ''),
        'correo' => strtolower(trim($input['correo'])),
        'password' => (string) $input['password'],
        'rol' => $input['rol'],
        'matricula_escolar' => trim($input['matricula_escolar'] ?? ''),
        'telefono' => trim($input['telefono'] ?? ''),
        'tutor' => [
            'nombre' => trim($input['tutor']['nombre'] ?? ''),
            'apellido' => trim($input['tutor']['apellido'] ?? ''),
            'correo' => strtolower(trim($input['tutor']['correo'] ?? '')),
            'telefono' => trim($input['tutor']['telefono'] ?? ''),
            'password' => (string) ($input['tutor']['password'] ?? $input['password']),
        ],
    ]);

    http_response_code(201);
    echo json_encode([
        'ok' => true,
        'mensaje' => 'Registro creado correctamente.',
        'id_usuario' => $idUsuario,
    ]);
} catch (RuntimeException $e) {
    http_response_code(409);
    echo json_encode(['ok' => false, 'mensaje' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'mensaje' => 'Error de servidor: ' . $e->getMessage()]);
}

// ------------------------------------------------------------
// FUNCIÓN DE VALIDACIÓN CON EXPRESIONES REGULARES
// ------------------------------------------------------------
function validarRegistro(array $input): array
{
    $errores = [];

    $rol = trim($input['rol'] ?? '');

    // =========================================================
    // REGEX CENTRALIZADAS
    // =========================================================

    $regexNombre =
        '/^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)(\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*$/u';

    $regexAlumno =
        '/^\d{8}@secgralbj\.edu\.mx$/';

    $regexDocente =
        '/^[a-záéíóúñ]+\.[a-záéíóúñ]+@secgralbj\.edu\.mx$/u';

    $regexTelefono =
        '/^\d{10}$/';

    $regexMatricula =
        '/^\d{8}$/';

    $regexPassword =
        '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/';

    // =========================================================
    // CAMPOS OBLIGATORIOS
    // =========================================================

    foreach (
        [
            'nombre',
            'apellido',
            'direccion',
            'correo',
            'password',
            'rol'
        ] as $campo
    ) {

        if (trim((string)($input[$campo] ?? '')) === '') {
            $errores[] =
                "El campo {$campo} es obligatorio.";
        }
    }

    // =========================================================
    // VALIDACIÓN DE NOMBRE
    // =========================================================

    $nombre = trim($input['nombre'] ?? '');

    if (
        $nombre !== '' &&
        !preg_match($regexNombre, $nombre)
    ) {
        $errores[] =
            'El nombre debe iniciar con mayúscula y contener solo letras.';
    }

    // =========================================================
    // VALIDACIÓN DE APELLIDO
    // =========================================================

    $apellido = trim($input['apellido'] ?? '');

    if (
        $apellido !== '' &&
        !preg_match($regexNombre, $apellido)
    ) {
        $errores[] =
            'El apellido debe iniciar con mayúscula y contener solo letras.';
    }

    // =========================================================
    // VALIDACIÓN DE ROL
    // =========================================================

    if (!in_array($rol, ['alumno', 'docente'], true)) {
        $errores[] =
            'El rol especificado no es válido.';
    }

    // =========================================================
    // VALIDACIÓN DE CORREO
    // =========================================================

    $correo =
        strtolower(trim($input['correo'] ?? ''));

    if (
        $correo !== '' &&
        !filter_var($correo, FILTER_VALIDATE_EMAIL)
    ) {
        $errores[] =
            'El correo electrónico no es válido.';
    } else {

        if (
            $rol === 'alumno' &&
            !preg_match($regexAlumno, $correo)
        ) {

            $errores[] =
                'El correo del alumno debe tener formato matricula@secgralbj.edu.mx';
        }

        if (
            $rol === 'docente' &&
            !preg_match($regexDocente, $correo)
        ) {

            $errores[] =
                'El correo del docente debe tener formato nombre.apellido@secgralbj.edu.mx';
        }
    }

    // =========================================================
    // VALIDACIÓN DE CONTRASEÑA
    // =========================================================

    $password =
        (string)($input['password'] ?? '');

    if (
        !preg_match($regexPassword, $password)
    ) {

        $errores[] =
            'La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial.';
    }

    // =========================================================
    // TELÉFONO
    // =========================================================

    $telefono =
        trim($input['telefono'] ?? '');

    if (
        $telefono !== '' &&
        !preg_match($regexTelefono, $telefono)
    ) {

        $errores[] =
            'El teléfono debe contener exactamente 10 dígitos.';
    }

    // =========================================================
    // VALIDACIONES DE ALUMNO
    // =========================================================

    if ($rol === 'alumno') {

        // -----------------------------------------------------
        // MATRÍCULA
        // -----------------------------------------------------

        $matricula =
            trim($input['matricula_escolar'] ?? '');

        if ($matricula === '') {

            $errores[] =
                'La matrícula escolar es obligatoria.';
        } elseif (
            !preg_match($regexMatricula, $matricula)
        ) {

            $errores[] =
                'La matrícula debe contener exactamente 8 dígitos.';
        }

        // -----------------------------------------------------
        // TUTOR
        // -----------------------------------------------------

        $tutor =
            $input['tutor'] ?? [];

        foreach (
            [
                'nombre',
                'apellido',
                'correo',
                'telefono'
            ] as $campo
        ) {

            if (
                trim((string)($tutor[$campo] ?? '')) === ''
            ) {

                $errores[] =
                    "El campo {$campo} del tutor es obligatorio.";
            }
        }

        // -----------------------------------------------------
        // NOMBRE TUTOR
        // -----------------------------------------------------

        $tutorNombre =
            trim($tutor['nombre'] ?? '');

        if (
            $tutorNombre !== '' &&
            !preg_match($regexNombre, $tutorNombre)
        ) {

            $errores[] =
                'El nombre del tutor no es válido.';
        }

        // -----------------------------------------------------
        // APELLIDO TUTOR
        // -----------------------------------------------------

        $tutorApellido =
            trim($tutor['apellido'] ?? '');

        if (
            $tutorApellido !== '' &&
            !preg_match($regexNombre, $tutorApellido)
        ) {

            $errores[] =
                'El apellido del tutor no es válido.';
        }

        // -----------------------------------------------------
        // CORREO TUTOR
        // -----------------------------------------------------

        $tutorCorreo =
            strtolower(trim($tutor['correo'] ?? ''));

        if (
            $tutorCorreo !== '' &&
            !filter_var(
                $tutorCorreo,
                FILTER_VALIDATE_EMAIL
            )
        ) {

            $errores[] =
                'El correo del tutor no es válido.';
        }

        // -----------------------------------------------------
        // TELÉFONO TUTOR
        // -----------------------------------------------------

        $tutorTelefono =
            trim($tutor['telefono'] ?? '');

        if (
            $tutorTelefono !== '' &&
            !preg_match(
                $regexTelefono,
                $tutorTelefono
            )
        ) {

            $errores[] =
                'El teléfono del tutor debe tener exactamente 10 dígitos.';
        }
    }

    return $errores;
}
