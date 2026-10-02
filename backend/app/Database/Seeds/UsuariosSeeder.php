<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class UsuariosSeeder extends Seeder
{
    public function run()
    {
        $usersData = []; // Ya sembrado en BD

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

            // 3b. Create cargo / desplazamiento
            $cargoRow = $this->db->table('cargos')->where('nombre', $u['cargo'])->get()->getRowArray();
            if (!$cargoRow) {
                $this->db->table('cargos')->insert(['nombre' => $u['cargo'], 'estado' => 'ACTIVO']);
                $cargoId = $this->db->insertID();
            } else {
                $cargoId = $cargoRow['id'];
            }
            $this->db->table('desplazamiento_oficina')->insert([
                'id_trabajador' => $idPersona,
                'id_cargo' => $cargoId,
                'documento' => 'DESIGNACION-' . date('Y'),
                'fecha_documento' => date('Y-m-d'),
                'tipo_funcion' => 'Titular'
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
