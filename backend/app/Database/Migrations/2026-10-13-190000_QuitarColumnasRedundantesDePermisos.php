<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * permisos_circulacion: se quita recorrido_salida (vacía en todos los permisos) y representante_legal, que copiaba el
 * nombre del representante de la asociación; ahora se toma de asociaciones.id_representante_legal. Idempotente.
 */
class QuitarColumnasRedundantesDePermisos extends Migration
{
    private const COLUMNAS = ['recorrido_salida' => 'VARCHAR(500) NULL', 'representante_legal' => 'VARCHAR(150) NULL'];

    private function existe(string $columna): bool
    {
        return (bool) $this->db->query(
            "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permisos_circulacion' AND COLUMN_NAME = ?",
            [$columna]
        )->getRowArray();
    }

    public function up()
    {
        foreach (array_keys(self::COLUMNAS) as $columna) {
            if ($this->existe($columna)) {
                $this->db->query("ALTER TABLE permisos_circulacion DROP COLUMN `$columna`");
            }
        }
    }

    public function down()
    {
        foreach (self::COLUMNAS as $columna => $definicion) {
            if (!$this->existe($columna)) {
                $this->db->query("ALTER TABLE permisos_circulacion ADD COLUMN `$columna` $definicion");
            }
        }
    }
}
