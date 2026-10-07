<?php
// Pruebas con curso temporal, dentro de una transacción que siempre se revierte.
define('FCPATH', dirname(__DIR__, 2) . '/public/');
define('ENVIRONMENT', 'development');
require FCPATH . '../app/Config/Paths.php';
$paths = new \Config\Paths();
require $paths->systemDirectory . '/Boot.php';
\CodeIgniter\Boot::bootConsole($paths);
$db = \Config\Database::connect();
$db->transBegin();
try {
    $datos = ['titulo'=>'Prueba temporal calendario ' . bin2hex(random_bytes(5)), 'fecha'=>'2040-01-20', 'fechaFin'=>'2040-01-25', 'fechaInscripcionInicio'=>'2040-01-01', 'fechaInscripcionFin'=>'2040-01-19', 'horaInicio'=>'10:15', 'horaFin'=>'13:45', 'cuposTotales'=>2, 'costo'=>0, 'estado'=>'PROGRAMADO'];
    $controller = static function (array $body) {
        $request = \Config\Services::incomingrequest(null, false);
        $request->setBody(json_encode($body));
        $curso = new \App\Controllers\Api\CursosController();
        $curso->initController($request, \Config\Services::response(null, false), \Config\Services::logger());
        return $curso;
    };
    $respuesta = $controller($datos)->create();
    if ($respuesta->getStatusCode() !== 201) throw new \RuntimeException('No se creó el calendario.');
    $id = json_decode($respuesta->getBody(), true)['data']['id'];
    $guardado = $db->table('cursos_seguridad_vial')->where('id', $id)->get()->getRowArray();
    if ($guardado['fecha_fin'] !== $datos['fechaFin'] || $guardado['hora_inicio'] !== '10:15:00' || $guardado['fecha_inscripcion_fin'] !== $datos['fechaInscripcionFin']) throw new \RuntimeException('El calendario no se guardó correctamente.');
    $detalle = json_decode($controller([])->show($id)->getBody(), true)['data'];
    if ($detalle['horario'] !== '10:15 - 13:45' || $detalle['fechaFin'] !== '2040-01-25') throw new \RuntimeException('El detalle no devuelve el horario/fecha real.');
    $respuesta = $controller(['fecha'=>'2040-01-21', 'fechaFin'=>'2040-01-30'])->update($id);
    if ($respuesta->getStatusCode() !== 200) throw new \RuntimeException('No se pudo reprogramar con fin explícito.');
    $personas = $db->table('personas p')->select('p.id,p.numero')->join('ciudadanos c', 'c.id_persona=p.id')->limit(2)->get()->getResultArray();
    if (count($personas) !== 2) throw new \RuntimeException('Se necesitan dos personas existentes para comprobar el cupo.');
    $cerrado = $controller(['dni'=>$personas[0]['numero']])->inscribirParticipante($id);
    if ($cerrado->getStatusCode() !== 400) throw new \RuntimeException('Inscripción permitida antes de la apertura.');
    foreach ($personas as $persona) {
        $db->table('inscripciones_curso')->insert(['uuid'=>\App\Libraries\Identificador::nuevo(), 'id_curso'=>$id, 'id_persona'=>$persona['id'], 'fecha_inscripcion'=>'2040-01-10', 'estado'=>'INSCRITO', 'estado_pago'=>'PAGADO', 'asistio'=>0]);
    }
    $reduccion = $controller(['cuposTotales'=>1])->update($id);
    if ($reduccion->getStatusCode() !== 400) throw new \RuntimeException('Capacidad reducida por debajo de inscritos.');
    echo "PASS calendario guardado/leído, reprogramación explícita, cierre de inscripción y protección de cupos\n";
} finally {
    $db->query('ROLLBACK');
    $db->close();
}
