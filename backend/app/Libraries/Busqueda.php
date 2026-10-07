<?php

namespace App\Libraries;

/**
 * Ayudas para las búsquedas de los listados.
 */
class Busqueda
{
    /**
     * Condición SQL (para usar con orWhere($sql, null, false)) que encuentra a una persona por su nombre
     * completo, escrito en cualquier orden y con cualquier parte: "Juan Olmos", "olmos regalado juan".
     * Cada palabra escrita debe aparecer en "nombres + apellido paterno + apellido materno".
     * Las búsquedas por campo suelto (LIKE en cada columna) no la encuentran cuando se mezclan campos.
     */
    public static function nombreCompleto(string $buscar, string $nombres, string $paterno, string $materno): string
    {
        $db = \Config\Database::connect();
        $palabras = preg_split('/\s+/u', trim($buscar), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if ($palabras === []) {
            return '1 = 0';
        }

        $completo = "CONCAT_WS(' ', {$nombres}, {$paterno}, {$materno})";
        $condiciones = array_map(
            static fn (string $palabra): string => "{$completo} LIKE '%" . $db->escapeLikeString($palabra) . "%' ESCAPE '!'",
            $palabras
        );

        return '(' . implode(' AND ', $condiciones) . ')';
    }
}
