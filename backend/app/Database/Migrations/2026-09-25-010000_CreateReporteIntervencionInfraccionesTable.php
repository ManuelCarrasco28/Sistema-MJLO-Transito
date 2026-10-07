<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * `ReportesIntervencionController` ya usaba la tabla
 * `reporte_intervencion_infracciones` para listar y convertir reportes de
 * evidencia a papeletas, pero nunca se creó en el esquema: cualquier reporte
 * con infracciones asociadas hacía fallar `index()` con un error 500.
 */
class CreateReporteIntervencionInfraccionesTable extends Migration
{
    public function up()
    {
        if ($this->db->tableExists('reporte_intervencion_infracciones')) {
            return;
        }

        $this->forge->addField([
            'id' => [
                'type'           => 'BIGINT',
                'constraint'     => 20,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'id_reporte' => [
                'type'       => 'INT',
                'constraint' => 11,
            ],
            'id_tipo_infraccion' => [
                'type'       => 'INT',
                'constraint' => 11,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('id_reporte');
        $this->forge->addKey('id_tipo_infraccion');
        $this->forge->addForeignKey('id_reporte', 'reportes_intervencion', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('id_tipo_infraccion', 'tipos_infraccion', 'id', '', 'RESTRICT');
        $this->forge->createTable('reporte_intervencion_infracciones');
    }

    public function down()
    {
        if ($this->db->tableExists('reporte_intervencion_infracciones')) {
            $this->forge->dropTable('reporte_intervencion_infracciones');
        }
    }
}
