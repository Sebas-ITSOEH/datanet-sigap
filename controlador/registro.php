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

function validarRegistro(array $input)
{
    $errores = [];
    $rol = $input['rol'] ?? '';

    foreach (['nombre', 'apellido', 'correo', 'password', 'rol'] as $campo) {
        if (trim((string) ($input[$campo] ?? '')) === '') {
            $errores[] = "El campo {$campo} es obligatorio.";
        }
    }

    if (!filter_var($input['correo'] ?? '', FILTER_VALIDATE_EMAIL)) {
        $errores[] = 'El correo del usuario no es valido.';
    }

    if (!in_array($rol, ['alumno', 'docente'], true)) {
        $errores[] = 'El rol de registro no es valido.';
    }

    if (strlen((string) ($input['password'] ?? '')) < 6) {
        $errores[] = 'La contrasena debe tener al menos 6 caracteres.';
    }

    if ($rol === 'alumno') {
        if (trim((string) ($input['matricula_escolar'] ?? '')) === '') {
            $errores[] = 'La matricula escolar es obligatoria para alumnos.';
        }

        $tutor = $input['tutor'] ?? [];
        foreach (['nombre', 'apellido', 'correo', 'telefono'] as $campo) {
            if (trim((string) ($tutor[$campo] ?? '')) === '') {
                $errores[] = "El campo {$campo} del tutor es obligatorio.";
            }
        }

        if (!filter_var($tutor['correo'] ?? '', FILTER_VALIDATE_EMAIL)) {
            $errores[] = 'El correo del tutor no es valido.';
        }
    }

    return $errores;
}
