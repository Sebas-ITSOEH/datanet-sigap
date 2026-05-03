CREATE DATABASE datanet;
USE datanet;

-- 👤 USUARIOS
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('admin','docente','alumno','padre') NOT NULL,
    direccion VARCHAR(255),
    matricula_escolar VARCHAR(20),
    telefono VARCHAR(20),
    id_tutor INT,
    estado BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_tutor) REFERENCES usuarios(id_usuario)
);

-- 👥 GRUPOS
CREATE TABLE grupos (
    id_grupo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(10) NOT NULL
);

-- 📚 ASIGNATURAS (contenido académico)
CREATE TABLE asignaturas (
    id_asignatura INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

-- 🎯 CURSOS (🔥 ahora este es el centro del sistema)
CREATE TABLE cursos (
    id_curso INT AUTO_INCREMENT PRIMARY KEY,
    id_asignatura INT NOT NULL,
    id_docente INT NOT NULL,
    id_grupo INT NOT NULL,
    codigo_clase VARCHAR(20) UNIQUE,
    periodo VARCHAR(20),
    FOREIGN KEY (id_asignatura) REFERENCES asignaturas(id_asignatura),
    FOREIGN KEY (id_docente) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_grupo) REFERENCES grupos(id_grupo)
);

-- 🧾 INSCRIPCIONES (alumnos en curso)
CREATE TABLE inscripciones (
    id_inscripcion INT AUTO_INCREMENT PRIMARY KEY,
    id_curso INT NOT NULL,
    id_alumno INT NOT NULL,
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_curso) REFERENCES cursos(id_curso),
    FOREIGN KEY (id_alumno) REFERENCES usuarios(id_usuario),
    UNIQUE(id_curso, id_alumno)
);

-- ⏱️ SESIONES (cada clase real)
CREATE TABLE sesiones (
    id_sesion INT AUTO_INCREMENT PRIMARY KEY,
    id_curso INT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    codigo_actual VARCHAR(100),
    FOREIGN KEY (id_curso) REFERENCES cursos(id_curso)
);

-- 📡 BEACONS
CREATE TABLE beacons (
    id_beacon INT AUTO_INCREMENT PRIMARY KEY,
    id_grupo INT,
    uuid VARCHAR(100),
    FOREIGN KEY (id_grupo) REFERENCES grupos(id_grupo)
);

-- 🚨 INTENTOS
CREATE TABLE intentos_asistencia (
    id_intento INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_sesion INT NOT NULL,
    codigo_qr VARCHAR(100),
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valido BOOLEAN,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_sesion) REFERENCES sesiones(id_sesion)
);

-- 📅 ASISTENCIAS
CREATE TABLE asistencias (
    id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
    id_sesion INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_hora_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    qr_valido BOOLEAN DEFAULT FALSE,
    bluetooth_valido BOOLEAN DEFAULT FALSE,
    validado_docente BOOLEAN DEFAULT FALSE,
    estado_final ENUM('presente','falta', 'retardo','dudoso') DEFAULT 'falta',
    FOREIGN KEY (id_sesion) REFERENCES sesiones(id_sesion),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    UNIQUE(id_sesion, id_usuario)
);

-- 📝 JUSTIFICANTES
CREATE TABLE justificantes (
    id_justificante INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    asunto VARCHAR(100),
    descripcion TEXT,
    archivo_url VARCHAR(255),
    estado ENUM('pendiente','aprobado','rechazado') DEFAULT 'pendiente',
    fecha_limite DATE,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- ✔ VALIDACIONES
CREATE TABLE validaciones_justificantes (
    id_validacion INT AUTO_INCREMENT PRIMARY KEY,
    id_justificante INT NOT NULL,
    id_admin INT NOT NULL,
    decision ENUM('aprobado','rechazado'),
    comentario TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_justificante) REFERENCES justificantes(id_justificante),
    FOREIGN KEY (id_admin) REFERENCES usuarios(id_usuario)
);

