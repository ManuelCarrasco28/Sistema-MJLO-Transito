<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * La columna `resolucion` de los cursos se usaba para guardar el nombre del instructor (y en los cursos importados
 * guardaba el número de resolución, que la pantalla mostraba como "instructor"). Ahora cada dato tiene su columna:
 * `resolucion` (número de resolución que sale en el carnet), `instructor` (nombre) e `id_instructor` (persona del padrón).
 * Idempotente.
 */
class CursoResolucionEInstructor extends Migration
{
    public function up()
    {
        if (!$this->db->fieldExists('instructor', 'cursos_seguridad_vial')) {
            $this->db->query('ALTER TABLE cursos_seguridad_vial ADD COLUMN instructor VARCHAR(150) NULL AFTER resolucion');
            // Lo que no lleva números es un nombre de instructor, no una resolución.
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
