<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CursoResolucionEInstructor extends Migration
{
    public function up()
    {
        if (!$this->db->fieldExists('instructor', 'cursos_seguridad_vial')) {
            $this->db->query('ALTER TABLE cursos_seguridad_vial ADD COLUMN instructor VARCHAR(150) NULL AFTER resolucion');

            $this->db->query("UPDATE cursos_seguridad_vial SET instructor = resolucion, resolucion = NULL WHERE resolucion IS NOT NULL AND resolucion NOT REGEXP '[0-9]'");
        }
        if (!$this->db->fieldExists('id_instructor', 'cursos_seguridad_vial')) {
            $this->db->query('ALTER TABLE cursos_seguridad_vial ADD COLUMN id_instructor INT(11) NULL AFTER instructor');
            $this->db->query('ALTER TABLE cursos_seguridad_vial ADD KEY idx_cursos_instructor (id_instructor)');
            $this->db->query('ALTER TABLE cursos_seguridad_vial ADD CONSTRAINT fk_cursos_instructor FOREIGN KEY (id_instructor) REFERENCES personas(id) ON DELETE SET NULL');
        }
    }

    public function down()
    {
    }
}