-- 📊 LOGS
CREATE TABLE logs (
    id_log INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    accion VARCHAR(100),
    descripcion TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- ==================== DATOS DE EJEMPLO ====================

-- 👤 USUARIOS - ADMIN
INSERT INTO usuarios (nombre, apellido, correo, password, rol, direccion, estado) VALUES
('Director', 'Sistema', 'admin@secundaria.edu.mx', MD5('admin123'), 'admin', 'Av. Principal 1000, Sede Central', TRUE);

-- 👤 USUARIOS - PADRES/TUTORES
INSERT INTO usuarios (nombre, apellido, correo, password, rol, telefono, estado) VALUES
('María José', 'Pérez García', 'mariajose.perez@email.mx', MD5('padre123'), 'padre', '5551234567', TRUE),
('Carlos Alberto', 'Mendoza López', 'carlos.mendoza@email.mx', MD5('padre123'), 'padre', '5559876543', TRUE),
('Patricia', 'Rodríguez Sánchez', 'patricia.rodriguez@email.mx', MD5('padre123'), 'padre', '5554445555', TRUE),
('Juan Carlos', 'García Torres', 'juancarlos.garcia@email.mx', MD5('padre123'), 'padre', '5556667777', TRUE),
('Rosa María', 'Flores Díaz', 'rosamaria.flores@email.mx', MD5('padre123'), 'padre', '5552223333', TRUE);

-- 👤 USUARIOS - DOCENTES
INSERT INTO usuarios (nombre, apellido, correo, password, rol, direccion, telefono, estado) VALUES
('Carlos', 'Aguilar', 'carlos.aguilar@secundaria.edu.mx', MD5('docente123'), 'docente', 'Calle Secundaria 456, Apto 3B', '5558881111', TRUE),
('María', 'Bautista', 'maria.bautista@secundaria.edu.mx', MD5('docente123'), 'docente', 'Av. Educación 789, Casa 12', '5559992222', TRUE),
('Javier', 'Castillo', 'javier.castillo@secundaria.edu.mx', MD5('docente123'), 'docente', 'Calle Magisterio 321, Depto 5', '5557773333', TRUE),
('Sandra', 'Martínez', 'sandra.martinez@secundaria.edu.mx', MD5('docente123'), 'docente', 'Av. Docentes 654, Casa 8', '5554444444', TRUE),
('Roberto', 'Castillo', 'roberto.castillo@secundaria.edu.mx', MD5('docente123'), 'docente', 'Calle Magisterio 321, Depto 5', '5557773334', TRUE);

-- 👤 USUARIOS - ALUMNOS
INSERT INTO usuarios (nombre, apellido, correo, password, rol, direccion, matricula_escolar, telefono, id_tutor, estado) VALUES
('Juan', 'Pérez', '20240001@estudiantes.edu.mx', MD5('alumno123'), 'alumno', 'Calle Principal 123, Depto 4A', '20240001', '5551234567', 1, TRUE),
('Luis', 'Mendoza', '20240002@estudiantes.edu.mx', MD5('alumno123'), 'alumno', 'Av. Secundaria 456, Casa 10', '20240002', '5559876543', 2, TRUE),
('Ana', 'Rodríguez', '20240003@estudiantes.edu.mx', MD5('alumno123'), 'alumno', 'Calle Tercera 789, Apto 2C', '20240003', '5554445555', 3, TRUE),
('Miguel', 'Pérez', '20240004@estudiantes.edu.mx', MD5('alumno123'), 'alumno', 'Av. Cuarta 111, Casa 15', '20240004', '5556667777', 1, TRUE),
('Sofía', 'García', '20240005@estudiantes.edu.mx', MD5('alumno123'), 'alumno', 'Calle Quinta 222, Depto 3', '20240005', '5552223333', 4, TRUE),
('Diego', 'Flores', '20240006@estudiantes.edu.mx', MD5('alumno123'), 'alumno', 'Av. Sexta 333, Casa 20', '20240006', '5558881111', 5, TRUE),
('Daniela', 'Sánchez', '20240007@estudiantes.edu.mx', MD5('alumno123'), 'alumno', 'Calle Séptima 444, Apto 1B', '20240007', '5559992222', 3, TRUE),
('Pablo', 'Ruiz', '20240008@estudiantes.edu.mx', MD5('alumno123'), 'alumno', 'Av. Octava 555, Casa 7', '20240008', '5557773333', 2, TRUE),
('Valentina', 'Moreno', '20240009@estudiantes.edu.mx', MD5('alumno123'), 'alumno', 'Calle Novena 666, Depto 4C', '20240009', '5554444444', 4, TRUE),
('Andrés', 'Vargas', '20240010@estudiantes.edu.mx', MD5('alumno123'), 'alumno', 'Av. Décima 777, Casa 25', '20240010', '5558881112', 5, TRUE),
('Isabella', 'Torres', '20240011@estudiantes.edu.mx', MD5('alumno123'), 'alumno', 'Calle Undécima 888, Apto 2A', '20240011', '5559992223', 1, TRUE);

-- 👥 GRUPOS
INSERT INTO grupos (nombre) VALUES
('1º A'),
('1º B'),
('2º A'),
('2º B'),
('3º A'),
('3º B');

-- 📚 ASIGNATURAS
INSERT INTO asignaturas (nombre) VALUES
('Matemáticas'),
('Español'),
('Historia'),
('Ciencias Naturales'),
('Educación Física'),
('Artes'),
('Inglés'),
('Formación Cívica');

-- 🎯 CURSOS
INSERT INTO cursos (id_asignatura, id_docente, id_grupo, codigo_clase, periodo) VALUES
(3, 7, 1, 'HIST-101', '2024-2025'),  -- Historia - Carlos Aguilar - 1º A
(1, 8, 1, 'MAT-202', '2024-2025'),  -- Matemáticas - María Bautista - 1º A
(4, 9, 1, 'FIS-301', '2024-2025'),  -- Ciencias Naturales - Javier Castillo - 1º A
(2, 7, 1, 'ESP-101', '2024-2025'),  -- Español - Carlos Aguilar - 1º A
(1, 8, 2, 'MAT-103', '2024-2025'),  -- Matemáticas - María Bautista - 1º B
(2, 7, 2, 'ESP-102', '2024-2025'),  -- Español - Carlos Aguilar - 1º B
(3, 11, 3, 'HIST-201', '2024-2025'),  -- Historia - Roberto Castillo - 2º A
(4, 10, 3, 'FIS-202', '2024-2025'),  -- Ciencias - Sandra Martínez - 2º A
(5, 11, 1, 'EDF-101', '2024-2025'),  -- Educación Física - Roberto Castillo - 1º A
(6, 9, 2, 'ART-102', '2024-2025');  -- Artes - Javier Castillo - 1º B

-- 🧾 INSCRIPCIONES
INSERT INTO inscripciones (id_curso, id_alumno) VALUES
-- Curso 1 (Historia - 1º A): Juan, Luis, Ana, Miguel, Sofía
(1, 12), (1, 13), (1, 14), (1, 15), (1, 16),
-- Curso 2 (Matemáticas - 1º A): Juan, Luis, Ana, Miguel, Sofía
(2, 12), (2, 13), (2, 14), (2, 15), (2, 16),
-- Curso 3 (Ciencias - 1º A): Juan, Luis, Ana, Miguel, Sofía
(3, 12), (3, 13), (3, 14), (3, 15), (3, 16),
-- Curso 4 (Español - 1º A): Juan, Luis, Ana, Miguel, Sofía
(4, 12), (4, 13), (4, 14), (4, 15), (4, 16),
-- Curso 5 (Matemáticas - 1º B): Diego, Daniela, Pablo, Valentina
(5, 17), (5, 18), (5, 19), (5, 20),
-- Curso 6 (Español - 1º B): Diego, Daniela, Pablo, Valentina
(6, 17), (6, 18), (6, 19), (6, 20),
-- Curso 7 (Historia - 2º A): Andrés, Isabella
(7, 21), (7, 22),
-- Curso 8 (Ciencias - 2º A): Andrés, Isabella
(8, 21), (8, 22),
-- Curso 9 (Educación Física - 1º A): Todos los de 1º A
(9, 12), (9, 13), (9, 14), (9, 15), (9, 16), (9, 17), (9, 18), (9, 19), (9, 20),
-- Curso 10 (Artes - 1º B): Diego Flores (12), Daniela Sánchez (13), Pablo Ruiz (14), Valentina Moreno (15)
(10, 17), (10, 18), (10, 19), (10, 20);

-- ⏱️ SESIONES
INSERT INTO sesiones (id_curso, fecha, hora_inicio, hora_fin, codigo_actual) VALUES
-- Curso 1: Historia HIST-101 (Carlos Aguilar)
(1, '2025-05-05', '08:00:00', '09:00:00', 'HIST-101-001'),
(1, '2025-05-06', '08:00:00', '09:00:00', 'HIST-101-002'),
(1, '2025-05-07', '08:00:00', '09:00:00', 'HIST-101-003'),
-- Curso 2: Matemáticas MAT-202 (María Bautista)
(2, '2025-05-05', '09:00:00', '10:00:00', 'MAT-202-001'),
(2, '2025-05-06', '09:00:00', '10:00:00', 'MAT-202-002'),
-- Curso 3: Ciencias FIS-301 (Javier Castillo)
(3, '2025-05-05', '10:00:00', '11:00:00', 'FIS-301-001'),
(3, '2025-05-06', '10:00:00', '11:00:00', 'FIS-301-002'),
-- Curso 4: Español (Carlos Aguilar)
(4, '2025-05-05', '11:00:00', '12:00:00', 'ESP-101-001'),
-- Curso 9: Educación Física (Roberto Castillo)
(9, '2025-05-05', '14:00:00', '15:00:00', 'EDF-101-001'),
(9, '2025-05-06', '14:00:00', '15:00:00', 'EDF-101-002');

-- 📡 BEACONS
INSERT INTO beacons (id_grupo, uuid) VALUES
(1, 'f7826da6-4fa2-4e98-8024-bc5b71e0893e'),
(2, 'e2c56db5-dffb-48d2-b060-d0f4dc8db899'),
(3, 'c3f0c3ef-8784-4d02-840c-02be73f47d0d'),
(4, 'd1f5f8a6-1234-5678-abcd-ef0123456789'),
(5, 'a5f7d6c1-9876-5432-1098-fedcba098765'),
(6, 'b2c8e5d1-4321-8765-dcba-0987654321ab');

-- 🚨 INTENTOS ASISTENCIA
INSERT INTO intentos_asistencia (id_usuario, id_sesion, codigo_qr, valido) VALUES
(12, 1, 'HIST-101-001', TRUE),
(13, 1, 'HIST-101-001', TRUE),
(14, 1, 'HIST-101-001', TRUE),
(15, 1, 'HIST-101-001', FALSE),
(16, 1, 'HIST-101-001', TRUE),
(12, 2, 'HIST-101-002', TRUE),
(13, 2, 'HIST-101-002', TRUE),
(14, 2, 'HIST-101-002', TRUE),
(12, 5, 'MAT-202-002', TRUE),
(13, 5, 'MAT-202-002', TRUE);

-- 📅 ASISTENCIAS
INSERT INTO asistencias (id_sesion, id_usuario, qr_valido, bluetooth_valido, validado_docente, estado_final) VALUES
(1, 12, TRUE, TRUE, TRUE, 'presente'),
(1, 13, TRUE, TRUE, TRUE, 'presente'),
(1, 14, TRUE, FALSE, TRUE, 'presente'),
(1, 15, FALSE, FALSE, TRUE, 'falta'),
(1, 16, TRUE, TRUE, TRUE, 'presente'),
(2, 12, TRUE, TRUE, TRUE, 'presente'),
(2, 13, TRUE, TRUE, FALSE, 'dudoso'),
(2, 14, TRUE, TRUE, TRUE, 'presente'),
(2, 15, FALSE, FALSE, FALSE, 'falta'),
(2, 16, TRUE, TRUE, TRUE, 'presente'),
(5, 12, TRUE, TRUE, TRUE, 'presente'),
(5, 13, TRUE, TRUE, TRUE, 'presente');

-- 📝 JUSTIFICANTES
INSERT INTO justificantes (id_usuario, fecha_inicio, fecha_fin, asunto, descripcion, estado, fecha_limite) VALUES
(15, '2025-05-05', '2025-05-05', 'Cita Médica', 'Asistencia a consulta de rutina', 'aprobado', '2025-05-10'),
(19, '2025-04-28', '2025-04-30', 'Enfermedad', 'Gripe con fiebre alta', 'aprobado', '2025-05-05'),
(17, '2025-05-03', '2025-05-03', 'Trámite Administrativo', 'Renovación de pasaporte', 'pendiente', '2025-05-08');

-- ✔ VALIDACIONES JUSTIFICANTES
INSERT INTO validaciones_justificantes (id_justificante, id_admin, decision, comentario) VALUES
(1, 1, 'aprobado', 'Documentación válida. Justificante aceptado.'),
(2, 1, 'aprobado', 'Certificado médico presentado. Aprobado.');

-- ==================== PROCEDIMIENTOS ALMACENADOS ====================

-- 📊 REPORTE GENERAL DE ASISTENCIA TRIMESTRAL
DELIMITER $$
CREATE PROCEDURE rpt_asistencia_general_trimestral(
    IN p_trimestre INT,
    IN p_anio INT
)
BEGIN
    DECLARE v_fecha_inicio DATE;
    DECLARE v_fecha_fin DATE;
    
    -- Definir rango de fechas según trimestre
    CASE p_trimestre
        WHEN 1 THEN SET v_fecha_inicio = CONCAT(p_anio, '-01-01'), v_fecha_fin = CONCAT(p_anio, '-03-31');
        WHEN 2 THEN SET v_fecha_inicio = CONCAT(p_anio, '-04-01'), v_fecha_fin = CONCAT(p_anio, '-06-30');
        WHEN 3 THEN SET v_fecha_inicio = CONCAT(p_anio, '-07-01'), v_fecha_fin = CONCAT(p_anio, '-09-30');
        WHEN 4 THEN SET v_fecha_inicio = CONCAT(p_anio, '-10-01'), v_fecha_fin = CONCAT(p_anio, '-12-31');
        ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Trimestre inválido. Use 1, 2, 3 o 4.';
    END CASE;
    
    SELECT 
        CONCAT('Trimestre ', p_trimestre, ' - ', p_anio) AS periodo,
        COUNT(DISTINCT a.id_asistencia) AS total_registros,
        SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) AS total_presentes,
        SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) AS total_faltas,
        SUM(CASE WHEN a.estado_final = 'retardo' THEN 1 ELSE 0 END) AS total_retardos,
        SUM(CASE WHEN a.estado_final = 'dudoso' THEN 1 ELSE 0 END) AS total_dudosos,
        ROUND(SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id_asistencia) * 100, 2) AS porcentaje_asistencia,
        ROUND(SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id_asistencia) * 100, 2) AS porcentaje_faltas
    FROM asistencias a
    INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
    WHERE s.fecha BETWEEN v_fecha_inicio AND v_fecha_fin;
