<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CatalogoTupaConCostosYRequisitos extends Migration
{
    private function existeColumna(string $tabla, string $columna): bool
    {
        return (bool) $this->db->query(
            'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [$tabla, $columna]
        )->getRowArray();
    }

    public function up()
    {

        $nuevas = [
            'id_unidad_organica' => 'INT NULL AFTER `id`',
            'plazo_atencion' => 'INT UNSIGNED NULL AFTER `descripcion`',
            'vigencia' => 'INT NOT NULL DEFAULT 0 AFTER `plazo_atencion`',
            'tipo_tramite' => "ENUM('INICIAL','RENOVACION','DUPLICADO') NOT NULL DEFAULT 'INICIAL' AFTER `vigencia`",
            'base_legal' => 'TEXT NULL AFTER `tipo_tramite`',
        ];
        foreach ($nuevas as $columna => $definicion) {
            if (!$this->existeColumna('procedimientos_administrativos', $columna)) {
                $this->db->query("ALTER TABLE procedimientos_administrativos ADD COLUMN `$columna` $definicion");
            }
        }

// 2) Costos con vigencia
        $this->db->query(
            "CREATE TABLE IF NOT EXISTS procedimiento_administrativo_costo (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                id_proc_admin BIGINT NOT NULL,
                fecha_inicio DATE NOT NULL,
                fecha_fin DATE NULL,
                costo DECIMAL(12,2) NOT NULL,
                estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
                fecha_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fecha_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_costo_proc (id_proc_admin, estado, fecha_inicio),
                CONSTRAINT fk_costo_proc FOREIGN KEY (id_proc_admin) REFERENCES procedimientos_administrativos (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );

        if ($this->existeColumna('procedimientos_administrativos', 'costo')) {
            $this->db->query(
                "INSERT INTO procedimiento_administrativo_costo (id_proc_admin, fecha_inicio, costo, estado)
                 SELECT pa.id, CURDATE(), pa.costo, 'ACTIVO' FROM procedimientos_administrativos pa
                 WHERE NOT EXISTS (SELECT 1 FROM procedimiento_administrativo_costo c WHERE c.id_proc_admin = pa.id)"
            );
            $this->db->query('ALTER TABLE procedimientos_administrativos DROP COLUMN costo');
        }

        $this->db->query(
            "CREATE TABLE IF NOT EXISTS requisito (
                id INT NOT NULL AUTO_INCREMENT,
                nombre VARCHAR(255) NOT NULL,
                descripcion TEXT NULL,
                tipo ENUM('DOCUMENTO','INFORMACION','PAGO') NOT NULL DEFAULT 'DOCUMENTO',
                estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
                fecha_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fecha_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_requisito_nombre (nombre)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );
        $this->db->query(
            "CREATE TABLE IF NOT EXISTS procedimiento_requisito (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                procedimiento_id BIGINT NOT NULL,
                requisito_id INT NOT NULL,
                obligatorio TINYINT(1) NOT NULL DEFAULT 1,
                orden INT NULL,
                fecha_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fecha_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_proc_requisito (procedimiento_id, requisito_id),
                KEY idx_requisito_id (requisito_id),
                CONSTRAINT fk_proc_requisito_proc FOREIGN KEY (procedimiento_id) REFERENCES procedimientos_administrativos (id) ON DELETE CASCADE,
                CONSTRAINT fk_proc_requisito_req FOREIGN KEY (requisito_id) REFERENCES requisito (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );

        if (!$this->existeColumna('certicav', 'id_pago')) {
            $this->db->query('ALTER TABLE certicav ADD COLUMN id_pago BIGINT NULL AFTER id_vehiculo');
            $this->db->query('ALTER TABLE certicav ADD UNIQUE KEY uq_certicav_pago (id_pago)');
            $this->db->query('ALTER TABLE certicav ADD CONSTRAINT fk_certicav_pago FOREIGN KEY (id_pago) REFERENCES pagos_transito (id) ON DELETE SET NULL');
        }
    }

    public function down()
    {
        if ($this->existeColumna('certicav', 'id_pago')) {
            $this->db->query('ALTER TABLE certicav DROP FOREIGN KEY fk_certicav_pago');
            $this->db->query('ALTER TABLE certicav DROP KEY uq_certicav_pago');
            $this->db->query('ALTER TABLE certicav DROP COLUMN id_pago');
        }
        $this->db->query('DROP TABLE IF EXISTS procedimiento_requisito');
        $this->db->query('DROP TABLE IF EXISTS requisito');

        if (!$this->existeColumna('procedimientos_administrativos', 'costo')) {
            $this->db->query('ALTER TABLE procedimientos_administrativos ADD COLUMN costo DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER descripcion');
            $this->db->query(
                "UPDATE procedimientos_administrativos pa SET costo = COALESCE((SELECT c.costo FROM procedimiento_administrativo_costo c
                 WHERE c.id_proc_admin = pa.id AND c.estado = 'ACTIVO' ORDER BY c.fecha_inicio DESC, c.id DESC LIMIT 1), 0)"
            );
        }
        $this->db->query('DROP TABLE IF EXISTS procedimiento_administrativo_costo');
        foreach (['base_legal', 'tipo_tramite', 'vigencia', 'plazo_atencion', 'id_unidad_organica'] as $columna) {
            if ($this->existeColumna('procedimientos_administrativos', $columna)) {
                $this->db->query("ALTER TABLE procedimientos_administrativos DROP COLUMN `$columna`");
            }
        }
    }
}
