<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class NombreTecnicoCerticav extends Migration
{
    public function up()
    {
        if (!$this->db->fieldExists('nombre_tecnico', 'certicav')) {
            $this->forge->addColumn('certicav', [
                'nombre_tecnico' => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => true],
            ]);
        }
    }

    public function down()
    {
        if ($this->db->fieldExists('nombre_tecnico', 'certicav')) {
            $this->forge->dropColumn('certicav', 'nombre_tecnico');
        }
    }
}
