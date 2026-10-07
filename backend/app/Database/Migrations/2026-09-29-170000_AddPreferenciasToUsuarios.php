<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddPreferenciasToUsuarios extends Migration
{
    public function up()
    {
        if (!$this->db->fieldExists('preferencias', 'usuarios')) {
            $this->forge->addColumn('usuarios', [
                'preferencias' => [
                    'type'     => 'TEXT',
                    'null'     => true,
                    'after'    => 'session_version',
                ],
            ]);
        }
    }

    public function down()
    {
        if ($this->db->fieldExists('preferencias', 'usuarios')) {
            $this->forge->dropColumn('usuarios', 'preferencias');
        }
    }
}
