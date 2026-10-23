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
    $token = bin2hex(random_bytes(5));
    $db->table('vehiculos')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'placa' => 'PRU-' . $token]);
    $vehicleId = (int)$db->insertID();

    $db->table('papeletas')->insert([
        'uuid' => \App\Libraries\Identificador::nuevo(),
        'numero_papeleta' => 'PAP-' . $token,
        'id_vehiculo' => $vehicleId,
        'monto_total' => 120.00,
        'fecha_hora' => date('Y-m-d H:i:s'),
        'lugar' => 'Av. Balta / Kennedy',
        'estado' => 'PENDIENTE_PAGO',
    ]);
    $ticketId = (int)$db->insertID();

    // 1. Generar internamiento automático desde infracción
    $service = new \App\Services\InternamientoAutomatico($db);
    $resultado = $service->generar($ticketId);

    check(!empty($resultado['id']), 'No se generó el internamiento automático.');
    $internamientoId = (int)$resultado['id'];

    $orden = $db->table('ordenes_internamiento')->where('id', $internamientoId)->get()->getRowArray();
    check($orden['estado'] === 'EN_PROCESO', 'El estado inicial debe ser EN_PROCESO mientras el vehículo va en camino.');

    // 2. Al registrar el inventario en el depósito, debe pasar a RETENIDO
    $criterio = $db->table('inventario_criterios')->limit(1)->get()->getRowArray();
    if ($criterio) {
        $criterioId = (int)$criterio['id'];
        $db->table('orden_internamiento_inventario')->insert([
            'id_orden_internamiento' => $internamientoId,
            'id_criterio' => $criterioId,
            'cantidad' => 2,
            'estado' => 'REGISTRADO',
        ]);
        $db->table('ordenes_internamiento')->where('id', $internamientoId)->update(['estado' => 'RETENIDO']);
    }

    $ordenRetenida = $db->table('ordenes_internamiento')->where('id', $internamientoId)->get()->getRowArray();
    check($ordenRetenida['estado'] === 'RETENIDO', 'El estado debe cambiar a RETENIDO tras inventariar el vehículo.');

    // 3. Probar internamiento desde reporte de intervención
    $tokenRep = bin2hex(random_bytes(5));
    $db->table('vehiculos')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'placa' => 'REP-' . $tokenRep]);
    $vehRepId = (int)$db->insertID();

    $inspector = $db->table('trabajadores')->where('estado', 'ACTIVO')->limit(1)->get()->getRowArray();
    $inspectorId = (int)($inspector['id_persona'] ?? 1);

    $db->table('reportes_intervencion')->insert([
        'uuid' => \App\Libraries\Identificador::nuevo(),
        'id_inspector' => $inspectorId,
        'id_vehiculo' => $vehRepId,
        'placa' => 'REP-' . $tokenRep,
        'lugar' => 'Calle Los Nogales 123',
        'observaciones' => 'Vehículo abandonado en vía pública',
        'fecha_hora' => date('Y-m-d H:i:s'),
        'estado' => 'PENDIENTE',
    ]);
    $reporteId = (int)$db->insertID();

    $resReporte = $service->generarDesdeReporte($reporteId);
    check(!empty($resReporte['id']), 'Debe generar internamiento para el reporte.');
    $ordenReporte = $db->table('ordenes_internamiento')->where('id', (int)$resReporte['id'])->get()->getRowArray();
    check($ordenReporte['estado'] === 'EN_PROCESO', 'Internamiento de reporte debe iniciar en EN_PROCESO.');
    check((int)$ordenReporte['id_reporte'] === $reporteId, 'id_reporte debe coincidir.');
    check($ordenReporte['id_papeleta'] === null, 'id_papeleta debe ser null inicialmente.');

    // 4. Al convertir reporte a papeleta, no debe duplicar sino vincular id_papeleta
    $db->table('papeletas')->insert([
        'uuid' => \App\Libraries\Identificador::nuevo(),
        'numero_papeleta' => 'PAP-' . $tokenRep,
        'id_vehiculo' => $vehRepId,
        'monto_total' => 200.00,
        'fecha_hora' => date('Y-m-d H:i:s'),
        'lugar' => 'Calle Los Nogales 123',
        'estado' => 'PENDIENTE_PAGO',
    ]);
    $nuevaPapeletaId = (int)$db->insertID();
    $db->table('reportes_intervencion')->where('id', $reporteId)->update([
        'id_papeleta' => $nuevaPapeletaId,
        'estado' => 'CONVERTIDO_PAPELETA',
    ]);

    $resConversion = $service->generar($nuevaPapeletaId);
    check(($resConversion['vinculado'] ?? false) === true, 'Debe vincular a la orden existente sin duplicar.');
    check((int)$resConversion['id'] === (int)$resReporte['id'], 'El ID de la orden vinculada debe ser el mismo que el del reporte.');

    $ordenVinculada = $db->table('ordenes_internamiento')->where('id', (int)$resReporte['id'])->get()->getRowArray();
    check((int)$ordenVinculada['id_papeleta'] === $nuevaPapeletaId, 'id_papeleta debe quedar vinculado.');

    echo "PASS InternamientoEnProcesoTest: flujo EN_PROCESO -> RETENIDO y Reporte -> Papeleta completados exitosamente.\n";
} finally {
    $db->query('ROLLBACK');
    $db->close();
}
