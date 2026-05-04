<?php

require_once __DIR__ . '/conexion.php';

class Prefecto
{
    private $db;

    public function __construct()
    {
        $this->db = Conexion::conectar();
        $this->asegurarTablasAuxiliares();
    }

    // ==========================================
    // PERFIL
    // ==========================================
    public function obtenerPerfil($idPrefecto)
    {
        $stmt = $this->db->prepare(
            'SELECT id_usuario, nombre, apellido, correo, rol, telefono, direccion
             FROM usuarios
             WHERE id_usuario = :id AND (rol = "admin" OR rol = "prefecto") AND estado = TRUE
             LIMIT 1'
        );
        $stmt->execute([':id' => $idPrefecto]);
        return $stmt->fetch();
    }

    // ==========================================
    // JUSTIFICANTES PENDIENTES
    // ==========================================
    public function listarJustificantesPendientes()
    {
        // Obtenemos el grupo del alumno a partir de inscripciones (puede tener varios, tomamos uno representativo)
        $sql = "SELECT 
                    j.id_justificante, 
                    j.asunto, 
                    j.descripcion, 
                    j.fecha_inicio, 
                    j.fecha_fin, 
                    j.fecha_solicitud,
                    j.estado,
                    u.id_usuario AS id_alumno,
                    CONCAT(u.nombre, ' ', u.apellido) AS alumno,
                    u.matricula_escolar,
                    tut.id_usuario AS id_tutor,
                    CONCAT(tut.nombre, ' ', tut.apellido) AS tutor,
                    tut.telefono AS telefono_tutor,
                    (SELECT g.nombre FROM inscripciones i 
                     JOIN cursos c ON i.id_curso = c.id_curso 
                     JOIN grupos g ON c.id_grupo = g.id_grupo 
                     WHERE i.id_alumno = u.id_usuario 
                     ORDER BY i.id_inscripcion LIMIT 1) AS grupo
                FROM justificantes j
                INNER JOIN usuarios u ON j.id_usuario = u.id_usuario
                LEFT JOIN usuarios tut ON u.id_tutor = tut.id_usuario
                WHERE j.estado = 'pendiente'
                ORDER BY j.fecha_solicitud ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    // ==========================================
    // HISTORIAL DE JUSTIFICANTES (aprobados/rechazados)
    // ==========================================
    public function listarHistorialJustificantes()
    {
        $sql = "SELECT 
                    j.id_justificante, 
                    j.asunto, 
                    j.estado, 
                    j.fecha_inicio, 
                    j.fecha_fin, 
                    j.fecha_solicitud,
                    u.id_usuario AS id_alumno,
                    CONCAT(u.nombre, ' ', u.apellido) AS alumno,
                    u.matricula_escolar,
                    tut.id_usuario AS id_tutor,
                    CONCAT(tut.nombre, ' ', tut.apellido) AS tutor,
                    tut.telefono AS telefono_tutor,
                    (SELECT g.nombre FROM inscripciones i 
                     JOIN cursos c ON i.id_curso = c.id_curso 
                     JOIN grupos g ON c.id_grupo = g.id_grupo 
                     WHERE i.id_alumno = u.id_usuario 
                     ORDER BY i.id_inscripcion LIMIT 1) AS grupo,
                    vj.decision AS decision_admin,
                    CONCAT(adm.nombre, ' ', adm.apellido) AS resuelto_por
                FROM justificantes j
                INNER JOIN usuarios u ON j.id_usuario = u.id_usuario
                LEFT JOIN usuarios tut ON u.id_tutor = tut.id_usuario
                LEFT JOIN validaciones_justificantes vj ON j.id_justificante = vj.id_justificante
                LEFT JOIN usuarios adm ON vj.id_admin = adm.id_usuario
                WHERE j.estado IN ('aprobado', 'rechazado')
                ORDER BY j.fecha_solicitud DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function responderJustificante($idJustificante, $estado, $idAdmin)
    {
        $stmt = $this->db->prepare(
            'UPDATE justificantes SET estado = :estado WHERE id_justificante = :id_justificante'
        );
        $stmt->execute([
            ':estado' => $estado,
            ':id_justificante' => $idJustificante
        ]);

        $stmt = $this->db->prepare(
            'INSERT INTO validaciones_justificantes (id_justificante, id_admin, decision, comentario)
             VALUES (:id_justificante, :id_admin, :decision, :comentario)'
        );
        $stmt->execute([
            ':id_justificante' => $idJustificante,
            ':id_admin' => $idAdmin,
            ':decision' => $estado,
            ':comentario' => 'Respuesta de prefectura'
        ]);

        return ['mensaje' => 'Justificante actualizado'];
    }

    // ==========================================
    // PERSONAL: ALUMNOS Y DOCENTES
    // ==========================================
    public function listarAlumnos($grupoFiltro = 'all')
    {
        $subQueryGrupo = "(SELECT g.nombre FROM inscripciones i 
                           JOIN cursos c ON i.id_curso = c.id_curso 
                           JOIN grupos g ON c.id_grupo = g.id_grupo 
                           WHERE i.id_alumno = u.id_usuario 
                           ORDER BY i.id_inscripcion LIMIT 1)";

        $query = "SELECT u.id_usuario, 
                         CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo,
                         u.matricula_escolar, 
                         u.correo, 
                         u.telefono,
                         u.direccion,
                         $subQueryGrupo AS grupo,
                         tut.id_usuario AS id_tutor,
                         CONCAT(tut.nombre, ' ', tut.apellido) AS tutor,
                         tut.telefono AS telefono_tutor,
                         CASE WHEN COUNT(CASE WHEN a.estado_final = 'falta' THEN 1 END) > 3 THEN 'riesgo' ELSE 'regular' END AS estado
                  FROM usuarios u
                  LEFT JOIN usuarios tut ON u.id_tutor = tut.id_usuario
                  LEFT JOIN asistencias a ON u.id_usuario = a.id_usuario
                  WHERE u.rol = 'alumno' AND u.estado = TRUE";

        if ($grupoFiltro !== 'all') {
            $query .= " HAVING grupo = :grupo";
        }

        $query .= " GROUP BY u.id_usuario ORDER BY u.apellido, u.nombre";

        $stmt = $this->db->prepare($query);
        $params = [];
        if ($grupoFiltro !== 'all') {
            $params[':grupo'] = $grupoFiltro;
        }
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function listarDocentes()
    {
        $stmt = $this->db->prepare(
            "SELECT id_usuario, 
                    CONCAT(nombre, ' ', apellido) AS nombre_completo, 
                    correo, 
                    telefono,
                    'activo' AS estado
             FROM usuarios
             WHERE rol = 'docente' AND estado = TRUE
             ORDER BY apellido, nombre"
        );
        $stmt->execute();
        return $stmt->fetchAll();
    }

    // ==========================================
    // SISTEMA: CONFIGURACIÓN
    // ==========================================
    public function obtenerConfiguracionSistema()
    {
        $stmt = $this->db->query('SELECT clave, valor FROM configuracion_sistema');
        return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    }

    public function guardarConfiguracionSistema(array $configuraciones)
    {
        $stmt = $this->db->prepare(
            'INSERT INTO configuracion_sistema (clave, valor) VALUES (:clave, :valor)
             ON DUPLICATE KEY UPDATE valor = VALUES(valor)'
        );
        foreach ($configuraciones as $clave => $valor) {
            $stmt->execute([':clave' => $clave, ':valor' => $valor]);
        }
        return $this->obtenerConfiguracionSistema();
    }

    // ==========================================
    // TABLAS AUXILIARES
    // ==========================================
    private function asegurarTablasAuxiliares()
    {
        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS configuracion_sistema (
                clave VARCHAR(50) PRIMARY KEY,
                valor VARCHAR(255) NOT NULL
            )'
        );
        $this->db->exec(
            "INSERT IGNORE INTO configuracion_sistema (clave, valor) VALUES
            ('limite_dias_justificar', '3'),
            ('ciclo_escolar', '2025-2026'),
            ('trim1_inicio', '2025-08-25'), ('trim1_fin', '2025-11-20'),
            ('trim2_inicio', '2025-11-21'), ('trim2_fin', '2026-03-10'),
            ('trim3_inicio', '2026-03-11'), ('trim3_fin', '2026-07-15')"
        );
    }
}