<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CursoFechasCarnet extends Migration
{
    public function up()
    {
        if (!$this->db->fieldExists('carnet_expedicion', 'cursos_seguridad_vial')) {
            $this->db->query('ALTER TABLE cursos_seguridad_vial ADD COLUMN carnet_expedicion DATE NULL AFTER hora_fin');
            $this->db->query('UPDATE cursos_seguridad_vial SET carnet_expedicion = fecha_inicio WHERE fecha_inicio IS NOT NULL');
        }
        if (!$this->db->fieldExists('carnet_vencimiento', 'cursos_seguridad_vial')) {
            $this->db->query('ALTER TABLE cursos_seguridad_vial ADD COLUMN carnet_vencimiento DATE NULL AFTER carnet_expedicion');
            $this->db->query('UPDATE cursos_seguridad_vial SET carnet_vencimiento = DATE_ADD(carnet_expedicion, INTERVAL 1 YEAR) WHERE carnet_expedicion IS NOT NULL');
        }
    }

    public function down()
    {
    }
}
