<?php

require_once __DIR__ . '/conexion.php';

class Docente
{
    private $db;

    public function __construct()
    {
        $this->db = Conexion::conectar();
        $this->asegurarTablasAuxiliares();
    }

    public function obtenerPerfil($idDocente)
    {
        $stmt = $this->db->prepare(
            'SELECT id_usuario, nombre, apellido, correo, rol
             FROM usuarios
             WHERE id_usuario = :id AND rol = "docente" AND estado = TRUE
             LIMIT 1'
        );
        $stmt->execute([':id' => $idDocente]);

        return $stmt->fetch();
    }

    public function listarCursos($idDocente)
    {
        $stmt = $this->db->prepare(
            'SELECT
                c.id_curso AS id,
                c.codigo_clase AS codigo,
                c.periodo,
                a.nombre AS nombre,
                g.nombre AS grupo_nombre,
                COUNT(DISTINCT i.id_alumno) AS total_alumnos
             FROM cursos c
             INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
             INNER JOIN grupos g ON c.id_grupo = g.id_grupo
             LEFT JOIN inscripciones i ON c.id_curso = i.id_curso
             WHERE c.id_docente = :id_docente
             GROUP BY c.id_curso, c.codigo_clase, c.periodo, a.nombre, g.nombre
             ORDER BY a.nombre, g.nombre'
        );
        $stmt->execute([':id_docente' => $idDocente]);

        $cursos = $stmt->fetchAll();
        foreach ($cursos as &$curso) {
            $partesGrupo = $this->separarGradoGrupo($curso['grupo_nombre']);
            $curso['grado'] = $partesGrupo['grado'];
            $curso['grupo'] = $partesGrupo['grupo'];
            $curso['desc'] = 'Curso activo del periodo ' . ($curso['periodo'] ?: 'actual') . '.';
            $curso['icono'] = $this->iconoAsignatura($curso['nombre']);
            $curso['horarios'] = $this->obtenerHorariosCurso($curso['id']);
            $curso['alumnos'] = $this->listarAlumnosCurso($idDocente, $curso['id']);
        }

        return $cursos;
    }

