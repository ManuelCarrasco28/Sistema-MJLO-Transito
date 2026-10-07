<?php
// Prueba de mapeo y filtro; cualquier actualización temporal se revierte.
define('FCPATH', dirname(__DIR__, 2) . '/public/');
define('ENVIRONMENT', 'development');
require FCPATH . '../app/Config/Paths.php';
$paths = new \Config\Paths();
require $paths->systemDirectory . '/Boot.php';
\CodeIgniter\Boot::bootConsole($paths);
$db = \Config\Database::connect();
$request = \Config\Services::incomingrequest(null, false);
$controller = new \App\Controllers\Api\InspeccionesController();
$controller->initController($request, \Config\Services::response(null, false), \Config\Services::logger());
$resolver = new \ReflectionMethod($controller, 'resolverTecnicoInspeccion');
$manual = $resolver->invoke($controller, $db, ['inspector' => 'Inspector Técnico Manual', 'tecnicoId' => '']);
if ($manual !== [null, 'Inspector Técnico Manual']) throw new \RuntimeException('El nombre libre no se conserva.');
try {
    $resolver->invoke($controller, $db, ['inspector' => '']);
    throw new \RuntimeException('Se aceptó un responsable vacío.');
} catch (\DomainException $expected) {}
$transito = $db->table('trabajadores t')->select('t.id_persona')
    ->where('t.tipo_inspector', 'TRANSITO')->get()->getRowArray();
if (!$transito) throw new \RuntimeException('Falta un inspector de tránsito para verificar el rechazo.');
try {
    $resolver->invoke($controller, $db, ['tecnicoId' => $transito['id_persona']]);
    throw new \RuntimeException('Se permitió vincular un inspector de tránsito.');
} catch (\DomainException $expected) {}
$request->setGlobal('get', ['page' => 1, 'porPagina' => 100, 'estado' => 'ACTIVO', 'tipoInspector' => 'TECNICO']);
$personal = new \App\Controllers\Api\PersonalController();
$personal->initController($request, \Config\Services::response(null, false), \Config\Services::logger());
$listado = json_decode($personal->index()->getBody(), true);
foreach ($listado['data'] ?? [] as $tecnico) {
    if ($tecnico['tipo_inspector'] !== 'TECNICO') throw new \RuntimeException('El filtro devolvió otro tipo.');
    $resolver->invoke($controller, $db, ['tecnicoId' => $tecnico['id']]);
}
$registro = $db->table('certicav')->select('id')->get()->getRowArray();
if (!$registro) throw new \RuntimeException('No hay inspecciones para probar el nombre guardado.');
$db->transBegin();
try {
    // Tipo técnico con cargo administrativo distinto y sin cuenta: el cargo no decide la función.
    $persona = $db->table('personas p')->select('p.id')
        ->join('ciudadanos c', 'c.id_persona=p.id')
        ->join('trabajadores t', 't.id_persona=p.id', 'left')
        ->join('usuarios u', 'u.id_persona=p.id', 'left')
        ->where('t.id_persona', null)->where('u.id', null)->get()->getRowArray();
    if (!$persona) throw new \RuntimeException('Falta una persona para la prueba temporal.');
    $request->setBody(json_encode(['id_persona'=>$persona['id'], 'cargo'=>'CAJERO DE RECAUDACIÓN', 'estado'=>'ACTIVO', 'tipo_inspector'=>'TECNICO']));
    $respuesta = $personal->create();
    if ($respuesta->getStatusCode() >= 400) throw new \RuntimeException('No se pudo registrar al técnico sin cuenta.');
    $vinculo = $resolver->invoke($controller, $db, ['tecnicoId'=>$persona['id']]);
    if ($vinculo[0] !== (int)$persona['id']) throw new \RuntimeException('Se sigue usando el cargo para identificar al técnico.');
    if ($db->table('usuarios')->where('id_persona', $persona['id'])->countAllResults() !== 0) throw new \RuntimeException('Se creó una cuenta para el técnico.');
    $cuentas = new \App\Controllers\Api\UsuariosController();
    $validarCuenta = new \ReflectionMethod($cuentas, 'errorTipoInspector');
    if (!$validarCuenta->invoke($cuentas, $db, (int)$persona['id'], 'Trabajador', 'ACTIVO')) throw new \RuntimeException('Se permitió dar acceso a un técnico.');
    if (!$validarCuenta->invoke($cuentas, $db, (int)$transito['id_persona'], 'Gerente', 'ACTIVO')) throw new \RuntimeException('Se permitió acceso de oficina a tránsito.');
    if ($validarCuenta->invoke($cuentas, $db, (int)$transito['id_persona'], 'Trabajador', 'ACTIVO') !== null) throw new \RuntimeException('Se bloqueó el rol móvil.');
    $db->table('certicav')->where('id', $registro['id'])->update(['nombre_tecnico' => $manual[1], 'id_tecnico' => null]);
    $detalle = json_decode($controller->show($registro['id'])->getBody(), true);
    if (($detalle['data']['inspector'] ?? '') !== $manual[1]) throw new \RuntimeException('La ficha no devuelve el nombre escrito.');
    echo "PASS tipo independiente del cargo, técnico sin cuenta, tránsito solo móvil, nombre manual guardado/leído y responsable vacío rechazado\n";
} finally {
    $db->query('ROLLBACK');
    $db->close();
}
