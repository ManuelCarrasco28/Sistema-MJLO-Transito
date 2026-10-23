<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Agrega id_reporte a ordenes_internamiento para vincular internamientos
 * que nacen directamente desde reportes de intervención en estado EN_PROCESO.
 */
class InternamientoDesdeReporte extends Migration
{
    public function up()
    {
        if (!$this->db->fieldExists('id_reporte', 'ordenes_internamiento')) {
            $this->db->query("ALTER TABLE ordenes_internamiento 
                ADD COLUMN id_reporte INT(11) NULL AFTER id_papeleta,
                ADD KEY idx_ordenes_internamiento_id_reporte (id_reporte),
                ADD CONSTRAINT fk_internamiento_reporte FOREIGN KEY (id_reporte) REFERENCES reportes_intervencion(id) ON DELETE SET NULL");
        }
    }

    public function down()
    {
        if ($this->db->fieldExists('id_reporte', 'ordenes_internamiento')) {
            $this->db->query("ALTER TABLE ordenes_internamiento 
                DROP FOREIGN KEY fk_internamiento_reporte,
                DROP KEY idx_ordenes_internamiento_id_reporte,
                DROP COLUMN id_reporte");
        }
    }
}
