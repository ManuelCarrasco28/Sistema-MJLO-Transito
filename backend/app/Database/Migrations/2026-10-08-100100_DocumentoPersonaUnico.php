<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class DocumentoPersonaUnico extends Migration
{
    public function up()
    {
        $existe = $this->db->query("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='personas' AND INDEX_NAME='uq_personas_numero'")->getRowArray();
        if (!$existe) {
            if ($this->db->query('SELECT numero FROM personas WHERE numero IS NOT NULL GROUP BY numero HAVING COUNT(*) > 1 LIMIT 1')->getRowArray()) {
                throw new \RuntimeException('Existen documentos duplicados. Regularícelos sin eliminar su historial antes de aplicar el índice.');
            }
            $this->db->query('ALTER TABLE personas ADD UNIQUE KEY uq_personas_numero (numero)');
        }
    }

    public function down()
    {
        $this->db->query('ALTER TABLE personas DROP INDEX uq_personas_numero');
    }
}