END$$
DELIMITER ;

-- 📊 REPORTE DE ASISTENCIA POR GRUPO TRIMESTRAL
DELIMITER $$
CREATE PROCEDURE rpt_asistencia_por_grupo_trimestral(
    IN p_trimestre INT,
    IN p_anio INT
)
BEGIN
    DECLARE v_fecha_inicio DATE;
    DECLARE v_fecha_fin DATE;
    
    -- Definir rango de fechas según trimestre
    CASE p_trimestre
        WHEN 1 THEN SET v_fecha_inicio = CONCAT(p_anio, '-01-01'), v_fecha_fin = CONCAT(p_anio, '-03-31');
        WHEN 2 THEN SET v_fecha_inicio = CONCAT(p_anio, '-04-01'), v_fecha_fin = CONCAT(p_anio, '-06-30');
        WHEN 3 THEN SET v_fecha_inicio = CONCAT(p_anio, '-07-01'), v_fecha_fin = CONCAT(p_anio, '-09-30');
        WHEN 4 THEN SET v_fecha_inicio = CONCAT(p_anio, '-10-01'), v_fecha_fin = CONCAT(p_anio, '-12-31');
        ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Trimestre inválido.';
    END CASE;
    
    SELECT 
        g.nombre AS grupo,
        COUNT(DISTINCT a.id_asistencia) AS total_registros,
        SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) AS presentes,
        SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) AS faltas,
        SUM(CASE WHEN a.estado_final = 'retardo' THEN 1 ELSE 0 END) AS retardos,
        SUM(CASE WHEN a.estado_final = 'dudoso' THEN 1 ELSE 0 END) AS dudosos,
        ROUND(SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id_asistencia) * 100, 2) AS pct_asistencia
    FROM asistencias a
    INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
    INNER JOIN cursos c ON s.id_curso = c.id_curso
    INNER JOIN grupos g ON c.id_grupo = g.id_grupo
    WHERE s.fecha BETWEEN v_fecha_inicio AND v_fecha_fin
    GROUP BY g.id_grupo, g.nombre
    ORDER BY g.nombre;
