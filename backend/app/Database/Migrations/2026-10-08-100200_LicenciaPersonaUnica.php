<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class LicenciaPersonaUnica extends Migration
{
    public function up()
    {
        if ($this->db->query("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ciudadanos' AND INDEX_NAME='uq_ciudadanos_licencia'")->getRowArray()) return;
        if ($this->db->query("SELECT numero_licencia FROM ciudadanos WHERE numero_licencia IS NOT NULL GROUP BY numero_licencia HAVING COUNT(*) > 1 LIMIT 1")->getRowArray()) {
            throw new \RuntimeException('Existen licencias duplicadas. Regularícelas explícitamente antes de aplicar el índice. No se eliminó ningún registro.');
        }
        $this->db->query('ALTER TABLE ciudadanos ADD UNIQUE KEY uq_ciudadanos_licencia (numero_licencia)');
    }

    public function down()
    {
        $this->db->query('ALTER TABLE ciudadanos DROP INDEX uq_ciudadanos_licencia');
    }
}
