<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateAuditoriaLogsTable extends Migration
{
    public function up()
    {
        if ($this->db->tableExists('auditoria_logs')) {
            return;
        }

        $this->forge->addField([
            'id' => [
                'type'           => 'BIGINT',
                'constraint'     => 20,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'id_usuario' => [
                'type'       => 'INT',
                'constraint' => 11,
                'null'       => true,
            ],
            'nombre_usuario' => [
                'type'       => 'VARCHAR',
                'constraint' => 60,
            ],
            'rol' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
            ],
            'modulo' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
            ],
            'accion' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
            ],
            'descripcion' => [
                'type' => 'TEXT',
            ],
            'detalles' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'ip' => [
                'type'       => 'VARCHAR',
                'constraint' => 45,
                'null'       => true,
            ],
            'user_agent' => [
                'type'       => 'VARCHAR',
                'constraint' => 250,
                'null'       => true,
            ],
            'fecha_hora' => [
                'type' => 'DATETIME',
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('modulo');
        $this->forge->addKey('accion');
        $this->forge->addKey('fecha_hora');
        $this->forge->createTable('auditoria_logs');
    }

    public function down()
    {
        if ($this->db->tableExists('auditoria_logs')) {
            $this->forge->dropTable('auditoria_logs');
        }
    }
}
