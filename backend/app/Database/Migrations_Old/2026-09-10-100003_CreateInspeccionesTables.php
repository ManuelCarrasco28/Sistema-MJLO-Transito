<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateInspeccionesTables extends Migration
{
    public function up()
    {
        // 1. Tabla: inspeccion_criterios
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'codigo'      => ['type' => 'VARCHAR', 'constraint' => 20],
            'nombre'      => ['type' => 'VARCHAR', 'constraint' => 150],
            'descripcion' => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'obligatorio' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
            'orden'       => ['type' => 'SMALLINT', 'constraint' => 6],
            'estado'      => ['type' => 'VARCHAR', 'constraint' => 15, 'default' => 'ACTIVO'],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('inspeccion_criterios', true);

        // 2. Tabla: inspecciones_tecnicas
        $this->forge->addField([
            'id'                 => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'numero_inspeccion'  => ['type' => 'VARCHAR', 'constraint' => 50],
            'id_vehiculo'        => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'id_tecnico'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'fecha_inspeccion'   => ['type' => 'DATE'],
            'resultado'          => ['type' => 'VARCHAR', 'constraint' => 50, 'default' => 'PENDIENTE'],
            'primera_evaluacion' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'segunda_evaluacion' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'observaciones'      => ['type' => 'VARCHAR', 'constraint' => 1000, 'null' => true],
            'estado'             => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'ACTIVO'],
            'created_at'         => ['type' => 'DATETIME', 'null' => true],
            'updated_at'         => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('id_vehiculo', 'vehiculos', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('id_tecnico', 'personal', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('inspecciones_tecnicas', true);

        // 3. Tabla: inspeccion_detalles
        $this->forge->addField([
            'id'              => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'id_inspeccion'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'id_criterio'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'estado_revision' => ['type' => 'VARCHAR', 'constraint' => 20],
            'observacion'     => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'created_at'      => ['type' => 'DATETIME', 'null' => true],
            'updated_at'      => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('id_inspeccion', 'inspecciones_tecnicas', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('id_criterio', 'inspeccion_criterios', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('inspeccion_detalles', true);
    }

    public function down()
    {
        $this->forge->dropTable('inspeccion_detalles', true);
        $this->forge->dropTable('inspecciones_tecnicas', true);
        $this->forge->dropTable('inspeccion_criterios', true);
    }
}

