<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Los carnets del curso se expiden al terminar el curso (antes se tomaba el inicio) y vencen un año después.
 * Idempotente.
 */
class CarnetExpedicionAlFinDelCurso extends Migration
{
    public function up()
    {
        $this->db->query('UPDATE cursos_seguridad_vial SET carnet_expedicion = COALESCE(fecha_fin, fecha_inicio), carnet_vencimiento = DATE_ADD(COALESCE(fecha_fin, fecha_inicio), INTERVAL 1 YEAR) WHERE COALESCE(fecha_fin, fecha_inicio) IS NOT NULL');
    }

    public function down()
    {
    }
}
