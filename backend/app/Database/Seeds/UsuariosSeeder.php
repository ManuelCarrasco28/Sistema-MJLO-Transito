<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class UsuariosSeeder extends Seeder
{
    public function run()
    {
        $usersData = [];

        foreach ($usersData as $u) {

            $this->db->table('personas')->insert([
                'uuid' => \App\Libraries\Identificador::nuevo(),
                'id_tipo_documento' => 1,
                'numero' => $u['numero'],
                'estado' => 'ACTIVO'
            ]);
            $idPersona = $this->db->insertID();

            $this->db->table('ciudadanos')->insert([
                'id_persona' => $idPersona,
                'nombres' => $u['nombres'],
                'apellido_paterno' => $u['apellido_paterno'],
                'apellido_materno' => $u['apellido_materno']
            ]);

            $this->db->table('trabajadores')->insert([
                'id_persona' => $idPersona,
                'tipo' => 'INTERNO',
                'tiene_cuenta' => 1,
                'estado' => 'ACTIVO'
            ]);

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

            $this->db->table('usuarios')->insert([
                'id_trabajador' => $idPersona,
                'nombre_usuario' => $u['usuario'],
                'password_hash' => password_hash($u['password'], PASSWORD_BCRYPT),
                'estado' => 'ACTIVO'
            ]);
        }
    }
}
