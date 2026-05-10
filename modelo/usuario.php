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
        $stmt->execute([':correo' => $correo, ':rol' => $rol]);

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

        $stmt = $this->db->prepare(
            'INSERT INTO usuarios
                (nombre, apellido, correo, password, rol, curp, matricula_escolar, telefono, clave_docente, nss, rfc, estado)
             VALUES
                (:nombre, :apellido, :correo, :password, :rol, :curp, :matricula, :telefono, :clave_docente, :nss, :rfc, TRUE)'
        );

        $stmt->execute([
            ':nombre'    => $datos['nombre'],
            ':apellido'  => $datos['apellido'],
            ':correo'    => $datos['correo'],
            ':password'  => password_hash($datos['password'], PASSWORD_DEFAULT),
            ':rol'       => $datos['rol'],
            ':curp'      => $datos['curp'] ?? null,
            ':matricula' => $datos['rol'] === 'alumno' ? ($datos['matricula_escolar'] ?? null) : null,
            ':telefono'  => $datos['rol'] === 'alumno' ? ($datos['telefono'] ?? null) : null,
            ':clave_docente' => $datos['rol'] === 'docente' ? ($datos['clave_docente'] ?? null) : null,
            ':nss'       => $datos['rol'] === 'docente' ? ($datos['nss'] ?? null) : null,
            ':rfc'       => $datos['rol'] === 'docente' ? ($datos['rfc'] ?? null) : null,
        ]);

        return (int) $this->db->lastInsertId();
    }

    private function validarCorreoDisponible($correo)
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM usuarios WHERE correo = :correo');
        $stmt->execute([':correo' => $correo]);
        if ((int) $stmt->fetchColumn() > 0) {
            throw new RuntimeException('El correo ya está registrado.');
        }
    }

    private function passwordValido($passwordIngresado, $passwordBd)
    {
        if (password_verify($passwordIngresado, $passwordBd)) return true;
        return hash_equals($passwordBd, hash('sha256', $passwordIngresado));
    }

    private function mapearRol($rolFrontend)
    {
        $roles = ['Profesor' => 'docente', 'Prefectura' => 'admin', 'Alumno' => 'alumno'];
        return $roles[$rolFrontend] ?? strtolower($rolFrontend);
    }
}