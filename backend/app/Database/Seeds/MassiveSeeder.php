<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use CodeIgniter\CLI\CLI;

class MassiveSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();

        $total = 2000000;
        $chunkSize = 5000;

        CLI::write("Preparando insercin de $total registros. Esto tomar unos minutos...", 'cyan');

        $passwordHash = password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT); // datos de carga: nadie inicia sesión con ellos;

        $cargo = $db->table('cargos')->where('nombre', 'Administrador')->get()->getRowArray();
        if (!$cargo) {
            $db->table('cargos')->insert(['nombre' => 'Administrador', 'estado' => 'ACTIVO']);
            $cargoId = $db->insertID();
        } else {
            $cargoId = $cargo['id'];
        }

        $db->query('SET FOREIGN_KEY_CHECKS = 0');
        $db->query('SET autocommit = 0');

        $maxPersona = $db->query('SELECT MAX(id) as m FROM personas')->getRow()->m ?? 0;
        $maxUsuario = $db->query('SELECT MAX(id) as m FROM usuarios')->getRow()->m ?? 0;
        $maxDesp = $db->query('SELECT MAX(id) as m FROM desplazamiento_oficina')->getRow()->m ?? 0;

        $nextDni = 30000000;
        $lotes = ceil($total / $chunkSize);

        for ($i = 0; $i < $lotes; $i++) {
            $personas = [];
            $ciudadanos = [];
            $trabajadores = [];
            $usuarios = [];
            $desplazamientos = [];

            $actualChunk = min($chunkSize, $total - ($i * $chunkSize));

            for ($j = 0; $j < $actualChunk; $j++) {
                $maxPersona++;
                $maxUsuario++;
                $maxDesp++;
                $nextDni++;

                $personas[] = [
                    'id' => $maxPersona,
                    'id_tipo_documento' => 1,
                    'numero' => (string)$nextDni,
                    'estado' => 'ACTIVO'
                ];

                $ciudadanos[] = [
                    'id_persona' => $maxPersona,
                    'nombres' => 'Test',
                    'apellido_paterno' => 'Masivo',
                    'apellido_materno' => (string)$nextDni
                ];

                $trabajadores[] = [
                    'id_persona' => $maxPersona,
                    'tipo' => 'INTERNO',
                    'tiene_cuenta' => 1,
                    'estado' => 'ACTIVO'
                ];

                $desplazamientos[] = [
                    'id' => $maxDesp,
                    'id_trabajador' => $maxPersona,
                    'id_cargo' => $cargoId,
                    'documento' => 'MASIVO-2026',
                    'fecha_documento' => date('Y-m-d'),
                    'tipo_funcion' => 'Titular'
                ];

                $usuarios[] = [
                    'id' => $maxUsuario,
                    'id_persona' => $maxPersona,
                    'id_rol' => 1,
                    'usuario' => 'test_' . $nextDni,
                    'clave' => $passwordHash,
                    'estado' => 'ACTIVO'
                ];
            }

            foreach ($personas as &$personaFila) {
                $personaFila['uuid'] = $personaFila['uuid'] ?? \App\Libraries\Identificador::nuevo();
            }
            unset($personaFila);
            $db->table('personas')->insertBatch($personas);
            $db->table('ciudadanos')->insertBatch($ciudadanos);
            $db->table('trabajadores')->insertBatch($trabajadores);
            $db->table('desplazamiento_oficina')->insertBatch($desplazamientos);
            $db->table('usuarios')->insertBatch($usuarios);

            $db->query('COMMIT');
            CLI::showProgress($i + 1, $lotes);
        }

        $db->query('SET autocommit = 1');
        $db->query('SET FOREIGN_KEY_CHECKS = 1');

        CLI::write("\n\nProceso Finalizado! Se inyectaron $total usuarios exitosamente.", 'green');
    }
}