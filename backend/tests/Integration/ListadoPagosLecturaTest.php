<?php

define('FCPATH', dirname(__DIR__, 2) . '/public/');
define('ENVIRONMENT', 'development');
require FCPATH . '../app/Config/Paths.php';
$paths = new \Config\Paths();
require $paths->systemDirectory . '/Boot.php';
\CodeIgniter\Boot::bootConsole($paths);
$db = \Config\Database::connect();
$sql = \App\Libraries\PagosListado::sql();
$esperado = (int)$db->query("SELECT COUNT(*) AS total FROM ($sql) listado")->getRow('total');
$actual = \App\Libraries\PagosListado::builder($db)->countAllResults();
if ($actual !== $esperado) throw new \RuntimeException('El builder no incluye todos los orígenes.');
$internamientos = (int)$db->table('ordenes_libertad')->countAllResults()
    + (int)$db->table('ordenes_internamiento')->where('estado', 'RETENIDO')->countAllResults();
$obtenidos = \App\Libraries\PagosListado::builder($db)->where('listado.tipo_pago', 'INTERNAMIENTO')->countAllResults();
if ($obtenidos !== $internamientos) throw new \RuntimeException('Faltan internamientos.');
$request = \Config\Services::incomingrequest(null, false);
$request->setGlobal('get', ['page'=>1, 'porPagina'=>5, 'tipoPago'=>'INTERNAMIENTO']);
$controller = new \App\Controllers\Api\PagosController();
$controller->initController($request, \Config\Services::response(), \Config\Services::logger());
$inicio = microtime(true);
$payload = json_decode($controller->index()->getBody(), true);
if (($payload['meta']['total'] ?? -1) !== $internamientos || count($payload['data']) > 5) throw new \RuntimeException('Respuesta paginada incorrecta: ' . json_encode(['meta'=>$payload['meta'] ?? null, 'esperado'=>$internamientos, 'filas'=>count($payload['data'] ?? [])]));
$request->setGlobal('get', ['page'=>1, 'porPagina'=>5, 'buscar'=>"prueba %_'", 'estado'=>'PAGADO']);
$response = $controller->index();
if ($response->getStatusCode() !== 200) throw new \RuntimeException('Búsqueda inválida.');
foreach (['CURSO', 'TRAMITE'] as $tipo) {
    $request->setGlobal('get', ['page'=>1, 'porPagina'=>20, 'tipoPago'=>$tipo, 'estado'=>'PAGADO']);
    $filas = json_decode($controller->index()->getBody(), true)['data'];
    foreach ($filas as $fila) {
        if (empty($fila['pagadoPor'])) continue;
        $request->setGlobal('get', ['page'=>1, 'porPagina'=>200, 'tipoPago'=>$tipo, 'estado'=>'PAGADO', 'buscar'=>$fila['pagadoPor']]);
        $resultado = json_decode($controller->index()->getBody(), true)['data'];
        if (!in_array($fila['id'], array_column($resultado, 'id'), true)) throw new \RuntimeException('No encuentra al pagador de ' . $tipo);
        break;
    }
}

foreach (['id_papeleta', 'id_inscripcion', 'id_tramite'] as $columna) {
    $metodo = new \ReflectionMethod($controller, 'idsConRecibo');
    $vigentes = $metodo->invoke($controller, $db, $columna);
    $esperados = array_map('intval', array_column($db->table('pagos_transito')->select($columna)
        ->where($columna . ' IS NOT NULL')->where('estado !=', 'ANULADO')->get()->getResultArray(), $columna));
    if ($vigentes !== $esperados) throw new \RuntimeException('Se incluyen recibos anulados al ocultar deudas.');
}
$validacion = \Config\Services::validation();
foreach ([-1, '-0.01'] as $costo) {
    $validacion->reset()->setRules(['costo'=>'permit_empty|numeric|greater_than_equal_to[0]']);
    if ($validacion->run(['costo'=>$costo])) throw new \RuntimeException('Se permite costo negativo.');
}
$validacion->reset()->setRules(['costo'=>'permit_empty|numeric|greater_than_equal_to[0]']);
if (!$validacion->run(['costo'=>0])) throw new \RuntimeException('Debe admitir cursos gratuitos.');
$request->setGlobal('get', ['page'=>1, 'porPagina'=>5]);
$inicioLista = microtime(true);
$todos = json_decode($controller->index()->getBody(), true);
$msLista = (microtime(true) - $inicioLista) * 1000;
$estadisticas = json_decode($controller->estadisticas()->getBody(), true)['data'];
if ($todos['meta']['total'] !== $estadisticas['totalPagos']) throw new \RuntimeException('Totales del listado y estadísticas no coinciden.');

foreach (['create','update'] as $accion) {
    foreach ([['titulo'=>'Prueba validación', 'fecha'=>'2026-10-10', 'costo'=>-1], ['titulo'=>'Prueba validación', 'fecha'=>'2026-10-10', 'estado'=>'OTRO']] as $entrada) {
        $peticion = \Config\Services::incomingrequest(null, false);
        $peticion->setBody(json_encode($entrada));
        $cursos = new \App\Controllers\Api\CursosController();
        $cursos->initController($peticion, \Config\Services::response(null, false), \Config\Services::logger());
        $respuesta = $accion === 'create' ? $cursos->create() : $cursos->update(0);
        if ($respuesta->getStatusCode() !== 400) throw new \RuntimeException('El controlador permite un curso inválido.');
    }
}
echo "PASS listado unificado, internamientos, paginación y búsqueda escapada (solo lectura)\n";
echo 'PASS búsqueda curso/trámite, exclusión de anulados, validación de cursos y totales; primera página: ' . round($msLista) . " ms\n";
