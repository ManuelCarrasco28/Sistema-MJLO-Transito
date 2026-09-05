<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class UsuariosSeeder extends Seeder
{
    public function run()
    {
        $personal = [
            ['tipo_documento' => 'DNI', 'numero_documento' => '11111111', 'nombres' => 'Diego', 'apellidos' => 'Barturen', 'cargo' => 'Administrador', 'estado' => 'ACTIVO'],
            ['tipo_documento' => 'DNI', 'numero_documento' => '22222222', 'nombres' => 'Manuel', 'apellidos' => 'Carrasco', 'cargo' => 'Administrador', 'estado' => 'ACTIVO'],
            ['tipo_documento' => 'DNI', 'numero_documento' => '33333333', 'nombres' => 'Milenka', 'apellidos' => 'Segundo', 'cargo' => 'Administrador', 'estado' => 'ACTIVO'],
            ['tipo_documento' => 'DNI', 'numero_documento' => '44444444', 'nombres' => 'Angelo', 'apellidos' => 'Saavedra', 'cargo' => 'Administrador', 'estado' => 'ACTIVO'],
        ];

        $this->db->table('personal')->insertBatch($personal);

        $usuarios = [
            ['personal_id' => 1, 'nombre_usuario' => 'diegobarturen', 'password_hash' => password_hash('diego123', PASSWORD_BCRYPT), 'estado' => 'ACTIVO'],
            ['personal_id' => 2, 'nombre_usuario' => 'manuelcarrasco', 'password_hash' => password_hash('manuel123', PASSWORD_BCRYPT), 'estado' => 'ACTIVO'],
            ['personal_id' => 3, 'nombre_usuario' => 'milenkasegundo', 'password_hash' => password_hash('milenka123', PASSWORD_BCRYPT), 'estado' => 'ACTIVO'],
            ['personal_id' => 4, 'nombre_usuario' => 'angelosaavedra', 'password_hash' => password_hash('angelo123', PASSWORD_BCRYPT), 'estado' => 'ACTIVO'],
        ];

        $this->db->table('usuarios')->insertBatch($usuarios);
    }
}
