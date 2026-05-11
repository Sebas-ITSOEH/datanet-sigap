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

    // ═══════════════════════════════════════
    // CONTEXTO Y PERFIL
    // ═══════════════════════════════════════

    public function contextoUsuario(array $usuario)
    {
        if ($usuario['rol'] === 'alumno') {
            $alumno = $this->obtenerAlumno((int) $usuario['id_usuario']);
            return ['usuario' => $usuario, 'alumno' => $alumno, 'hijos' => [$alumno]];
        }

        if ($usuario['rol'] === 'padre') {
            $hijos = $this->obtenerHijos((int) $usuario['id_usuario']);
            return ['usuario' => $usuario, 'alumno' => $hijos[0] ?? null, 'hijos' => $hijos];
        }

        throw new RuntimeException('Rol no autorizado para este portal.');
    }

    // ═══════════════════════════════════════
    // RESUMEN DEL ALUMNO
    // ═══════════════════════════════════════

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

        $materiasData = $this->materias($usuario);

        $resumen = [
            'presentes' => $presentes,
            'retardos' => $retardos,
            'faltas' => $faltas,
            'justificados' => $justificados,
            'tramites_activos' => $tramitesActivos,
            'materias' => count($materiasData['materias'] ?? []),
            'asistencia_general' => $total > 0 ? round(($presentes + $retardos) / $total * 100) : 100,
            'promedio_general' => 'N/A',
        ];

        return $ctx + ['resumen' => $resumen, 'avisos' => $this->avisosEjemplo()];
    }

    // ═══════════════════════════════════════
    // MATERIAS
    // ═══════════════════════════════════════

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

    // ═══════════════════════════════════════
    // DETALLE DE MATERIA (NUEVO - COMPLETO)
    // ═══════════════════════════════════════

    public function detalleMateria(array $usuario, $idCurso)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            throw new RuntimeException('No hay alumno asociado a esta cuenta.');
        }

        $idAlumno = (int) $ctx['alumno']['id'];

        // Verificar que el alumno esté inscrito en este curso
        $stmtVerifica = $this->db->prepare(
            'SELECT COUNT(*) FROM inscripciones 
             WHERE id_curso = :id_curso AND id_alumno = :id_alumno'
        );
        $stmtVerifica->execute([
            ':id_curso' => $idCurso,
            ':id_alumno' => $idAlumno
        ]);

        if ((int) $stmtVerifica->fetchColumn() === 0) {
            throw new RuntimeException('No estás inscrito en esta materia.');
        }

        // Obtener información detallada del curso
        $stmt = $this->db->prepare(
            'SELECT
                c.id_curso AS id,
                c.codigo_clase AS codigo,
                c.periodo,
                a.nombre AS materia,
                a.id_asignatura,
                CONCAT(d.nombre, " ", d.apellido) AS docente,
                d.correo AS correo_docente,
                d.id_usuario AS id_docente,
                g.nombre AS grupo,
                g.id_grupo,
                COUNT(DISTINCT s.id_sesion) AS total_sesiones,
                COUNT(DISTINCT asis.id_asistencia) AS total_registros,
                SUM(CASE WHEN asis.estado_final = "presente" THEN 1 ELSE 0 END) AS presentes,
                SUM(CASE WHEN asis.estado_final = "retardo" THEN 1 ELSE 0 END) AS retardos,
                SUM(CASE WHEN asis.estado_final = "falta" THEN 1 ELSE 0 END) AS faltas
             FROM cursos c
             INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
             INNER JOIN usuarios d ON c.id_docente = d.id_usuario
             INNER JOIN grupos g ON c.id_grupo = g.id_grupo
             LEFT JOIN sesiones s ON c.id_curso = s.id_curso
             LEFT JOIN asistencias asis ON asis.id_sesion = s.id_sesion AND asis.id_usuario = :id_alumno
             WHERE c.id_curso = :id_curso
             GROUP BY c.id_curso, c.codigo_clase, c.periodo, a.nombre, a.id_asignatura, 
                      d.nombre, d.apellido, d.correo, d.id_usuario, g.nombre, g.id_grupo'
        );
        $stmt->execute([
            ':id_alumno' => $idAlumno,
            ':id_curso' => $idCurso
        ]);

        $detalle = $stmt->fetch();

        if (!$detalle) {
            throw new RuntimeException('Curso no encontrado.');
        }

        // Obtener historial de asistencias recientes para este curso
        $stmtHist = $this->db->prepare(
            'SELECT
                s.fecha,
                TIME_FORMAT(s.hora_inicio, "%H:%i") AS hora,
                asis.estado_final AS estado,
                s.id_sesion
             FROM asistencias asis
             INNER JOIN sesiones s ON asis.id_sesion = s.id_sesion
             WHERE s.id_curso = :id_curso AND asis.id_usuario = :id_alumno
             ORDER BY s.fecha DESC, s.hora_inicio DESC
             LIMIT 10'
        );
        $stmtHist->execute([
            ':id_curso' => $idCurso,
            ':id_alumno' => $idAlumno
        ]);

        $historial = $stmtHist->fetchAll();

        // Obtener horario de la materia
        $stmtHorario = $this->db->prepare(
            'SELECT dia_semana, TIME_FORMAT(hora_inicio, "%H:%i") AS hora_inicio, 
                    TIME_FORMAT(hora_fin, "%H:%i") AS hora_fin
             FROM horarios_cursos
             WHERE id_curso = :id_curso
             ORDER BY FIELD(dia_semana, "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"), 
                      hora_inicio'
        );
        $stmtHorario->execute([':id_curso' => $idCurso]);
        $horario = $stmtHorario->fetchAll();

        // Obtener próximas sesiones
        $stmtProximas = $this->db->prepare(
            'SELECT fecha, TIME_FORMAT(hora_inicio, "%H:%i") AS hora_inicio, 
                    TIME_FORMAT(hora_fin, "%H:%i") AS hora_fin
             FROM sesiones
             WHERE id_curso = :id_curso AND fecha >= CURDATE()
             ORDER BY fecha, hora_inicio
             LIMIT 5'
        );
        $stmtProximas->execute([':id_curso' => $idCurso]);
        $proximasSesiones = $stmtProximas->fetchAll();

        // Calcular estadísticas
        $total = (int) $detalle['total_registros'];
        $presentes = (int) $detalle['presentes'];
        $retardos = (int) $detalle['retardos'];
        $faltas = (int) $detalle['faltas'];
        $totalSesiones = (int) $detalle['total_sesiones'];
        $porcentaje = $total > 0 ? round(($presentes + $retardos) / $total * 100) : 100;

        return [
            'detalle' => [
                'id' => (int) $detalle['id'],
                'codigo' => $detalle['codigo'],
                'materia' => $detalle['materia'],
                'id_asignatura' => (int) $detalle['id_asignatura'],
                'docente' => $detalle['docente'],
                'correo_docente' => $detalle['correo_docente'],
                'id_docente' => (int) $detalle['id_docente'],
                'grupo' => $detalle['grupo'],
                'id_grupo' => (int) $detalle['id_grupo'],
                'periodo' => $detalle['periodo'],
                'total_sesiones' => $totalSesiones,
                'total_registros' => $total,
                'presentes' => $presentes,
                'retardos' => $retardos,
                'faltas' => $faltas,
                'porcentaje_asistencia' => $porcentaje,
                'estado' => $porcentaje < 80 ? 'risk' : 'safe',
                'icono' => $this->iconoAsignatura($detalle['materia']),
                'historial' => $historial,
                'horario' => $horario,
                'proximas_sesiones' => $proximasSesiones,
                'estadisticas' => [
                    'asistencia_ideal' => $totalSesiones,
                    'sesiones_restantes' => max(0, $totalSesiones - $total),
                    'faltas_permitidas' => max(0, floor($totalSesiones * 0.2)),
                    'faltas_restantes' => max(0, floor($totalSesiones * 0.2) - $faltas),
                    'estado_riesgo' => $porcentaje < 80,
                ]
            ]
        ];
    }

    // ═══════════════════════════════════════
    // VERIFICAR CÓDIGO DE CLASE
    // ═══════════════════════════════════════

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

        $clase = $stmt->fetch();

        if (!$clase) {
            throw new RuntimeException('Código de clase no encontrado. Verifica con tu profesor.');
        }

        if ((int) $clase['inscrito'] === 1) {
            throw new RuntimeException('Ya estás inscrito en esta clase.');
        }

        if ((int) $clase['pendiente'] === 1) {
            throw new RuntimeException('Ya tienes una solicitud pendiente para esta clase.');
        }

        return $clase;
    }

    // ═══════════════════════════════════════
    // SOLICITAR INSCRIPCIÓN
    // ═══════════════════════════════════════

    public function solicitarInscripcion(array $usuario, $idCurso)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            throw new RuntimeException('No hay alumno asociado a esta cuenta.');
        }

        $idAlumno = (int) $ctx['alumno']['id'];

        // Verificar si ya está inscrito
        $stmtVerifica = $this->db->prepare(
            'SELECT COUNT(*) FROM inscripciones WHERE id_curso = :id_curso AND id_alumno = :id_alumno'
        );
        $stmtVerifica->execute([':id_curso' => $idCurso, ':id_alumno' => $idAlumno]);
        if ((int) $stmtVerifica->fetchColumn() > 0) {
            throw new RuntimeException('Ya estás inscrito en esta clase.');
        }

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

    // ═══════════════════════════════════════
    // ABANDONAR MATERIA
    // ═══════════════════════════════════════

    public function abandonarMateria(array $usuario, $idCurso)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            throw new RuntimeException('No hay alumno asociado a esta cuenta.');
        }

        $idAlumno = (int) $ctx['alumno']['id'];

        $stmt = $this->db->prepare(
            'DELETE FROM inscripciones WHERE id_curso = :id_curso AND id_alumno = :id_alumno'
        );
        $stmt->execute([':id_curso' => $idCurso, ':id_alumno' => $idAlumno]);

        if ($stmt->rowCount() === 0) {
            throw new RuntimeException('No se encontró la inscripción para abandonar.');
        }

        return $this->materias($usuario)['materias'];
    }

    // ═══════════════════════════════════════
    // HISTORIAL GENERAL
    // ═══════════════════════════════════════

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
                CONCAT(d.nombre, " ", d.apellido) AS docente,
                c.id_curso
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

    // ═══════════════════════════════════════
    // HISTORIAL POR MATERIA (NUEVO)
    // ═══════════════════════════════════════

    public function historialPorMateria(array $usuario, $idCurso)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            throw new RuntimeException('No hay alumno asociado a esta cuenta.');
        }

        $idAlumno = (int) $ctx['alumno']['id'];
        $stmt = $this->db->prepare(
            'SELECT
                s.fecha,
                TIME_FORMAT(s.hora_inicio, "%H:%i") AS hora,
                TIME_FORMAT(s.hora_fin, "%H:%i") AS hora_fin,
                asis.estado_final AS estado,
                asis.qr_valido,
                asis.bluetooth_valido,
                asis.validado_docente,
                asis.fecha_hora_registro,
                a.nombre AS materia
             FROM asistencias asis
             INNER JOIN sesiones s ON asis.id_sesion = s.id_sesion
             INNER JOIN cursos c ON s.id_curso = c.id_curso
             INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
             WHERE asis.id_usuario = :id_alumno AND c.id_curso = :id_curso
             ORDER BY s.fecha DESC, s.hora_inicio DESC'
        );
        $stmt->execute([
            ':id_alumno' => $idAlumno,
            ':id_curso' => $idCurso
        ]);

        return $stmt->fetchAll();
    }

    // ═══════════════════════════════════════
    // JUSTIFICANTES
    // ═══════════════════════════════════════

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
            fecha_solicitud,
            fecha_limite
         FROM justificantes
         WHERE id_usuario = :id_alumno
         ORDER BY fecha_solicitud DESC'
    );
    $stmt->execute([':id_alumno' => $idAlumno]);

    $justificantes = $stmt->fetchAll();
    
    // Parsear metadata de cada justificante
    foreach ($justificantes as &$j) {
        $metadata = $this->extraerMetadata($j['descripcion']);
        $j['tipo_justificacion'] = $metadata['tipo'] ?? ($j['fecha_inicio'] === $j['fecha_fin'] ? 'completo' : 'rango');
        $j['materias'] = $metadata['materias'] ?? [];
        // Limpiar descripción para mostrar
        $j['descripcion'] = preg_replace('/\n<!--METADATA:.*:METADATA-->/', '', $j['descripcion']);
    }

    return $ctx + [
        'justificantes' => $justificantes,
        'materias' => array_map(function ($m) {
            return $m['materia'];
        }, $this->materias($usuario)['materias']),
    ];
}

