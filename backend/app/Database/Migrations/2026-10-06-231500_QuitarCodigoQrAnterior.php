<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class QuitarCodigoQrAnterior extends Migration
{
    public function up()
    {
        if ($this->db->fieldExists('codigo_qr_anterior', 'vehiculos')) {
            $this->db->query('ALTER TABLE vehiculos DROP INDEX idx_vehiculos_codigo_qr_anterior, DROP COLUMN codigo_qr_anterior');
        }
    }

    public function down()
    {
        if (!$this->db->fieldExists('codigo_qr_anterior', 'vehiculos')) {
            $this->db->query('ALTER TABLE vehiculos ADD COLUMN codigo_qr_anterior VARCHAR(100) NULL AFTER codigo_qr, ADD KEY idx_vehiculos_codigo_qr_anterior (codigo_qr_anterior)');
        }
    }
}