END$$
DELIMITER ;

-- 📊 REPORTE DE ASISTENCIA POR ALUMNO TRIMESTRAL
DELIMITER $$
CREATE PROCEDURE rpt_asistencia_por_alumno_trimestral(
    IN p_trimestre INT,
    IN p_anio INT,
    IN p_id_alumno INT
)
BEGIN
    DECLARE v_fecha_inicio DATE;
    DECLARE v_fecha_fin DATE;
    
    -- Definir rango de fechas según trimestre
    CASE p_trimestre
        WHEN 1 THEN SET v_fecha_inicio = CONCAT(p_anio, '-01-01'), v_fecha_fin = CONCAT(p_anio, '-03-31');
        WHEN 2 THEN SET v_fecha_inicio = CONCAT(p_anio, '-04-01'), v_fecha_fin = CONCAT(p_anio, '-06-30');
        WHEN 3 THEN SET v_fecha_inicio = CONCAT(p_anio, '-07-01'), v_fecha_fin = CONCAT(p_anio, '-09-30');
        WHEN 4 THEN SET v_fecha_inicio = CONCAT(p_anio, '-10-01'), v_fecha_fin = CONCAT(p_anio, '-12-31');
        ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Trimestre inválido.';
    END CASE;
    
    SELECT 
        CONCAT(u.nombre, ' ', u.apellido) AS alumno,
        u.correo,
        COUNT(DISTINCT a.id_asistencia) AS sesiones_registradas,
        SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) AS presentes,
        SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) AS faltas,
        SUM(CASE WHEN a.estado_final = 'retardo' THEN 1 ELSE 0 END) AS retardos,
        SUM(CASE WHEN a.estado_final = 'dudoso' THEN 1 ELSE 0 END) AS dudosos,
        ROUND(SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id_asistencia) * 100, 2) AS pct_asistencia,
        CASE 
            WHEN SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) > 5 THEN 'CRÍTICO'
            WHEN SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) > 3 THEN 'ALERTA'
            ELSE 'OK'
        END AS estado_faltas
    FROM asistencias a
    INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
    INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
    WHERE s.fecha BETWEEN v_fecha_inicio AND v_fecha_fin
    AND a.id_usuario = p_id_alumno
    GROUP BY u.id_usuario, u.nombre, u.apellido, u.correo;
