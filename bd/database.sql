DROP DATABASE IF EXISTS datanet;

CREATE DATABASE IF NOT EXISTS datanet;

USE datanet;
-- =========================================
-- 👤 USUARIOS (SOLO 3 ROLES)
-- =========================================
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('admin','docente','alumno') NOT NULL,
    
    -- 🔄 CAMPOS COMUNES
    curp VARCHAR(18) UNIQUE,
    
    -- 🎓 CAMPOS EXCLUSIVOS DE ALUMNO
    matricula_escolar VARCHAR(20) UNIQUE,
    telefono VARCHAR(20),  -- Teléfono del tutor
    
    -- 👩‍🏫 CAMPOS DE DOCENTE Y ADMIN (PREFECTO)
    clave_docente VARCHAR(20) UNIQUE,
    nss VARCHAR(11) UNIQUE,
    rfc VARCHAR(13) UNIQUE,
    
    -- ✅ Estado
    estado BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 👥 GRUPOS
CREATE TABLE grupos (
    id_grupo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(10) NOT NULL
);

-- 📚 ASIGNATURAS
CREATE TABLE asignaturas (
    id_asignatura INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

-- 🎯 CURSOS
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

-- 🧾 INSCRIPCIONES
CREATE TABLE inscripciones (
    id_inscripcion INT AUTO_INCREMENT PRIMARY KEY,
    id_curso INT NOT NULL,
    id_alumno INT NOT NULL,
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_curso) REFERENCES cursos(id_curso),
    FOREIGN KEY (id_alumno) REFERENCES usuarios(id_usuario),
    UNIQUE(id_curso, id_alumno)
);

-- ⏱️ SESIONES
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
    estado_final ENUM('presente','falta','retardo','dudoso') DEFAULT 'falta',
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

-- ==================== TABLAS AUXILIARES ====================

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

-- =========================================
-- 📥 DATOS DE EJEMPLO (SHA2)
-- =========================================

-- 👤 ADMIN (PREFECTO) - ID 1
INSERT INTO usuarios (nombre, apellido, correo, password, rol, curp, clave_docente, nss, rfc, estado) VALUES
('Director', 'Sistema', 'admin@secgralbj.edu.mx', SHA2('admin123', 256), 'admin', 
 'DISA800101HDFRZN01', 'DSMX', '12345678901', 'DISA800101HDF', TRUE);

-- 👩‍🏫 DOCENTES - IDs 2 al 6
INSERT INTO usuarios (nombre, apellido, correo, password, rol, curp, clave_docente, nss, rfc, estado) VALUES
('Ana María', 'Rodríguez Juárez', 'ana.rodriguez@secgralbj.edu.mx', SHA2('Docente2024!', 256), 'docente', 
 'ROJA800315MDFZNN09', 'AMRJ', '23456789012', 'ROJA800315MDF', TRUE),
 
('Carlos', 'Aguilar Martínez', 'carlos.aguilar@secgralbj.edu.mx', SHA2('Docente2024!', 256), 'docente', 
 'AUMC750620HDFGRL08', 'CAMZ', '34567890123', 'AUMC750620HDF', TRUE),
 
('María', 'Bautista López', 'maria.bautista@secgralbj.edu.mx', SHA2('Docente2024!', 256), 'docente', 
 'BALM820405MDFTZS03', 'MBLA', '45678901234', 'BALM820405MDF', TRUE),

('Javier', 'Castillo Ruiz', 'javier.castillo@secgralbj.edu.mx', SHA2('Docente2024!', 256), 'docente', 
 'CARJ780912HDFZSV06', 'JCRZ', '56789012345', 'CARJ780912HDF', TRUE),

('Sandra', 'Martínez Díaz', 'sandra.martinez@secgralbj.edu.mx', SHA2('Docente2024!', 256), 'docente', 
 'MADS850730MDFRTN02', 'SMDZ', '67890123456', 'MADS850730MDF', TRUE);

