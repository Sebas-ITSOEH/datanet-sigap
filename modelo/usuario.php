<?php

require_once __DIR__ . '/conexion.php';

class Usuario
{
    private $db;

    public function __construct()
    {
        $this->db = Conexion::conectar();
    }

    public function autenticar($correo, $password, $rolFrontend)
    {
        $rol = $this->mapearRol($rolFrontend);

        $stmt = $this->db->prepare(
            'SELECT id_usuario, nombre, apellido, correo, password, rol, estado
             FROM usuarios
             WHERE correo = :correo AND rol = :rol AND estado = TRUE
             LIMIT 1'
        );
        $stmt->execute([
            ':correo' => $correo,
            ':rol' => $rol,
        ]);

        $usuario = $stmt->fetch();
        if (!$usuario || !$this->passwordValido($password, $usuario['password'])) {
            return null;
        }

        unset($usuario['password']);
        return $usuario;
    }

    public function registrar(array $datos)
    {
        $this->validarCorreoDisponible($datos['correo']);

        $this->db->beginTransaction();

        try {
            $idTutor = null;
            if ($datos['rol'] === 'alumno') {
                $idTutor = $this->crearTutor($datos['tutor']);
            }

            $stmt = $this->db->prepare(
                'INSERT INTO usuarios
                    (nombre, apellido, correo, password, rol, direccion, matricula_escolar, telefono, id_tutor, estado)
                 VALUES
                    (:nombre, :apellido, :correo, :password, :rol, :direccion, :matricula, :telefono, :id_tutor, TRUE)'
            );

            $stmt->execute([
                ':nombre' => $datos['nombre'],
                ':apellido' => $datos['apellido'],
                ':correo' => $datos['correo'],
                ':password' => password_hash($datos['password'], PASSWORD_DEFAULT),
                ':rol' => $datos['rol'],
                ':direccion' => $datos['direccion'] ?? null,
                ':matricula' => $datos['rol'] === 'alumno' ? ($datos['matricula_escolar'] ?? null) : null,
                ':telefono' => $datos['telefono'] ?? null,
                ':id_tutor' => $idTutor,
            ]);

            $idUsuario = (int) $this->db->lastInsertId();
            $this->db->commit();

            return $idUsuario;
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    private function crearTutor(array $tutor)
    {
        $this->validarCorreoDisponible($tutor['correo']);

        $stmt = $this->db->prepare(
            'INSERT INTO usuarios
                (nombre, apellido, correo, password, rol, telefono, estado)
             VALUES
                (:nombre, :apellido, :correo, :password, "padre", :telefono, TRUE)'
        );

        $stmt->execute([
            ':nombre' => $tutor['nombre'],
            ':apellido' => $tutor['apellido'],
            ':correo' => $tutor['correo'],
            ':password' => password_hash($tutor['password'], PASSWORD_DEFAULT),
            ':telefono' => $tutor['telefono'] ?? null,
        ]);

        return (int) $this->db->lastInsertId();
    }

    private function validarCorreoDisponible($correo)
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM usuarios WHERE correo = :correo');
        $stmt->execute([':correo' => $correo]);

        if ((int) $stmt->fetchColumn() > 0) {
            throw new RuntimeException('El correo ya esta registrado.');
        }
    }

    private function passwordValido($passwordIngresado, $passwordBd)
    {
        if (password_verify($passwordIngresado, $passwordBd)) {
            return true;
        }

        return hash_equals($passwordBd, md5($passwordIngresado));
    }

    private function mapearRol($rolFrontend)
    {
        $roles = [
            'Profesor' => 'docente',
            'Padre de familia' => 'padre',
            'Prefectura' => 'admin',
            'Alumno' => 'alumno',
        ];

        return $roles[$rolFrontend] ?? strtolower($rolFrontend);
    }
}
