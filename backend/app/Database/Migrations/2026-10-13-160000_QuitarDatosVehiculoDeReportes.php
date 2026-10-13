<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Los reportes de intervención ya no guardan clase, marca ni color del vehículo: esos datos salen del vehículo
 * registrado (id_vehiculo). Las columnas estaban vacías en todos los reportes y ninguna pantalla ni la app móvil
 * las llenaba. Idempotente.
 */
class QuitarDatosVehiculoDeReportes extends Migration
{
    public function up()
    {
        foreach (['vehiculo_clase', 'vehiculo_marca', 'vehiculo_color'] as $columna) {
            $existe = $this->db->query(
                "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reportes_intervencion' AND COLUMN_NAME = ?",
                [$columna]
            )->getRowArray();
            if ($existe) {
                $this->db->query("ALTER TABLE reportes_intervencion DROP COLUMN `$columna`");
            }
        }
    }

    public function down()
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
}
