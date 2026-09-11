<?php

namespace App\Services;

use CodeIgniter\Database\BaseConnection;
use DomainException;

class Multas
{
    public function __construct(private BaseConnection $db) {}

    public function uit(int $anio): float
    {
        $configuredYear = (int) env('multas.uit.anio', 0);
        $configuredValue = (float) env('multas.uit.valor', 0);

        if ($configuredYear !== $anio || $configuredValue <= 0) {
            throw new DomainException("Falta configurar la UIT del año $anio.");
        }

        return $configuredValue;
    }

    public function monto(array $infraccion, int $anio): float
    {
        $porcentaje = $infraccion['porcentaje_uit'] ?? null;
        if (!is_numeric($porcentaje) || (float)$porcentaje <= 0) throw new DomainException('La infracción necesita un porcentaje UIT válido.');
        return round($this->uit($anio) * (float)$porcentaje / 100, 2);
    }
}