END$$
DELIMITER ;

-- 📊 REPORTE DE DETALLE DE ASISTENCIA POR ALUMNO Y MATERIA
DELIMITER $$
CREATE PROCEDURE rpt_asistencia_alumno_detallado(
    IN p_id_alumno INT,
    IN p_trimestre INT,
    IN p_anio INT
)
BEGIN
    DECLARE v_fecha_inicio DATE;
    DECLARE v_fecha_fin DATE;
    
    CASE p_trimestre
        WHEN 1 THEN SET v_fecha_inicio = CONCAT(p_anio, '-01-01'), v_fecha_fin = CONCAT(p_anio, '-03-31');
        WHEN 2 THEN SET v_fecha_inicio = CONCAT(p_anio, '-04-01'), v_fecha_fin = CONCAT(p_anio, '-06-30');
        WHEN 3 THEN SET v_fecha_inicio = CONCAT(p_anio, '-07-01'), v_fecha_fin = CONCAT(p_anio, '-09-30');
        WHEN 4 THEN SET v_fecha_inicio = CONCAT(p_anio, '-10-01'), v_fecha_fin = CONCAT(p_anio, '-12-31');
        ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Trimestre inválido.';
    END CASE;
    
    SELECT 
        ass.nombre AS asignatura,
        u_doc.nombre AS docente,
        s.fecha,
        s.hora_inicio,
        a.estado_final AS estado,
        a.qr_valido,
        a.bluetooth_valido,
        a.validado_docente
    FROM asistencias a
    INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
    INNER JOIN cursos c ON s.id_curso = c.id_curso
    INNER JOIN asignaturas ass ON c.id_asignatura = ass.id_asignatura
    INNER JOIN usuarios u_doc ON c.id_docente = u_doc.id_usuario
    WHERE s.fecha BETWEEN v_fecha_inicio AND v_fecha_fin
    AND a.id_usuario = p_id_alumno
    ORDER BY s.fecha, s.hora_inicio;
END$$
DELIMITER ;

-- 📊 REPORTE DE JUSTIFICANTES Y SU IMPACTO EN ASISTENCIA
DELIMITER $$
CREATE PROCEDURE rpt_justificantes_trimestral(
    IN p_trimestre INT,
    IN p_anio INT
)
BEGIN
    DECLARE v_fecha_inicio DATE;
    DECLARE v_fecha_fin DATE;
    
    CASE p_trimestre
        WHEN 1 THEN SET v_fecha_inicio = CONCAT(p_anio, '-01-01'), v_fecha_fin = CONCAT(p_anio, '-03-31');
        WHEN 2 THEN SET v_fecha_inicio = CONCAT(p_anio, '-04-01'), v_fecha_fin = CONCAT(p_anio, '-06-30');
        WHEN 3 THEN SET v_fecha_inicio = CONCAT(p_anio, '-07-01'), v_fecha_fin = CONCAT(p_anio, '-09-30');
        WHEN 4 THEN SET v_fecha_inicio = CONCAT(p_anio, '-10-01'), v_fecha_fin = CONCAT(p_anio, '-12-31');
        ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Trimestre inválido.';
    END CASE;
    
    SELECT 
        CONCAT(u.nombre, ' ', u.apellido) AS alumno,
        j.asunto,
        j.fecha_inicio,
        j.fecha_fin,
        j.estado AS estado_justificante,
        DATEDIFF(j.fecha_fin, j.fecha_inicio) + 1 AS dias_justificados,
        CASE WHEN vj.id_validacion IS NOT NULL THEN vj.decision ELSE 'Sin validar' END AS decision_admin
    FROM justificantes j
    LEFT JOIN validaciones_justificantes vj ON j.id_justificante = vj.id_justificante
    INNER JOIN usuarios u ON j.id_usuario = u.id_usuario
    WHERE j.fecha_solicitud BETWEEN v_fecha_inicio AND v_fecha_fin
    ORDER BY u.nombre, j.fecha_inicio;
