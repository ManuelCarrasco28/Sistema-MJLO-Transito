<?php

namespace App\Commands;

use App\Libraries\Identificador;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

class RellenarUuid extends BaseCommand
{
    protected $group = 'Mantenimiento';
    protected $name = 'uuid:rellenar';
    protected $description = 'Asigna UUID v7 a los registros principales que todavía no tienen.';

    public function run(array $params)
    {
        $db = \Config\Database::connect();
        foreach (Identificador::TABLAS as $tabla) {
            $rellenados = Identificador::rellenar($db, $tabla);
            CLI::write(str_pad($tabla, 26) . ($rellenados > 0 ? "{$rellenados} registros rellenados" : 'al día'));
        }
    }
}
