<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class QuitarTipoInspectorDeTrabajadores extends Migration
{
    public function up()
    {
        // El tipo de inspector se deduce del cargo vigente; la tabla trabajadores no lo guarda.
        if ($this->db->fieldExists('tipo_inspector', 'trabajadores')) {
            $this->forge->dropColumn('trabajadores', 'tipo_inspector');
        }
    }

    public function down()
    {
        if (!$this->db->fieldExists('tipo_inspector', 'trabajadores')) {
            $this->forge->addColumn('trabajadores', [
                'tipo_inspector' => ['type' => 'ENUM', 'constraint' => ['TRANSITO', 'TECNICO'], 'null' => true, 'after' => 'tipo'],
            ]);
        }
    }
}