// Agregar método auxiliar
private function extraerMetadata($descripcion)
{
    if (preg_match('/<!--METADATA:(.*?):METADATA-->/', $descripcion, $matches)) {
        return json_decode($matches[1], true) ?: [];
    }
    return [];
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

    if ($fechaFin < $fechaInicio) {
        throw new RuntimeException('La fecha de fin no puede ser anterior a la fecha de inicio.');
    }

    $asunto = $datos['asunto'] ?? $this->asuntoDesdeMotivo($datos['motivo'] ?? '');
    $descripcion = trim($datos['descripcion'] ?? '');
    if (empty($descripcion)) {
        throw new RuntimeException('La descripción del justificante es obligatoria.');
    }

    // Guardar tipo y materias en la descripción como metadata
    $tipoJustificacion = $datos['tipo_justificacion'] ?? 'completo';
    $materias = $datos['materias'] ?? [];
    
    $metadata = [
        'tipo' => $tipoJustificacion,
        'materias' => $materias
    ];
    
    // Agregar metadata a la descripción (se puede parsear después)
    $descripcionCompleta = $descripcion . "\n<!--METADATA:" . json_encode($metadata) . ":METADATA-->";

    $stmt = $this->db->prepare(
        'INSERT INTO justificantes
            (id_usuario, fecha_inicio, fecha_fin, asunto, descripcion, archivo_url, estado, fecha_limite)
         VALUES
            (:id_usuario, :fecha_inicio, :fecha_fin, :asunto, :descripcion, :archivo_url, 
             "pendiente", DATE_ADD(:fecha_fin2, INTERVAL 5 DAY))'
    );
    $stmt->execute([
        ':id_usuario' => $ctx['alumno']['id'],
        ':fecha_inicio' => $fechaInicio,
        ':fecha_fin' => $fechaFin,
        ':asunto' => $asunto,
        ':descripcion' => $descripcionCompleta,
        ':archivo_url' => $datos['archivo_url'] ?? '',
        ':fecha_fin2' => $fechaFin,
    ]);

    return $this->justificantes($usuario)['justificantes'];
}

    public function actualizarJustificante(array $usuario, $idJustificante, array $datos)
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

        if ($fechaFin < $fechaInicio) {
            throw new RuntimeException('La fecha de fin no puede ser anterior a la fecha de inicio.');
        }

        $asunto = $datos['asunto'] ?? $this->asuntoDesdeMotivo($datos['motivo'] ?? '');
        $descripcion = trim($datos['descripcion'] ?? '');
        if (empty($descripcion)) {
            throw new RuntimeException('La descripción del justificante es obligatoria.');
        }

        $metadata = [
            'tipo' => $datos['tipo_justificacion'] ?? 'completo',
            'materias' => $datos['materias'] ?? []
        ];
        $descripcionCompleta = $descripcion . "\n<!--METADATA:" . json_encode($metadata) . ":METADATA-->";

        $stmt = $this->db->prepare(
            'UPDATE justificantes
             SET fecha_inicio = :fecha_inicio,
                 fecha_fin = :fecha_fin,
                 asunto = :asunto,
                 descripcion = :descripcion,
                 archivo_url = :archivo_url,
                 fecha_limite = DATE_ADD(:fecha_fin2, INTERVAL 5 DAY)
             WHERE id_justificante = :id
             AND id_usuario = :id_alumno
             AND estado = "pendiente"'
        );
        $stmt->execute([
            ':fecha_inicio' => $fechaInicio,
            ':fecha_fin' => $fechaFin,
            ':asunto' => $asunto,
            ':descripcion' => $descripcionCompleta,
            ':archivo_url' => $datos['archivo_url'] ?? '',
            ':fecha_fin2' => $fechaFin,
            ':id' => $idJustificante,
            ':id_alumno' => $ctx['alumno']['id'],
        ]);

        if ($stmt->rowCount() === 0 && !$this->existeJustificantePendiente($ctx['alumno']['id'], $idJustificante)) {
            throw new RuntimeException('No se puede actualizar este justificante. Solo se pueden editar justificantes pendientes.');
        }

        return $this->justificantes($usuario)['justificantes'];
    }

    private function existeJustificantePendiente($idAlumno, $idJustificante)
    {
        $stmt = $this->db->prepare(
            'SELECT COUNT(*)
             FROM justificantes
             WHERE id_justificante = :id
             AND id_usuario = :id_alumno
             AND estado = "pendiente"'
        );
        $stmt->execute([
            ':id' => $idJustificante,
            ':id_alumno' => $idAlumno,
        ]);
        return (int)$stmt->fetchColumn() > 0;
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

        if ($stmt->rowCount() === 0) {
            throw new RuntimeException('No se puede eliminar este justificante. Solo se pueden eliminar justificantes pendientes.');
        }

        // También eliminar validaciones asociadas
        $stmtVal = $this->db->prepare('DELETE FROM validaciones_justificantes WHERE id_justificante = :id');
        $stmtVal->execute([':id' => $idJustificante]);

        return $this->justificantes($usuario)['justificantes'];
    }

    // ═══════════════════════════════════════
    // HORARIO DEL ALUMNO (NUEVO)
    // ═══════════════════════════════════════

    public function horarioAlumno(array $usuario)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            return [];
        }

        $idAlumno = (int) $ctx['alumno']['id'];
        $stmt = $this->db->prepare(
            'SELECT 
                h.dia_semana,
                TIME_FORMAT(h.hora_inicio, "%H:%i") AS hora_inicio,
                TIME_FORMAT(h.hora_fin, "%H:%i") AS hora_fin,
                a.nombre AS materia,
                c.codigo_clase AS codigo,
                g.nombre AS grupo,
                CONCAT(d.nombre, " ", d.apellido) AS docente,
                c.id_curso
             FROM horarios_cursos h
             INNER JOIN cursos c ON h.id_curso = c.id_curso
             INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
             INNER JOIN usuarios d ON c.id_docente = d.id_usuario
             INNER JOIN grupos g ON c.id_grupo = g.id_grupo
             INNER JOIN inscripciones i ON c.id_curso = i.id_curso
             WHERE i.id_alumno = :id_alumno
             ORDER BY FIELD(h.dia_semana, "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"), 
                      h.hora_inicio'
        );
        $stmt->execute([':id_alumno' => $idAlumno]);

        return $stmt->fetchAll();
    }

    // ═══════════════════════════════════════
    // HORARIO POR MATERIA (NUEVO)
    // ═══════════════════════════════════════

    public function horarioPorMateria(array $usuario, $idCurso)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            throw new RuntimeException('No hay alumno asociado a esta cuenta.');
        }

        $stmt = $this->db->prepare(
            'SELECT 
                h.dia_semana,
                TIME_FORMAT(h.hora_inicio, "%H:%i") AS hora_inicio,
                TIME_FORMAT(h.hora_fin, "%H:%i") AS hora_fin
             FROM horarios_cursos h
             WHERE h.id_curso = :id_curso
             ORDER BY FIELD(h.dia_semana, "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"), 
                      h.hora_inicio'
        );
        $stmt->execute([':id_curso' => $idCurso]);

        return $stmt->fetchAll();
    }

    // ═══════════════════════════════════════
    // PIN DEL TUTOR
    // ═══════════════════════════════════════

    public function verificarPin(array $usuario)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            throw new RuntimeException('No hay alumno asociado a esta cuenta.');
        }

        $stmt = $this->db->prepare(
            'SELECT pin_tutor IS NOT NULL AND pin_tutor != "" AS tiene_pin
             FROM usuarios WHERE id_usuario = :id'
        );
        $stmt->execute([':id' => $ctx['alumno']['id']]);
        $row = $stmt->fetch();

        return ['tiene_pin' => (bool) ($row['tiene_pin'] ?? false)];
    }

    public function validarPin(array $usuario, $pin)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            throw new RuntimeException('No hay alumno asociado a esta cuenta.');
        }

        $stmt = $this->db->prepare(
            'SELECT pin_tutor FROM usuarios WHERE id_usuario = :id'
        );
        $stmt->execute([':id' => $ctx['alumno']['id']]);
        $row = $stmt->fetch();

        if (empty($row['pin_tutor'])) {
            throw new RuntimeException('No se ha configurado un PIN de tutor.');
        }

        if (!password_verify($pin, $row['pin_tutor'])) {
            throw new RuntimeException('PIN incorrecto.');
        }

        return ['valido' => true];
    }

    public function registrarPin(array $usuario, $pin)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            throw new RuntimeException('No hay alumno asociado a esta cuenta.');
        }

        if (strlen($pin) < 4 || strlen($pin) > 6) {
            throw new RuntimeException('El PIN debe tener entre 4 y 6 dígitos.');
        }

        if (!ctype_digit($pin)) {
            throw new RuntimeException('El PIN solo debe contener números.');
        }

        $stmt = $this->db->prepare(
            'UPDATE usuarios SET pin_tutor = :pin WHERE id_usuario = :id'
        );
        $stmt->execute([
            ':pin' => password_hash($pin, PASSWORD_DEFAULT),
            ':id' => $ctx['alumno']['id']
        ]);

        return ['registrado' => true];
    }

    public function cambiarPin(array $usuario, $pinActual, $pinNuevo)
    {
        $ctx = $this->contextoUsuario($usuario);
        if (!$ctx['alumno']) {
            throw new RuntimeException('No hay alumno asociado a esta cuenta.');
        }

        // Validar PIN actual
        $this->validarPin($usuario, $pinActual);

        // Validar nuevo PIN
        if (strlen($pinNuevo) < 4 || strlen($pinNuevo) > 6) {
            throw new RuntimeException('El nuevo PIN debe tener entre 4 y 6 dígitos.');
        }

        if (!ctype_digit($pinNuevo)) {
            throw new RuntimeException('El nuevo PIN solo debe contener números.');
        }

        $stmt = $this->db->prepare(
            'UPDATE usuarios SET pin_tutor = :pin WHERE id_usuario = :id'
        );
        $stmt->execute([
            ':pin' => password_hash($pinNuevo, PASSWORD_DEFAULT),
            ':id' => $ctx['alumno']['id']
        ]);

        return ['cambiado' => true];
    }

    // ═══════════════════════════════════════
    // MÉTODOS PRIVADOS AUXILIARES
    // ═══════════════════════════════════════

 private function obtenerAlumno($idAlumno)
{
    $stmt = $this->db->prepare(
        'SELECT u.id_usuario AS id, CONCAT(u.nombre, " ", u.apellido) AS nombre,
                u.nombre AS nombre_simple, u.apellido, u.correo, 
                u.matricula_escolar AS matricula, u.telefono, u.curp,
                u.telefono AS telefonoTutor,
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

    $alumno = $stmt->fetch();
    
    if ($alumno) {
        // Formatear grupo como "2º A" (número + º + letra)
        $alumno['grupo_formateado'] = $this->formatearGrupo($alumno['grupo'] ?? '');
        $alumno['tutor'] = $alumno['nombre'] ?? '';
        $alumno['numero'] = $alumno['matricula'] ?? '';
        $alumno['grado'] = $this->extraerGrado($alumno['grupo'] ?? '');
    }
    
    return $alumno;
}

// Agregar estos métodos auxiliares
private function extraerGrado($grupo)
{
    $match = [];
    if (preg_match('/[0-9]+/', $grupo, $match)) {
        return $match[0] . '°';
    }
    return '';
}

private function formatearGrupo($grupo)
{
    // Convierte "1º A" o "1° A" o "1 A" a "1º A"
    if (empty($grupo)) return '';
    
    // Si ya está formateado, devolverlo
    if (preg_match('/[0-9]+[°º]\s*[A-Z]/', $grupo)) {
        return $grupo;
    }
    
    // Intentar extraer número y letra
    if (preg_match('/([0-9]+).*?([A-Z])/i', $grupo, $m)) {
        return $m[1] . '° ' . strtoupper($m[2]);
    }
    
    return $grupo;
}

// ═══════════════════════════════════════
// MATERIAS POR DÍA (NUEVO)
// ═══════════════════════════════════════

public function materiasPorDia(array $usuario, $fecha)
{
    $ctx = $this->contextoUsuario($usuario);
    if (!$ctx['alumno']) {
        return [];
    }

    $idAlumno = (int) $ctx['alumno']['id'];
    
    // Obtener el día de la semana en español
    $diasES = ['Sunday' => 'Domingo', 'Monday' => 'Lunes', 'Tuesday' => 'Martes', 
               'Wednesday' => 'Miércoles', 'Thursday' => 'Jueves', 'Friday' => 'Viernes', 
               'Saturday' => 'Sábado'];
    
    $timestamp = strtotime($fecha);
    $diaSemanaIngles = date('l', $timestamp);
    $diaSemana = $diasES[$diaSemanaIngles] ?? $diaSemanaIngles;
    
    // Consultar las materias que el alumno tiene ese día según el horario
    $stmt = $this->db->prepare(
        'SELECT 
            c.id_curso AS id,
            a.nombre AS materia,
            c.codigo_clase AS codigo,
            TIME_FORMAT(h.hora_inicio, "%H:%i") AS hora_inicio,
            TIME_FORMAT(h.hora_fin, "%H:%i") AS hora_fin,
            CONCAT(d.nombre, " ", d.apellido) AS docente,
            g.nombre AS grupo
         FROM horarios_cursos h
         INNER JOIN cursos c ON h.id_curso = c.id_curso
         INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
         INNER JOIN usuarios d ON c.id_docente = d.id_usuario
         INNER JOIN grupos g ON c.id_grupo = g.id_grupo
         INNER JOIN inscripciones i ON c.id_curso = i.id_curso
         WHERE i.id_alumno = :id_alumno
         AND h.dia_semana = :dia_semana
         ORDER BY h.hora_inicio'
    );
    $stmt->execute([
        ':id_alumno' => $idAlumno,
        ':dia_semana' => $diaSemana
    ]);
    
    $materias = $stmt->fetchAll();
    
    return [
        'fecha' => $fecha,
        'dia_semana' => $diaSemana,
        'materias' => $materias
    ];
}

    private function obtenerHijos($idPadre)
    {
        // Asumiendo que hay una tabla de relación padre-hijo
        // Si no existe, retornar array vacío
        try {
            $stmt = $this->db->prepare(
                'SELECT u.id_usuario AS id, CONCAT(u.nombre, " ", u.apellido) AS nombre,
                        u.nombre AS nombre_simple, u.apellido, u.correo, 
                        u.matricula_escolar AS matricula, u.telefono, u.curp,
                        g.nombre AS grupo
                 FROM usuarios u
                 INNER JOIN padre_hijo ph ON u.id_usuario = ph.id_hijo
                 LEFT JOIN inscripciones i ON u.id_usuario = i.id_alumno
                 LEFT JOIN cursos c ON i.id_curso = c.id_curso
                 LEFT JOIN grupos g ON c.id_grupo = g.id_grupo
                 WHERE ph.id_padre = :id_padre AND u.rol = "alumno" AND u.estado = TRUE
                 GROUP BY u.id_usuario, u.nombre, u.apellido, u.correo, 
                          u.matricula_escolar, u.telefono, u.curp, g.nombre'
            );
            $stmt->execute([':id_padre' => $idPadre]);
            return $stmt->fetchAll();
        } catch (Throwable $e) {
            return [];
        }
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
                c.periodo,
                s.fecha_solicitud
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

        // Agregar columna pin_tutor si no existe
        try {
            $this->db->exec(
                'ALTER TABLE usuarios ADD COLUMN pin_tutor VARCHAR(255) NULL AFTER password'
            );
        } catch (Throwable $e) {
            // La columna ya existe
        }

        // Crear tabla padre_hijo si no existe
        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS padre_hijo (
                id_padre INT NOT NULL,
                id_hijo INT NOT NULL,
                PRIMARY KEY (id_padre, id_hijo),
                FOREIGN KEY (id_padre) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
                FOREIGN KEY (id_hijo) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
            )'
        );
    }

    private function iconoAsignatura($nombre)
    {
        $nombre = strtolower($nombre);
        if (str_contains($nombre, 'mat')) return 'fa-calculator';
        if (str_contains($nombre, 'hist')) return 'fa-book-open';
        if (str_contains($nombre, 'ciencia') || str_contains($nombre, 'fis') || str_contains($nombre, 'quim')) return 'fa-flask';
        if (str_contains($nombre, 'espa')) return 'fa-book';
        if (str_contains($nombre, 'arte')) return 'fa-palette';
        if (str_contains($nombre, 'ingl')) return 'fa-language';
        if (str_contains($nombre, 'educacion') || str_contains($nombre, 'fisic')) return 'fa-person-running';
        if (str_contains($nombre, 'formacion') || str_contains($nombre, 'civic')) return 'fa-landmark';
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
