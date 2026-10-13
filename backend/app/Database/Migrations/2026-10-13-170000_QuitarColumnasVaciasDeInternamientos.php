<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Se quitan columnas de internamientos que estaban vacías en todos los registros y que ninguna pantalla llenaba:
 * las firmas (imagen) del remisor y del interesado, el documento de referencia (la papeleta ya está en id_papeleta)
 * y la observación por ítem del inventario. Idempotente.
 */
class QuitarColumnasVaciasDeInternamientos extends Migration
{
    private const COLUMNAS = [
        'ordenes_internamiento' => [
            'firma_remisor_img' => 'VARCHAR(500) NULL',
            'firma_interesado_img' => 'VARCHAR(500) NULL',
            'documento_referencia' => 'VARCHAR(100) NULL',
        ],
        'orden_internamiento_inventario' => [
            'observacion' => 'VARCHAR(500) NULL',
        ],
    ];

    private function existe(string $tabla, string $columna): bool
    {
        return (bool) $this->db->query(
            'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [$tabla, $columna]
        )->getRowArray();
    }

    public function up()
    {
        foreach (self::COLUMNAS as $tabla => $columnas) {
            foreach (array_keys($columnas) as $columna) {
                if ($this->existe($tabla, $columna)) {
                    $this->db->query("ALTER TABLE `$tabla` DROP COLUMN `$columna`");
                }
            }
        }
    }

    public function down()
    {
        foreach (self::COLUMNAS as $tabla => $columnas) {
            foreach ($columnas as $columna => $definicion) {
                if (!$this->existe($tabla, $columna)) {
                    $this->db->query("ALTER TABLE `$tabla` ADD COLUMN `$columna` $definicion");
                }
            }
        }
    }
}
