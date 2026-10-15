<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateCursosTramitesTables extends Migration
{
    public function up()
    {

        $this->forge->addField([
            'id'                => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'codigo'            => ['type' => 'VARCHAR', 'constraint' => 50],
            'nombre'            => ['type' => 'VARCHAR', 'constraint' => 150],
            'descripcion'       => ['type' => 'TEXT', 'null' => true],
            'resolucion'        => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'fecha_inicio'      => ['type' => 'DATE', 'null' => true],
            'fecha_fin'         => ['type' => 'DATE', 'null' => true],
            'lugar'             => ['type' => 'VARCHAR', 'constraint' => 250, 'null' => true],
            'costo_inscripcion' => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => '0.00'],
            'cupos'             => ['type' => 'INT', 'constraint' => 11, 'null' => true],
            'estado'            => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'ACTIVO'],
            'created_at'        => ['type' => 'DATETIME', 'null' => true],
            'updated_at'        => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('cursos_seguridad_vial', true);

        $this->forge->addField([
            'id'                => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'id_curso'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'id_persona'        => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'id_vehiculo'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'numero_ri'         => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'fecha_inscripcion' => ['type' => 'DATE'],
            'estado_pago'       => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'PENDIENTE'],
            'asistio'           => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'estado'            => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'INSCRITO'],
            'created_at'        => ['type' => 'DATETIME', 'null' => true],
            'updated_at'        => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('id_curso', 'cursos_seguridad_vial', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('id_persona', 'personas', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('id_vehiculo', 'vehiculos', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('inscripciones_curso', true);

        $this->forge->addField([
            'id'                   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'numero_formulario'    => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'tipo_tramite'         => ['type' => 'VARCHAR', 'constraint' => 100],
            'id_persona'           => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'id_organizacion'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'id_vehiculo'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'funcionario_dirigido' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'cargo_funcionario'    => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'detalle_solicitud'    => ['type' => 'TEXT', 'null' => true],
            'fecha_solicitud'      => ['type' => 'DATE'],
            'estado'               => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'PENDIENTE'],
            'created_at'           => ['type' => 'DATETIME', 'null' => true],
            'updated_at'           => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('id_persona', 'personas', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('id_organizacion', 'organizaciones', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('id_vehiculo', 'vehiculos', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('tramites_documentarios', true);
    }

    public function down()
    {
        $this->forge->dropTable('tramites_documentarios', true);
        $this->forge->dropTable('inscripciones_curso', true);
        $this->forge->dropTable('cursos_seguridad_vial', true);
    }
}

