<?php
// Registros temporales: todas las operaciones se revierten al terminar.
define('FCPATH', dirname(__DIR__, 2) . '/public/');
define('ENVIRONMENT', 'development');
require FCPATH . '../app/Config/Paths.php';
$paths = new \Config\Paths();
require $paths->systemDirectory . '/Boot.php';
\CodeIgniter\Boot::bootConsole($paths);
$db = \Config\Database::connect();
$db->transBegin();
try {
    $controller = static function (array $body = []) {
        $request = \Config\Services::incomingrequest(null, false);
        $request->setBody(json_encode($body));
        $controller = new \App\Controllers\Api\CursosController();
        $controller->initController($request, \Config\Services::response(null, false), \Config\Services::logger());
        return $controller;
    };
    $persona = $db->table('personas p')->select('p.id,p.numero')->join('ciudadanos c', 'c.id_persona=p.id')->get()->getRowArray();
    if (!$persona) throw new \RuntimeException('Se necesita una persona existente para la prueba.');
    $hoy = \App\Libraries\ReglasCurso::hoy();
    $db->table('cursos_seguridad_vial')->insert(['uuid'=>\App\Libraries\Identificador::nuevo(), 'codigo'=>'TEST-' . bin2hex(random_bytes(5)), 'nombre'=>'Prueba temporal retiro', 'fecha_inicio'=>$hoy, 'fecha_fin'=>$hoy, 'estado'=>'PROGRAMADO', 'cupos'=>1, 'costo_inscripcion'=>0]);
    $cursoId = (int)$db->insertID();
    $inscribir = $controller(['dni'=>$persona['numero']])->inscribirParticipante($cursoId);
    if ($inscribir->getStatusCode() !== 201) throw new \RuntimeException('No se pudo crear la inscripción temporal: ' . $inscribir->getBody());
    $inscripcion = json_decode($inscribir->getBody(), true)['data'];
    $id = $inscripcion['idInscripcion'];
    $resultado = $controller()->retirarInscripcion($inscripcion['uuid']);
    if ($resultado->getStatusCode() !== 200 || json_decode($resultado->getBody(), true)['data']['cuposInscritos'] !== 0) throw new \RuntimeException('El retiro no liberó el cupo.');
    if ($db->table('inscripciones_curso')->where('id', $id)->get()->getRowArray()['estado'] !== 'CANCELADO') throw new \RuntimeException('No se conservó la inscripción cancelada.');
    if (!$db->table('personas')->where('id', $persona['id'])->countAllResults()) throw new \RuntimeException('La persona no se conservó.');
    if (count(json_decode($controller()->show($cursoId)->getBody(), true)['data']['participantes']) !== 0) throw new \RuntimeException('El retirado sigue en la lista activa.');
    if ($controller(['estado'=>'APROBADO'])->registrarNota($cursoId, $persona['numero'])->getStatusCode() !== 404) throw new \RuntimeException('Se pudo reactivar con nota una inscripción cancelada.');
    if ($controller(['entregado'=>true])->marcarEntregaCarnet($id)->getStatusCode() !== 400) throw new \RuntimeException('Se permitió entregar un carnet de inscripción retirada.');
    if ($controller()->retirarInscripcion($id)->getStatusCode() !== 200) throw new \RuntimeException('El retiro repetido debe ser idempotente.');
    $reinscribir = $controller(['dni'=>$persona['numero']])->inscribirParticipante($cursoId);
    if ($reinscribir->getStatusCode() !== 201 || json_decode($reinscribir->getBody(), true)['data']['idInscripcion'] !== $id) throw new \RuntimeException('No se pudo reinscribir conservando el registro.');
    $db->table('pagos_transito')->insert(['uuid'=>\App\Libraries\Identificador::nuevo(), 'id_inscripcion'=>$id, 'tipo_pago'=>'CURSO', 'total'=>10, 'estado'=>'PENDIENTE']);
    $pagoId = (int)$db->insertID();
    if ($controller()->retirarInscripcion($id)->getStatusCode() !== 200) throw new \RuntimeException('No se permitió retirar una inscripción sin pagar.');
    if ($db->table('pagos_transito')->where('id', $pagoId)->get()->getRowArray()['estado'] !== 'ANULADO') throw new \RuntimeException('El comprobante pendiente no fue anulado.');
    if (\App\Libraries\PagosListado::builder($db)->where('listado.id_inscripcion', $id)->countAllResults() !== 0) throw new \RuntimeException('El retiro sigue apareciendo en Pagos.');
    if ($db->table('inscripciones_curso')->where('id', $id)->get()->getRowArray()['estado_pago'] !== 'ANULADO') throw new \RuntimeException('El retiro conservó una deuda pendiente.');
    if ($controller(['dni'=>$persona['numero']])->inscribirParticipante($cursoId)->getStatusCode() !== 201) throw new \RuntimeException('No se pudo reinscribir después de cancelar la deuda.');
    if (\App\Libraries\PagosListado::builder($db)->where('listado.id', $pagoId)->where('listado.prefijo', '')->countAllResults() !== 0) throw new \RuntimeException('El cobro cancelado reapareció al reinscribir.');
    $db->table('pagos_transito')->where('id', $pagoId)->update(['estado'=>'PAGADO', 'numero_recibo'=>'TEST-' . bin2hex(random_bytes(5)), 'fecha_pago'=>$hoy, 'hora_pago'=>'10:00:00', 'medio_pago'=>'EFECTIVO']);
    $cobrado = $controller()->retirarInscripcion($id);
    if ($cobrado->getStatusCode() !== 400) throw new \RuntimeException('Protección de pago cobrado: ' . $cobrado->getStatusCode() . ' ' . $cobrado->getBody());
    $db->table('pagos_transito')->where('id', $pagoId)->update(['estado'=>'ANULADO']);
    $db->table('certificados_curso')->insert(['uuid'=>\App\Libraries\Identificador::nuevo(), 'id_inscripcion'=>$id, 'numero_certificado'=>'TEST-' . bin2hex(random_bytes(5))]);
    if ($controller()->retirarInscripcion($id)->getStatusCode() !== 400) throw new \RuntimeException('Se permitió retirar con carnet emitido.');
    if ($controller()->retirarInscripcion('no-existe')->getStatusCode() !== 404) throw new \RuntimeException('Identificador inexistente aceptado.');
    echo "PASS retiro sin deuda, comprobante pendiente anulado/oculto, cupos, reinscripción y protección de pagos cobrados/carnets\n";
} finally {
    $db->query('ROLLBACK');
    $db->close();
}
