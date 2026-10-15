<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class InscripcionCursoUnica extends Migration
{
    public function up()
    {
        $existe = $this->db->query("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inscripciones_curso' AND NON_UNIQUE=0 GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)='id_curso,id_persona'")->getRowArray();
        if ($existe) return;
        if ($this->db->query('SELECT id_curso,id_persona FROM inscripciones_curso GROUP BY id_curso,id_persona HAVING COUNT(*)>1 LIMIT 1')->getRowArray()) {
            throw new \RuntimeException('Existen inscripciones duplicadas. Deben regularizarse conservando pagos y certificados. No se eliminó ningún registro.');
        }
        $this->db->query('ALTER TABLE inscripciones_curso ADD UNIQUE KEY uq_inscripciones_curso_persona (id_curso,id_persona)');
    }

    public function down()
    {

    }
}
