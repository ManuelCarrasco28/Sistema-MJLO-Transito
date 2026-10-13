<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Cada internamiento tiene un solo número, el de su boleta (numero_boleta); la orden de libertad tiene el suyo
 * (ordenes_libertad.numero_orden). El segundo número del internamiento (INT-000001) era redundante. Idempotente.
 */
class QuitarNumeroOrdenDeInternamientos extends Migration
{
    private function existe(): bool
    {
        return (bool) $this->db->query(
            "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ordenes_internamiento' AND COLUMN_NAME = 'numero_orden'"
        )->getRowArray();
    }

    public function up()
    {
        if ($this->existe()) {
            $this->db->query('ALTER TABLE ordenes_internamiento DROP COLUMN numero_orden');
        }
    }

    public function down()
    {
        if (!$this->existe()) {
            $this->db->query('ALTER TABLE ordenes_internamiento ADD COLUMN numero_orden VARCHAR(50) NULL AFTER id_vehiculo');
            $this->db->query("UPDATE ordenes_internamiento SET numero_orden = CONCAT('INT-', LPAD(id, 6, '0')) WHERE numero_orden IS NULL");
            $this->db->query('ALTER TABLE ordenes_internamiento ADD UNIQUE KEY uq_internamientos_numero_orden (numero_orden)');
        }
    }
}
