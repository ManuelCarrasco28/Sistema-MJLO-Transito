<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AmpliarDocumentoPersona extends Migration
{
    public function up()
    {
        $this->db->query('ALTER TABLE personas MODIFY numero VARCHAR(15) NOT NULL');
    }

    public function down()
    {

        if ($this->db->query('SELECT id FROM personas WHERE CHAR_LENGTH(numero) > 11 LIMIT 1')->getRowArray()) {
            throw new \RuntimeException('No se puede reducir la longitud: existen documentos de más de 11 caracteres.');
        }
        $this->db->query('ALTER TABLE personas MODIFY numero VARCHAR(11) NOT NULL');
    }
}
