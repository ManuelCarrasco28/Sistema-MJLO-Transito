<?php
define('FCPATH', dirname(__DIR__, 2) . '/public/');
define('ENVIRONMENT', 'development');
require FCPATH . '../app/Config/Paths.php';
$paths = new \Config\Paths();
require $paths->systemDirectory . '/Boot.php';
\CodeIgniter\Boot::bootConsole($paths);
if (($argv[1] ?? '') === '--worker') {
    \App\Services\AuthSession::checkRateLimit('test_concurrencia', $argv[2], 500);
    exit(0);
}
$key = bin2hex(random_bytes(16));
$procesos = [];
$archivo = WRITEPATH . 'rate_limits_test_concurrencia/' . hash('sha256', $key) . '.json';
try {
    for ($i = 0; $i < 16; $i++) {
        $pipes = [];
        $proceso = proc_open([PHP_BINARY, __FILE__, '--worker', $key], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        if (!is_resource($proceso)) throw new \RuntimeException('No se pudo iniciar el proceso de prueba.');
        fclose($pipes[0]);
        $procesos[] = [$proceso, $pipes];
    }
    $errores = [];
    foreach ($procesos as [$proceso, $pipes]) {
        $salida = stream_get_contents($pipes[1]) . stream_get_contents($pipes[2]);
        fclose($pipes[1]); fclose($pipes[2]);
        if (proc_close($proceso) !== 0) $errores[] = $salida;
    }
    if ($errores) throw new \RuntimeException(implode("\n", $errores));
    $datos = json_decode(file_get_contents($archivo), true);
    if (($datos['attempts'] ?? 0) !== 16) throw new \RuntimeException('Se perdieron intentos simultáneos.');
    \App\Services\AuthSession::clearRateLimit('test_concurrencia', $key);
    if (\App\Services\AuthSession::checkRateLimit('test_concurrencia', $key, 2) !== null) throw new \RuntimeException('No se reinició el contador.');
    echo "PASS 16 procesos simultáneos contabilizados sin pérdida; reinicio correcto.\n";
} finally { if (is_file($archivo)) unlink($archivo); }
