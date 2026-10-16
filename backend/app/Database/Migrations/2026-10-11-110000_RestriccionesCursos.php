<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class RestriccionesCursos extends Migration
{
    private function existeRestriccion(string $nombre): bool
    {
        return (bool) $this->db->query(
            "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'cursos_seguridad_vial' AND CONSTRAINT_NAME = ?",
            [$nombre]
        )->getRowArray();
    }

    public function up()
    {
        if (!$this->existeRestriccion('ck_curso_fechas')) {
            if ($this->db->query('SELECT id FROM cursos_seguridad_vial WHERE fecha_fin < fecha_inicio LIMIT 1')->getRowArray()) {
                throw new \RuntimeException('Hay cursos cuya fecha de fin es anterior a su inicio. Corríjalos antes de migrar.');
            }
            $this->db->query('ALTER TABLE cursos_seguridad_vial ADD CONSTRAINT ck_curso_fechas CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)');
        }
        if (!$this->existeRestriccion('ck_curso_inscripcion')) {
            if ($this->db->query('SELECT id FROM cursos_seguridad_vial WHERE fecha_inscripcion_fin < fecha_inscripcion_inicio LIMIT 1')->getRowArray()) {
                throw new \RuntimeException('Hay cursos con el cierre de inscripción antes de su apertura. Corríjalos antes de migrar.');
            }
            $this->db->query('ALTER TABLE cursos_seguridad_vial ADD CONSTRAINT ck_curso_inscripcion CHECK (fecha_inscripcion_fin IS NULL OR fecha_inscripcion_inicio IS NULL OR fecha_inscripcion_fin >= fecha_inscripcion_inicio)');
        }
        if (!$this->existeRestriccion('ck_curso_cupos')) {
            $this->db->query('UPDATE cursos_seguridad_vial SET cupos = 50 WHERE cupos IS NULL OR cupos <= 0');
            $this->db->query('ALTER TABLE cursos_seguridad_vial MODIFY cupos INT NOT NULL DEFAULT 50');
            $this->db->query('ALTER TABLE cursos_seguridad_vial ADD CONSTRAINT ck_curso_cupos CHECK (cupos > 0)');
        }
        $unico = $this->db->query("SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cursos_seguridad_vial' AND INDEX_NAME = 'uq_cursos_codigo'")->getRowArray();
        if (!$unico) {
            if ($this->db->query('SELECT codigo FROM cursos_seguridad_vial WHERE codigo IS NOT NULL GROUP BY codigo HAVING COUNT(*) > 1 LIMIT 1')->getRowArray()) {
                throw new \RuntimeException('Hay códigos de curso repetidos. Corríjalos antes de migrar.');
            }
            $this->db->query('ALTER TABLE cursos_seguridad_vial ADD UNIQUE KEY uq_cursos_codigo (codigo)');
        }
    }

    public function down()
    {

    }
}
