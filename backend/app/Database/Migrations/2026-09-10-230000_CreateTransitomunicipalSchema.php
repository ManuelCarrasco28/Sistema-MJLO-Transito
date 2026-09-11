<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateTransitomunicipalSchema extends Migration
{
    private const SCHEMA_FILE = APPPATH . 'Database/Schema/transitomunicipal_2026_09_10.sql';

    /**
     * Crea la estructura actual de transitomunicipal desde el dump validado.
     *
     * Si la base ya está creada, no intenta recrearla. Esto permite registrar la
     * migración en una base existente sin romper por tablas ya existentes.
     */
    public function up()
    {
        if (
            $this->db->tableExists('personas')
            && $this->db->tableExists('vehiculos')
            && $this->db->tableExists('tramites_documentarios')
        ) {
            return;
        }

        if (! is_file(self::SCHEMA_FILE)) {
            throw new \RuntimeException('No se encontró el SQL base: ' . self::SCHEMA_FILE);
        }

        $sql = file_get_contents(self::SCHEMA_FILE);
        if ($sql === false || trim($sql) === '') {
            throw new \RuntimeException('El SQL base está vacío o no se puede leer.');
        }

        $this->db->disableForeignKeyChecks();

        foreach ($this->splitSqlStatements($sql) as $statement) {
            $statement = trim($statement);

            if ($statement === '' || $this->shouldSkipStatement($statement)) {
                continue;
            }

            $this->db->query($statement);
        }

        $this->db->enableForeignKeyChecks();
    }

    /**
     * Elimina las tablas creadas por esta migración.
     */
    public function down()
    {
        $this->db->disableForeignKeyChecks();

        foreach ($this->tablesInDropOrder() as $table) {
            $this->forge->dropTable($table, true);
        }

        $this->db->enableForeignKeyChecks();
    }

    /**
     * Divide sentencias SQL respetando comillas simples, dobles y backticks.
     *
     * El dump de phpMyAdmin contiene INSERT largos, por eso no conviene separar
     * con explode(';') sin revisar contexto.
     */
    private function splitSqlStatements(string $sql): array
    {
        $statements = [];
        $buffer = '';
        $length = strlen($sql);
        $quote = null;
        $escaped = false;

        for ($i = 0; $i < $length; $i++) {
            $char = $sql[$i];
            $buffer .= $char;

            if ($quote !== null) {
                if ($escaped) {
                    $escaped = false;
                    continue;
                }

                if ($char === '\\') {
                    $escaped = true;
                    continue;
                }

                if ($char === $quote) {
                    $quote = null;
                }

                continue;
            }

            if ($char === '\'' || $char === '"' || $char === '`') {
                $quote = $char;
                continue;
            }

            if ($char === ';') {
                $statements[] = $buffer;
                $buffer = '';
            }
        }

        if (trim($buffer) !== '') {
            $statements[] = $buffer;
        }

        return $statements;
    }

    private function shouldSkipStatement(string $statement): bool
    {
        $normalized = strtoupper(ltrim($statement));

        return str_starts_with($normalized, 'START TRANSACTION')
            || str_starts_with($normalized, 'COMMIT')
            || str_starts_with($normalized, 'SET SQL_MODE')
            || str_starts_with($normalized, 'SET TIME_ZONE')
            || str_starts_with($normalized, '/*!40101 SET');
    }

    private function tablesInDropOrder(): array
    {
        return [
            'pagos_transito',
            'ordenes_libertad',
            'orden_internamiento_inventario',
            'ordenes_internamiento',
            'papeleta_detalles',
            'papeletas',
            'certicav_detalles',
            'certicav',
            'certificados_curso',
            'inscripciones_curso',
            'permisos_circulacion',
            'tramites_documentarios',
            'documentos_vehiculo',
            'vehiculo_propietarios',
            'vehiculos',
            'desplazamiento_oficina',
            'usuarios',
            'trabajadores',
            'administrados',
            'ciudadanos',
            'personas',
            'procedimientos_administrativos',
            'tipos_infraccion',
            'tipos_vehiculo',
            'organizaciones',
            'inventario_criterios',
            'inspeccion_criterios',
            'cursos_seguridad_vial',
            'cargos',
            'unidades_organicas',
            'jerarquia_organizacional',
            'ubigeos',
            'tipo_documentos_identidad',
        ];
    }
}
