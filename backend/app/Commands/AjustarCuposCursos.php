<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

/** Corrección manual de capacidad; nunca borra inscripciones ni toca pagos. */
class AjustarCuposCursos extends BaseCommand
{
    protected $group = 'Mantenimiento';
    protected $name = 'cursos:ajustar-cupos';
    protected $description = 'Lista cursos sobreocupados; --aplicar aumenta únicamente sus cupos hasta el número de inscritos.';
    protected $options = ['--aplicar'=>'Aplicar el ajuste de cupos, conservando todos los registros.'];

    public function run(array $params)
    {
        $db = \Config\Database::connect();
        $desde = "FROM cursos_seguridad_vial c JOIN (SELECT id_curso, COUNT(*) AS inscritos FROM inscripciones_curso WHERE estado NOT IN ('ANULADO','CANCELADO') GROUP BY id_curso) i ON i.id_curso=c.id WHERE COALESCE(c.cupos,0)<i.inscritos";
        $cantidad = (int)$db->query('SELECT COUNT(*) AS total ' . $desde)->getRow('total');
        if (CLI::getOption('aplicar') === null) { CLI::write("Cursos sobreocupados: $cantidad. No se modificó ningún dato."); return; }
        $db->transBegin();
        try {
            $db->query("UPDATE cursos_seguridad_vial c JOIN (SELECT id_curso, COUNT(*) AS inscritos FROM inscripciones_curso WHERE estado NOT IN ('ANULADO','CANCELADO') GROUP BY id_curso) i ON i.id_curso=c.id SET c.cupos=i.inscritos WHERE COALESCE(c.cupos,0)<i.inscritos");
            if (!$db->transStatus()) throw new \RuntimeException('No se pudo aplicar el ajuste.');
            $afectados = $db->affectedRows();
            $db->transCommit();
            CLI::write("Cupos ajustados: $afectados. Inscripciones y pagos conservados.");
        } catch (\Throwable $e) { $db->transRollback(); throw $e; }
    }
}
