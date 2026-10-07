<?php

namespace App\Database\Migrations;

use App\Libraries\Identificador;
use CodeIgniter\Database\Migration;

/**
 * Completa el uuid: agrega la columna a las tablas que se sumaron después (ordenes_libertad,
 * tramites_documentarios, certificados_curso), rellena lo que falte y vuelve la columna OBLIGATORIA en todas.
 * Con NOT NULL, un insert que olvide asignar el uuid falla a la vista en vez de dejar un registro sin identificador.
 */
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