-- 🎓 ALUMNOS - IDs 7 al 17
INSERT INTO usuarios (nombre, apellido, correo, password, rol, curp, matricula_escolar, telefono, estado) VALUES
('Juan Carlos', 'Hernández López', '20240001@secgralbj.edu.mx', SHA2('Alumno2024!', 256), 'alumno', 
 'HELJ050215HDFRNLA2', '20240001', '5512345678', TRUE),

('Luis Ángel', 'Mendoza Pérez', '20240002@secgralbj.edu.mx', SHA2('Alumno2024!', 256), 'alumno', 
 'MEPL060720HDFNRSA3', '20240002', '5559876543', TRUE),

('Ana Patricia', 'Rodríguez Sánchez', '20240003@secgralbj.edu.mx', SHA2('Alumno2024!', 256), 'alumno', 
 'ROSA070315MDFDHNA4', '20240003', '5554445555', TRUE),

('Miguel Ángel', 'Pérez García', '20240004@secgralbj.edu.mx', SHA2('Alumno2024!', 256), 'alumno', 
 'PEGA080922HDFRRGA5', '20240004', '5556667777', TRUE),

('Sofía', 'García Flores', '20240005@secgralbj.edu.mx', SHA2('Alumno2024!', 256), 'alumno', 
 'GAFS090114MDFRLRA6', '20240005', '5552223333', TRUE),

('Diego', 'Flores Díaz', '20240006@secgralbj.edu.mx', SHA2('Alumno2024!', 256), 'alumno', 
 'FLDD100806HDFRZGA7', '20240006', '5558881111', TRUE),

('Daniela', 'Sánchez Ruiz', '20240007@secgralbj.edu.mx', SHA2('Alumno2024!', 256), 'alumno', 
 'SARD110323MDFNZNA8', '20240007', '5559992222', TRUE),

('Pablo', 'Ruiz Moreno', '20240008@secgralbj.edu.mx', SHA2('Alumno2024!', 256), 'alumno', 
 'RUMP121212HDFZRBA9', '20240008', '5557773333', TRUE),

('Valentina', 'Moreno Vargas', '20240009@secgralbj.edu.mx', SHA2('Alumno2024!', 256), 'alumno', 
 'MOVV130505MDFRRGA0', '20240009', '5554444444', TRUE),

('Andrés', 'Vargas Torres', '20240010@secgralbj.edu.mx', SHA2('Alumno2024!', 256), 'alumno', 
 'VATA140830HDFRRRA1', '20240010', '5558881112', TRUE),

('Isabella', 'Torres García', '20240011@secgralbj.edu.mx', SHA2('Alumno2024!', 256), 'alumno', 
 'TOGA150918MDFRRSA2', '20240011', '5559992223', TRUE);

-- 👥 GRUPOS
INSERT INTO grupos (nombre) VALUES
('1º A'), ('1º B'), ('2º A'), ('2º B'), ('3º A'), ('3º B');

-- 📚 ASIGNATURAS
INSERT INTO asignaturas (nombre) VALUES
('Matemáticas'), ('Español'), ('Historia'), ('Ciencias Naturales'),
('Educación Física'), ('Artes'), ('Inglés'), ('Formación Cívica');

-- 🎯 CURSOS
INSERT INTO cursos (id_asignatura, id_docente, id_grupo, codigo_clase, periodo) VALUES
(3, 3, 1, 'HIST-101', '2024-2025'),
(1, 4, 1, 'MAT-202', '2024-2025'),
(4, 5, 1, 'FIS-301', '2024-2025'),
(2, 3, 1, 'ESP-101', '2024-2025'),
(1, 4, 2, 'MAT-103', '2024-2025'),
(2, 3, 2, 'ESP-102', '2024-2025'),
(3, 2, 3, 'HIST-201', '2024-2025'),
(4, 6, 3, 'FIS-202', '2024-2025'),
(5, 2, 1, 'EDF-101', '2024-2025'),
(6, 5, 2, 'ART-102', '2024-2025');

