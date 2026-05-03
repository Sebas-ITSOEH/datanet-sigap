<?php

session_start();
header('Content-Type: application/json; charset=utf-8');

$accion = $_GET['accion'] ?? 'actual';

if ($accion === 'logout') {
    $_SESSION = [];
    session_destroy();
    echo json_encode(['ok' => true, 'mensaje' => 'Sesion cerrada.']);
    exit;
}

if (empty($_SESSION['usuario'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'mensaje' => 'No hay sesion activa.']);
    exit;
}

echo json_encode([
    'ok' => true,
    'usuario' => $_SESSION['usuario'],
]);
