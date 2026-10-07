<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * `usuarios` pasa a apuntar directo a `personas` (id_persona) y gana
 * `id_rol` (FK a roles), reemplazando el pseudo-rol que antes se sacaba
 * del `cargo` del trabajador. También agrega `session_version`, usado
 * para poder invalidar sesiones activas (logout real, cambio de clave,
 * cambio de rol) sin depender de un almacén de sesiones con estado.
 */
class RestructureUsuariosTable extends Migration
{
    public function up()
    {
        if ($this->db->fieldExists('id_persona', 'usuarios')) {
            // Ya migrada (por ejemplo, la base vino del dump de init-db).
            return;
        }

        if (!$this->db->tableExists('usuarios')) {
            $this->forge->addField([
                'id'              => ['type' => 'INT', 'constraint' => 11, 'auto_increment' => true],
                'id_persona'      => ['type' => 'INT', 'constraint' => 11, 'null' => false],
                'id_rol'          => ['type' => 'INT', 'constraint' => 11, 'null' => false],
                'usuario'         => ['type' => 'VARCHAR', 'constraint' => 60, 'null' => false],
                'clave'           => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => false],
                'estado'          => ['type' => 'ENUM', 'constraint' => ['ACTIVO', 'INACTIVO'], 'null' => false, 'default' => 'ACTIVO'],
                'fecha_logueo'    => ['type' => 'DATETIME', 'null' => true],
                'session_version' => ['type' => 'INT', 'constraint' => 11, 'null' => false, 'default' => 0],
                'fecha_created'   => ['type' => 'TIMESTAMP', 'null' => false],
                'fecha_updated'   => ['type' => 'TIMESTAMP', 'null' => false],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->addUniqueKey('id_persona');
            $this->forge->addUniqueKey('usuario');
            $this->forge->addForeignKey('id_persona', 'personas', 'id');
            $this->forge->addForeignKey('id_rol', 'roles', 'id');
            $this->forge->createTable('usuarios', true, ['ENGINE' => 'InnoDB', 'CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_general_ci']);
            return;
        }

        // Tabla en el esquema viejo (id_trabajador / nombre_usuario / password_hash):
        // renombrar columnas y agregar las nuevas, preservando los datos.
        $this->db->query('ALTER TABLE usuarios DROP FOREIGN KEY IF EXISTS fk_usuarios_trabajador');
        $this->db->query('ALTER TABLE usuarios DROP KEY IF EXISTS uq_usuarios_personal');

        $this->db->query("
            ALTER TABLE usuarios
              CHANGE id_trabajador id_persona INT(11) NOT NULL,
              CHANGE nombre_usuario usuario VARCHAR(60) NOT NULL,
              CHANGE password_hash clave VARCHAR(255) NOT NULL,
              MODIFY estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
              ADD COLUMN id_rol INT(11) NULL AFTER id_persona,
              ADD COLUMN fecha_logueo DATETIME DEFAULT NULL,
              ADD COLUMN session_version INT(11) NOT NULL DEFAULT 0,
              ADD COLUMN fecha_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              ADD COLUMN fecha_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ");

        // Todo usuario existente queda como 'Trabajador' por defecto; ajustar
        // manualmente los que deban ser SuperAdmin/Gerente/SubGerente/Secretaria.
        $trabajadorRol = $this->db->table('roles')->select('id')->where('nombre', 'Trabajador')->get()->getRow();
        if ($trabajadorRol) {
            $this->db->table('usuarios')->where('id_rol', null)->update(['id_rol' => $trabajadorRol->id]);
        }

        $this->db->query('ALTER TABLE usuarios MODIFY id_rol INT(11) NOT NULL');
        $this->db->query('ALTER TABLE usuarios ADD CONSTRAINT uq_usuarios_persona UNIQUE (id_persona)');
        $this->db->query('ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_persona FOREIGN KEY (id_persona) REFERENCES personas(id)');
        $this->db->query('ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_rol FOREIGN KEY (id_rol) REFERENCES roles(id)');
    }

    public function down()
    {
        if (!$this->db->fieldExists('id_persona', 'usuarios')) {
            return;
        }

        $this->db->query('ALTER TABLE usuarios DROP FOREIGN KEY IF EXISTS fk_usuarios_persona');
        $this->db->query('ALTER TABLE usuarios DROP FOREIGN KEY IF EXISTS fk_usuarios_rol');
        $this->db->query('ALTER TABLE usuarios DROP KEY IF EXISTS uq_usuarios_persona');

        $this->db->query('
            ALTER TABLE usuarios
              CHANGE id_persona id_trabajador INT(11) NOT NULL,
              CHANGE usuario nombre_usuario VARCHAR(60) NOT NULL,
              CHANGE clave password_hash VARCHAR(255) NOT NULL,
              DROP COLUMN id_rol,
              DROP COLUMN fecha_logueo,
              DROP COLUMN session_version,
              DROP COLUMN fecha_created,
              DROP COLUMN fecha_updated
        ');
        $this->db->query('ALTER TABLE usuarios ADD CONSTRAINT uq_usuarios_personal UNIQUE (id_trabajador)');
        $this->db->query('ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_trabajador FOREIGN KEY (id_trabajador) REFERENCES trabajadores(id_persona)');
    }
}
