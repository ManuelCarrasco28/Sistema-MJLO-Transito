<?php

namespace App\Libraries;

class Placa
{
    public static function normalizar(?string $valor): string
    {
        $texto = strtoupper(trim((string) $valor));
        if ($texto === '' || preg_match('/^SIN[-_ ]?PLACA/', $texto)) {
            return $texto;
        }

        return preg_replace('/[^A-Z0-9]/', '', $texto);
    }

    public static function paraBusqueda(string $buscar): string
    {
        $texto = trim($buscar);
        if (preg_match('/^[A-Za-z0-9]{2,4}[-\s][A-Za-z0-9]{2,4}$/', $texto)) {
            return self::normalizar($texto);
        }

        return $buscar;
    }
}
