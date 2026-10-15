<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class ObservacionesConductorEnReportes extends Migration
{
    public function up()
    {
        $existe = $this->db->query(
            "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reportes_intervencion' AND COLUMN_NAME = 'observaciones_conductor'"
        )->getRowArray();
        if (!$existe) {
            $this->db->query("ALTER TABLE reportes_intervencion ADD COLUMN `observaciones_conductor` TEXT NULL AFTER observaciones");
        }
    }

    public function down()
    {
    }
}
