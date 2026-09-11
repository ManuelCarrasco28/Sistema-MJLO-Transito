<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateCoreTables extends Migration
{
    public function up()
    {
        // 1. Tabla: personal
        $this->forge->addField([
            'id'               => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tipo_documento'   => ['type' => 'VARCHAR', 'constraint' => 20],
            'numero_documento' => ['type' => 'VARCHAR', 'constraint' => 20],
            'nombres'          => ['type' => 'VARCHAR', 'constraint' => 100],
            'apellidos'        => ['type' => 'VARCHAR', 'constraint' => 100],
            'cargo'            => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'estado'           => ['type' => 'ENUM', 'constraint' => ['ACTIVO', 'INACTIVO'], 'default' => 'ACTIVO'],
            'created_at'       => ['type' => 'DATETIME', 'null' => true],
            'updated_at'       => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('personal', true);

        // 2. Tabla: usuarios
        $this->forge->addField([
            'id'             => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'id_personal'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'nombre_usuario' => ['type' => 'VARCHAR', 'constraint' => 50],
            'password_hash'  => ['type' => 'VARCHAR', 'constraint' => 255],
            'estado'         => ['type' => 'ENUM', 'constraint' => ['ACTIVO', 'INACTIVO'], 'default' => 'ACTIVO'],
            'created_at'     => ['type' => 'DATETIME', 'null' => true],
            'updated_at'     => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('id_personal', 'personal', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('usuarios', true);

        // 3. Tabla: personas
        $this->forge->addField([
            'id'                       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tipo_documento'           => ['type' => 'VARCHAR', 'constraint' => 20],
            'numero_documento'         => ['type' => 'VARCHAR', 'constraint' => 20],
            'nombres'                  => ['type' => 'VARCHAR', 'constraint' => 100],
            'apellido_paterno'         => ['type' => 'VARCHAR', 'constraint' => 100],
            'apellido_materno'         => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'direccion'                => ['type' => 'VARCHAR', 'constraint' => 250, 'null' => true],
            'telefono'                 => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'celular'                  => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'email'                    => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'numero_licencia_conducir' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'foto_url'                 => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'estado'                   => ['type' => 'ENUM', 'constraint' => ['ACTIVO', 'INACTIVO'], 'default' => 'ACTIVO'],
            'created_at'               => ['type' => 'DATETIME', 'null' => true],
            'updated_at'               => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('personas', true);

        // 4. Tabla: organizaciones
        $this->forge->addField([
            'id'                  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tipo'                => ['type' => 'VARCHAR', 'constraint' => 50],
            'razon_social'        => ['type' => 'VARCHAR', 'constraint' => 250],
            'ruc'                 => ['type' => 'VARCHAR', 'constraint' => 11, 'null' => true],
            'partida_registral'   => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'representante_legal' => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => true],
            'direccion'           => ['type' => 'VARCHAR', 'constraint' => 250, 'null' => true],
            'telefono_contacto'   => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'email_contacto'      => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'estado'              => ['type' => 'ENUM', 'constraint' => ['ACTIVO', 'INACTIVO'], 'default' => 'ACTIVO'],
            'created_at'          => ['type' => 'DATETIME', 'null' => true],
            'updated_at'          => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('organizaciones', true);
    }

    public function down()
    {
        $this->forge->dropTable('organizaciones', true);
        $this->forge->dropTable('personas', true);
        $this->forge->dropTable('usuarios', true);
        $this->forge->dropTable('personal', true);
    }
}

