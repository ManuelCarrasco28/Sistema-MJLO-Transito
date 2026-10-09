<?php
// Pruebas directas de los controladores con base real; todos los fixtures se revierten.
define('FCPATH', dirname(__DIR__, 2) . '/public/');
define('ENVIRONMENT', 'development');
require FCPATH . '../app/Config/Paths.php';
$paths = new \Config\Paths();
require $paths->systemDirectory . '/Boot.php';
\CodeIgniter\Boot::bootConsole($paths);
function controlador(string $clase, array $datos = []) {
    $request = \Config\Services::incomingrequest(null, false);
    $request->setBody(json_encode($datos));
    $controller = new $clase();
    $controller->initController($request, \Config\Services::response(null, false), \Config\Services::logger());
    return $controller;
}
function verificar(bool $condicion, string $mensaje): void {
    if (!$condicion) throw new \RuntimeException($mensaje);
}
$db = \Config\Database::connect();
$cargoTemporal = 'TEST-ROLLBACK-' . bin2hex(random_bytes(5));
$personalController = \App\Controllers\Api\PersonalController::class;
$datosTrabajador = ['id_persona' => 2147483647, 'cargo' => $cargoTemporal, 'estado' => 'ACTIVO'];
verificar(controlador($personalController, $datosTrabajador)->create()->getStatusCode() === 400, 'Acepta trabajador sin persona.');
verificar(!$db->table('cargos')->where('nombre', $cargoTemporal)->countAllResults(), 'Alta fallida dejó cargo guardado.');
verificar(controlador($personalController, $datosTrabajador)->update(2147483647)->getStatusCode() === 404, 'Muestra éxito en trabajador inexistente.');
verificar(!$db->table('cargos')->where('nombre', $cargoTemporal)->countAllResults(), 'Edición fallida dejó cargo guardado.');
echo "PASS Trabajadores: altas y ediciones fallidas revierten sus cambios\n";
$db->resetTransStatus();
$db->transException(true)->transBegin();
try {
    $uuid = fn() => \App\Libraries\Identificador::nuevo();
    $sufijo = bin2hex(random_bytes(4));
    $personasController = \App\Controllers\Api\PersonasController::class;
    $datosPersona = ['tipoDocumento' => 'PASAPORTE', 'numeroDocumento' => 'TEST' . $sufijo . '123', 'nombres' => 'Prueba', 'apellidoPaterno' => 'Temporal', 'apellidoMaterno' => 'Test', 'numeroLicencia' => 'T' . strtoupper($sufijo), 'direccion' => 'Dirección de prueba'];
    $respuesta = controlador($personasController, $datosPersona)->create();
    verificar($respuesta->getStatusCode() === 201, 'No acepta documento de 15 caracteres: ' . $respuesta->getBody());
    $personaLarga = (int)json_decode($respuesta->getBody(), true)['data']['id'];
    verificar($db->table('personas')->where('id', $personaLarga)->get()->getRow('numero') === $datosPersona['numeroDocumento'], 'Documento truncado.');
    $respuesta = controlador($personasController, $datosPersona)->create();
    verificar($respuesta->getStatusCode() === 400, 'Acepta documento/licencia duplicados.');
    $errores = json_decode($respuesta->getBody(), true)['messages'];
    verificar(isset($errores['numeroDocumento'], $errores['numeroLicencia']), 'No identifica ambos duplicados para el formulario.');
    verificar(controlador($personasController, $datosPersona)->update($personaLarga)->getStatusCode() === 200, 'Bloquea edición propia.');
    $datosPersona['tipoDocumento'] = 'DNI';
    verificar(controlador($personasController, $datosPersona)->update($personaLarga)->getStatusCode() === 400, 'Permite DNI de 15 caracteres.');
    echo "PASS Personas: documento de 15 caracteres sin truncar, duplicados por campo y edición propia\n";

    $numero = 'T' . $sufijo;
    $db->table('personas')->insert(['uuid' => $uuid(), 'numero' => $numero]);
    $persona = (int)$db->insertID();
    $db->table('ciudadanos')->insert(['id_persona' => $persona, 'nombres' => 'Prueba', 'apellido_paterno' => 'Temporal']);
    $placa = 'Z' . strtoupper(substr($sufijo, 0, 5));
    $db->table('vehiculos')->insert(['uuid' => $uuid(), 'placa' => $placa, 'marca' => 'Original']);
    $vehiculo = (int)$db->insertID();
    $db->table('vehiculo_propietarios')->insert(['id_vehiculo' => $vehiculo, 'id_persona' => $persona, 'estado' => 'ACTIVO']);
    $vc = \App\Controllers\Api\VehiculosController::class;
    $respuesta = controlador($vc, ['marca' => 'No guardar', 'propietarioDni' => 'NO-EXISTE-' . $sufijo])->update($vehiculo);
    verificar($respuesta->getStatusCode() === 400, 'Acepta propietario inexistente.');
    verificar($db->table('vehiculos')->where('id', $vehiculo)->get()->getRow('marca') === 'Original', 'Edición parcial de vehículo.');
    foreach ([['anio' => 1800], ['anio' => 'abc'], ['estado' => 'ERROR'], ['tipo' => 'TIPO INEXISTENTE ' . $sufijo]] as $datos) {
        verificar(controlador($vc, $datos)->update($vehiculo)->getStatusCode() === 400, 'Acepta año, estado o tipo inválido.');
    }
    verificar(controlador($vc, ['marca' => 'Actualizada'])->update($vehiculo)->getStatusCode() === 200, 'No edita vehículo.');
    verificar($db->table('vehiculos')->where('id', $vehiculo)->get()->getRow('marca') === 'Actualizada', 'No persiste vehículo.');
    echo "PASS Vehículos: validación, edición persistida y ausencia de guardado parcial\n";

    $dc = \App\Controllers\Api\DocumentosController::class;
    $datos = ['vehiculoPlaca' => $placa, 'tipoDocumento' => 'SOAT', 'codigo' => 'TEST-' . $sufijo, 'fechaExpedicion' => date('Y-m-d'), 'fechaExpiracion' => '2040-12-31', 'estado' => 'VIGENTE'];
    $respuesta = controlador($dc, $datos)->create();
    verificar($respuesta->getStatusCode() === 201, 'No crea documento: ' . $respuesta->getBody());
    $documento = (int)$db->table('documentos_vehiculo')->where('codigo', $datos['codigo'])->get()->getRow('id');
    foreach ([['codigo' => ''], ['estado' => 'ERROR'], ['fechaExpedicion' => '2026-02-30'], ['fechaExpiracion' => '2000-01-01']] as $datosInvalidos) {
        verificar(controlador($dc, $datosInvalidos)->update($documento)->getStatusCode() === 400, 'Documento acepta campos inválidos.');
    }
    verificar(controlador($dc, ['codigo' => 'EDIT-' . $sufijo])->update($documento)->getStatusCode() === 200, 'No edita documento.');
    verificar($db->table('documentos_vehiculo')->where('id', $documento)->get()->getRow('codigo') === 'EDIT-' . $sufijo, 'No persiste documento.');
    verificar(controlador($dc)->delete($documento)->getStatusCode() === 200, 'No elimina documento.');
    verificar(!$db->table('documentos_vehiculo')->where('id', $documento)->countAllResults(), 'Documento sigue guardado.');
    echo "PASS Documentos: alta, errores, edición persistida y eliminación\n";

    $pc = \App\Controllers\Api\PermisosController::class;
    $respuesta = controlador($pc, ['tipoPermiso' => 'CARGA_DESCARGA', 'numeroAutorizacion' => 'TEST-' . $sufijo, 'contenido' => 'Temporal', 'fechaInicioVigencia' => '2040-01-01', 'fechaFinVigencia' => '2040-12-31'])->create();
    verificar($respuesta->getStatusCode() === 201, 'No crea permiso: ' . $respuesta->getBody());
    $permiso = (int)json_decode($respuesta->getBody(), true)['id'];
    foreach ([['tipoPermiso' => 'ERROR'], ['estado' => 'ERROR'], ['horarioInicio' => '25:00'], ['fechaFinVigencia' => '2039-12-31'], ['fechaEmision' => '2026-02-30']] as $datosInvalidos) {
        verificar(controlador($pc, $datosInvalidos)->update($permiso)->getStatusCode() === 400, 'Permiso acepta campos inválidos.');
    }
    verificar(controlador($pc, ['contenido' => 'Actualizado'])->update($permiso)->getStatusCode() === 200, 'No edita permiso.');
    verificar($db->table('permisos_circulacion')->where('id', $permiso)->get()->getRow('contenido') === 'Actualizado', 'No persiste permiso.');
    verificar(controlador($pc)->delete($permiso)->getStatusCode() === 200, 'No elimina permiso.');
    verificar(!$db->table('permisos_circulacion')->where('id', $permiso)->countAllResults(), 'Permiso sigue guardado.');
    echo "PASS Permisos: alta, errores, edición persistida y eliminación\n";

    $db->table('ordenes_internamiento')->insert(['uuid' => $uuid(), 'id_vehiculo' => $vehiculo, 'numero_boleta' => 'TEST-' . $sufijo]);
    $internamiento = (int)$db->insertID();
    $db->table('ordenes_libertad')->insert(['uuid' => $uuid(), 'id_internamiento' => $internamiento, 'numero_orden' => 'TEST-' . $sufijo, 'id_persona_autorizada' => $persona]);
    $ic = \App\Controllers\Api\InternamientosController::class;
    verificar(controlador($ic)->delete($internamiento)->getStatusCode() === 400, 'Borra internamiento liberado.');
    verificar($db->table('ordenes_libertad')->where('id_internamiento', $internamiento)->countAllResults() === 1, 'Pierde orden de libertad.');
    $db->table('ordenes_libertad')->where('id_internamiento', $internamiento)->delete();
    verificar(controlador($ic)->delete($internamiento)->getStatusCode() === 200, 'No borra internamiento sin libertad.');
    verificar(!$db->table('ordenes_internamiento')->where('id', $internamiento)->countAllResults(), 'Internamiento sigue guardado.');
    echo "PASS Internamientos: preserva libertad y permite eliminar registros sin ella\n";
} finally { $db->query('ROLLBACK'); $db->close(); }
echo "Fixtures revertidos.\n";