    public function crearCurso($idDocente, array $datos)
    {
        $this->db->beginTransaction();

        try {
            $idAsignatura = $this->obtenerOCrearAsignatura($datos['nombre']);
            $idGrupo = $this->obtenerOCrearGrupo($datos['grado'], $datos['grupo']);

            $stmt = $this->db->prepare(
                'INSERT INTO cursos (id_asignatura, id_docente, id_grupo, codigo_clase, periodo)
                 VALUES (:id_asignatura, :id_docente, :id_grupo, :codigo, :periodo)'
            );
            $stmt->execute([
                ':id_asignatura' => $idAsignatura,
                ':id_docente' => $idDocente,
                ':id_grupo' => $idGrupo,
                ':codigo' => $datos['codigo'],
                ':periodo' => $datos['periodo'] ?? $this->periodoActual(),
            ]);

            $idCurso = (int) $this->db->lastInsertId();
            $this->guardarHorarios($idCurso, $datos['horarios'] ?? []);

            $this->db->commit();

            return $this->obtenerCurso($idDocente, $idCurso);
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function obtenerCurso($idDocente, $idCurso)
    {
        $cursos = $this->listarCursos($idDocente);
        foreach ($cursos as $curso) {
            if ((int) $curso['id'] === (int) $idCurso) {
                return $curso;
            }
        }
        return null;
    }

    // ============================================================
    // CORREGIDO: SIN u.direccion, SIN LEFT JOIN tutor
    // ============================================================
  public function listarAlumnosCurso($idDocente, $idCurso)
{
    $this->validarCursoDocente($idDocente, $idCurso);

    $stmt = $this->db->prepare(
        'SELECT
            u.id_usuario AS id,
            CONCAT(u.nombre, " ", u.apellido) AS nombre,
            u.nombre AS nombre_simple,
            u.apellido,
            u.matricula_escolar AS matricula,
            u.correo,
            u.telefono,
            u.telefono AS telefonoTutor,
            u.curp,
            CONCAT(u.nombre, " ", u.apellido) AS tutor
         FROM inscripciones i
         INNER JOIN usuarios u ON i.id_alumno = u.id_usuario
         WHERE i.id_curso = :id_curso AND u.rol = "alumno" AND u.estado = TRUE
         ORDER BY u.apellido, u.nombre'
    );
    $stmt->execute([':id_curso' => $idCurso]);

    return $stmt->fetchAll();
}

    // ============================================================
    // CORREGIDO: SIN LEFT JOIN tutor
    // ============================================================
    public function listarAlumnosDisponibles($idDocente, $idCurso)
{
    $this->validarCursoDocente($idDocente, $idCurso);

    $stmt = $this->db->prepare(
        'SELECT
            u.id_usuario AS id,
            CONCAT(u.nombre, " ", u.apellido) AS nombre,
            u.nombre AS nombre_simple,
            u.apellido,
            u.matricula_escolar AS matricula,
            u.correo,
            u.telefono,
            u.telefono AS telefonoTutor,
            u.curp,
            CONCAT(u.nombre, " ", u.apellido) AS tutor
         FROM usuarios u
         WHERE u.rol = "alumno"
         AND u.estado = TRUE
         AND NOT EXISTS (
            SELECT 1 FROM inscripciones i
            WHERE i.id_curso = :id_curso AND i.id_alumno = u.id_usuario
         )
         ORDER BY u.apellido, u.nombre'
    );
    $stmt->execute([':id_curso' => $idCurso]);

    return $stmt->fetchAll();
}

    // ============================================================
    // CORREGIDO: SIN LEFT JOIN tutor
    // ============================================================
    public function buscarAlumnoPorMatricula($idDocente, $idCurso, $matricula)
{
    $this->validarCursoDocente($idDocente, $idCurso);

    $stmt = $this->db->prepare(
        'SELECT
            u.id_usuario AS id,
            CONCAT(u.nombre, " ", u.apellido) AS nombre,
            u.nombre AS nombre_simple,
            u.apellido,
            u.matricula_escolar AS matricula,
            u.correo,
            u.telefono,
            u.telefono AS telefonoTutor,
            u.curp,
            CONCAT(u.nombre, " ", u.apellido) AS tutor,
            EXISTS (
                SELECT 1 FROM inscripciones i
                WHERE i.id_curso = :id_curso AND i.id_alumno = u.id_usuario
            ) AS inscrito
         FROM usuarios u
         WHERE u.rol = "alumno" AND u.estado = TRUE AND u.matricula_escolar = :matricula
         LIMIT 1'
    );
    $stmt->execute([
        ':id_curso' => $idCurso,
        ':matricula' => $matricula,
    ]);

    $resultado = $stmt->fetch();
    
    // Si no se encuentra por matrícula exacta, buscar por coincidencia parcial
    if (!$resultado) {
        $stmt2 = $this->db->prepare(
            'SELECT
                u.id_usuario AS id,
                CONCAT(u.nombre, " ", u.apellido) AS nombre,
                u.nombre AS nombre_simple,
                u.apellido,
                u.matricula_escolar AS matricula,
                u.correo,
                u.telefono,
                u.telefono AS telefonoTutor,
                u.curp,
                CONCAT(u.nombre, " ", u.apellido) AS tutor,
                EXISTS (
                    SELECT 1 FROM inscripciones i
                    WHERE i.id_curso = :id_curso AND i.id_alumno = u.id_usuario
                ) AS inscrito
             FROM usuarios u
             WHERE u.rol = "alumno" AND u.estado = TRUE 
             AND (u.matricula_escolar LIKE :matricula_like 
                  OR CONCAT(u.nombre, " ", u.apellido) LIKE :nombre_like)
             LIMIT 1'
        );
        $stmt2->execute([
            ':id_curso' => $idCurso,
            ':matricula_like' => '%' . $matricula . '%',
            ':nombre_like' => '%' . $matricula . '%',
        ]);
        $resultado = $stmt2->fetch();
    }

    return $resultado;
}

    public function agregarAlumno($idDocente, $idCurso, $idAlumno)
    {
        $this->validarCursoDocente($idDocente, $idCurso);

        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO inscripciones (id_curso, id_alumno)
             SELECT :id_curso, id_usuario
             FROM usuarios
             WHERE id_usuario = :id_alumno AND rol = "alumno" AND estado = TRUE'
        );
        $stmt->execute([
            ':id_curso' => $idCurso,
            ':id_alumno' => $idAlumno,
        ]);

        return $this->listarAlumnosCurso($idDocente, $idCurso);
    }

    public function eliminarAlumno($idDocente, $idCurso, $idAlumno)
    {
        $this->validarCursoDocente($idDocente, $idCurso);

        $stmt = $this->db->prepare(
            'DELETE FROM inscripciones WHERE id_curso = :id_curso AND id_alumno = :id_alumno'
        );
        $stmt->execute([
            ':id_curso' => $idCurso,
            ':id_alumno' => $idAlumno,
        ]);

        return $this->listarAlumnosCurso($idDocente, $idCurso);
    }

    public function listarCursosParaLista($idDocente)
    {
        $cursos = $this->listarCursos($idDocente);

        return array_map(function ($curso) {
            return [
                'id' => $curso['id'],
                'label' => $curso['nombre'] . ' - ' . $curso['grado'] . '°' . $curso['grupo'],
            ];
        }, $cursos);
    }

public function obtenerListaAsistencia($idDocente, $idCurso, $fecha)
{
    $this->validarCursoDocente($idDocente, $idCurso);
    $idSesion = $this->obtenerOCrearSesion($idCurso, $fecha);

    $stmt = $this->db->prepare(
        'SELECT
            u.id_usuario AS id,
            CONCAT(u.apellido, ", ", u.nombre) AS nombre,
            u.matricula_escolar AS matricula,
            u.telefono AS telefonoTutor,
            COALESCE(a.estado_final, "pendiente") AS estado,
            CASE WHEN j.id_justificante IS NULL THEN 0 ELSE 1 END AS justificado,
            j.asunto AS motivo_justificante,
            j.archivo_url AS archivo_justificante
         FROM inscripciones i
         INNER JOIN usuarios u ON i.id_alumno = u.id_usuario
         LEFT JOIN asistencias a ON a.id_sesion = :id_sesion AND a.id_usuario = u.id_usuario
         LEFT JOIN justificantes j ON j.id_usuario = u.id_usuario
            AND j.estado = "aprobado"
            AND :fecha BETWEEN j.fecha_inicio AND j.fecha_fin
         WHERE i.id_curso = :id_curso AND u.estado = TRUE
         ORDER BY u.apellido, u.nombre'
    );
    $stmt->execute([
        ':id_sesion' => $idSesion,
        ':fecha' => $fecha,
        ':id_curso' => $idCurso,
    ]);

    return [
        'id_sesion' => $idSesion,
        'alumnos' => $stmt->fetchAll(),
    ];
}

    public function generarQrToken($idDocente, $idCurso, $fecha, $segundosVigencia = 30)
    {
        $this->validarCursoDocente($idDocente, $idCurso);
        $idSesion = $this->obtenerOCrearSesion($idCurso, $fecha);
        $segundosVigencia = max(10, min(300, (int) $segundosVigencia));

        $stmt = $this->db->prepare('CALL sp_generar_qr_token(:id_sesion, :segundos)');
        $stmt->execute([
            ':id_sesion' => $idSesion,
            ':segundos' => $segundosVigencia,
        ]);
        $token = $stmt->fetch();
        $stmt->closeCursor();

        if (!$token) {
            throw new RuntimeException('No se pudo generar el token QR.');
        }

        return [
            'token' => $token['token'],
            'id_sesion' => (int) $token['id_sesion'],
            'fecha_generacion' => $token['fecha_generacion'],
            'fecha_expiracion' => $token['fecha_expiracion'],
            'segundos_vigencia' => $segundosVigencia,
        ];
    }

    public function guardarAsistencia($idDocente, $idCurso, $fecha, array $registros)
    {
        $this->validarCursoDocente($idDocente, $idCurso);
        $idSesion = $this->obtenerOCrearSesion($idCurso, $fecha);

        $stmt = $this->db->prepare(
            'INSERT INTO asistencias
                (id_sesion, id_usuario, qr_valido, bluetooth_valido, validado_docente, estado_final)
             VALUES
                (:id_sesion, :id_usuario, FALSE, FALSE, TRUE, :estado)
             ON DUPLICATE KEY UPDATE
                validado_docente = TRUE,
                estado_final = VALUES(estado_final),
                fecha_hora_registro = CURRENT_TIMESTAMP'
        );

        // NUEVO: Preparamos la consulta para contar los retardos previos del alumno en este curso.
        // Excluimos la sesión actual (id_sesion_actual) por si el profe está actualizando una lista ya guardada.
        $stmtRetardos = $this->db->prepare(
            'SELECT COUNT(*) FROM asistencias a
             INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
             WHERE a.id_usuario = :id_usuario 
               AND s.id_curso = :id_curso 
               AND a.estado_final = "retardo"
               AND a.id_sesion != :id_sesion_actual'
        );

        foreach ($registros as $registro) {
            $estado = $this->mapearEstadoAsistencia($registro['estado'] ?? 'falta');
            $idAlumno = (int) $registro['id_alumno'];

            // === MAGIA: 3 RETARDOS = 1 FALTA ===
            if ($estado === 'retardo') {
                $stmtRetardos->execute([
                    ':id_usuario' => $idAlumno,
                    ':id_curso' => $idCurso,
                    ':id_sesion_actual' => $idSesion
                ]);
                $cantidadRetardos = (int) $stmtRetardos->fetchColumn();

                // Usamos módulo (%) para que aplique cada 3 retardos (ej. el 3, el 6, el 9...)
                if (($cantidadRetardos + 1) % 3 === 0) {
                    $estado = 'falta_retardo'; // Sobre-escribimos el estado antes de insertarlo en la BD
                }
            }
            // =====================================

            $stmt->execute([
                ':id_sesion' => $idSesion,
                ':id_usuario' => $idAlumno,
                ':estado' => $estado,
            ]);
        }

        return $this->obtenerListaAsistencia($idDocente, $idCurso, $fecha);
    }

    public function generarReporteSemanal($idDocente, $idCurso, $fechaInicio)
    {
        $curso = $this->obtenerCurso($idDocente, $idCurso);
        if (!$curso) {
            throw new RuntimeException('Clase no encontrada.');
        }

        $inicio = new DateTime($fechaInicio);
        $dias = [];
        for ($i = 0; $i < 5; $i++) {
            $dia = clone $inicio;
            $dia->modify("+{$i} day");
            $dias[] = $dia->format('Y-m-d');
        }

        $alumnos = $this->listarAlumnosCurso($idDocente, $idCurso);
        $stmt = $this->db->prepare(
            'SELECT s.fecha, a.id_usuario, a.estado_final
             FROM asistencias a
             INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
             WHERE s.id_curso = :id_curso
             AND s.fecha BETWEEN :inicio AND :fin'
        );
        $stmt->execute([
            ':id_curso' => $idCurso,
            ':inicio' => $dias[0],
            ':fin' => $dias[4],
        ]);

        $porAlumnoFecha = [];
        foreach ($stmt->fetchAll() as $row) {
            $porAlumnoFecha[$row['id_usuario']][$row['fecha']] = $row['estado_final'];
        }

        foreach ($alumnos as &$alumno) {
            $alumno['asistencias'] = [];
            foreach ($dias as $fecha) {
                $alumno['asistencias'][] = $porAlumnoFecha[$alumno['id']][$fecha] ?? 'sin_registro';
            }
        }

        return [
            'clase' => $curso,
            'dias' => $dias,
            'alumnos' => $alumnos,
        ];
    }

    public function listarSolicitudes($idDocente)
    {
        $stmt = $this->db->prepare(
            'SELECT
                s.id_solicitud AS id,
                s.id_curso,
                u.id_usuario AS id_alumno,
                CONCAT(u.nombre, " ", u.apellido) AS alumno,
                u.matricula_escolar AS matricula,
                a.nombre AS clase,
                g.nombre AS grupo,
                s.fecha_solicitud
             FROM solicitudes_inscripcion s
             INNER JOIN cursos c ON s.id_curso = c.id_curso
             INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
             INNER JOIN grupos g ON c.id_grupo = g.id_grupo
             INNER JOIN usuarios u ON s.id_alumno = u.id_usuario
             WHERE c.id_docente = :id_docente AND s.estado = "pendiente"
             ORDER BY s.fecha_solicitud ASC'
        );
        $stmt->execute([':id_docente' => $idDocente]);

        return $stmt->fetchAll();
    }

    public function responderSolicitud($idDocente, $idSolicitud, $decision)
    {
        $stmt = $this->db->prepare(
            'SELECT s.id_curso, s.id_alumno
             FROM solicitudes_inscripcion s
             INNER JOIN cursos c ON s.id_curso = c.id_curso
             WHERE s.id_solicitud = :id_solicitud AND c.id_docente = :id_docente
             LIMIT 1'
        );
        $stmt->execute([
            ':id_solicitud' => $idSolicitud,
            ':id_docente' => $idDocente,
        ]);
        $solicitud = $stmt->fetch();

        if (!$solicitud) {
            throw new RuntimeException('Solicitud no encontrada.');
        }

        $estado = $decision === 'aceptar' ? 'aceptada' : 'rechazada';
        $update = $this->db->prepare(
            'UPDATE solicitudes_inscripcion SET estado = :estado WHERE id_solicitud = :id_solicitud'
        );
        $update->execute([
            ':estado' => $estado,
            ':id_solicitud' => $idSolicitud,
        ]);

        if ($estado === 'aceptada') {
            $this->agregarAlumno($idDocente, $solicitud['id_curso'], $solicitud['id_alumno']);
        }

        return $this->listarSolicitudes($idDocente);
    }

    private function asegurarTablasAuxiliares()
    {
        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS horarios_cursos (
                id_horario INT AUTO_INCREMENT PRIMARY KEY,
                id_curso INT NOT NULL,
                dia_semana VARCHAR(20) NOT NULL,
                hora_inicio TIME NOT NULL,
                hora_fin TIME NOT NULL,
                FOREIGN KEY (id_curso) REFERENCES cursos(id_curso) ON DELETE CASCADE,
                UNIQUE KEY uq_horario_curso (id_curso, dia_semana, hora_inicio, hora_fin)
            )'
        );

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

        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS qr_tokens (
                id_qr_token INT AUTO_INCREMENT PRIMARY KEY,
                token VARCHAR(64) NOT NULL UNIQUE,
                id_sesion INT NOT NULL,
                fecha_generacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fecha_expiracion TIMESTAMP NOT NULL,
                activo BOOLEAN NOT NULL DEFAULT TRUE,
                usado BOOLEAN NOT NULL DEFAULT FALSE,
                FOREIGN KEY (id_sesion) REFERENCES sesiones(id_sesion) ON DELETE CASCADE,
                INDEX idx_qr_token_token (token),
                INDEX idx_qr_token_sesion (id_sesion),
                INDEX idx_qr_token_expiracion (fecha_expiracion)
            )'
        );

