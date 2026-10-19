<?php

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
    ->where(\App\Libraries\TipoInspector::sqlTieneRol('t', 'TRANSITO'), null, false)->get()->getRowArray();
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

    $persona = $db->table('personas p')->select('p.id')
        ->join('ciudadanos c', 'c.id_persona=p.id')
        ->join('trabajadores t', 't.id_persona=p.id', 'left')
        ->join('usuarios u', 'u.id_persona=p.id', 'left')
        ->where('t.id_persona', null)->where('u.id', null)->get()->getRowArray();
    if (!$persona) throw new \RuntimeException('Falta una persona para la prueba temporal.');
    $rolTecnico = $db->table('roles')->where('nombre', \App\Libraries\TipoInspector::ROL_TECNICO)->get()->getRowArray();
    if (!$rolTecnico) throw new \RuntimeException('Falta el rol Inspector Técnico.');
    $db->table('trabajadores')->insert(['id_persona' => $persona['id'], 'tipo' => 'INTERNO', 'tiene_cuenta' => 1, 'estado' => 'ACTIVO']);
    $db->table('usuarios')->insert(['id_persona' => $persona['id'], 'id_rol' => $rolTecnico['id'], 'usuario' => 'tec_prueba_' . $persona['id'], 'clave' => password_hash('Clave12345', PASSWORD_DEFAULT), 'estado' => 'ACTIVO']);
    $vinculo = $resolver->invoke($controller, $db, ['tecnicoId'=>$persona['id']]);
    if ($vinculo[0] !== (int)$persona['id']) throw new \RuntimeException('No se reconoció al técnico por su rol.');
    $sinRol = $db->table('trabajadores t')->select('t.id_persona')->where(\App\Libraries\TipoInspector::sqlTieneRol('t', 'TECNICO') . ' = 0', null, false)->get()->getRowArray();
    try {
        $resolver->invoke($controller, $db, ['tecnicoId' => $sinRol['id_persona']]);
        throw new \RuntimeException('Se aceptó como técnico a quien no tiene ese rol.');
    } catch (\DomainException $expected) {}
    $db->table('certicav')->where('id', $registro['id'])->update(['nombre_tecnico' => $manual[1], 'id_tecnico' => null]);
    $detalle = json_decode($controller->show($registro['id'])->getBody(), true);
    if (($detalle['data']['inspector'] ?? '') !== $manual[1]) throw new \RuntimeException('La ficha no devuelve el nombre escrito.');
    echo "PASS técnico y tránsito identificados por su rol, nombre manual guardado/leído y responsable vacío rechazado\n";
} finally {
    $db->query('ROLLBACK');
    $db->close();
}
