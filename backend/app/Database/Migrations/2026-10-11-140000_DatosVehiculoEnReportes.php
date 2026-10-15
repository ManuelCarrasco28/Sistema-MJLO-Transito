<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class DatosVehiculoEnReportes extends Migration
{
    public function up()
    {
        foreach (['vehiculo_clase' => 60, 'vehiculo_marca' => 60, 'vehiculo_color' => 40] as $columna => $largo) {
            $existe = $this->db->query(
                "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reportes_intervencion' AND COLUMN_NAME = ?",
                [$columna]
            )->getRowArray();
            if (!$existe) {
                $this->db->query("ALTER TABLE reportes_intervencion ADD COLUMN `$columna` VARCHAR($largo) NULL AFTER placa");
            }
        }
    }

    public function down()
    {
    }
}