-- 🧾 INSCRIPCIONES
INSERT INTO inscripciones (id_curso, id_alumno) VALUES
(1, 7), (1, 8), (1, 9), (1, 10), (1, 11),
(2, 7), (2, 8), (2, 9), (2, 10), (2, 11),
(3, 7), (3, 8), (3, 9), (3, 10), (3, 11),
(4, 7), (4, 8), (4, 9), (4, 10), (4, 11),
(5, 12), (5, 13), (5, 14), (5, 15),
(6, 12), (6, 13), (6, 14), (6, 15),
(7, 16), (7, 17),
(8, 16), (8, 17),
(9, 7), (9, 8), (9, 9), (9, 10), (9, 11), (9, 12), (9, 13), (9, 14), (9, 15),
(10, 12), (10, 13), (10, 14), (10, 15);

-- ⏱️ SESIONES
INSERT INTO sesiones (id_curso, fecha, hora_inicio, hora_fin, codigo_actual) VALUES
(1, '2025-05-05', '08:00:00', '09:00:00', 'HIST-101-001'),
(1, '2025-05-06', '08:00:00', '09:00:00', 'HIST-101-002'),
(2, '2025-05-05', '09:00:00', '10:00:00', 'MAT-202-001'),
(3, '2025-05-05', '10:00:00', '11:00:00', 'FIS-301-001'),
(4, '2025-05-05', '11:00:00', '12:00:00', 'ESP-101-001'),
(9, '2025-05-05', '14:00:00', '15:00:00', 'EDF-101-001');

-- 📡 BEACONS
INSERT INTO beacons (id_grupo, uuid) VALUES
(1, 'f7826da6-4fa2-4e98-8024-bc5b71e0893e'),
(2, 'e2c56db5-dffb-48d2-b060-d0f4dc8db899'),
(3, 'c3f0c3ef-8784-4d02-840c-02be73f47d0d');

-- 🚨 INTENTOS ASISTENCIA
INSERT INTO intentos_asistencia (id_usuario, id_sesion, codigo_qr, valido) VALUES
(7, 1, 'HIST-101-001', TRUE),
(8, 1, 'HIST-101-001', TRUE),
(9, 1, 'HIST-101-001', TRUE),
(10, 1, 'HIST-101-001', FALSE),
(11, 1, 'HIST-101-001', TRUE);

-- 📅 ASISTENCIAS
INSERT INTO asistencias (id_sesion, id_usuario, qr_valido, bluetooth_valido, validado_docente, estado_final) VALUES
(1, 7, TRUE, TRUE, TRUE, 'presente'),
(1, 8, TRUE, TRUE, TRUE, 'presente'),
(1, 9, TRUE, FALSE, TRUE, 'presente'),
(1, 10, FALSE, FALSE, TRUE, 'falta'),
(1, 11, TRUE, TRUE, TRUE, 'presente'),
(2, 7, TRUE, TRUE, TRUE, 'presente'),
(2, 8, TRUE, TRUE, FALSE, 'dudoso'),
(3, 7, TRUE, TRUE, TRUE, 'presente'),
(3, 8, TRUE, TRUE, TRUE, 'presente');

-- 📝 JUSTIFICANTES
INSERT INTO justificantes (id_usuario, fecha_inicio, fecha_fin, asunto, descripcion, estado, fecha_limite) VALUES
(10, '2025-05-05', '2025-05-05', 'Cita Médica', 'Asistencia a consulta de rutina', 'aprobado', '2025-05-10');

-- ✔ VALIDACIONES JUSTIFICANTES
INSERT INTO validaciones_justificantes (id_justificante, id_admin, decision, comentario) VALUES
(1, 1, 'aprobado', 'Documentación válida. Justificante aceptado.');

-- ==================== HORARIOS ====================

