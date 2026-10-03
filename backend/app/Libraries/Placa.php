<?php

namespace App\Libraries;

/**
 * Las placas se guardan sin guion ni espacios y en mayúsculas (ABC123).
 * Los códigos de vehículos sin placa (SIN_PLACA, SIN-PLACA-XXXX) no son placas
 * reales y se conservan tal cual.
 */
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

    /**
     * Para búsquedas libres: si el texto parece una placa escrita con guion o
     * espacio ("abc-123") se convierte a su forma guardada; cualquier otro texto
     * (nombres, números de documento) se devuelve sin cambios.
     */
    public static function paraBusqueda(string $buscar): string
    {
        $texto = trim($buscar);
        if (preg_match('/^[A-Za-z0-9]{2,4}[-\s][A-Za-z0-9]{2,4}$/', $texto)) {
            return self::normalizar($texto);
        }

        return $buscar;
    }
}
