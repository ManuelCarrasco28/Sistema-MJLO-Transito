<?php

namespace App\Services;

use CodeIgniter\Database\BaseConnection;
use DomainException;

class Multas
{
    public function __construct(private BaseConnection $db) {}

    public function uit(int $anio): float
    {
        if (!$this->db->tableExists('municipalidad_anio')) {
            throw new DomainException('Falta crear la tabla municipalidad_anio para configurar la UIT.');
        }

        $row = $this->db->table('municipalidad_anio ma')
            ->select('ma.uit')
            ->join('municipalidad m', 'm.id = ma.id_municipalidad', 'inner')
            ->where('ma.anio', (string)$anio)
            ->where('m.estado', 'ACTIVO')
            ->orderBy('ma.id', 'DESC')
            ->get()
            ->getRowArray();

        if (!$row || (float)$row['uit'] <= 0) {
            throw new DomainException("Falta configurar la UIT del año $anio.");
        }

        return (float)$row['uit'];
    }

    public function monto(array $infraccion, int $anio): float
    {
        $porcentaje = $infraccion['porcentaje_uit'] ?? null;
        if (!is_numeric($porcentaje) || (float)$porcentaje <= 0) throw new DomainException('La infracción necesita un porcentaje UIT válido.');
        return round($this->uit($anio) * (float)$porcentaje / 100, 2);
    }
}