INSERT IGNORE INTO horarios_cursos (id_curso, dia_semana, hora_inicio, hora_fin) VALUES
(1, 'Lunes', '08:00:00', '09:00:00'),
(1, 'Miércoles', '08:00:00', '09:00:00'),
(2, 'Lunes', '09:00:00', '10:00:00'),
(2, 'Miércoles', '09:00:00', '10:00:00'),
(3, 'Martes', '10:00:00', '11:00:00'),
(3, 'Jueves', '10:00:00', '11:00:00'),
(4, 'Viernes', '11:00:00', '12:00:00'),
(5, 'Martes', '09:00:00', '10:00:00'),
(6, 'Lunes', '10:00:00', '11:00:00'),
(7, 'Martes', '08:00:00', '09:00:00'),
(8, 'Jueves', '10:00:00', '11:00:00'),
(9, 'Viernes', '14:00:00', '15:00:00'),
(10, 'Viernes', '12:00:00', '13:00:00');

-- ==================== SOLICITUDES PENDIENTES ====================

INSERT IGNORE INTO solicitudes_inscripcion (id_curso, id_alumno, estado) VALUES
(1, 16, 'pendiente'),
(2, 17, 'pendiente');

-- =========================================
-- 🔐 PROCEDIMIENTO login_validar (SHA2)
-- =========================================

DELIMITER $$
CREATE PROCEDURE login_validar(
    IN p_correo VARCHAR(100),
    IN p_password VARCHAR(255)
)
BEGIN
    SELECT 
        id_usuario,
        nombre,
        apellido,
        correo,
        rol,
        estado,
        CASE WHEN password = SHA2(p_password, 256) THEN TRUE ELSE FALSE END AS password_valido
    FROM usuarios
    WHERE correo = p_correo 
    AND estado = TRUE
    LIMIT 1;
END$$
DELIMITER ;

-- =========================================
-- 📊 REPORTE GENERAL DE ASISTENCIA TRIMESTRAL
-- =========================================

DELIMITER $$
CREATE PROCEDURE rpt_asistencia_general_trimestral(
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
        CONCAT('Trimestre ', p_trimestre, ' - ', p_anio) AS periodo,
        COUNT(DISTINCT a.id_asistencia) AS total_registros,
        SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) AS total_presentes,
        SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) AS total_faltas,
        SUM(CASE WHEN a.estado_final = 'retardo' THEN 1 ELSE 0 END) AS total_retardos,
        ROUND(SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id_asistencia) * 100, 2) AS porcentaje_asistencia
    FROM asistencias a
    INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
    WHERE s.fecha BETWEEN v_fecha_inicio AND v_fecha_fin;
END$$
DELIMITER ;

-- =========================================
-- 📊 REPORTE POR GRUPO
-- =========================================

DELIMITER $$
CREATE PROCEDURE rpt_asistencia_por_grupo_trimestral(
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
        g.nombre AS grupo,
        COUNT(DISTINCT a.id_asistencia) AS total_registros,
        SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) AS presentes,
        SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) AS faltas,
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

-- =========================================
-- 📊 REPORTE POR ALUMNO
-- =========================================

DELIMITER $$
CREATE PROCEDURE rpt_asistencia_por_alumno_trimestral(
    IN p_trimestre INT,
    IN p_anio INT,
    IN p_id_alumno INT
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
        u.matricula_escolar AS matricula,
        u.telefono AS telefono_tutor,
        COUNT(DISTINCT a.id_asistencia) AS sesiones_registradas,
        SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) AS presentes,
        SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) AS faltas,
        ROUND(SUM(CASE WHEN a.estado_final = 'presente' THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id_asistencia) * 100, 2) AS pct_asistencia
    FROM asistencias a
    INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
    INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
    WHERE s.fecha BETWEEN v_fecha_inicio AND v_fecha_fin
    AND a.id_usuario = p_id_alumno
    GROUP BY u.id_usuario, u.nombre, u.apellido, u.correo, u.matricula_escolar, u.telefono;
END$$
DELIMITER ;

