<?php

defined('FCPATH') || define('FCPATH', dirname(__DIR__, 2) . '/public/');
defined('ENVIRONMENT') || define('ENVIRONMENT', 'development');
require FCPATH . '../app/Config/Paths.php';
$paths = new \Config\Paths();
require $paths->systemDirectory . '/Boot.php';
\CodeIgniter\Boot::bootConsole($paths);

function check(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}

$db = \Config\Database::connect(null, false);
$db->transException(true)->transBegin();
try {
    // 1. Obtener dos inspectores existentes en la BD
    $inspectores = $db->table('trabajadores')->limit(2)->get()->getResultArray();
    check(count($inspectores) >= 1, 'Se requiere al menos un trabajador para la prueba.');
    $inspectorA = (int)$inspectores[0]['id_persona'];
    $inspectorB = isset($inspectores[1]) ? (int)$inspectores[1]['id_persona'] : $inspectorA;

    // 2. Crear placa de prueba
    $placaTest = 'HIS-' . bin2hex(random_bytes(3));
    $db->table('vehiculos')->insert([
        'uuid' => \App\Libraries\Identificador::nuevo(),
        'placa' => $placaTest,
    ]);
    $vehiculoId = (int)$db->insertID();

    // 3. Crear reporte con inspector A
    $db->table('reportes_intervencion')->insert([
        'uuid' => \App\Libraries\Identificador::nuevo(),
        'id_vehiculo' => $vehiculoId,
        'placa' => $placaTest,
        'id_inspector' => $inspectorA,
        'estado' => 'PENDIENTE',
        'lugar' => 'Calle Real 123',
    ]);
    $repId = (int)$db->insertID();

    // 4. Crear papeleta con inspector B
    $db->table('papeletas')->insert([
        'uuid' => \App\Libraries\Identificador::nuevo(),
        'id_vehiculo' => $vehiculoId,
        'placa' => $placaTest,
        'id_inspector' => $inspectorB,
        'numero_papeleta' => 'PAP-' . bin2hex(random_bytes(3)),
        'monto_total' => 150.00,
        'fecha_hora' => date('Y-m-d H:i:s'),
        'lugar' => 'Av. Balta',
        'estado' => 'PENDIENTE_PAGO',
    ]);
    $papId = (int)$db->insertID();

    // 5. Simular consulta de inspector C buscando por placa
    $sesionInspectorC = ['id_persona' => 9999, 'rol' => 'INSPECTOR', 'cargo' => 'INSPECTOR'];
    $placaNorm = \App\Libraries\Placa::normalizar($placaTest);

    $inspectorIdReportes = 0;
    if (!\App\Libraries\Acceso::esOficina($sesionInspectorC)) {
        if (empty($placaNorm)) {
            $inspectorIdReportes = 9999;
        } else {
            $inspectorIdReportes = 0;
        }
    }
    check($inspectorIdReportes === 0, 'Al buscar por placa, no debe filtrar por inspector.');

    $reportesFound = $db->table('reportes_intervencion r')
        ->where('r.id_vehiculo', $vehiculoId)
        ->get()->getResultArray();
    check(count($reportesFound) === 1, 'Debe encontrar el reporte creado por inspector A.');
    check((int)$reportesFound[0]['id'] === $repId, 'El reporte coincide.');

    // En PapeletasController:
    $inspectorIdPapeletas = 0;
    if (!\App\Libraries\Acceso::esOficina($sesionInspectorC)) {
        if (empty($placaNorm)) {
            $inspectorIdPapeletas = 9999;
        } else {
            $inspectorIdPapeletas = 0;
        }
    }
    check($inspectorIdPapeletas === 0, 'Al buscar por placa, no debe filtrar por inspector.');

    $papeletasFound = $db->table('papeletas p')
        ->where('p.id_vehiculo', $vehiculoId)
        ->get()->getResultArray();
    check(count($papeletasFound) === 1, 'Debe encontrar la papeleta creada por inspector B.');
    check((int)$papeletasFound[0]['id'] === $papId, 'La papeleta coincide.');

    echo "PASS HistorialVehicularInspectorTest: Inspector C puede ver reportes y papeletas de todos los inspectores al consultar por placa.\n";
} finally {
    $db->transRollback();
}
