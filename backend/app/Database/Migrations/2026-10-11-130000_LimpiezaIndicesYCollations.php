<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class LimpiezaIndicesYCollations extends Migration
{
    private function existeIndice(string $tabla, string $indice): bool
    {
        return (bool) $this->db->query(
            'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
            [$tabla, $indice]
        )->getRowArray();
    }

    public function up()
    {

        $redundantes = [
            ['ciudadanos', 'idx_ciudadanos_licencia', 'uq_ciudadanos_licencia'],
            ['documentos_vehiculo', 'idx_docveh_tipo', 'uq_docveh_tipo_codigo'],
            ['inscripciones_curso', 'curso_id', 'uq_inscripciones_curso_persona'],
            ['ordenes_internamiento', 'idx_oi_boleta', 'uq_internamientos_numero_boleta'],
            ['personas', 'idx_personas_numero', 'uq_personas_numero'],
            ['vehiculos', 'asociacion_id', 'idx_vehiculos_asociacion_id'],
            ['vehiculo_propietarios', 'vehiculo_id', 'idx_vp_vehiculo_activo'],
        ];
        foreach ($redundantes as [$tabla, $indice, $cubre]) {
            if ($this->existeIndice($tabla, $indice) && $this->existeIndice($tabla, $cubre)) {
                $this->db->query("ALTER TABLE `$tabla` DROP INDEX `$indice`");
            }
        }

        if (!$this->existeIndice('auditoria_logs', 'idx_auditoria_usuario')) {
            $this->db->query('ALTER TABLE auditoria_logs ADD INDEX idx_auditoria_usuario (id_usuario)');
        }

        $col = $this->db->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pagos_transito' AND COLUMN_NAME = 'id_operativo'")->getRowArray();
        if ($col) {
            if ($this->db->query('SELECT 1 FROM pagos_transito WHERE id_operativo IS NOT NULL LIMIT 1')->getRowArray()) {
                throw new \RuntimeException('pagos_transito.id_operativo tiene datos; revíselos antes de quitar la columna.');
            }
            $this->db->query('ALTER TABLE pagos_transito DROP COLUMN id_operativo');
        }

        $tablas = $this->db->query(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_COLLATION <> 'utf8mb4_general_ci'"
        )->getResultArray();
        foreach ($tablas as $t) {
            $this->db->query('ALTER TABLE `' . $t['TABLE_NAME'] . '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
        }
    }

    public function down()
    {

    }
}
