<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class ColumnasInformalesPapeletasReportes extends Migration
{
    public function up()
    {
        $columnas = [
            'papeletas' => [
                'placa' => 'VARCHAR(20) NULL AFTER id_vehiculo',
                'dueño_informal_nombres' => 'VARCHAR(255) NULL AFTER placa',
                'dueño_informal_dni' => 'VARCHAR(20) NULL AFTER dueño_informal_nombres',
                'conductor_informal_nombres' => 'VARCHAR(255) NULL AFTER dueño_informal_dni',
                'conductor_informal_dni' => 'VARCHAR(20) NULL AFTER conductor_informal_nombres',
            ],
            'reportes_intervencion' => [
                'dueno_informal_nombres' => 'VARCHAR(255) NULL AFTER placa',
                'dueno_informal_dni' => 'VARCHAR(20) NULL AFTER dueno_informal_nombres',
                'conductor_informal_nombres' => 'VARCHAR(255) NULL AFTER dueno_informal_dni',
                'conductor_informal_dni' => 'VARCHAR(20) NULL AFTER conductor_informal_nombres',
            ],
        ];

        foreach ($columnas as $tabla => $definiciones) {
            foreach ($definiciones as $columna => $definicion) {
                if (!$this->db->fieldExists($columna, $tabla)) {
                    $this->db->query("ALTER TABLE `{$tabla}` ADD COLUMN `{$columna}` {$definicion}");
                }
            }
        }
    }

    public function down()
    {
// No se quitan: contienen datos de papeletas ya emitidas.
    }
}
