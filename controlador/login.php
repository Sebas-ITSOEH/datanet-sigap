<?php

session_start();
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

$correo = trim($input['correo'] ?? '');
$password = (string) ($input['password'] ?? '');
$rol = trim($input['rol'] ?? '');

if ($correo === '' || $password === '' || $rol === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'mensaje' => 'Correo, contrasena y rol son obligatorios.']);
    exit;
}

try {
    $modelo = new Usuario();
    $usuario = $modelo->autenticar($correo, $password, $rol);

    if ($usuario === null) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'mensaje' => 'Credenciales incorrectas o usuario inactivo.']);
        exit;
    }

    $_SESSION['usuario'] = $usuario;

    $redirects = [
        'docente' => 'vista/indexDocente.html',
        'admin' => 'vista/indexPrefectura.html',
        'alumno' => 'vista/indexAlumno.html',
        'padre' => 'vista/indexAlumno.html',
    ];

    echo json_encode([
        'ok' => true,
        'mensaje' => 'Inicio de sesion correcto.',
        'usuario' => $usuario,
        'redirect' => $redirects[$usuario['rol']] ?? 'index.html',
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'mensaje' => 'Error de servidor: ' . $e->getMessage()]);
}
