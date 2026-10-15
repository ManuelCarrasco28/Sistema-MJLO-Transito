<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddIndexPersonasNumero extends Migration
{
    public function up()
    {
        if (!$this->db->query("SHOW INDEX FROM personas WHERE Key_name = 'idx_personas_numero'")->getRow()) {
            $this->db->query('ALTER TABLE personas ADD INDEX idx_personas_numero (numero)');
        }
    }

    public function down()
    {
        if ($this->db->query("SHOW INDEX FROM personas WHERE Key_name = 'idx_personas_numero'")->getRow()) {
            $this->db->query('ALTER TABLE personas DROP INDEX idx_personas_numero');
        }
    }
}
