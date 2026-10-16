<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddTokenToMunicipalidadAnio extends Migration
{
    public function up()
    {
        if ($this->db->fieldExists('token', 'municipalidad_anio')) {
            return;
        }

        $this->forge->addColumn('municipalidad_anio', [
            'token' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
                'after'      => 'uit',
            ],
        ]);
    }

    public function down()
    {
        if ($this->db->fieldExists('token', 'municipalidad_anio')) {
            $this->forge->dropColumn('municipalidad_anio', 'token');
        }
    }
}
