<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Pasa el código QR de todos los vehículos a su UUID. El código anterior (QR-VEH-2026-920, QR-HOTFHJEDIESJ…)
 * se conserva en `codigo_qr_anterior` para que un QR ya impreso con el código viejo siga encontrando al
 * vehículo en la app móvil. Es repetible: no pisa un código anterior ya guardado.
 */
class VehiculosCodigoQrUuid extends Migration
{
    public function up()
    {
        if (!$this->db->fieldExists('codigo_qr_anterior', 'vehiculos')) {
            $this->db->query('ALTER TABLE vehiculos ADD COLUMN codigo_qr_anterior VARCHAR(100) NULL AFTER codigo_qr, ADD KEY idx_vehiculos_codigo_qr_anterior (codigo_qr_anterior)');
        }

        $this->db->query('UPDATE vehiculos SET codigo_qr_anterior = codigo_qr WHERE uuid IS NOT NULL AND codigo_qr IS NOT NULL AND codigo_qr <> uuid AND codigo_qr_anterior IS NULL');
        $this->db->query('UPDATE vehiculos SET codigo_qr = uuid WHERE uuid IS NOT NULL AND (codigo_qr IS NULL OR codigo_qr <> uuid)');
    }

    public function down()
    {
        $this->db->query('UPDATE vehiculos SET codigo_qr = codigo_qr_anterior WHERE codigo_qr_anterior IS NOT NULL');
        if ($this->db->fieldExists('codigo_qr_anterior', 'vehiculos')) {
            $this->db->query('ALTER TABLE vehiculos DROP INDEX idx_vehiculos_codigo_qr_anterior, DROP COLUMN codigo_qr_anterior');
        }
    }
}
