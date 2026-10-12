<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Restricciones que antes solo cuidaba el código:
 *  - un solo pago activo (no anulado) por papeleta, inscripción o trámite;
 *  - quién cobró (id_usuario_cobra);
 *  - número de orden y de boleta únicos en internamientos y un solo internamiento RETENIDO por vehículo.
 * Es idempotente y no borra datos: si ya hay duplicados, se detiene y pide regularizarlos.
 */
class RestriccionesPagosInternamientos extends Migration
{
    private function existeColumna(string $tabla, string $columna): bool
    {
        return (bool) $this->db->query(
            'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [$tabla, $columna]
        )->getRowArray();
    }

    private function existeIndice(string $tabla, string $indice): bool
    {
        return (bool) $this->db->query(
            'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
            [$tabla, $indice]
        )->getRowArray();
    }

    public function up()
    {
        // ---- pagos: un solo pago activo por origen
        foreach (['id_papeleta' => 'papeleta', 'id_inscripcion' => 'inscripcion', 'id_tramite' => 'tramite'] as $fk => $nombre) {
            $col = "pago_activo_{$nombre}";
            $idx = "uq_pago_activo_{$nombre}";
            if ($this->existeIndice('pagos_transito', $idx)) {
                continue;
            }
            if ($this->db->query("SELECT $fk FROM pagos_transito WHERE $fk IS NOT NULL AND estado <> 'ANULADO' GROUP BY $fk HAVING COUNT(*) > 1 LIMIT 1")->getRowArray()) {
                throw new \RuntimeException("Hay más de un pago activo para un mismo origen ($fk). Anule los repetidos antes de migrar; no se eliminó ningún registro.");
            }
            if (!$this->existeColumna('pagos_transito', $col)) {
                $this->db->query("ALTER TABLE pagos_transito ADD COLUMN $col BIGINT AS (IF(estado <> 'ANULADO', $fk, NULL)) VIRTUAL");
            }
            $this->db->query("ALTER TABLE pagos_transito ADD UNIQUE KEY $idx ($col)");
        }

        // ---- pagos: quién cobró
        if (!$this->existeColumna('pagos_transito', 'id_usuario_cobra')) {
            $this->db->query('ALTER TABLE pagos_transito ADD COLUMN id_usuario_cobra INT NULL');
            $this->db->query('ALTER TABLE pagos_transito ADD CONSTRAINT fk_pagos_usuario_cobra FOREIGN KEY (id_usuario_cobra) REFERENCES usuarios (id) ON DELETE SET NULL');
        }

        // ---- internamientos: números únicos y un solo RETENIDO por vehículo
        if (!$this->existeIndice('ordenes_internamiento', 'uq_internamientos_numero_orden')) {
            if ($this->db->query('SELECT numero_orden FROM ordenes_internamiento WHERE numero_orden IS NOT NULL GROUP BY numero_orden HAVING COUNT(*) > 1 LIMIT 1')->getRowArray()) {
                throw new \RuntimeException('Hay números de orden de internamiento repetidos. Regularícelos antes de migrar.');
            }
            $this->db->query('ALTER TABLE ordenes_internamiento ADD UNIQUE KEY uq_internamientos_numero_orden (numero_orden)');
        }
        if (!$this->existeIndice('ordenes_internamiento', 'uq_internamientos_numero_boleta')) {
            if ($this->db->query('SELECT numero_boleta FROM ordenes_internamiento WHERE numero_boleta IS NOT NULL GROUP BY numero_boleta HAVING COUNT(*) > 1 LIMIT 1')->getRowArray()) {
                throw new \RuntimeException('Hay números de boleta de internamiento repetidos. Regularícelos antes de migrar.');
            }
            $this->db->query('ALTER TABLE ordenes_internamiento ADD UNIQUE KEY uq_internamientos_numero_boleta (numero_boleta)');
        }
        if (!$this->existeIndice('ordenes_internamiento', 'uq_internamientos_vehiculo_retenido')) {
            if ($this->db->query("SELECT id_vehiculo FROM ordenes_internamiento WHERE estado = 'RETENIDO' GROUP BY id_vehiculo HAVING COUNT(*) > 1 LIMIT 1")->getRowArray()) {
                throw new \RuntimeException('Hay vehículos con más de un internamiento RETENIDO. Regularícelos antes de migrar.');
            }
            if (!$this->existeColumna('ordenes_internamiento', 'vehiculo_retenido')) {
                $this->db->query("ALTER TABLE ordenes_internamiento ADD COLUMN vehiculo_retenido INT AS (IF(estado = 'RETENIDO', id_vehiculo, NULL)) VIRTUAL");
            }
            $this->db->query('ALTER TABLE ordenes_internamiento ADD UNIQUE KEY uq_internamientos_vehiculo_retenido (vehiculo_retenido)');
        }
    }

    public function down()
    {
        // Las restricciones se conservan al revertir (protegen datos); no se retiran.
    }
}
