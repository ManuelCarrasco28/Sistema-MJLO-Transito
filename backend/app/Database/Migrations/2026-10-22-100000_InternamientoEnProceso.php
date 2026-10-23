<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Permite que una orden de internamiento inicie en estado 'EN_PROCESO' mientras el vehículo
 * está en camino al depósito. Al realizarse el inventario físico pasa a 'RETENIDO'.
 * Actualiza la columna virtual vehiculo_retenido para que el índice único considere ambos estados.
 */
class InternamientoEnProceso extends Migration
{
    public function up()
    {
        if ($this->db->fieldExists('vehiculo_retenido', 'ordenes_internamiento')) {
            $this->db->query("ALTER TABLE ordenes_internamiento MODIFY COLUMN vehiculo_retenido INT AS (IF(estado IN ('RETENIDO', 'EN_PROCESO'), id_vehiculo, NULL)) VIRTUAL");
        }
    }

    public function down()
    {
        if ($this->db->fieldExists('vehiculo_retenido', 'ordenes_internamiento')) {
            $this->db->query("ALTER TABLE ordenes_internamiento MODIFY COLUMN vehiculo_retenido INT AS (IF(estado = 'RETENIDO', id_vehiculo, NULL)) VIRTUAL");
        }
    }
}
