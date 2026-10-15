<?php

namespace App\Libraries;

class Busqueda
{

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
