<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateVehiculosTables extends Migration
{
    public function up()
    {
        // 1. Tabla: tipos_vehiculo
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'nombre'      => ['type' => 'VARCHAR', 'constraint' => 50],
            'descripcion' => ['type' => 'VARCHAR', 'constraint' => 250, 'null' => true],
            'estado'      => ['type' => 'ENUM', 'constraint' => ['ACTIVO', 'INACTIVO'], 'default' => 'ACTIVO'],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('tipos_vehiculo', true);

        // 2. Tabla: vehiculos
        $this->forge->addField([
            'id'                   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'id_tipo_vehiculo'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'placa'                => ['type' => 'VARCHAR', 'constraint' => 15],
            'marca'                => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'modelo'               => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'color'                => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'anio_fabricacion'     => ['type' => 'INT', 'constraint' => 4, 'null' => true],
            'numero_serie'         => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'serie_motor'          => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'partida_registral'    => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'codigo_qr'            => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'id_asociacion'        => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'estado_formalizacion' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'created_at'           => ['type' => 'DATETIME', 'null' => true],
            'updated_at'           => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('id_tipo_vehiculo', 'tipos_vehiculo', 'id', 'RESTRICT', 'RESTRICT');
        $this->forge->addForeignKey('id_asociacion', 'organizaciones', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('vehiculos', true);

        // 3. Tabla: vehiculo_propietarios
        $this->forge->addField([
            'id'                 => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'id_vehiculo'        => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'id_persona'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'id_organizacion'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'fecha_inicio'       => ['type' => 'DATE'],
            'fecha_fin'          => ['type' => 'DATE', 'null' => true],
            'documento_sustento' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'estado'             => ['type' => 'ENUM', 'constraint' => ['VIGENTE', 'HISTORICO'], 'default' => 'VIGENTE'],
            'created_at'         => ['type' => 'DATETIME', 'null' => true],
            'updated_at'         => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('id_vehiculo', 'vehiculos', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('id_persona', 'personas', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('id_organizacion', 'organizaciones', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('vehiculo_propietarios', true);

        // 4. Tabla: documentos_vehiculo
        $this->forge->addField([
            'id'               => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'id_vehiculo'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'tipo_documento'   => ['type' => 'VARCHAR', 'constraint' => 30],
            'codigo'           => ['type' => 'VARCHAR', 'constraint' => 50],
            'fecha_expedicion' => ['type' => 'DATE', 'null' => true],
            'fecha_expiracion' => ['type' => 'DATE', 'null' => true],
            'estado'           => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'VIGENTE'],
            'created_at'       => ['type' => 'DATETIME', 'null' => true],
            'updated_at'       => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('id_vehiculo', 'vehiculos', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('documentos_vehiculo', true);
    }

    public function down()
    {
        $this->forge->dropTable('documentos_vehiculo', true);
        $this->forge->dropTable('vehiculo_propietarios', true);
        $this->forge->dropTable('vehiculos', true);
        $this->forge->dropTable('tipos_vehiculo', true);
    }
}

