USE datanet;

-- Limpieza ligera para bases ya importadas con datos de ejemplo anteriores.
DELETE a
FROM asistencias a
INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
WHERE u.rol <> 'alumno';

DELETE ia
FROM intentos_asistencia ia
INNER JOIN usuarios u ON ia.id_usuario = u.id_usuario
WHERE u.rol <> 'alumno';

DELETE i
FROM inscripciones i
INNER JOIN usuarios u ON i.id_alumno = u.id_usuario
WHERE u.rol <> 'alumno';

CREATE TABLE IF NOT EXISTS horarios_cursos (
    id_horario INT AUTO_INCREMENT PRIMARY KEY,
    id_curso INT NOT NULL,
    dia_semana VARCHAR(20) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    FOREIGN KEY (id_curso) REFERENCES cursos(id_curso) ON DELETE CASCADE,
    UNIQUE KEY uq_horario_curso (id_curso, dia_semana, hora_inicio, hora_fin)
);

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

UPDATE usuarios SET id_tutor = 2
WHERE correo IN (
    '20240001@estudiantes.edu.mx',
    '20240004@estudiantes.edu.mx',
    '20240011@estudiantes.edu.mx'
)
AND rol = 'alumno'
AND (id_tutor IS NULL OR id_tutor = 1);

INSERT IGNORE INTO inscripciones (id_curso, id_alumno)
SELECT c.id_curso, u.id_usuario
FROM cursos c
INNER JOIN usuarios u ON u.correo IN (
    '20240001@estudiantes.edu.mx',
    '20240002@estudiantes.edu.mx',
    '20240003@estudiantes.edu.mx',
    '20240004@estudiantes.edu.mx',
    '20240005@estudiantes.edu.mx'
)
WHERE c.codigo_clase IN ('HIST-101', 'MAT-202', 'FIS-301', 'ESP-101');

INSERT IGNORE INTO inscripciones (id_curso, id_alumno)
SELECT c.id_curso, u.id_usuario
FROM cursos c
INNER JOIN usuarios u ON u.correo IN (
    '20240006@estudiantes.edu.mx',
    '20240007@estudiantes.edu.mx',
    '20240008@estudiantes.edu.mx',
    '20240009@estudiantes.edu.mx'
)
WHERE c.codigo_clase IN ('MAT-103', 'ESP-102', 'ART-102');

INSERT IGNORE INTO inscripciones (id_curso, id_alumno)
SELECT c.id_curso, u.id_usuario
FROM cursos c
INNER JOIN usuarios u ON u.correo IN (
    '20240010@estudiantes.edu.mx',
    '20240011@estudiantes.edu.mx'
)
WHERE c.codigo_clase IN ('HIST-201', 'FIS-202');

INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin)
SELECT id_curso, 'Lunes', '08:00:00', '09:00:00' FROM cursos WHERE codigo_clase = 'HIST-101';
INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin)
SELECT id_curso, 'Miércoles', '08:00:00', '09:00:00' FROM cursos WHERE codigo_clase = 'HIST-101';
INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin)
SELECT id_curso, 'Lunes', '09:00:00', '10:00:00' FROM cursos WHERE codigo_clase = 'MAT-202';
INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin)
SELECT id_curso, 'Miércoles', '09:00:00', '10:00:00' FROM cursos WHERE codigo_clase = 'MAT-202';
INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin)
SELECT id_curso, 'Martes', '10:00:00', '11:00:00' FROM cursos WHERE codigo_clase = 'FIS-301';
INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin)
SELECT id_curso, 'Jueves', '10:00:00', '11:00:00' FROM cursos WHERE codigo_clase = 'FIS-301';
INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin)
SELECT id_curso, 'Viernes', '11:00:00', '12:00:00' FROM cursos WHERE codigo_clase = 'ESP-101';
INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin)
SELECT id_curso, 'Martes', '09:00:00', '10:00:00' FROM cursos WHERE codigo_clase = 'MAT-103';
INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin)
SELECT id_curso, 'Jueves', '09:00:00', '10:00:00' FROM cursos WHERE codigo_clase = 'MAT-103';
INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin)
SELECT id_curso, 'Lunes', '10:00:00', '11:00:00' FROM cursos WHERE codigo_clase = 'ESP-102';
INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin)
SELECT id_curso, 'Martes', '08:00:00', '09:00:00' FROM cursos WHERE codigo_clase = 'HIST-201';
INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin)
SELECT id_curso, 'Jueves', '10:00:00', '11:00:00' FROM cursos WHERE codigo_clase = 'FIS-202';
INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin)
SELECT id_curso, 'Viernes', '14:00:00', '15:00:00' FROM cursos WHERE codigo_clase = 'EDF-101';
INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin)
SELECT id_curso, 'Viernes', '12:00:00', '13:00:00' FROM cursos WHERE codigo_clase = 'ART-102';

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

INSERT IGNORE INTO solicitudes_inscripcion (id_curso, id_alumno, estado)
SELECT c.id_curso, u.id_usuario, 'pendiente'
FROM cursos c
INNER JOIN usuarios u ON u.correo = '20240001@estudiantes.edu.mx'
WHERE c.codigo_clase = 'MAT-103';