END$$
DELIMITER ;

-- 📊 REPORTE DE ALUMNOS CON FALTAS CRÍTICAS
DELIMITER $$
CREATE PROCEDURE rpt_alumnos_faltas_criticas(
    IN p_trimestre INT,
    IN p_anio INT,
    IN p_limite_faltas INT
)
BEGIN
    DECLARE v_fecha_inicio DATE;
    DECLARE v_fecha_fin DATE;
    
    CASE p_trimestre
        WHEN 1 THEN SET v_fecha_inicio = CONCAT(p_anio, '-01-01'), v_fecha_fin = CONCAT(p_anio, '-03-31');
        WHEN 2 THEN SET v_fecha_inicio = CONCAT(p_anio, '-04-01'), v_fecha_fin = CONCAT(p_anio, '-06-30');
        WHEN 3 THEN SET v_fecha_inicio = CONCAT(p_anio, '-07-01'), v_fecha_fin = CONCAT(p_anio, '-09-30');
        WHEN 4 THEN SET v_fecha_inicio = CONCAT(p_anio, '-10-01'), v_fecha_fin = CONCAT(p_anio, '-12-31');
        ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Trimestre inválido.';
    END CASE;
    
    SELECT 
        CONCAT(u.nombre, ' ', u.apellido) AS alumno,
        u.correo,
        g.nombre AS grupo,
        COUNT(DISTINCT a.id_asistencia) AS sesiones_totales,
        SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) AS total_faltas,
        ROUND(SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id_asistencia) * 100, 2) AS pct_faltas,
        CASE 
            WHEN SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) > 10 THEN '🔴 CRÍTICO'
            WHEN SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) > 5 THEN '🟠 ALERTA'
            ELSE '🟡 MONITOR'
        END AS nivel_riesgo
    FROM asistencias a
    INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
    INNER JOIN cursos c ON s.id_curso = c.id_curso
    INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
    INNER JOIN grupos g ON c.id_grupo = g.id_grupo
    WHERE s.fecha BETWEEN v_fecha_inicio AND v_fecha_fin
    AND u.rol = 'alumno'
    GROUP BY u.id_usuario, u.nombre, u.apellido, u.correo, g.id_grupo, g.nombre
    HAVING SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) >= p_limite_faltas
    ORDER BY total_faltas DESC;
END$$
DELIMITER ;

-- 📊 REPORTE DE DESEMPEÑO DE DOCENTES (Calidad de registro)
DELIMITER $$
CREATE PROCEDURE rpt_desempeno_docentes_trimestral(
    IN p_trimestre INT,
    IN p_anio INT
)
BEGIN
    DECLARE v_fecha_inicio DATE;
    DECLARE v_fecha_fin DATE;
    
    CASE p_trimestre
        WHEN 1 THEN SET v_fecha_inicio = CONCAT(p_anio, '-01-01'), v_fecha_fin = CONCAT(p_anio, '-03-31');
        WHEN 2 THEN SET v_fecha_inicio = CONCAT(p_anio, '-04-01'), v_fecha_fin = CONCAT(p_anio, '-06-30');
        WHEN 3 THEN SET v_fecha_inicio = CONCAT(p_anio, '-07-01'), v_fecha_fin = CONCAT(p_anio, '-09-30');
        WHEN 4 THEN SET v_fecha_inicio = CONCAT(p_anio, '-10-01'), v_fecha_fin = CONCAT(p_anio, '-12-31');
        ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Trimestre inválido.';
    END CASE;
    
    SELECT 
        CONCAT(u.nombre, ' ', u.apellido) AS docente,
        COUNT(DISTINCT c.id_curso) AS cursos_asignados,
        COUNT(DISTINCT s.id_sesion) AS sesiones_registradas,
        SUM(CASE WHEN a.validado_docente = TRUE THEN 1 ELSE 0 END) AS asistencias_validadas,
        ROUND(SUM(CASE WHEN a.validado_docente = TRUE THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id_asistencia) * 100, 2) AS pct_validacion,
        SUM(CASE WHEN a.estado_final = 'dudoso' THEN 1 ELSE 0 END) AS registros_dudosos
    FROM usuarios u
    INNER JOIN cursos c ON u.id_usuario = c.id_docente
    INNER JOIN sesiones s ON c.id_curso = s.id_curso
    LEFT JOIN asistencias a ON s.id_sesion = a.id_sesion
    WHERE s.fecha BETWEEN v_fecha_inicio AND v_fecha_fin
    GROUP BY u.id_usuario, u.nombre, u.apellido
    ORDER BY pct_validacion DESC;
