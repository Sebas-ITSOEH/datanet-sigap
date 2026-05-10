<?php
require_once __DIR__ . '/conexion.php';

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

    // ============================================================
    // LISTAR SOLICITUDES CON CRUCE DE MATERIAS AFECTADAS
    // ============================================================
    public static function mdlListarSolicitudes($grupo = 'todos') {
        $pdo = Conexion::conectar();
        
        $sql = "
            SELECT 
                j.id_justificante, j.id_usuario, j.fecha_inicio, j.fecha_fin, j.asunto, j.descripcion, 
                j.archivo_url, j.estado, j.fecha_solicitud,
                u.nombre AS alumno_nombre, u.apellido AS alumno_apellido, u.matricula_escolar,
                u.telefono AS telefono_tutor,
                COALESCE(g.nombre, 'Sin grupo') AS grupo
            FROM justificantes j
            INNER JOIN usuarios u ON j.id_usuario = u.id_usuario
            LEFT JOIN inscripciones i ON u.id_usuario = i.id_alumno
            LEFT JOIN cursos c ON i.id_curso = c.id_curso
            LEFT JOIN grupos g ON c.id_grupo = g.id_grupo
            WHERE 1=1
        ";
        
        if ($grupo !== 'todos' && $grupo !== '') {
            $sql .= " AND g.nombre = :grupo";
        }
        
        $sql .= " GROUP BY j.id_justificante, j.id_usuario, j.fecha_inicio, j.fecha_fin, j.asunto, j.descripcion, j.archivo_url, j.estado, j.fecha_solicitud, u.nombre, u.apellido, u.matricula_escolar, u.telefono, g.nombre ORDER BY j.fecha_solicitud DESC";
        
        $stmt = $pdo->prepare($sql);
        if ($grupo !== 'todos' && $grupo !== '') {
            $stmt->bindParam(":grupo", $grupo, PDO::PARAM_STR);
        }
        $stmt->execute();
        $solicitudes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Preparamos la consulta para obtener el horario del alumno
        $sqlMaterias = "
            SELECT 
                a.nombre AS materia,
                CONCAT(doc.nombre, ' ', doc.apellido) AS docente,
                DATE_FORMAT(hc.hora_inicio, '%H:%i') AS hora_inicio_fmt,
                DATE_FORMAT(hc.hora_fin, '%H:%i') AS hora_fin_fmt,
                hc.dia_semana
            FROM inscripciones i
            INNER JOIN cursos c ON i.id_curso = c.id_curso
            INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
            INNER JOIN usuarios doc ON c.id_docente = doc.id_usuario
            INNER JOIN horarios_cursos hc ON c.id_curso = hc.id_curso
            WHERE i.id_alumno = :id_alumno
            ORDER BY FIELD(hc.dia_semana, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'), hc.hora_inicio
        ";
        $stmtMat = $pdo->prepare($sqlMaterias);

        $diasSemanaEspanol = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        // Cruzamos los días del justificante con el horario
        foreach ($solicitudes as &$sol) {
            $id_alumno = $sol['id_usuario'];
            $fecha_inicio = strtotime($sol['fecha_inicio']);
            $fecha_fin = strtotime($sol['fecha_fin']);
            
            $diasAfectados = [];
            for ($current = $fecha_inicio; $current <= $fecha_fin; $current = strtotime('+1 day', $current)) {
                $numDia = date('w', $current);
                if (!in_array($diasSemanaEspanol[$numDia], $diasAfectados)) {
                    $diasAfectados[] = $diasSemanaEspanol[$numDia];
                }
            }

            $stmtMat->bindParam(":id_alumno", $id_alumno, PDO::PARAM_INT);
            $stmtMat->execute();
            $horarios = $stmtMat->fetchAll(PDO::FETCH_ASSOC);

            $materiasAfectadas = [];
            foreach ($horarios as $hor) {
                if (in_array($hor['dia_semana'], $diasAfectados)) {
                    $diaCorto = mb_substr($hor['dia_semana'], 0, 3, 'UTF-8');
                    $materiasAfectadas[] = [
                        'materia' => $hor['materia'],
                        'docente' => $hor['docente'],
                        'hora' => $diaCorto . ' ' . $hor['hora_inicio_fmt'] . ' - ' . $hor['hora_fin_fmt']
                    ];
                }
            }
            
            $sol['materias_afectadas_json'] = json_encode($materiasAfectadas, JSON_UNESCAPED_UNICODE);
        }
        unset($sol); 

        return $solicitudes;
    }

    public static function mdlListarPersonal($rol = 'alumno', $grupo = 'todos') {
        if ($rol === 'alumno') {
            $sql = "
                SELECT 
                    u.id_usuario, u.nombre, u.apellido, u.correo, u.rol, 
                    u.matricula_escolar, u.telefono, u.curp, u.estado,
                    COALESCE(g.nombre, 'Sin grupo') AS grupo
                FROM usuarios u
                LEFT JOIN inscripciones i ON u.id_usuario = i.id_alumno
                LEFT JOIN cursos c ON i.id_curso = c.id_curso
                LEFT JOIN grupos g ON c.id_grupo = g.id_grupo
                WHERE u.rol = 'alumno'
            ";
            
            if ($grupo !== 'todos' && $grupo !== '') {
                $sql .= " AND g.nombre = :grupo";
            }
            
            $sql .= " GROUP BY u.id_usuario, u.nombre, u.apellido, u.correo, u.rol, u.matricula_escolar, u.telefono, u.curp, u.estado, g.nombre ORDER BY g.nombre, u.apellido ASC";
            
            $stmt = Conexion::conectar()->prepare($sql);
            if ($grupo !== 'todos' && $grupo !== '') {
                $stmt->bindParam(":grupo", $grupo, PDO::PARAM_STR);
            }
        } else {
            $sql = "SELECT id_usuario, nombre, apellido, correo, rol, clave_docente, telefono, curp, estado FROM usuarios WHERE rol = 'docente' ORDER BY apellido ASC";
            $stmt = Conexion::conectar()->prepare($sql);
        }
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function mdlListarGrupos() {
        $stmt = Conexion::conectar()->prepare("SELECT DISTINCT g.id_grupo, g.nombre FROM grupos g INNER JOIN cursos c ON g.id_grupo = c.id_grupo INNER JOIN inscripciones i ON c.id_curso = i.id_curso ORDER BY g.nombre");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function mdlCrearUsuario($datos) {
        $pdo = Conexion::conectar();
        $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, apellido, correo, password, rol, matricula_escolar, telefono) VALUES (:nombre, :apellido, :correo, SHA2(:password, 256), :rol, :matricula, :telefono)");
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