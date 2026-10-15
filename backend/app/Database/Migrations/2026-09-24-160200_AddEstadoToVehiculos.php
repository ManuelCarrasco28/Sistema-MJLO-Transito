<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

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