END$$
DELIMITER ;

-- 📊 REPORTE COMPARATIVO DE TRIMESTRES
DELIMITER $$
CREATE PROCEDURE rpt_comparativo_trimestres(
    IN p_anio INT
)
BEGIN
    SELECT 
        'Trimestre 1' AS periodo,
        COUNT(DISTINCT a.id_asistencia) AS total_registros,
        SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) AS presentes,
        SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) AS faltas,
        ROUND(SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id_asistencia) * 100, 2) AS pct_asistencia
    FROM asistencias a
    INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
    WHERE s.fecha BETWEEN CONCAT(p_anio, '-01-01') AND CONCAT(p_anio, '-03-31')
    
    UNION ALL
    
    SELECT 
        'Trimestre 2',
        COUNT(DISTINCT a.id_asistencia),
        SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END),
        SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END),
        ROUND(SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id_asistencia) * 100, 2)
    FROM asistencias a
    INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
    WHERE s.fecha BETWEEN CONCAT(p_anio, '-04-01') AND CONCAT(p_anio, '-06-30')
    
    UNION ALL
    
    SELECT 
        'Trimestre 3',
        COUNT(DISTINCT a.id_asistencia),
        SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END),
        SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END),
        ROUND(SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id_asistencia) * 100, 2)
    FROM asistencias a
    INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
    WHERE s.fecha BETWEEN CONCAT(p_anio, '-07-01') AND CONCAT(p_anio, '-09-30')
    
    UNION ALL
    
    SELECT 
        'Trimestre 4',
        COUNT(DISTINCT a.id_asistencia),
        SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END),
        SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END),
        ROUND(SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id_asistencia) * 100, 2)
    FROM asistencias a
    INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
    WHERE s.fecha BETWEEN CONCAT(p_anio, '-10-01') AND CONCAT(p_anio, '-12-31');
END$$
DELIMITER ;

-- 🔐 AUTENTICACIÓN: VALIDAR LOGIN
DELIMITER $$
CREATE PROCEDURE login_validar(
    IN p_correo VARCHAR(100),
    IN p_password VARCHAR(255),
    IN p_rol VARCHAR(50)
)
BEGIN
    DECLARE v_rol_bd VARCHAR(20);
    
    -- Mapear roles del frontend a la BD
    IF p_rol = 'Profesor' THEN
        SET v_rol_bd = 'docente';
    ELSEIF p_rol = 'Padre de familia' THEN
        SET v_rol_bd = 'padre';
    ELSEIF p_rol = 'Prefectura' THEN
        SET v_rol_bd = 'admin';
    ELSE
        SET v_rol_bd = p_rol;
    END IF;
    
    SELECT 
        id_usuario,
        nombre,
        apellido,
        correo,
        rol,
        estado,
        CASE WHEN password = MD5(p_password) THEN TRUE ELSE FALSE END AS password_valido
    FROM usuarios
    WHERE correo = p_correo 
    AND rol = v_rol_bd
    AND estado = TRUE
    LIMIT 1;
END$$
DELIMITER ;

-- 📚 OBTENER CÓDIGOS DE CLASE DISPONIBLES PARA ALUMNO
DELIMITER $$
CREATE PROCEDURE obtener_codigos_clase_disponibles()
BEGIN
    SELECT 
        c.codigo_clase,
        CONCAT(a.nombre, ' (', g.nombre, ')') AS nombre_clase,
        CONCAT(u.nombre, ' ', u.apellido) AS docente,
        c.periodo
    FROM cursos c
    INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
    INNER JOIN usuarios u ON c.id_docente = u.id_usuario
    INNER JOIN grupos g ON c.id_grupo = g.id_grupo
    WHERE c.periodo = (SELECT MAX(periodo) FROM cursos)
    ORDER BY c.codigo_clase;
END$$
DELIMITER ;

-- 📋 OBTENER CLASES INSCRITAS DE UN ALUMNO
DELIMITER $$
CREATE PROCEDURE obtener_clases_alumno(
    IN p_id_alumno INT
)
BEGIN
    SELECT 
        c.id_curso,
        c.codigo_clase,
        a.nombre AS asignatura,
        CONCAT(u.nombre, ' ', u.apellido) AS docente,
        g.nombre AS grupo,
        c.periodo
    FROM inscripciones i
    INNER JOIN cursos c ON i.id_curso = c.id_curso
    INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
    INNER JOIN usuarios u ON c.id_docente = u.id_usuario
    INNER JOIN grupos g ON c.id_grupo = g.id_grupo
    WHERE i.id_alumno = p_id_alumno
    ORDER BY a.nombre;
END$$
DELIMITER ;

