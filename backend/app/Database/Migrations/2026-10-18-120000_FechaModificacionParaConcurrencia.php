<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Cada registro editable guarda cuándo se modificó por última vez. El servidor la usa para avisar
 * cuando alguien intenta guardar sobre un cambio ajeno que no llegó a ver.
 */
class FechaModificacionParaConcurrencia extends Migration
{
    private const TABLAS = [
        'vehiculos', 'asociaciones', 'documentos_vehiculo', 'papeletas',
        'cursos_seguridad_vial', 'permisos_circulacion', 'certicav', 'ordenes_internamiento',
    ];

    public function up()
    {
        foreach (self::TABLAS as $tabla) {
            if ($this->db->tableExists($tabla) && !$this->db->fieldExists('fecha_modificacion', $tabla)) {
                $this->db->query("ALTER TABLE `{$tabla}` ADD COLUMN `fecha_modificacion` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)");
            }
        }
    }

    public function down()
    {
        foreach (self::TABLAS as $tabla) {
            if ($this->db->tableExists($tabla) && $this->db->fieldExists('fecha_modificacion', $tabla)) {
                $this->db->query("ALTER TABLE `{$tabla}` DROP COLUMN `fecha_modificacion`");
            }
        }
    }
}
