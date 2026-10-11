<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddCancelacionToOperativos extends Migration
{
    public function up()
    {
        $fields = [];
        if (!$this->db->fieldExists('hora_cancelacion', 'operativos')) {
            $fields['hora_cancelacion'] = ['type' => 'TIME', 'null' => true];
        }
        if (!$this->db->fieldExists('fecha_hora_cancelacion', 'operativos')) {
            $fields['fecha_hora_cancelacion'] = ['type' => 'DATETIME', 'null' => true];
        }
        if (!$this->db->fieldExists('motivo_cancelacion', 'operativos')) {
            $fields['motivo_cancelacion'] = ['type' => 'TEXT', 'null' => true];
        }

        if (!empty($fields)) {
            $this->forge->addColumn('operativos', $fields);
        }
    }

    public function down()
    {
        $cols = ['hora_cancelacion', 'fecha_hora_cancelacion', 'motivo_cancelacion'];
        foreach ($cols as $col) {
            if ($this->db->fieldExists($col, 'operativos')) {
                $this->forge->dropColumn('operativos', $col);
            }
        }
    }
}
