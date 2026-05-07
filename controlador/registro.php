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
function validarRegistro(array $input)
{
    $errores = [];
    $rol = $input['rol'] ?? '';

    // 1. Obligatoriedad de campos básicos
    foreach (['nombre', 'apellido', 'correo', 'password', 'rol'] as $campo) {
        if (trim((string) ($input[$campo] ?? '')) === '') {
            $errores[] = "El campo {$campo} es obligatorio.";
        }
    }

    // 2. Validación de nombre (español: letras, acentos, ñ, espacios, apóstrofes, guiones)
    $nombre = trim($input['nombre'] ?? '');
    if ($nombre !== '' && !preg_match('/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s\'-]+$/u', $nombre)) {
        $errores[] = 'El nombre solo puede contener letras, espacios, apóstrofes o guiones.';
    }

    // 3. Validación de apellido (mismo patrón español)
    $apellido = trim($input['apellido'] ?? '');
    if ($apellido !== '' && !preg_match('/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s\'-]+$/u', $apellido)) {
        $errores[] = 'El apellido solo puede contener letras, espacios, apóstrofes o guiones.';
    }

    // 4. Correo: primero validación genérica, luego regex según dominio según rol
    $correo = strtolower(trim($input['correo'] ?? ''));
    if ($correo !== '' && !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        $errores[] = 'El correo del usuario no es válido.';
    } else {
        // Validación de dominio según rol, usando regex específicos de la BD
        if ($rol === 'alumno' && !preg_match('/^\d{8}@estudiantes\.edu\.mx$/', $correo)) {
            $errores[] = 'El correo del alumno debe ser matrícula (8 dígitos) @estudiantes.edu.mx';
        } elseif ($rol === 'docente' && !preg_match('/^[a-zA-Z]+\.[a-zA-Z]+@secundaria\.edu\.mx$/', $correo)) {
            $errores[] = 'El correo del docente debe tener formato nombre.apellido@secundaria.edu.mx';
        } elseif ($rol === 'padre' && !preg_match('/^[a-zA-Z]+\.[a-zA-Z]+@email\.mx$/', $correo)) {
            // Los padres no se registran directamente por este controlador (solo tutor), pero se incluye por si acaso
            $errores[] = 'El correo del padre debe tener formato nombre.apellido@email.mx';
        }
    }

    // 5. Rol válido
    if (!in_array($rol, ['alumno', 'docente'], true)) {
        $errores[] = 'El rol de registro no es válido.';
    }

    // 6. Contraseña segura (basado en datos de ejemplo: MD5, pero ahora con requisitos de complejidad)
    $password = (string) ($input['password'] ?? '');
    if (strlen($password) < 6) {
        $errores[] = 'La contraseña debe tener al menos 6 caracteres.';
    } elseif (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/', $password)) {
        // Mínimo 8 caracteres, al menos una mayúscula, una minúscula y un dígito
        $errores[] = 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.';
    }

    // 7. Teléfono (opcional, pero si se proporciona debe ser 10 dígitos)
    $telefono = trim($input['telefono'] ?? '');
    if ($telefono !== '' && !preg_match('/^\d{10}$/', $telefono)) {
        $errores[] = 'El teléfono debe tener 10 dígitos.';
    }

    // 8. Validaciones específicas para alumno
    if ($rol === 'alumno') {
        // Matrícula obligatoria y formato exacto: 8 dígitos
        $matricula = trim((string) ($input['matricula_escolar'] ?? ''));
        if ($matricula === '') {
            $errores[] = 'La matrícula escolar es obligatoria para alumnos.';
        } elseif (!preg_match('/^\d{8}$/', $matricula)) {
            // Coincide exactamente con 8 dígitos (20240001, etc.)
            $errores[] = 'La matrícula debe tener 8 dígitos.';
        }

        // Datos del tutor obligatorios
        $tutor = $input['tutor'] ?? [];
        foreach (['nombre', 'apellido', 'correo', 'telefono'] as $campo) {
            if (trim((string) ($tutor[$campo] ?? '')) === '') {
                $errores[] = "El campo {$campo} del tutor es obligatorio.";
            }
        }

        // Nombre y apellido del tutor con el mismo patrón español
        $tutorNombre = trim($tutor['nombre'] ?? '');
        if ($tutorNombre !== '' && !preg_match('/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s\'-]+$/u', $tutorNombre)) {
            $errores[] = 'El nombre del tutor solo puede contener letras y espacios.';
        }
        $tutorApellido = trim($tutor['apellido'] ?? '');
        if ($tutorApellido !== '' && !preg_match('/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s\'-]+$/u', $tutorApellido)) {
            $errores[] = 'El apellido del tutor solo puede contener letras y espacios.';
        }

        // Correo del tutor con el dominio que usan los padres: nombre.apellido@email.mx
        $tutorCorreo = strtolower(trim($tutor['correo'] ?? ''));
        if ($tutorCorreo !== '' && !preg_match('/^[a-zA-Z]+\.[a-zA-Z]+@email\.mx$/', $tutorCorreo)) {
            $errores[] = 'El correo del tutor debe tener el formato nombre.apellido@email.mx';
        }

        // Teléfono del tutor (10 dígitos)
        $tutorTelefono = trim($tutor['telefono'] ?? '');
        if ($tutorTelefono !== '' && !preg_match('/^\d{10}$/', $tutorTelefono)) {
            $errores[] = 'El teléfono del tutor debe tener 10 dígitos.';
        }
    }

    return $errores;
}
