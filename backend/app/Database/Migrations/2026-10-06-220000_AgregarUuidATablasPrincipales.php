<?php

namespace App\Database\Migrations;

use App\Libraries\Identificador;
use CodeIgniter\Database\Migration;

/**
 * Agrega la columna `uuid` (CHAR(36), única) a las tablas principales y rellena los registros existentes con
 * UUID versión 7 (ramsey/uuid). Es repetible: no vuelve a crear columnas ni a cambiar uuid ya asignados.
 */
class AgregarUuidATablasPrincipales extends Migration
{
    public function up()
    {
        foreach (Identificador::TABLAS as $tabla) {
            if (!$this->db->fieldExists('uuid', $tabla)) {
                $this->db->query("ALTER TABLE `{$tabla}` ADD COLUMN uuid CHAR(36) NULL AFTER id, ADD UNIQUE KEY `uq_{$tabla}_uuid` (uuid)");
            }

            Identificador::rellenar($this->db, $tabla);
        }
    }

    public function down()
    {
        foreach (Identificador::TABLAS as $tabla) {
            if ($this->db->fieldExists('uuid', $tabla)) {
                $this->db->query("ALTER TABLE `{$tabla}` DROP INDEX `uq_{$tabla}_uuid`, DROP COLUMN uuid");
            }
        }
    }
}
