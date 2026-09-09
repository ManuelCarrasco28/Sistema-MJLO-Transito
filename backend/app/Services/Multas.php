<?php

namespace App\Services;

use CodeIgniter\Database\BaseConnection;
use DomainException;

class Multas
{
    public function __construct(private BaseConnection $db) {}

    public function uit(int $anio): float
    {
        $row = $this->db->table('uits')->where('anio', $anio)->get()->getRowArray();
        if (!$row || (float)$row['valor'] <= 0) throw new DomainException("Falta configurar la UIT del año $anio.");
        return (float)$row['valor'];
    }

    public function monto(array $infraccion, int $anio): float
    {
        $porcentaje = $infraccion['porcentaje_uit'] ?? null;
        if (!is_numeric($porcentaje) || (float)$porcentaje <= 0) throw new DomainException('La infracción necesita un porcentaje UIT válido.');
        return round($this->uit($anio) * (float)$porcentaje / 100, 2);
    }
}
