<?php

namespace App\Database\Migrations;

use App\Libraries\Identificador;
use CodeIgniter\Database\Migration;

class UuidTablasRestantesYObligatorio extends Migration
{
    public function up()
    {
        foreach (Identificador::TABLAS as $tabla) {
            if (!$this->db->fieldExists('uuid', $tabla)) {
                $this->db->query("ALTER TABLE `{$tabla}` ADD COLUMN uuid CHAR(36) NULL AFTER id, ADD UNIQUE KEY `uq_{$tabla}_uuid` (uuid)");
            }

            Identificador::rellenar($this->db, $tabla);
            $this->db->query("ALTER TABLE `{$tabla}` MODIFY uuid CHAR(36) NOT NULL");
        }
    }

    public function down()
    {
        foreach (Identificador::TABLAS as $tabla) {
            $this->db->query("ALTER TABLE `{$tabla}` MODIFY uuid CHAR(36) NULL");
        }
        foreach (['ordenes_libertad', 'tramites_documentarios', 'certificados_curso'] as $tabla) {
            if ($this->db->fieldExists('uuid', $tabla)) {
                $this->db->query("ALTER TABLE `{$tabla}` DROP INDEX `uq_{$tabla}_uuid`, DROP COLUMN uuid");
            }
        }
    }
}
