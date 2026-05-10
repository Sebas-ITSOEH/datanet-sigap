<?php

require_once __DIR__ . '/conexion.php';

class Alumno
{
    private $db;

    public function __construct()
    {
        $this->db = Conexion::conectar();
        $this->asegurarTablasAuxiliares();
    }

    public function contextoUsuario(array $usuario)
    {
        if ($usuario['rol'] === 'alumno') {
            $alumno = $this->obtenerAlumno((int) $usuario['id_usuario']);
            return ['usuario' => $usuario, 'alumno' => $alumno, 'hijos' => [$alumno]];
        }

        throw new RuntimeException('Rol no autorizado para este portal.');
    }

    public function resumen(array $usuario)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            return $ctx + ['resumen' => $this->resumenVacio(), 'avisos' => $this->avisosEjemplo()];
        }

        $idAlumno = (int) $ctx['alumno']['id'];
        $stmt = $this->db->prepare(
            'SELECT
                SUM(CASE WHEN estado_final = "presente" THEN 1 ELSE 0 END) AS presentes,
                SUM(CASE WHEN estado_final = "retardo" THEN 1 ELSE 0 END) AS retardos,
                SUM(CASE WHEN estado_final = "falta" THEN 1 ELSE 0 END) AS faltas,
                COUNT(*) AS total
             FROM asistencias
             WHERE id_usuario = :id_alumno'
        );
        $stmt->execute([':id_alumno' => $idAlumno]);
        $row = $stmt->fetch() ?: [];

        $justificados = $this->contarJustificantes($idAlumno, 'aprobado');
        $tramitesActivos = $this->contarJustificantes($idAlumno, 'pendiente');
        $total = (int) ($row['total'] ?? 0);
        $presentes = (int) ($row['presentes'] ?? 0);
        $retardos = (int) ($row['retardos'] ?? 0);
        $faltas = (int) ($row['faltas'] ?? 0);

        $resumen = [
            'presentes' => $presentes,
            'retardos' => $retardos,
            'faltas' => $faltas,
            'justificados' => $justificados,
            'tramites_activos' => $tramitesActivos,
            'materias' => count($this->materias($usuario)['materias']),
            'asistencia_general' => $total > 0 ? round(($presentes + $retardos) / $total * 100) : 100,
            'promedio_general' => 'N/A',
        ];

        return $ctx + ['resumen' => $resumen, 'avisos' => $this->avisosEjemplo()];
    }

    public function materias(array $usuario)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            return $ctx + ['materias' => [], 'solicitudes' => []];
        }

        $idAlumno = (int) $ctx['alumno']['id'];
        $stmt = $this->db->prepare(
            'SELECT
                c.id_curso AS id,
                c.codigo_clase AS codigo,
                c.periodo,
                a.nombre AS materia,
                CONCAT(d.nombre, " ", d.apellido) AS docente,
                d.correo AS correo_docente,
                g.nombre AS grupo,
                COUNT(asis.id_asistencia) AS total_registros,
                SUM(CASE WHEN asis.estado_final IN ("presente", "retardo") THEN 1 ELSE 0 END) AS asistencias_validas,
                SUM(CASE WHEN asis.estado_final = "falta" THEN 1 ELSE 0 END) AS faltas
             FROM inscripciones i
             INNER JOIN cursos c ON i.id_curso = c.id_curso
             INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
             INNER JOIN usuarios d ON c.id_docente = d.id_usuario
             INNER JOIN grupos g ON c.id_grupo = g.id_grupo
             LEFT JOIN sesiones s ON c.id_curso = s.id_curso
             LEFT JOIN asistencias asis ON asis.id_sesion = s.id_sesion AND asis.id_usuario = i.id_alumno
             WHERE i.id_alumno = :id_alumno
             GROUP BY c.id_curso, c.codigo_clase, c.periodo, a.nombre, d.nombre, d.apellido, d.correo, g.nombre
             ORDER BY a.nombre'
        );
        $stmt->execute([':id_alumno' => $idAlumno]);

        $materias = [];
        foreach ($stmt->fetchAll() as $row) {
            $total = (int) $row['total_registros'];
            $validas = (int) $row['asistencias_validas'];
            $porcentaje = $total > 0 ? round($validas / $total * 100) : 100;
            $materias[] = $row + [
                'porcentaje_asistencia' => $porcentaje,
                'estado' => $porcentaje < 80 ? 'risk' : 'safe',
                'icono' => $this->iconoAsignatura($row['materia']),
            ];
        }

        return $ctx + [
            'materias' => $materias,
            'solicitudes' => $this->solicitudesAlumno($idAlumno),
        ];
    }

    public function verificarCodigo(array $usuario, $codigo)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            throw new RuntimeException('No hay alumno asociado a esta cuenta.');
        }

        $stmt = $this->db->prepare(
            'SELECT
                c.id_curso AS id,
                c.codigo_clase AS codigo,
                c.periodo,
                a.nombre AS materia,
                CONCAT(d.nombre, " ", d.apellido) AS docente,
                g.nombre AS grupo,
                EXISTS (
                    SELECT 1 FROM inscripciones i
                    WHERE i.id_curso = c.id_curso AND i.id_alumno = :id_alumno
                ) AS inscrito,
                EXISTS (
                    SELECT 1 FROM solicitudes_inscripcion s
                    WHERE s.id_curso = c.id_curso AND s.id_alumno = :id_alumno2 AND s.estado = "pendiente"
                ) AS pendiente
             FROM cursos c
             INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
             INNER JOIN usuarios d ON c.id_docente = d.id_usuario
             INNER JOIN grupos g ON c.id_grupo = g.id_grupo
             WHERE UPPER(c.codigo_clase) = UPPER(:codigo)
             LIMIT 1'
        );
        $stmt->execute([
            ':id_alumno' => $ctx['alumno']['id'],
            ':id_alumno2' => $ctx['alumno']['id'],
            ':codigo' => $codigo,
        ]);

        return $stmt->fetch();
    }

    public function solicitarInscripcion(array $usuario, $idCurso)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            throw new RuntimeException('No hay alumno asociado a esta cuenta.');
        }

        $idAlumno = (int) $ctx['alumno']['id'];
        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO solicitudes_inscripcion (id_curso, id_alumno, estado)
             VALUES (:id_curso, :id_alumno, "pendiente")'
        );
        $stmt->execute([
            ':id_curso' => $idCurso,
            ':id_alumno' => $idAlumno,
        ]);

        return $this->solicitudesAlumno($idAlumno);
    }

    public function historial(array $usuario)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            return $ctx + ['eventos' => [], 'resumen' => $this->resumenVacio()];
        }

        $idAlumno = (int) $ctx['alumno']['id'];
        $stmt = $this->db->prepare(
            'SELECT
                s.fecha,
                TIME_FORMAT(s.hora_inicio, "%H:%i") AS hora,
                asis.estado_final AS estado,
                a.nombre AS materia,
                CONCAT(d.nombre, " ", d.apellido) AS docente
             FROM asistencias asis
             INNER JOIN sesiones s ON asis.id_sesion = s.id_sesion
             INNER JOIN cursos c ON s.id_curso = c.id_curso
             INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
             INNER JOIN usuarios d ON c.id_docente = d.id_usuario
             WHERE asis.id_usuario = :id_alumno
             ORDER BY s.fecha DESC, s.hora_inicio DESC
             LIMIT 50'
        );
        $stmt->execute([':id_alumno' => $idAlumno]);

        $eventos = $stmt->fetchAll();
        $resumen = [
            'presentes' => 0,
            'retardos' => 0,
            'faltas' => 0,
        ];
        foreach ($eventos as $evento) {
            if ($evento['estado'] === 'presente') $resumen['presentes']++;
            if ($evento['estado'] === 'retardo') $resumen['retardos']++;
            if ($evento['estado'] === 'falta') $resumen['faltas']++;
        }

        return $ctx + ['eventos' => $eventos, 'resumen' => $resumen];
    }

    public function justificantes(array $usuario)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            return $ctx + ['justificantes' => [], 'materias' => []];
        }

        $idAlumno = (int) $ctx['alumno']['id'];
        $stmt = $this->db->prepare(
            'SELECT
                id_justificante AS id,
                fecha_inicio,
                fecha_fin,
                asunto,
                descripcion,
                archivo_url,
                estado,
                fecha_solicitud
             FROM justificantes
             WHERE id_usuario = :id_alumno
             ORDER BY fecha_solicitud DESC'
        );
        $stmt->execute([':id_alumno' => $idAlumno]);

        return $ctx + [
            'justificantes' => $stmt->fetchAll(),
            'materias' => array_map(function ($m) {
                return $m['materia'];
            }, $this->materias($usuario)['materias']),
        ];
    }

    public function crearJustificante(array $usuario, array $datos)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            throw new RuntimeException('No hay alumno asociado a esta cuenta.');
        }

        $fechaInicio = $datos['fecha_inicio'] ?? $datos['fecha'] ?? null;
        $fechaFin = $datos['fecha_fin'] ?? $fechaInicio;
        if (!$fechaInicio || !$fechaFin) {
            throw new RuntimeException('La fecha del justificante es obligatoria.');
        }

        $stmt = $this->db->prepare(
            'INSERT INTO justificantes
                (id_usuario, fecha_inicio, fecha_fin, asunto, descripcion, archivo_url, estado, fecha_limite)
             VALUES
                (:id_usuario, :fecha_inicio, :fecha_fin, :asunto, :descripcion, :archivo_url, "pendiente", DATE_ADD(:fecha_fin2, INTERVAL 5 DAY))'
        );
        $stmt->execute([
            ':id_usuario' => $ctx['alumno']['id'],
            ':fecha_inicio' => $fechaInicio,
            ':fecha_fin' => $fechaFin,
            ':asunto' => $datos['asunto'] ?? $this->asuntoDesdeMotivo($datos['motivo'] ?? ''),
            ':descripcion' => $datos['descripcion'] ?? '',
            ':archivo_url' => $datos['archivo_url'] ?? '',
            ':fecha_fin2' => $fechaFin,
        ]);

        return $this->justificantes($usuario)['justificantes'];
    }

    public function eliminarJustificante(array $usuario, $idJustificante)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            throw new RuntimeException('No hay alumno asociado a esta cuenta.');
        }

        $stmt = $this->db->prepare(
            'DELETE FROM justificantes
             WHERE id_justificante = :id AND id_usuario = :id_alumno AND estado = "pendiente"'
        );
        $stmt->execute([
            ':id' => $idJustificante,
            ':id_alumno' => $ctx['alumno']['id'],
        ]);

        return $this->justificantes($usuario)['justificantes'];
    }

    // ============================================================
    // CORREGIDO: obtenerAlumno() SIN direccion, SIN tutor como usuario
    // ============================================================
    private function obtenerAlumno($idAlumno)
    {
        $stmt = $this->db->prepare(
            'SELECT u.id_usuario AS id, CONCAT(u.nombre, " ", u.apellido) AS nombre,
                    u.nombre AS nombre_simple, u.apellido, u.correo, 
                    u.matricula_escolar AS matricula, u.telefono, u.curp,
                    g.nombre AS grupo
             FROM usuarios u
             LEFT JOIN inscripciones i ON u.id_usuario = i.id_alumno
             LEFT JOIN cursos c ON i.id_curso = c.id_curso
             LEFT JOIN grupos g ON c.id_grupo = g.id_grupo
             WHERE u.id_usuario = :id AND u.rol = "alumno" AND u.estado = TRUE
             GROUP BY u.id_usuario, u.nombre, u.apellido, u.correo, 
                      u.matricula_escolar, u.telefono, u.curp, g.nombre
             LIMIT 1'
        );
        $stmt->execute([':id' => $idAlumno]);

        return $stmt->fetch();
    }

    private function solicitudesAlumno($idAlumno)
    {
        $stmt = $this->db->prepare(
            'SELECT
                s.id_solicitud AS id,
                s.estado,
                c.codigo_clase AS codigo,
                a.nombre AS materia,
                CONCAT(d.nombre, " ", d.apellido) AS docente,
                g.nombre AS grupo,
                c.periodo
             FROM solicitudes_inscripcion s
             INNER JOIN cursos c ON s.id_curso = c.id_curso
             INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
             INNER JOIN usuarios d ON c.id_docente = d.id_usuario
             INNER JOIN grupos g ON c.id_grupo = g.id_grupo
             WHERE s.id_alumno = :id_alumno AND s.estado = "pendiente"
             ORDER BY s.fecha_solicitud DESC'
        );
        $stmt->execute([':id_alumno' => $idAlumno]);

        return $stmt->fetchAll();
    }

    private function contarJustificantes($idAlumno, $estado)
    {
        $stmt = $this->db->prepare(
            'SELECT COUNT(*) FROM justificantes WHERE id_usuario = :id_alumno AND estado = :estado'
        );
        $stmt->execute([':id_alumno' => $idAlumno, ':estado' => $estado]);

        return (int) $stmt->fetchColumn();
    }

    private function resumenVacio()
    {
        return [
            'presentes' => 0,
            'retardos' => 0,
            'faltas' => 0,
            'justificados' => 0,
            'tramites_activos' => 0,
            'materias' => 0,
            'asistencia_general' => 100,
            'promedio_general' => 'N/A',
        ];
    }

    private function asegurarTablasAuxiliares()
    {
        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS solicitudes_inscripcion (
                id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
                id_curso INT NOT NULL,
                id_alumno INT NOT NULL,
                estado ENUM("pendiente","aceptada","rechazada") DEFAULT "pendiente",
                fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_curso) REFERENCES cursos(id_curso) ON DELETE CASCADE,
                FOREIGN KEY (id_alumno) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
                UNIQUE KEY uq_solicitud_curso_alumno (id_curso, id_alumno, estado)
            )'
        );
    }

    private function iconoAsignatura($nombre)
    {
        $nombre = strtolower($nombre);
        if (str_contains($nombre, 'mat')) return 'fa-calculator';
        if (str_contains($nombre, 'hist')) return 'fa-book-open';
        if (str_contains($nombre, 'ciencia') || str_contains($nombre, 'fis')) return 'fa-flask';
        if (str_contains($nombre, 'espa')) return 'fa-book';
        if (str_contains($nombre, 'arte')) return 'fa-palette';
        if (str_contains($nombre, 'ingl')) return 'fa-language';
        return 'fa-book-bookmark';
    }

    private function asuntoDesdeMotivo($motivo)
    {
        $mapa = [
            'salud' => 'Enfermedad / Cita Médica',
            'personal' => 'Asuntos Familiares / Personales',
            'viaje' => 'Viaje Escolar / Congreso',
        ];
        return $mapa[$motivo] ?? 'Justificante';
    }

    private function avisosEjemplo()
    {
        return [
            ['icono' => 'fa-regular fa-bell', 'texto' => 'Entrega de boletas disponible en prefectura.', 'fecha' => 'Reciente'],
            ['icono' => 'fa-regular fa-calendar', 'texto' => 'Revisa tus asistencias antes del cierre semanal.', 'fecha' => 'Esta semana'],
            ['icono' => 'fa-solid fa-clipboard-list', 'texto' => 'Puedes solicitar justificantes desde este portal.', 'fecha' => 'Aviso'],
        ];
    }
}