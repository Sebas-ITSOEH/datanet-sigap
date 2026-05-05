<?php
require_once 'conexion.php';

class ModeloPrefectura {

    public static function mdlActualizarJustificante($id_solicitud, $estado) {
        $pdo = Conexion::conectar();
        $stmt = $pdo->prepare("UPDATE justificantes SET estado = :estado WHERE id_justificante = :id");
        $stmt->bindParam(":estado", $estado, PDO::PARAM_STR);
        $stmt->bindParam(":id", $id_solicitud, PDO::PARAM_INT);
        return $stmt->execute() ? "ok" : "error";
    }

    public static function mdlRegistrarValidacion($id_solicitud, $id_admin, $decision, $comentario) {
        $pdo = Conexion::conectar();
        $stmt = $pdo->prepare("INSERT INTO validaciones_justificantes (id_justificante, id_admin, decision, comentario) VALUES (:id_justificante, :id_admin, :decision, :comentario)");
        $stmt->bindParam(":id_justificante", $id_solicitud, PDO::PARAM_INT);
        $stmt->bindParam(":id_admin", $id_admin, PDO::PARAM_INT);
        $stmt->bindParam(":decision", $decision, PDO::PARAM_STR);
        $stmt->bindParam(":comentario", $comentario, PDO::PARAM_STR);
        return $stmt->execute() ? "ok" : "error";
    }

    public static function mdlListarSolicitudes() {
        $stmt = Conexion::conectar()->prepare("
            SELECT 
                j.id_justificante, j.fecha_inicio, j.fecha_fin, j.asunto, j.descripcion, 
                j.archivo_url, j.estado, j.fecha_solicitud,
                u.nombre AS alumno_nombre, u.apellido AS alumno_apellido, u.matricula_escolar,
                t.nombre AS tutor_nombre, t.apellido AS tutor_apellido, t.telefono AS tutor_telefono,
                (SELECT g.nombre FROM inscripciones i 
                 INNER JOIN cursos c ON i.id_curso = c.id_curso 
                 INNER JOIN grupos g ON c.id_grupo = g.id_grupo 
                 WHERE i.id_alumno = u.id_usuario LIMIT 1) AS grupo
            FROM justificantes j
            INNER JOIN usuarios u ON j.id_usuario = u.id_usuario
            LEFT JOIN usuarios t ON u.id_tutor = t.id_usuario
            ORDER BY j.fecha_solicitud DESC
        ");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function mdlListarPersonal() {
        $stmt = Conexion::conectar()->prepare("
            SELECT id_usuario, nombre, apellido, correo, rol, matricula_escolar, telefono, direccion, estado 
            FROM usuarios 
            WHERE rol IN ('alumno', 'docente')
            ORDER BY rol, apellido ASC
        ");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function mdlCrearUsuario($datos) {
        $pdo = Conexion::conectar();
        $stmt = $pdo->prepare("
            INSERT INTO usuarios (nombre, apellido, correo, password, rol, matricula_escolar, telefono) 
            VALUES (:nombre, :apellido, :correo, MD5(:password), :rol, :matricula, :telefono)");
        $stmt->bindParam(":nombre", $datos["nombre"], PDO::PARAM_STR);
        $stmt->bindParam(":apellido", $datos["apellido"], PDO::PARAM_STR);
        $stmt->bindParam(":correo", $datos["correo"], PDO::PARAM_STR);
        $stmt->bindParam(":password", $datos["password"], PDO::PARAM_STR);
        $stmt->bindParam(":rol", $datos["rol"], PDO::PARAM_STR);
        $stmt->bindParam(":matricula", $datos["matricula"], PDO::PARAM_STR);
        $stmt->bindParam(":telefono", $datos["telefono"], PDO::PARAM_STR);
        return $stmt->execute() ? "ok" : "error";
    }

    public static function mdlObtenerPrefecto($id_admin) {
        $stmt = Conexion::conectar()->prepare("SELECT nombre, apellido, correo FROM usuarios WHERE id_usuario = :id");
        $stmt->bindParam(":id", $id_admin, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public static function mdlActualizarPrefecto($id_admin, $nombre, $apellido, $correo) {
        $stmt = Conexion::conectar()->prepare("UPDATE usuarios SET nombre = :nombre, apellido = :apellido, correo = :correo WHERE id_usuario = :id");
        $stmt->bindParam(":nombre", $nombre, PDO::PARAM_STR);
        $stmt->bindParam(":apellido", $apellido, PDO::PARAM_STR);
        $stmt->bindParam(":correo", $correo, PDO::PARAM_STR);
        $stmt->bindParam(":id", $id_admin, PDO::PARAM_INT);
        return $stmt->execute() ? "ok" : "error";
    }
}
?>
