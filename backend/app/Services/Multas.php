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
            // Al cambiar de año todavía puede faltar la UIT nueva: se usa la última configurada para no frenar las papeletas
            $ultima = $this->db->table('municipalidad_anio ma')
                ->select('ma.uit, ma.anio')
                ->join('municipalidad m', 'm.id = ma.id_municipalidad', 'inner')
                ->where('ma.uit >', 0)
                ->where('CAST(ma.anio AS UNSIGNED) <', $anio, false)
                ->where('m.estado', 'ACTIVO')
                ->orderBy('CAST(ma.anio AS UNSIGNED)', 'DESC', false)
                ->get()
                ->getRowArray();
            if (!$ultima) {
                throw new DomainException("Falta configurar la UIT del año $anio.");
            }
            log_message('warning', "No hay UIT configurada para $anio; se usa la del año {$ultima['anio']}. Configure la UIT del año en Super Admin.");

            return (float) $ultima['uit'];
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