        try {
            $this->db->exec('DROP TRIGGER IF EXISTS tr_qr_tokens_desactivar_expirados');
        } catch (Throwable $e) {
            // El procedimiento sp_generar_qr_token ya desactiva los tokens anteriores.
        }
    }

    private function obtenerHorariosCurso($idCurso)
    {
        $stmt = $this->db->prepare(
            'SELECT dia_semana, TIME_FORMAT(hora_inicio, "%H:%i") AS inicio, TIME_FORMAT(hora_fin, "%H:%i") AS fin
             FROM horarios_cursos
             WHERE id_curso = :id_curso
             ORDER BY FIELD(dia_semana, "Lunes", "Martes", "Miercoles", "Miércoles", "Jueves", "Viernes"), hora_inicio'
        );
        $stmt->execute([':id_curso' => $idCurso]);
        $horarios = $stmt->fetchAll();

        if ($horarios) {
            return array_map(function ($h) {
                return $h['dia_semana'] . ' ' . $h['inicio'] . '-' . $h['fin'];
            }, $horarios);
        }

        $stmtSesiones = $this->db->prepare(
            'SELECT DISTINCT TIME_FORMAT(hora_inicio, "%H:%i") AS inicio, TIME_FORMAT(hora_fin, "%H:%i") AS fin
             FROM sesiones
             WHERE id_curso = :id_curso
             ORDER BY hora_inicio'
        );
        $stmtSesiones->execute([':id_curso' => $idCurso]);

        return array_map(function ($h) {
            return $h['inicio'] . '-' . $h['fin'];
        }, $stmtSesiones->fetchAll());
    }

    private function guardarHorarios($idCurso, array $horarios)
    {
        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin)
             VALUES (:id_curso, :dia, :inicio, :fin)'
        );

        foreach ($horarios as $horario) {
            if (empty($horario['dia']) || empty($horario['inicio']) || empty($horario['fin'])) continue;

            $stmt->execute([
                ':id_curso' => $idCurso,
                ':dia' => $horario['dia'],
                ':inicio' => $this->normalizarHora($horario['inicio']),
                ':fin' => $this->normalizarHora($horario['fin']),
            ]);
        }
    }

    private function obtenerOCrearAsignatura($nombre)
    {
        $stmt = $this->db->prepare('SELECT id_asignatura FROM asignaturas WHERE nombre = :nombre LIMIT 1');
        $stmt->execute([':nombre' => $nombre]);
        $id = $stmt->fetchColumn();
        if ($id) return (int) $id;

        $insert = $this->db->prepare('INSERT INTO asignaturas (nombre) VALUES (:nombre)');
        $insert->execute([':nombre' => $nombre]);
        return (int) $this->db->lastInsertId();
    }

    private function obtenerOCrearGrupo($grado, $grupo)
    {
        $nombre = trim($grado . '° ' . strtoupper($grupo));
        $stmt = $this->db->prepare('SELECT id_grupo FROM grupos WHERE nombre = :nombre LIMIT 1');
        $stmt->execute([':nombre' => $nombre]);
        $id = $stmt->fetchColumn();
        if ($id) return (int) $id;

        $insert = $this->db->prepare('INSERT INTO grupos (nombre) VALUES (:nombre)');
        $insert->execute([':nombre' => $nombre]);
        return (int) $this->db->lastInsertId();
    }

    private function validarCursoDocente($idDocente, $idCurso)
    {
        $stmt = $this->db->prepare(
            'SELECT COUNT(*) FROM cursos WHERE id_curso = :id_curso AND id_docente = :id_docente'
        );
        $stmt->execute([':id_curso' => $idCurso, ':id_docente' => $idDocente]);
        if ((int) $stmt->fetchColumn() === 0) {
            throw new RuntimeException('La clase no pertenece al docente autenticado.');
        }
    }

    private function obtenerOCrearSesion($idCurso, $fecha)
    {
        $stmt = $this->db->prepare('SELECT id_sesion FROM sesiones WHERE id_curso = :id_curso AND fecha = :fecha LIMIT 1');
        $stmt->execute([':id_curso' => $idCurso, ':fecha' => $fecha]);
        $idSesion = $stmt->fetchColumn();
        if ($idSesion) return (int) $idSesion;

        $horario = $this->primerHorario($idCurso);
        $insert = $this->db->prepare(
            'INSERT INTO sesiones (id_curso, fecha, hora_inicio, hora_fin, codigo_actual)
             VALUES (:id_curso, :fecha, :inicio, :fin, :codigo)'
        );
        $insert->execute([
            ':id_curso' => $idCurso, ':fecha' => $fecha,
            ':inicio' => $horario['inicio'], ':fin' => $horario['fin'],
            ':codigo' => 'SES-' . $idCurso . '-' . str_replace('-', '', $fecha),
        ]);
        return (int) $this->db->lastInsertId();
    }

    private function primerHorario($idCurso)
    {
        $stmt = $this->db->prepare(
            'SELECT hora_inicio AS inicio, hora_fin AS fin FROM horarios_cursos
             WHERE id_curso = :id_curso ORDER BY id_horario LIMIT 1'
        );
        $stmt->execute([':id_curso' => $idCurso]);
        $horario = $stmt->fetch();
        return $horario ?: ['inicio' => '08:00:00', 'fin' => '09:00:00'];
    }

    private function mapearEstadoAsistencia($estado)
    {
        $mapa = ['asistencia' => 'presente', 'presente' => 'presente', 'retardo' => 'retardo',
                 'falta' => 'falta', 'dudoso' => 'dudoso', 'pendiente' => 'falta', 
                 'falta_retardo' => 'falta_retardo']; // <--- NUEVO
        return $mapa[$estado] ?? 'falta';
    }

    private function separarGradoGrupo($grupoNombre)
    {
        if (preg_match('/([0-9]+).*?([A-ZÁÉÍÓÚÑ])$/u', $grupoNombre, $m)) {
            return ['grado' => $m[1], 'grupo' => $m[2]];
        }
        return ['grado' => '', 'grupo' => $grupoNombre];
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
        return 'fa-chalkboard';
    }

    private function normalizarHora($hora)
    {
        return strlen($hora) === 5 ? $hora . ':00' : $hora;
    }

    private function periodoActual()
    {
        $anio = (int) date('Y');
        $mes = (int) date('n');
        return $mes >= 8 ? $anio . '-' . ($anio + 1) : ($anio - 1) . '-' . $anio;
    }
}
