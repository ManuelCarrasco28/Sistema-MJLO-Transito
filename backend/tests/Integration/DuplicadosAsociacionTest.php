<?php
define('FCPATH', dirname(__DIR__, 2) . '/public/');
define('ENVIRONMENT', 'development');
require FCPATH . '../app/Config/Paths.php';
$paths = new \Config\Paths();
require $paths->systemDirectory . '/Boot.php';
\CodeIgniter\Boot::bootConsole($paths);
function asociacionController(array $body) {
    $request = \Config\Services::incomingrequest(null, false);
    $request->setBody(json_encode($body));
    $controller = new \App\Controllers\Api\AsociacionesController();
    $controller->initController($request, \Config\Services::response(null, false), \Config\Services::logger());
    return $controller;
}
function comprobarDuplicados($respuesta, array $campos): void {
    if ($respuesta->getStatusCode() !== 400) throw new \RuntimeException('Se permitió un duplicado: ' . $respuesta->getBody());
    $errores = json_decode($respuesta->getBody(), true)['messages'];
    foreach ($campos as $campo) if (!isset($errores[$campo])) throw new \RuntimeException('Falta advertencia de ' . $campo);
}
$db = \Config\Database::connect();
$db->transException(true)->transBegin();
try {
    $nombre = 'Asociación temporal ' . bin2hex(random_bytes(5));
    do { $ruc = (string)random_int(20000000000, 29999999999); } while ($db->table('asociaciones')->where('ruc', $ruc)->countAllResults());
    $respuesta = asociacionController(['razonSocial' => $nombre, 'ruc' => $ruc])->create();
    if ($respuesta->getStatusCode() !== 201) throw new \RuntimeException($respuesta->getBody());
    $id = (int)json_decode($respuesta->getBody(), true)['data']['id'];
    comprobarDuplicados(asociacionController(['razonSocial' => $nombre, 'ruc' => $ruc])->create(), ['razonSocial', 'ruc']);
    comprobarDuplicados(asociacionController(['razonSocial' => mb_strtoupper($nombre), 'ruc' => ''])->create(), ['razonSocial']);
    comprobarDuplicados(asociacionController(['razonSocial' => str_replace(' ', '   ', mb_strtolower($nombre)), 'ruc' => ''])->create(), ['razonSocial']);
    if (asociacionController(['razonSocial' => $nombre, 'ruc' => $ruc])->update($id)->getStatusCode() !== 200) throw new \RuntimeException('No permite editar el mismo registro.');
    $db->table('asociaciones')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'razon_social' => $nombre . ' otra', 'ruc' => null]);
    $otro = (int)$db->insertID();
    comprobarDuplicados(asociacionController(['razonSocial' => $nombre, 'ruc' => $ruc])->update($otro), ['razonSocial', 'ruc']);
    if ($db->table('asociaciones')->where('id', $otro)->get()->getRow('razon_social') !== $nombre . ' otra') throw new \RuntimeException('Se guardó una edición rechazada.');
    echo "PASS altas y ediciones bloquean nombre/RUC duplicados; ignora mayúsculas y espacios; edición propia permitida.\n";
} finally { $db->query('ROLLBACK'); $db->close(); }
