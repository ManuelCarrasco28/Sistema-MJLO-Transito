<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Agrega la columna observaciones_conductor a la tabla reportes_intervencion para que
 * los reportes levantados en campo puedan almacenar el descargo o manifestaciones del
 * conductor, tal como se contempla en la papeleta oficial y en el módulo de tránsito.
 */
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
