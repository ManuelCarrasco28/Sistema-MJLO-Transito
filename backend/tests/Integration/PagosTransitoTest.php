<?php
// Run: php tests/Integration/PagosTransitoTest.php
// Every fixture is enclosed in an outer transaction and rolled back.
define('FCPATH', dirname(__DIR__, 2) . '/public/');
define('ENVIRONMENT', 'development');
require FCPATH . '../app/Config/Paths.php';
$paths = new \Config\Paths();
require $paths->systemDirectory . '/Boot.php';
\CodeIgniter\Boot::bootConsole($paths);

function check(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
function rejects(callable $operation): void {
    try { $operation(); } catch (DomainException $e) { return; }
    throw new RuntimeException('La operación inválida fue aceptada.');
}
function scenario(string $name, callable $operation): void {
    $db = \Config\Database::connect(null, false);
    $db->transException(true)->transBegin();
    try {
        $token = bin2hex(random_bytes(5));
        $db->table('vehiculos')->insert(['placa' => 'TST-' . $token]);
        $vehicle = $db->insertID();
        $db->table('papeletas')->insert(['numero_papeleta' => 'TEST-' . $token, 'id_vehiculo' => $vehicle, 'monto_total' => '100.00']);
        $ticket = (int)$db->insertID();
        $operation($db, new \App\Services\PagosTransito($db), $ticket, $token);
        echo "PASS $name\n";
    } finally {
        // Ensure even failed nested operations cannot leave fixture rows behind.
        $db->query('ROLLBACK');
        $db->close();
    }
}

scenario('Pendiente sin recibo ni fecha; generación repetida no duplica', function ($db, $service, $ticket) {
    $pago = $service->generar('PAPELETA', $ticket);
    check($pago['estado'] === 'PENDIENTE' && $pago['numero_recibo'] === null && $pago['fecha_pago'] === null, 'Pendiente incorrecto.');
    check($service->generar('PAPELETA', $ticket)['id'] === $pago['id'], 'Pago duplicado.');
    rejects(fn() => $service->confirmar((int)$pago['id'], []));
    check($db->table('papeletas')->where('id', $ticket)->get()->getRow('estado') === 'PENDIENTE_PAGO', 'Se marcó pagada sin recibo.');
});
scenario('Confirmación y anulación mantienen ambos estados', function ($db, $service, $ticket, $token) {
    $pago = $service->generar('PAPELETA', $ticket);
    $paid = $service->confirmar((int)$pago['id'], ['numeroRecibo' => 'TEST-' . $token, 'fechaPago' => date('Y-m-d')]);
    check($paid['estado'] === 'PAGADO', 'No se confirmó.');
    check($db->table('papeletas')->where('id', $ticket)->get()->getRow('estado') === 'PAGADA', 'Estado papeleta incorrecto.');
    rejects(fn() => $service->confirmar((int)$pago['id'], ['numeroRecibo' => 'TEST-' . $token, 'fechaPago' => date('Y-m-d')]));
    $service->anularPapeleta($ticket);
    check($db->table('pagos_transito')->where('id', $pago['id'])->get()->getRow('estado') === 'ANULADO', 'Pago sigue vigente.');
    rejects(fn() => $service->generar('PAPELETA', $ticket));
});
scenario('Recibo duplicado no marca otra papeleta como pagada', function ($db, $service, $ticket, $token) {
    $first = $service->generar('PAPELETA', $ticket);
    $service->confirmar((int)$first['id'], ['numeroRecibo' => 'TEST-' . $token, 'fechaPago' => date('Y-m-d')]);
    $vehicle = $db->table('papeletas')->where('id', $ticket)->get()->getRow('id_vehiculo');
    $db->table('papeletas')->insert(['numero_papeleta' => 'TEST-2-' . $token, 'id_vehiculo' => $vehicle, 'monto_total' => 20]);
    $secondTicket = (int)$db->insertID();
    $second = $service->generar('PAPELETA', $secondTicket);
    rejects(fn() => $service->confirmar((int)$second['id'], ['numeroRecibo' => 'TEST-' . $token, 'fechaPago' => date('Y-m-d')]));
    check($db->table('papeletas')->where('id', $secondTicket)->get()->getRow('estado') === 'PENDIENTE_PAGO', 'Pago parcial tras error.');
});
scenario('Anular un pago restaura la deuda', function ($db, $service, $ticket, $token) {
    $pago = $service->generar('PAPELETA', $ticket);
    $service->confirmar((int)$pago['id'], ['numeroRecibo' => 'TEST-' . $token, 'fechaPago' => date('Y-m-d')]);
    $service->anular((int)$pago['id']);
    check($db->table('papeletas')->where('id', $ticket)->get()->getRow('estado') === 'PENDIENTE_PAGO', 'Deuda no restaurada.');
});
scenario('Curso: monto del catálogo y vínculo con inscripción', function ($db, $service, $ticket, $token) {
    $db->table('personas')->insert(['numero_documento' => 'TEST-' . $token, 'nombres' => 'Prueba transaccional', 'apellido_paterno' => 'Temporal']);
    $person = $db->insertID();
    $db->table('cursos_seguridad_vial')->insert(['nombre' => 'Prueba transaccional', 'costo_inscripcion' => 25]);
    $course = $db->insertID();
    $db->table('inscripciones_curso')->insert(['id_curso' => $course, 'id_persona' => $person, 'fecha_inscripcion' => date('Y-m-d')]);
    $enrollment = (int)$db->insertID();
    $pago = $service->generar('CURSO', $enrollment);
    check((float)$pago['total'] === 25.0 && (int)$pago['id_inscripcion'] === $enrollment, 'Curso sin trazabilidad.');
    $service->confirmar((int)$pago['id'], ['numeroRecibo' => 'TEST-' . $token, 'fechaPago' => date('Y-m-d')]);
    check($db->table('inscripciones_curso')->where('id', $enrollment)->get()->getRow('estado_pago') === 'PAGADO', 'Inscripción no actualizada.');
});
scenario('Trámite: importe del procedimiento administrativo', function ($db, $service, $ticket, $token) {
    $db->table('procedimientos_administrativos')->insert(['codigo' => 'TEST-' . $token, 'nombre' => 'Prueba transaccional', 'costo' => 45]);
    $procedure = $db->insertID();
    $db->table('tramites_documentarios')->insert(['id_procedimiento_admin' => $procedure, 'fecha_solicitud' => date('Y-m-d')]);
    $pago = $service->generar('TRAMITE', (int)$db->insertID());
    check((float)$pago['total'] === 45.0 && $pago['id_papeleta'] === null, 'Origen de trámite incorrecto.');
});
scenario('UIT exige el año exacto y no utiliza otro año silenciosamente', function ($db) {
    $db->table('municipalidad')->insert([
        'ruc' => '20999999991',
        'razon_social' => 'Municipalidad de prueba',
        'direccion_fiscal' => 'Dirección de prueba',
        'departamento' => 'Lambayeque',
        'provincia' => 'Chiclayo',
        'distrito' => 'José Leonardo Ortiz',
        'telefono' => '000000000',
        'email' => 'prueba@muni.gob.pe',
        'mesa_partes' => 'Mesa de partes',
        'estado' => 'ACTIVO',
    ]);
    $municipalidad = $db->insertID();
    $db->table('municipalidad_anio')->insert(['id_municipalidad' => $municipalidad, 'nombre' => 'Año prueba', 'anio' => '2200', 'uit' => 1000]);
    $service = new \App\Services\Multas($db);
    check($service->monto(['porcentaje_uit' => 1.5], 2200) === 15.0, 'Cálculo incorrecto.');
    rejects(fn() => $service->uit(2201));
});
echo "Todas las pruebas finalizaron; datos de prueba revertidos.\n";
