<?php
define('FCPATH', dirname(__DIR__, 2) . '/public/');
define('ENVIRONMENT', 'development');
require FCPATH . '../app/Config/Paths.php';
$paths = new \Config\Paths();
require $paths->systemDirectory . '/Boot.php';
\CodeIgniter\Boot::bootConsole($paths);
$db = \Config\Database::connect();
$db->transException(true)->transBegin();
try {
    do { $numero = (string)random_int(10000000, 99999999); $licencia = 'T' . $numero; }
    while ($db->table('personas')->where('numero', $numero)->countAllResults() || $db->table('ciudadanos')->where('numero_licencia', $licencia)->countAllResults());
    $db->table('personas')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'numero' => $numero]);
    $id = (int)$db->insertID();
    $db->table('ciudadanos')->insert(['id_persona' => $id, 'nombres' => 'Prueba', 'apellido_paterno' => 'Temporal', 'numero_licencia' => $licencia]);
    $controller = new \App\Controllers\Api\PersonasController();
    $method = new ReflectionMethod($controller, 'camposDuplicados');
    $input = ['numeroDocumento' => $numero, 'numeroLicencia' => strtolower($licencia)];
    $errores = $method->invoke($controller, $db, $input);
    if (array_keys($errores) !== ['numeroDocumento', 'numeroLicencia']) throw new RuntimeException('No informa ambos campos duplicados.');
    if ($method->invoke($controller, $db, $input, $id) !== []) throw new RuntimeException('Impide editar los datos de la misma persona.');
    if (array_keys($method->invoke($controller, $db, ['numeroLicencia' => $licencia])) !== ['numeroLicencia']) throw new RuntimeException('No informa la licencia duplicada por separado.');
    echo "PASS Documento y licencia duplicados identificados; edición propia permitida.\n";
} finally { $db->query('ROLLBACK'); $db->close(); }
