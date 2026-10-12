<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Integridad de CERTICAV y reportes de intervención: N° de registro único y claves foráneas del conductor
 * y del operativo. Idempotente; si hay datos huérfanos o repetidos se detiene sin borrar nada.
 */
class RestriccionesReportesCerticav extends Migration
{
    private function existeIndice(string $tabla, string $indice): bool
    {
        return (bool) $this->db->query(
            'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
            [$tabla, $indice]
        )->getRowArray();
    }

    private function existeFk(string $tabla, string $nombre): bool
    {
        return (bool) $this->db->query(
            "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
            [$tabla, $nombre]
        )->getRowArray();
    }

    public function up()
    {
        if (!$this->existeIndice('certicav', 'uq_certicav_numero_registro')) {
            if ($this->db->query('SELECT numero_registro FROM certicav GROUP BY numero_registro HAVING COUNT(*) > 1 LIMIT 1')->getRowArray()) {
                throw new \RuntimeException('Hay N° de registro de CERTICAV repetidos. Corríjalos antes de migrar.');
            }
            if ($this->existeIndice('certicav', 'idx_certicav_registro')) {
                $this->db->query('ALTER TABLE certicav DROP INDEX idx_certicav_registro');
            }
            $this->db->query('ALTER TABLE certicav ADD UNIQUE KEY uq_certicav_numero_registro (numero_registro)');
        }

        if (!$this->existeFk('reportes_intervencion', 'fk_reportes_conductor')) {
            if ($this->db->query('SELECT r.id FROM reportes_intervencion r LEFT JOIN personas p ON p.id = r.id_conductor WHERE r.id_conductor IS NOT NULL AND p.id IS NULL LIMIT 1')->getRowArray()) {
                throw new \RuntimeException('Hay reportes con un conductor inexistente. Corríjalos antes de migrar.');
            }
            $this->db->query('ALTER TABLE reportes_intervencion ADD CONSTRAINT fk_reportes_conductor FOREIGN KEY (id_conductor) REFERENCES personas (id) ON DELETE RESTRICT');
        }
        if (!$this->existeFk('reportes_intervencion', 'fk_reportes_operativo')) {
            if ($this->db->query('SELECT r.id FROM reportes_intervencion r LEFT JOIN operativos o ON o.id = r.id_operativo WHERE r.id_operativo IS NOT NULL AND o.id IS NULL LIMIT 1')->getRowArray()) {
                throw new \RuntimeException('Hay reportes con un operativo inexistente. Corríjalos antes de migrar.');
            }
            $this->db->query('ALTER TABLE reportes_intervencion ADD CONSTRAINT fk_reportes_operativo FOREIGN KEY (id_operativo) REFERENCES operativos (id) ON DELETE RESTRICT');
        }
    }

    public function down()
    {
        // Las restricciones protegen datos; no se retiran al revertir.
    }
}
