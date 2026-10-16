<?php

namespace App\Commands;

use App\Libraries\Acceso;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

class RestablecerClave extends BaseCommand
{
    protected $group = 'Mantenimiento';
    protected $name = 'usuarios:clave';
    protected $description = 'Restablece la contraseña de un usuario (aleatoria si no se indica).';
    protected $usage = 'usuarios:clave <usuario> [clave]';

    public function run(array $params)
    {
        $usuario = trim((string) ($params[0] ?? ''));
        if ($usuario === '') {
            CLI::error('Indique el usuario. Ejemplo: php spark usuarios:clave superadmin');
            return EXIT_USER_INPUT;
        }

        $clave = $params[1] ?? null;
        $generada = $clave === null;
        if ($generada) {

            $alfabeto = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
            $clave = '';
            for ($i = 0; $i < 12; $i++) {
                $clave .= $alfabeto[random_int(0, strlen($alfabeto) - 1)];
            }
            $clave .= random_int(10, 99);
        }

        $error = Acceso::errorDePassword($clave, $usuario);
        if ($error !== null) {
            CLI::error($error);
            return EXIT_USER_INPUT;
        }

        $db = \Config\Database::connect();
        $fila = $db->table('usuarios')->select('id')->where('usuario', $usuario)->get()->getRowArray();
        if (!$fila) {
            CLI::error("No existe el usuario '{$usuario}'.");
            return EXIT_USER_INPUT;
        }

        $db->table('usuarios')->where('id', $fila['id'])->update([
            'clave' => password_hash($clave, PASSWORD_DEFAULT),
            'estado' => 'ACTIVO',
        ]);
        $db->query('UPDATE usuarios SET session_version = session_version + 1 WHERE id = ?', [$fila['id']]);

        CLI::write("Contraseña de '{$usuario}' actualizada.", 'green');
        if ($generada) {
            CLI::write("Contraseña temporal (se muestra una sola vez): {$clave}", 'yellow');
        }
        return EXIT_SUCCESS;
    }
}
