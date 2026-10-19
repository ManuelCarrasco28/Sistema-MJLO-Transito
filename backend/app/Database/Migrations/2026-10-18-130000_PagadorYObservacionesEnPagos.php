<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Quién pagó realmente en ventanilla (puede ser distinto del titular del trámite) y una observación del cobro.
 */
class PagadorYObservacionesEnPagos extends Migration
{
    private const COLUMNAS = [
        'pagado_por_nombre' => 'VARCHAR(160) NULL',
        'pagado_por_documento' => 'VARCHAR(20) NULL',
        'observaciones' => 'VARCHAR(300) NULL',
    ];

    public function up()
    {
        foreach (self::COLUMNAS as $columna => $definicion) {
            if (!$this->db->fieldExists($columna, 'pagos_transito')) {
                $this->db->query("ALTER TABLE `pagos_transito` ADD COLUMN `{$columna}` {$definicion}");
            }
        }
    }

    public function down()
    {
        foreach (array_keys(self::COLUMNAS) as $columna) {
            if ($this->db->fieldExists($columna, 'pagos_transito')) {
                $this->db->query("ALTER TABLE `pagos_transito` DROP COLUMN `{$columna}`");
            }
        }
    }
}
