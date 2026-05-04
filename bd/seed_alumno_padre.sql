USE datanet;

-- Ajusta tutores de ejemplo para que el portal de Padre/Tutor tenga hijos asociados.
UPDATE usuarios SET id_tutor = 2
WHERE correo IN (
    '20240001@estudiantes.edu.mx',
    '20240004@estudiantes.edu.mx',
    '20240011@estudiantes.edu.mx'
)
AND rol = 'alumno'
AND (id_tutor IS NULL OR id_tutor = 1);

CREATE TABLE IF NOT EXISTS solicitudes_inscripcion (
    id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
    id_curso INT NOT NULL,
    id_alumno INT NOT NULL,
    estado ENUM('pendiente','aceptada','rechazada') DEFAULT 'pendiente',
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_curso) REFERENCES cursos(id_curso) ON DELETE CASCADE,
    FOREIGN KEY (id_alumno) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    UNIQUE KEY uq_solicitud_curso_alumno (id_curso, id_alumno, estado)
);

-- Solicitudes visibles en "Materias > Solicitudes en proceso".
INSERT IGNORE INTO solicitudes_inscripcion (id_curso, id_alumno, estado)
SELECT c.id_curso, u.id_usuario, 'pendiente'
FROM cursos c
INNER JOIN usuarios u ON u.correo = '20240010@estudiantes.edu.mx'
WHERE c.codigo_clase = 'HIST-101';

INSERT IGNORE INTO solicitudes_inscripcion (id_curso, id_alumno, estado)
SELECT c.id_curso, u.id_usuario, 'pendiente'
FROM cursos c
INNER JOIN usuarios u ON u.correo = '20240011@estudiantes.edu.mx'
WHERE c.codigo_clase = 'MAT-202';

-- Justificantes de ejemplo para probar historial y detalle.
INSERT INTO justificantes (id_usuario, fecha_inicio, fecha_fin, asunto, descripcion, archivo_url, estado, fecha_limite)
SELECT u.id_usuario, '2025-05-05', '2025-05-05', 'Cita Médica',
       'Asistencia a consulta de rutina', 'receta_medica.pdf', 'aprobado', '2025-05-10'
FROM usuarios u
WHERE u.correo = '20240004@estudiantes.edu.mx'
AND NOT EXISTS (
    SELECT 1 FROM justificantes j
    WHERE j.id_usuario = u.id_usuario
    AND j.fecha_inicio = '2025-05-05'
    AND j.asunto = 'Cita Médica'
);

INSERT INTO justificantes (id_usuario, fecha_inicio, fecha_fin, asunto, descripcion, archivo_url, estado, fecha_limite)
SELECT u.id_usuario, '2025-05-08', '2025-05-08', 'Asuntos Familiares',
       'Trámite familiar autorizado por tutor', 'carta_tutor.pdf', 'pendiente', '2025-05-13'
FROM usuarios u
WHERE u.correo = '20240001@estudiantes.edu.mx'
AND NOT EXISTS (
    SELECT 1 FROM justificantes j
    WHERE j.id_usuario = u.id_usuario
    AND j.fecha_inicio = '2025-05-08'
    AND j.asunto = 'Asuntos Familiares'
);
