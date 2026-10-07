<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CalendarioCursos extends Migration
{
    public function up()
    {
        foreach (['fecha_inscripcion_inicio'=>'DATE', 'fecha_inscripcion_fin'=>'DATE', 'hora_inicio'=>'TIME', 'hora_fin'=>'TIME'] as $columna=>$tipo) {
            if (!$this->db->fieldExists($columna, 'cursos_seguridad_vial')) {
                $this->forge->addColumn('cursos_seguridad_vial', [$columna=>['type'=>$tipo, 'null'=>true]]);
            }
        }
    }

    public function down()
    {
        foreach (['fecha_inscripcion_inicio', 'fecha_inscripcion_fin', 'hora_inicio', 'hora_fin'] as $columna) {
            if ($this->db->fieldExists($columna, 'cursos_seguridad_vial')) $this->forge->dropColumn('cursos_seguridad_vial', $columna);
        }
    }
}
