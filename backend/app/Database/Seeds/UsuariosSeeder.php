<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class UsuariosSeeder extends Seeder
{
    public function run()
    {
        $usersData = [
            [
                'nombres' => 'Diego',
                'apellido_paterno' => 'Barturen',
                'apellido_materno' => '',
                'numero' => '11111111',
                'usuario' => 'diegobarturen',
                'password' => 'diego123'
            ],
            [
                'nombres' => 'Manuel',
                'apellido_paterno' => 'Carrasco',
                'apellido_materno' => '',
                'numero' => '22222222',
                'usuario' => 'manuelcarrasco',
                'password' => 'manuel123'
            ],
            [
                'nombres' => 'Milenka',
                'apellido_paterno' => 'Segundo',
                'apellido_materno' => '',
                'numero' => '33333333',
                'usuario' => 'milenkasegundo',
                'password' => 'milenka123'
            ],
            [
                'nombres' => 'Angelo',
                'apellido_paterno' => 'Saavedra',
                'apellido_materno' => '',
                'numero' => '44444444',
                'usuario' => 'angelosaavedra',
                'password' => 'angelo123'
            ],
        ];

        foreach ($usersData as $u) {
            // 1. Crear en `personas`
            $this->db->table('personas')->insert([
                'id_tipo_documento' => 1, // Asumimos 1 = DNI
                'numero' => $u['numero'],
                'estado' => 'ACTIVO'
            ]);
            $idPersona = $this->db->insertID();

            // 2. Crear en `ciudadanos`
            $this->db->table('ciudadanos')->insert([
                'id_persona' => $idPersona,
                'nombres' => $u['nombres'],
                'apellido_paterno' => $u['apellido_paterno'],
                'apellido_materno' => $u['apellido_materno']
            ]);

            // 3. Crear en `trabajadores`
            $this->db->table('trabajadores')->insert([
                'id_persona' => $idPersona,
                'tipo' => 'INTERNO',
                'tiene_cuenta' => 1,
                'estado' => 'ACTIVO'
            ]);

            // 4. Crear en `usuarios`
            $this->db->table('usuarios')->insert([
                'id_trabajador' => $idPersona,
                'nombre_usuario' => $u['usuario'],
                'password_hash' => password_hash($u['password'], PASSWORD_BCRYPT),
                'estado' => 'ACTIVO'
            ]);
        }
    }
}
