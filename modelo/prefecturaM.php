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

    private static function extraerMetadataJustificante($descripcion) {
        if (preg_match('/<!--METADATA:(.*?):METADATA-->/s', $descripcion ?? '', $matches)) {
            $metadata = json_decode($matches[1], true);
            return is_array($metadata) ? $metadata : [];
        }
        return [];
    }

    private static function limpiarDescripcionJustificante($descripcion) {
        return trim(preg_replace('/\s*<!--METADATA:.*?:METADATA-->/s', '', $descripcion ?? ''));
    }

    private static function obtenerRangoTrimestre($trimestre, $anio = null) {
        $trimestre = max(1, min(3, (int)$trimestre));
        $config = self::mdlObtenerConfiguracion();

        $inicio = $config["trim{$trimestre}_inicio"] ?? null;
        $fin = $config["trim{$trimestre}_fin"] ?? null;

        if ($inicio && $fin) {
            return [$inicio, $fin];
        }

        $anio = (int)($anio ?: date('Y'));
        $anioAnterior = $anio - 1;
        switch ($trimestre) {
            case 1: return ["$anioAnterior-08-01", "$anioAnterior-11-30"];
            case 2: return ["$anioAnterior-12-01", "$anio-03-31"];
            default: return ["$anio-04-01", "$anio-07-31"];
        }
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
            'No registrado' AS tutor_nombre,
            '' AS tutor_apellido,
            u.telefono AS tutor_telefono,
            COALESCE(ga.grupo, 'Sin grupo') AS grupo
        FROM justificantes j
        INNER JOIN usuarios u ON j.id_usuario = u.id_usuario
        LEFT JOIN (
            SELECT x.id_alumno, SUBSTRING_INDEX(GROUP_CONCAT(x.nombre ORDER BY x.total DESC, x.nombre ASC SEPARATOR ','), ',', 1) AS grupo
            FROM (
                SELECT i.id_alumno, g.nombre, COUNT(*) AS total
                FROM inscripciones i
                INNER JOIN cursos c ON i.id_curso = c.id_curso
                INNER JOIN grupos g ON c.id_grupo = g.id_grupo
                GROUP BY i.id_alumno, g.nombre
            ) x
            GROUP BY x.id_alumno
        ) ga ON ga.id_alumno = u.id_usuario
        WHERE 1=1
    ";
    
    if ($grupo !== 'todos' && $grupo !== '') {
        $sql .= " AND ga.grupo = :grupo";
    }
    
    $sql .= " ORDER BY j.fecha_solicitud DESC";
    
    $stmt = $pdo->prepare($sql);
    if ($grupo !== 'todos' && $grupo !== '') {
        $stmt->bindParam(":grupo", $grupo, PDO::PARAM_STR);
    }
    $stmt->execute();
    $solicitudes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Consulta para obtener el horario del alumno
    $sqlMaterias = "
        SELECT 
            a.nombre AS materia,
            CONCAT(doc.nombre, ' ', doc.apellido) AS docente,
            DATE_FORMAT(hc.hora_inicio, '%H:%i') AS hora_inicio_fmt,
            DATE_FORMAT(hc.hora_fin, '%H:%i') AS hora_fin_fmt,
            hc.dia_semana,
            CASE
                WHEN LOWER(hc.dia_semana) LIKE 'lunes%' THEN 1
                WHEN LOWER(hc.dia_semana) LIKE 'martes%' THEN 2
                WHEN LOWER(hc.dia_semana) LIKE 'mi%' THEN 3
                WHEN LOWER(hc.dia_semana) LIKE 'jueves%' THEN 4
                WHEN LOWER(hc.dia_semana) LIKE 'viernes%' THEN 5
                WHEN LOWER(hc.dia_semana) LIKE 's%' THEN 6
                WHEN LOWER(hc.dia_semana) LIKE 'domingo%' THEN 0
                ELSE NULL
            END AS num_dia
        FROM inscripciones i
        INNER JOIN cursos c ON i.id_curso = c.id_curso
        INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
        INNER JOIN usuarios doc ON c.id_docente = doc.id_usuario
        INNER JOIN horarios_cursos hc ON c.id_curso = hc.id_curso
        WHERE i.id_alumno = :id_alumno
        ORDER BY num_dia, hc.hora_inicio
    ";
    $stmtMat = $pdo->prepare($sqlMaterias);

    // Cruzamos los días del justificante con el horario
    foreach ($solicitudes as &$sol) {
        $id_alumno = (int)$sol['id_usuario'];
        $metadata = self::extraerMetadataJustificante($sol['descripcion'] ?? '');
        $materiasSeleccionadas = $metadata['materias'] ?? [];
        $tipoJustificacion = $metadata['tipo'] ?? '';

        $sol['descripcion'] = self::limpiarDescripcionJustificante($sol['descripcion'] ?? '');
        $sol['tipo_justificacion'] = $tipoJustificacion;

        $fecha_inicio = strtotime($sol['fecha_inicio']);
        $fecha_fin = strtotime($sol['fecha_fin']);
        
        $diasAfectados = [];
        for ($current = $fecha_inicio; $current <= $fecha_fin; $current = strtotime('+1 day', $current)) {
            $diasAfectados[] = (int)date('w', $current);
        }
        $diasAfectados = array_values(array_unique($diasAfectados));

        $stmtMat->bindValue(":id_alumno", $id_alumno, PDO::PARAM_INT);
        $stmtMat->execute();
        $horarios = $stmtMat->fetchAll(PDO::FETCH_ASSOC);

        $materiasAfectadas = [];
        foreach ($horarios as $hor) {
            if ($hor['num_dia'] !== null && in_array((int)$hor['num_dia'], $diasAfectados, true)) {
                if ($tipoJustificacion === 'materias' && !empty($materiasSeleccionadas) && !in_array($hor['materia'], $materiasSeleccionadas, true)) {
                    continue;
                }
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
            // Se añaden subconsultas para contar el total de registros y el total de presencias/retardos
            $sql = "
                SELECT 
                    u.id_usuario, u.nombre, u.apellido, u.correo, u.rol, 
                    u.matricula_escolar, u.telefono, u.curp, u.estado,
                    COALESCE(ga.grupo, 'Sin grupo') AS grupo,
                    (SELECT COUNT(*) FROM asistencias a WHERE a.id_usuario = u.id_usuario) AS total_registros,
                    (SELECT COUNT(*) FROM asistencias a WHERE a.id_usuario = u.id_usuario AND a.estado_final IN ('presente', 'retardo')) AS total_asistencias
                FROM usuarios u
                LEFT JOIN (
                    SELECT x.id_alumno, SUBSTRING_INDEX(GROUP_CONCAT(x.nombre ORDER BY x.total DESC, x.nombre ASC SEPARATOR ','), ',', 1) AS grupo
                    FROM (
                        SELECT i.id_alumno, g.nombre, COUNT(*) AS total
                        FROM inscripciones i
                        INNER JOIN cursos c ON i.id_curso = c.id_curso
                        INNER JOIN grupos g ON c.id_grupo = g.id_grupo
                        GROUP BY i.id_alumno, g.nombre
                    ) x
                    GROUP BY x.id_alumno
                ) ga ON ga.id_alumno = u.id_usuario
                WHERE u.rol = 'alumno'
            ";
            
            if ($grupo !== 'todos' && $grupo !== '') {
                $sql .= " AND ga.grupo = :grupo";
            }
            
            $sql .= " ORDER BY ga.grupo, u.apellido ASC";
            
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

    // ============================================================
    // GESTIÓN DE GRUPOS
    // ============================================================
    public static function mdlListarGrupos() {
        // Modificado para que traiga TODOS los grupos, incluso los vacíos
        $stmt = Conexion::conectar()->prepare("SELECT id_grupo, nombre FROM grupos ORDER BY nombre ASC");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function mdlCrearGrupo($nombre) {
        $pdo = Conexion::conectar();
        // Verificar si ya existe
        $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM grupos WHERE nombre = :nombre");
        $stmtCheck->bindParam(":nombre", $nombre, PDO::PARAM_STR);
        $stmtCheck->execute();
        if($stmtCheck->fetchColumn() > 0) {
            return "existe";
        }
        
        $stmt = $pdo->prepare("INSERT INTO grupos (nombre) VALUES (:nombre)");
        $stmt->bindParam(":nombre", $nombre, PDO::PARAM_STR);
        return $stmt->execute() ? "ok" : "error";
    }

    public static function mdlEliminarGrupo($id_grupo) {
        $pdo = Conexion::conectar();
        try {
            $stmt = $pdo->prepare("DELETE FROM grupos WHERE id_grupo = :id_grupo");
            $stmt->bindParam(":id_grupo", $id_grupo, PDO::PARAM_INT);
            return $stmt->execute() ? "ok" : "error";
        } catch (PDOException $e) {
            // El código 23000 indica violación de llave foránea (el grupo tiene alumnos o materias)
            if ($e->getCode() == '23000') {
                return "en_uso";
            }
            return "error";
        }
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
        // Se agregó "rol" a la consulta SELECT
        $stmt = Conexion::conectar()->prepare("SELECT nombre, apellido, correo, rol FROM usuarios WHERE id_usuario = :id");
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

    // ============================================================
    // OBTENER ESTADÍSTICAS DE ASISTENCIA POR GRUPO
    // ============================================================
    public static function mdlObtenerEstadisticasGrupos($trimestre, $anio) {
        $pdo = Conexion::conectar();
        $trimestre = max(1, min(3, (int)$trimestre));
        $stmt = $pdo->prepare("CALL rpt_asistencia_por_grupo_trimestral(:trimestre, :anio)");
        $stmt->bindParam(":trimestre", $trimestre, PDO::PARAM_INT);
        $stmt->bindParam(":anio", $anio, PDO::PARAM_INT);
        $stmt->execute();
        $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stmt->closeCursor();
        return $datos;
    }

    // ============================================================
    // OBTENER ASISTENCIA DETALLADA PARA EXPORTACIÓN
    // ============================================================
    public static function mdlObtenerAsistenciaSemanal($id_grupo, $materia, $fecha_inicio, $fecha_fin) {
        $pdo = Conexion::conectar();
        
        // 1. Obtener lista de alumnos y sus asistencias en el rango
        $sql = "
            SELECT 
                u.id_usuario,
                CONCAT(u.nombre, ' ', u.apellido) AS alumno,
                s.fecha,
                a.estado_final
            FROM usuarios u
            INNER JOIN inscripciones i ON u.id_usuario = i.id_alumno
            INNER JOIN cursos c ON i.id_curso = c.id_curso
            INNER JOIN asignaturas asig ON c.id_asignatura = asig.id_asignatura
            INNER JOIN grupos g ON c.id_grupo = g.id_grupo
            LEFT JOIN sesiones s ON c.id_curso = s.id_curso AND s.fecha BETWEEN :f_inicio AND :f_fin
            LEFT JOIN asistencias a ON s.id_sesion = a.id_sesion AND u.id_usuario = a.id_usuario
            WHERE g.nombre = :grupo 
              AND asig.nombre = :materia
            ORDER BY u.apellido ASC, s.fecha ASC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(":grupo", $id_grupo, PDO::PARAM_STR);
        $stmt->bindParam(":materia", $materia, PDO::PARAM_STR);
        $stmt->bindParam(":f_inicio", $fecha_inicio, PDO::PARAM_STR);
        $stmt->bindParam(":f_fin", $fecha_fin, PDO::PARAM_STR);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ============================================================
    // OBTENER ASIGNATURAS PARA LOS FILTROS
    // ============================================================
    public static function mdlListarAsignaturas() {
        $stmt = Conexion::conectar()->prepare("SELECT id_asignatura, nombre FROM asignaturas ORDER BY nombre ASC");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ============================================================
    // OBTENER HISTORIAL DETALLADO DEL EXPEDIENTE DE UN ALUMNO
    // ============================================================
    public static function mdlObtenerExpedienteAlumno($matricula, $fecha_inicio = null, $fecha_fin = null, $materia = null) {
        $pdo = Conexion::conectar();
        $sql = "
            SELECT 
                DATE_FORMAT(s.fecha, '%d/%m/%Y') AS fecha_fmt,
                asig.nombre AS materia,
                DATE_FORMAT(s.hora_inicio, '%H:%i') as hora,
                a.estado_final
            FROM asistencias a
            INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
            INNER JOIN cursos c ON s.id_curso = c.id_curso
            INNER JOIN asignaturas asig ON c.id_asignatura = asig.id_asignatura
            INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
            WHERE u.matricula_escolar = :matricula
        ";
        
        if (!empty($fecha_inicio) && !empty($fecha_fin)) {
            $sql .= " AND s.fecha BETWEEN :fecha_inicio AND :fecha_fin";
        }
        
        // Se añade condición de materia si no está vacía
        if (!empty($materia)) {
            $sql .= " AND asig.nombre = :materia";
        }
        
        $sql .= " ORDER BY s.fecha DESC, s.hora_inicio DESC LIMIT 100";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(":matricula", $matricula, PDO::PARAM_STR);
        
        if (!empty($fecha_inicio) && !empty($fecha_fin)) {
            $stmt->bindParam(":fecha_inicio", $fecha_inicio, PDO::PARAM_STR);
            $stmt->bindParam(":fecha_fin", $fecha_fin, PDO::PARAM_STR);
        }

        if (!empty($materia)) {
            $stmt->bindParam(":materia", $materia, PDO::PARAM_STR);
        }
        
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ============================================================
    // OBTENER HORARIO DE UN DOCENTE
    // ============================================================
    public static function mdlObtenerHorarioDocente($id_docente) {
        $pdo = Conexion::conectar();
        $sql = "
            SELECT 
                a.nombre AS asignatura,
                g.nombre AS grupo,
                hc.dia_semana,
                DATE_FORMAT(hc.hora_inicio, '%H:%i') AS hora_inicio,
                DATE_FORMAT(hc.hora_fin, '%H:%i') AS hora_fin
            FROM cursos c
            INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
            INNER JOIN grupos g ON c.id_grupo = g.id_grupo
            INNER JOIN horarios_cursos hc ON c.id_curso = hc.id_curso
            WHERE c.id_docente = :id_docente
            ORDER BY 
                CASE 
                    WHEN LOWER(hc.dia_semana) LIKE 'lunes%' THEN 1
                    WHEN LOWER(hc.dia_semana) LIKE 'martes%' THEN 2
                    WHEN LOWER(hc.dia_semana) LIKE 'mi%' THEN 3
                    WHEN LOWER(hc.dia_semana) LIKE 'jueves%' THEN 4
                    WHEN LOWER(hc.dia_semana) LIKE 'viernes%' THEN 5
                    ELSE 6
                END, hc.hora_inicio
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(":id_docente", $id_docente, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ============================================================
    // OBTENER ALUMNOS EN RIESGO POR GRUPO Y TRIMESTRE
    // ============================================================
    public static function mdlObtenerRiesgoPorGrupo($trimestre, $anio, $grupo) {
        $pdo = Conexion::conectar();
        
        [$fecha_inicio, $fecha_fin] = self::obtenerRangoTrimestre($trimestre, $anio);

        $sql = "
            SELECT 
                u.matricula_escolar,
                CONCAT(u.nombre, ' ', u.apellido) AS alumno,
                u.telefono AS telefono_tutor,
                SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) AS total_faltas,
                ROUND(SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id_asistencia) * 100, 2) AS pct_asistencia
            FROM asistencias a
            INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
            INNER JOIN cursos c ON s.id_curso = c.id_curso
            INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
            INNER JOIN grupos g ON c.id_grupo = g.id_grupo
            WHERE s.fecha BETWEEN :f_inicio AND :f_fin
            AND u.rol = 'alumno'
            AND g.nombre = :grupo
            GROUP BY u.id_usuario, u.nombre, u.apellido, u.matricula_escolar, u.telefono
            HAVING pct_asistencia < 85 -- Filtramos solo los que tienen menos de 85% de asistencia
            ORDER BY total_faltas DESC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(":f_inicio", $fecha_inicio, PDO::PARAM_STR);
        $stmt->bindParam(":f_fin", $fecha_fin, PDO::PARAM_STR);
        $stmt->bindParam(":grupo", $grupo, PDO::PARAM_STR);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ============================================================
    // CONFIGURACIÓN DEL SISTEMA
    // ============================================================
    private static function configuracionPorDefecto() {
        return [
            'id' => 1,
            'limite_justificacion_dias' => 3,
            'ciclo_activo' => '2025-2026',
            'trim1_inicio' => '2025-08-28',
            'trim1_fin' => '2025-11-20',
            'trim2_inicio' => '2025-11-21',
            'trim2_fin' => '2026-03-10',
            'trim3_inicio' => '2026-03-11',
            'trim3_fin' => '2026-07-15',
            'nombre_director' => 'Prof. Gustavo Eleazar Viveros Niño'
        ];
    }

    public static function mdlObtenerConfiguracion() {
        try {
            $stmt = Conexion::conectar()->prepare("SELECT * FROM configuracion_sistema WHERE id = 1");
            $stmt->execute();
            $config = $stmt->fetch(PDO::FETCH_ASSOC);
            return $config ?: self::configuracionPorDefecto();
        } catch (PDOException $e) {
            return self::configuracionPorDefecto();
        }
    }

    public static function mdlActualizarConfiguracion($datos) {
        $pdo = Conexion::conectar();
        $config = array_merge(self::configuracionPorDefecto(), is_array($datos) ? $datos : []);
        $stmt = $pdo->prepare("INSERT INTO configuracion_sistema (
                id,
                limite_justificacion_dias,
                ciclo_activo,
                trim1_inicio,
                trim1_fin,
                trim2_inicio,
                trim2_fin,
                trim3_inicio,
                trim3_fin,
                nombre_director
            ) VALUES (
                1,
                :limite,
                :ciclo,
                :t1_ini,
                :t1_fin,
                :t2_ini,
                :t2_fin,
                :t3_ini,
                :t3_fin,
                :director
            )
            ON DUPLICATE KEY UPDATE
                limite_justificacion_dias = VALUES(limite_justificacion_dias),
                ciclo_activo = VALUES(ciclo_activo),
                trim1_inicio = VALUES(trim1_inicio),
                trim1_fin = VALUES(trim1_fin),
                trim2_inicio = VALUES(trim2_inicio),
                trim2_fin = VALUES(trim2_fin),
                trim3_inicio = VALUES(trim3_inicio),
                trim3_fin = VALUES(trim3_fin),
                nombre_director = VALUES(nombre_director)");
        
        $limite = (int)($config['limite_dias'] ?? $config['limite_justificacion_dias']);
        $stmt->bindParam(":limite", $limite, PDO::PARAM_INT);
        $stmt->bindParam(":ciclo", $config['ciclo_activo'], PDO::PARAM_STR);
        $stmt->bindParam(":t1_ini", $config['trim1_inicio'], PDO::PARAM_STR);
        $stmt->bindParam(":t1_fin", $config['trim1_fin'], PDO::PARAM_STR);
        $stmt->bindParam(":t2_ini", $config['trim2_inicio'], PDO::PARAM_STR);
        $stmt->bindParam(":t2_fin", $config['trim2_fin'], PDO::PARAM_STR);
        $stmt->bindParam(":t3_ini", $config['trim3_inicio'], PDO::PARAM_STR);
        $stmt->bindParam(":t3_fin", $config['trim3_fin'], PDO::PARAM_STR);
        $stmt->bindParam(":director", $config['nombre_director'], PDO::PARAM_STR);
        
        return $stmt->execute() ? "ok" : "error";
    }
}
?>
