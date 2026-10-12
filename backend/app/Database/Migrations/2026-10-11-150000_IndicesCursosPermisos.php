<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/** Índices para la actualización de estados por fecha y los listados de cursos y permisos. Idempotente. */
class IndicesCursosPermisos extends Migration
{
    public function up()
    {
        $indices = [
            ['cursos_seguridad_vial', 'idx_cursos_estado_inicio', '(estado, fecha_inicio)'],
            ['cursos_seguridad_vial', 'idx_cursos_fecha_fin', '(fecha_fin)'],
            ['permisos_circulacion', 'idx_permisos_estado_vigencia', '(estado, fecha_fin_vigencia)'],
        ];
        foreach ($indices as [$tabla, $nombre, $columnas]) {
            $existe = $this->db->query(
                'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
                [$tabla, $nombre]
            )->getRowArray();
            if (!$existe) {
                $this->db->query("ALTER TABLE `$tabla` ADD INDEX `$nombre` $columnas");
            }
        }
    }

    public function down()
    {
    }
}
