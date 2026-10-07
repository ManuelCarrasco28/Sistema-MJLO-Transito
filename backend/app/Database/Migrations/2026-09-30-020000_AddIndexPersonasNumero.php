<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * personas.numero (DNI/RUC) se usa constantemente en WHERE exacto y en
 * subconsultas de Papeletas, Pagos y Vehículos, pero no tenía ningún índice.
 * Con ~30,000 registros esto forzaba un escaneo completo de tabla en cada
 * búsqueda por documento.
 */
class AddIndexPersonasNumero extends Migration
{
    public function up()
    {
        if (!$this->db->query("SHOW INDEX FROM personas WHERE Key_name = 'idx_personas_numero'")->getRow()) {
            $this->db->query('ALTER TABLE personas ADD INDEX idx_personas_numero (numero)');
        }
    }

    public function down()
    {
        if ($this->db->query("SHOW INDEX FROM personas WHERE Key_name = 'idx_personas_numero'")->getRow()) {
            $this->db->query('ALTER TABLE personas DROP INDEX idx_personas_numero');
        }
    }
}