-- =========================================
-- 📊 ALUMNOS CON FALTAS CRÍTICAS
-- =========================================

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
        u.telefono AS telefono_tutor,
        g.nombre AS grupo,
        COUNT(DISTINCT a.id_asistencia) AS sesiones_totales,
        SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) AS total_faltas,
        ROUND(SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) / COUNT(DISTINCT a.id_asistencia) * 100, 2) AS pct_faltas
    FROM asistencias a
    INNER JOIN sesiones s ON a.id_sesion = s.id_sesion
    INNER JOIN cursos c ON s.id_curso = c.id_curso
    INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
    INNER JOIN grupos g ON c.id_grupo = g.id_grupo
    WHERE s.fecha BETWEEN v_fecha_inicio AND v_fecha_fin
    AND u.rol = 'alumno'
    GROUP BY u.id_usuario, u.nombre, u.apellido, u.correo, u.telefono, g.id_grupo, g.nombre
    HAVING SUM(CASE WHEN a.estado_final = 'falta' THEN 1 ELSE 0 END) >= p_limite_faltas
    ORDER BY total_faltas DESC;
END$$
DELIMITER ;

-- =========================================
-- 📚 PROCEDIMIENTOS PARA ALUMNO
-- =========================================

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
        u.curp,
        u.telefono AS telefono_tutor,
        COUNT(DISTINCT i.id_curso) AS total_materias
    FROM usuarios u
    LEFT JOIN inscripciones i ON u.id_usuario = i.id_alumno
    WHERE u.id_usuario = p_id_alumno
    AND u.rol = 'alumno'
    GROUP BY u.id_usuario, u.nombre, u.apellido, u.correo, u.matricula_escolar, u.curp, u.telefono;
END$$
DELIMITER ;

-- =========================================
-- 👁️ VISTAS
-- =========================================

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

CREATE OR REPLACE VIEW vw_perfil_alumno_completo AS
SELECT 
    u.id_usuario,
    u.nombre,
    u.apellido,
    u.correo,
    u.matricula_escolar,
    u.curp,
    u.telefono AS telefono_tutor,
    g.nombre AS grupo
FROM usuarios u
LEFT JOIN inscripciones i ON u.id_usuario = i.id_alumno
LEFT JOIN cursos c ON i.id_curso = c.id_curso
LEFT JOIN grupos g ON c.id_grupo = g.id_grupo
WHERE u.rol = 'alumno';


-- REGISTROS DE PRUEBA PARA SOLICITUD
-- 1. Justificante de 3 días (Lunes a Miércoles) para el alumno ID 7 (Juan Carlos)
-- Esto afectará sus clases de Lunes (Matemáticas, Español), Martes (Historia) y Miércoles (Matemáticas, Español)
INSERT INTO justificantes (id_usuario, fecha_inicio, fecha_fin, asunto, descripcion, estado, fecha_limite) 
VALUES (7, '2024-10-14', '2024-10-16', 'Motivos de Salud', 'Infección estomacal severa, se receta reposo absoluto por 3 días.', 'pendiente', '2024-10-20');

-- 2. Justificante de 1 día (Martes) para el alumno ID 8 (Luis Ángel)
-- Esto afectará solo sus clases del Martes (Historia)
INSERT INTO justificantes (id_usuario, fecha_inicio, fecha_fin, asunto, descripcion, estado, fecha_limite) 
VALUES (8, '2024-10-15', '2024-10-15', 'Asunto Familiar', 'Cita para trámite de pasaporte y visa fuera de la ciudad.', 'pendiente', '2024-10-20');

-- 3. Justificante de 2 días (Jueves y Viernes) para el alumno ID 12 (Sofía)
-- Esto afectará sus clases del Jueves y Viernes
INSERT INTO justificantes (id_usuario, fecha_inicio, fecha_fin, asunto, descripcion, estado, fecha_limite) 
VALUES (12, '2024-10-17', '2024-10-18', 'Competencia Deportiva', 'Torneo estatal de atletismo representando a la institución.', 'aprobado', '2024-10-25');

select * from usuarios;