-- 👨‍🎓 OBTENER INFORMACIÓN COMPLETA DEL ALUMNO
DELIMITER $$
CREATE PROCEDURE obtener_perfil_alumno(
    IN p_id_alumno INT
)
BEGIN
    SELECT 
        u.id_usuario,
        CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo,
        u.nombre,
        u.apellido,
        u.correo,
        u.matricula_escolar,
        u.direccion,
        u.telefono,
        CONCAT(u_tutor.nombre, ' ', u_tutor.apellido) AS tutor_nombre,
        u_tutor.telefono AS tutor_telefono,
        u_tutor.correo AS tutor_correo,
        COUNT(DISTINCT i.id_curso) AS total_materias,
        ROUND(AVG(CASE WHEN a.estado_final = 'presente' THEN 100 ELSE 0 END), 2) AS pct_asistencia_promedio
    FROM usuarios u
    LEFT JOIN usuarios u_tutor ON u.id_tutor = u_tutor.id_usuario
    LEFT JOIN inscripciones i ON u.id_usuario = i.id_alumno
    LEFT JOIN asistencias a ON u.id_usuario = a.id_usuario
    WHERE u.id_usuario = p_id_alumno
    AND u.rol = 'alumno'
    GROUP BY u.id_usuario, u.nombre, u.apellido, u.correo, u.matricula_escolar, 
             u.direccion, u.telefono, u_tutor.nombre, u_tutor.apellido, u_tutor.telefono, u_tutor.correo;
END$$
DELIMITER ;

-- ==================== VISTAS ÚTILES ====================

-- Vista: Resumen de Asistencia Reciente
CREATE OR REPLACE VIEW vw_resumen_asistencia_reciente AS
SELECT 
    u.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS alumno,
    g.nombre AS grupo,
    COUNT(DISTINCT a.id_asistencia) AS sesiones_registradas,
    SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) AS presentes,
    SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) AS faltas,
    ROUND(SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id_asistencia) * 100, 2) AS pct_asistencia
FROM asistencias a
INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
INNER JOIN cursos c ON s.id_curso = c.id_curso
INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
INNER JOIN grupos g ON c.id_grupo = g.id_grupo
WHERE s.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY u.id_usuario, u.nombre, u.apellido, g.id_grupo, g.nombre;

-- Vista: Cursos Activos con Cantidad de Alumnos
CREATE OR REPLACE VIEW vw_cursos_activos AS
SELECT 
    c.id_curso,
    c.codigo_clase,
    a.nombre AS asignatura,
    CONCAT(u.nombre, ' ', u.apellido) AS docente,
    g.nombre AS grupo,
    COUNT(i.id_inscripcion) AS cantidad_alumnos
FROM cursos c
INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
INNER JOIN usuarios u ON c.id_docente = u.id_usuario
INNER JOIN grupos g ON c.id_grupo = g.id_grupo
LEFT JOIN inscripciones i ON c.id_curso = i.id_curso
GROUP BY c.id_curso, c.codigo_clase, a.nombre, u.id_usuario, u.nombre, u.apellido, g.nombre;

-- Vista: Clases de un Alumno (para formulario de unirse a clase)
CREATE OR REPLACE VIEW vw_clases_disponibles_alumno AS
SELECT 
    c.codigo_clase,
    a.nombre AS nombre_asignatura,
    CONCAT(u.nombre, ' ', u.apellido) AS docente,
    g.nombre AS grupo,
    c.periodo
FROM cursos c
INNER JOIN asignaturas a ON c.id_asignatura = a.id_asignatura
INNER JOIN usuarios u ON c.id_docente = u.id_usuario
INNER JOIN grupos g ON c.id_grupo = g.id_grupo
WHERE c.periodo = (SELECT MAX(periodo) FROM cursos);

-- Vista: Perfil Completo del Alumno con Tutor
CREATE OR REPLACE VIEW vw_perfil_alumno_completo AS
SELECT 
    u.id_usuario,
    u.nombre,
    u.apellido,
    u.correo,
    u.matricula_escolar,
    u.direccion,
    u.telefono,
    CONCAT(u_tutor.nombre, ' ', u_tutor.apellido) AS tutor_nombre,
    u_tutor.telefono AS tutor_telefono,
    g.nombre AS grupo
FROM usuarios u
LEFT JOIN usuarios u_tutor ON u.id_tutor = u_tutor.id_usuario
LEFT JOIN inscripciones i ON u.id_usuario = i.id_alumno
LEFT JOIN cursos c ON i.id_curso = c.id_curso
LEFT JOIN grupos g ON c.id_grupo = g.id_grupo
WHERE u.rol = 'alumno';

-- ==================== TABLAS AUXILIARES DOCENTE ====================

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

-- Datos de ejemplo para que el panel docente tenga horarios visibles.
INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin) VALUES
(1, 'Lunes', '08:00:00', '09:00:00'),
(1, 'Miércoles', '08:00:00', '09:00:00'),
(2, 'Lunes', '09:00:00', '10:00:00'),
(2, 'Miércoles', '09:00:00', '10:00:00'),
(3, 'Martes', '10:00:00', '11:00:00'),
(3, 'Jueves', '10:00:00', '11:00:00'),
(4, 'Viernes', '11:00:00', '12:00:00'),
(5, 'Martes', '09:00:00', '10:00:00'),
(5, 'Jueves', '09:00:00', '10:00:00'),
(6, 'Lunes', '10:00:00', '11:00:00'),
(7, 'Martes', '08:00:00', '09:00:00'),
(8, 'Jueves', '10:00:00', '11:00:00'),
(9, 'Viernes', '14:00:00', '15:00:00'),
(10, 'Viernes', '12:00:00', '13:00:00');

-- Solicitudes pendientes para probar aceptar/rechazar desde "Mis Clases".
INSERT IGNORE INTO solicitudes_inscripcion (id_curso, id_alumno, estado) VALUES
(1, 21, 'pendiente'),
(2, 22, 'pendiente'),
(5, 12, 'pendiente'),
(7, 17, 'pendiente');
