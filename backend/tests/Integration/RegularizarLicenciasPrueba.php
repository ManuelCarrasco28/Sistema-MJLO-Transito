<?php
// Ejecutar únicamente con autorización explícita para los datos de prueba.
if (($argv[1] ?? '') !== '--confirmar-datos-de-prueba') exit("Requiere --confirmar-datos-de-prueba\n");
define('FCPATH', dirname(__DIR__, 2) . '/public/');
define('ENVIRONMENT', 'development');
require FCPATH . '../app/Config/Paths.php';
$paths = new \Config\Paths();
require $paths->systemDirectory . '/Boot.php';
\CodeIgniter\Boot::bootConsole($paths);
$db = \Config\Database::connect();
\App\Services\CandadoPersona::adquirir($db);
try {
    $db->transException(true)->transBegin();
    $duplicados = $db->query("SELECT c.id_persona FROM ciudadanos c JOIN (SELECT numero_licencia, MIN(id_persona) AS conservar FROM ciudadanos WHERE numero_licencia IS NOT NULL AND TRIM(numero_licencia) <> '' GROUP BY numero_licencia HAVING COUNT(*) > 1) d ON c.numero_licencia=d.numero_licencia AND c.id_persona<>d.conservar FOR UPDATE")->getResultArray();
    foreach ($duplicados as $fila) {
        $db->table('ciudadanos')->where('id_persona', $fila['id_persona'])->update(['numero_licencia' => null]);
        \App\Services\AuditoriaService::registrar('PERSONAS', 'MODIFICAR', 'Se retiró una licencia duplicada de un registro de prueba, conservando la persona.', ['id_persona' => $fila['id_persona']]);
    }
    $db->transCommit();
    echo 'Licencias de prueba regularizadas: ' . count($duplicados) . ". Personas, pagos y trámites conservados.\n";
} catch (\Throwable $e) {
    $db->transRollback();
    throw $e;
} finally { \App\Services\CandadoPersona::liberar($db); }
