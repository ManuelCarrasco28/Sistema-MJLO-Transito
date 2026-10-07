<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * `vehiculos` no tenía un estado real de operatividad (Activo/Inactivo):
 * el campo `estado` que devolvía la API era en realidad la formalidad
 * (Formal/Informal, derivada de tener o no asociación). Se separan ambos
 * conceptos: `estado` ahora es el estado real del vehículo, y la
 * formalidad se sigue calculando aparte a partir de `id_asociacion`.
 */
class AddEstadoToVehiculos extends Migration
{
    public function up()
    {
        if ($this->db->fieldExists('estado', 'vehiculos')) {
            return;
        }

        $this->forge->addColumn('vehiculos', [
            'estado' => [
                'type'       => 'ENUM',
                'constraint' => ['ACTIVO', 'INACTIVO'],
                'null'       => false,
                'default'    => 'ACTIVO',
                'after'      => 'codigo_qr',
            ],
        ]);
    }

    public function down()
    {
        if ($this->db->fieldExists('estado', 'vehiculos')) {
            $this->forge->dropColumn('vehiculos', 'estado');
        }
    }
}
