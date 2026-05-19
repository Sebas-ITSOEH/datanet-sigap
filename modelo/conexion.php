<?php

class Conexion
{
    private const HOST = 'localhost';
    private const DB_NAME = 'datanet';
    private const USER = '';
    private const PASSWORD = '';
    private const CHARSET = 'utf8mb4';

    private static $conexion = null;

    public static function conectar()
    {
        if (self::$conexion === null) {
            $dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=%s',
                self::HOST,
                self::DB_NAME,
                self::CHARSET
            );

            self::$conexion = new PDO($dsn, self::USER, self::PASSWORD, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }

        return self::$conexion;
    }
}
