<?php
// Solo lectura: no mostrar números de documento ni licencias.
define('FCPATH', dirname(__DIR__, 2) . '/public/');
define('ENVIRONMENT', 'development');
require FCPATH . '../app/Config/Paths.php';
$paths = new \Config\Paths();
require $paths->systemDirectory . '/Boot.php';
\CodeIgniter\Boot::bootConsole($paths);
$db = \Config\Database::connect();
foreach ([
    'documentos_duplicados' => "SELECT COUNT(*) AS n FROM (SELECT numero FROM personas WHERE numero IS NOT NULL AND TRIM(numero) <> '' GROUP BY numero HAVING COUNT(*) > 1) d",
    'licencias_duplicadas' => "SELECT COUNT(*) AS n FROM (SELECT numero_licencia FROM ciudadanos WHERE numero_licencia IS NOT NULL AND TRIM(numero_licencia) <> '' GROUP BY numero_licencia HAVING COUNT(*) > 1) d",
    'inscripciones_duplicadas' => 'SELECT COUNT(*) AS n FROM (SELECT id_curso,id_persona FROM inscripciones_curso GROUP BY id_curso,id_persona HAVING COUNT(*) > 1) d',
    'longitud_documento' => "SELECT CHARACTER_MAXIMUM_LENGTH AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'personas' AND COLUMN_NAME = 'numero'",
] as $nombre => $sql) echo $nombre . ': ' . $db->query($sql)->getRowArray()['n'] . "\n";
