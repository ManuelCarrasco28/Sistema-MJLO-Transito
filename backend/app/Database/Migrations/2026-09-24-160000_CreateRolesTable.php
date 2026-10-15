<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateRolesTable extends Migration
{
    public function up()
    {
        if ($this->db->tableExists('roles')) {
            return;
        }

        $this->forge->addField([
            'id'             => ['type' => 'INT', 'constraint' => 11, 'auto_increment' => true],
            'fecha_created'  => ['type' => 'TIMESTAMP', 'null' => false],
            'fecha_updated'  => ['type' => 'TIMESTAMP', 'null' => false],
            'nombre'         => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'estado'         => ['type' => 'ENUM', 'constraint' => ['ACTIVO', 'INACTIVO'], 'null' => true, 'default' => 'ACTIVO'],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('roles', true, ['ENGINE' => 'InnoDB', 'CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_general_ci']);

        $this->db->table('roles')->insertBatch([
            ['nombre' => 'SuperAdmin', 'estado' => 'ACTIVO'],
            ['nombre' => 'Gerente', 'estado' => 'ACTIVO'],
            ['nombre' => 'SubGerente', 'estado' => 'ACTIVO'],
            ['nombre' => 'Secretaria', 'estado' => 'ACTIVO'],
            ['nombre' => 'Trabajador', 'estado' => 'ACTIVO'],
        ]);
    }

    public function down()
    {
        $this->forge->dropTable('roles', true);
    }
}
