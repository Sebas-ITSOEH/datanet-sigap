<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../modelo/prefecturaM.php';

try {
    echo json_encode([
        'ok' => true,
        'configuracion' => ModeloPrefectura::mdlObtenerConfiguracion()
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'mensaje' => 'No se pudo obtener la configuración del sistema.'
    ], JSON_UNESCAPED_UNICODE);
}
?>
