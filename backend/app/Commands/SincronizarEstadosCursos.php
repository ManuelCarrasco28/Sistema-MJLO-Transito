<?php

namespace App\Commands;

use App\Libraries\ReglasCurso;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

/**
 * php spark cursos:sincronizar-estados
 * Pone al día los estados que dependen de una fecha: cursos (programado, en curso, finalizado), documentos del vehículo y permisos (vigente, vencido). Conviene programarlo
 * una vez al día (cron o tarea programada), para que no dependa de que alguien abra la pantalla de cursos.
 */
class SincronizarEstadosCursos extends BaseCommand
{
    protected $group = 'Mantenimiento';
    protected $name = 'cursos:sincronizar-estados';
    protected $description = 'Actualiza los estados de cursos, documentos y permisos según sus fechas.';

    public function run(array $params)
    {
        $db = \Config\Database::connect();
        ReglasCurso::sincronizarEstados($db);
        \App\Libraries\EstadosPorFecha::sincronizar($db);
        CLI::write('Estados de cursos, documentos del vehículo y permisos actualizados.', 'green');
    }
}
