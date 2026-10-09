<?php
// Ejecutar en desarrollo. Todas las filas temporales se revierten, incluso si falla una prueba.
define('FCPATH', dirname(__DIR__, 2) . '/public/');
define('ENVIRONMENT', 'development');
require FCPATH . '../app/Config/Paths.php';
$paths = new \Config\Paths();
require $paths->systemDirectory . '/Boot.php';
\CodeIgniter\Boot::bootConsole($paths);

function comprobar(bool $condicion, string $mensaje): void {
    if (!$condicion) throw new RuntimeException($mensaje);
}
function escenario(string $nombre, callable $operacion): void {
    $db = \Config\Database::connect(null, false);
    $db->transException(true)->transBegin();
    try { $operacion($db); echo "PASS {$nombre}\n"; }
    finally { $db->query('ROLLBACK'); $db->close(); }
}
function bloqueado(callable $operacion): void {
    try { $operacion(); } catch (DomainException $e) {
        comprobar(str_contains($e->getMessage(), 'vinculados'), 'Error sin explicar los vínculos.');
        return;
    }
    throw new RuntimeException('Se permitió borrar un registro vinculado.');
}
escenario('Vehículo vinculado conserva propietarios y documentos', function ($db) {
    $db->table('vehiculos')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'placa' => 'TEST-' . bin2hex(random_bytes(4))]);
    $vehiculo = (int)$db->insertID();
    $persona = $db->table('personas')->select('id')->get()->getRow('id');
    comprobar((bool)$persona, 'Se necesita una persona para la prueba.');
    $db->table('vehiculo_propietarios')->insert(['id_vehiculo' => $vehiculo, 'id_persona' => $persona]);
    $db->table('documentos_vehiculo')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'id_vehiculo' => $vehiculo]);
    $db->table('papeletas')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'numero_papeleta' => 'TEST-' . bin2hex(random_bytes(4)), 'id_vehiculo' => $vehiculo]);
    bloqueado(fn() => \App\Services\EliminacionSegura::eliminar($db, 'vehiculos', $vehiculo, ['vehiculo_propietarios' => 'id_vehiculo', 'documentos_vehiculo' => 'id_vehiculo']));
    foreach (['vehiculos' => 'id', 'vehiculo_propietarios' => 'id_vehiculo', 'documentos_vehiculo' => 'id_vehiculo'] as $tabla => $columna) {
        comprobar($db->table($tabla)->where($columna, $vehiculo)->countAllResults() === 1, "Se perdió {$tabla}.");
    }
});
escenario('Vehículo sin vínculos se elimina junto a sus documentos', function ($db) {
    $db->table('vehiculos')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'placa' => 'TEST-' . bin2hex(random_bytes(4))]);
    $id = (int)$db->insertID();
    $db->table('documentos_vehiculo')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'id_vehiculo' => $id]);
    \App\Services\EliminacionSegura::eliminar($db, 'vehiculos', $id, ['vehiculo_propietarios' => 'id_vehiculo', 'documentos_vehiculo' => 'id_vehiculo']);
    comprobar($db->table('vehiculos')->where('id', $id)->countAllResults() === 0, 'El vehículo sigue registrado.');
    comprobar($db->table('documentos_vehiculo')->where('id_vehiculo', $id)->countAllResults() === 0, 'Quedó un documento huérfano.');
});
escenario('Curso con inscripción no se elimina; curso vacío sí', function ($db) {
    $db->table('cursos_seguridad_vial')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'nombre' => 'TEST ELIMINACION', 'cupos' => 194]);
    $curso = (int)$db->insertID();
    $persona = $db->table('personas')->select('id')->get()->getRow('id');
    $db->table('inscripciones_curso')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'id_curso' => $curso, 'id_persona' => $persona]);
    bloqueado(fn() => \App\Services\EliminacionSegura::eliminar($db, 'cursos_seguridad_vial', $curso));
    comprobar($db->table('cursos_seguridad_vial')->where('id', $curso)->countAllResults() === 1, 'Se perdió el curso.');
    $db->table('inscripciones_curso')->where('id_curso', $curso)->delete();
    \App\Services\EliminacionSegura::eliminar($db, 'cursos_seguridad_vial', $curso);
    comprobar($db->table('cursos_seguridad_vial')->where('id', $curso)->countAllResults() === 0, 'El curso vacío no se borró.');
});
escenario('Persona vinculada conserva su ficha; persona sin vínculos se elimina', function ($db) {
    $db->table('personas')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'numero' => 'TEST-' . bin2hex(random_bytes(4))]);
    $persona = (int)$db->insertID();
    $db->table('ciudadanos')->insert(['id_persona' => $persona, 'nombres' => 'Prueba', 'apellido_paterno' => 'Temporal']);
    $db->table('administrados')->insert(['id_persona' => $persona]);
    $db->table('vehiculos')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'placa' => 'TEST-' . bin2hex(random_bytes(4))]);
    $vehiculo = (int)$db->insertID();
    $db->table('vehiculo_propietarios')->insert(['id_vehiculo' => $vehiculo, 'id_persona' => $persona]);
    $fichas = ['ciudadanos' => 'id_persona', 'administrados' => 'id_persona'];
    bloqueado(fn() => \App\Services\EliminacionSegura::eliminar($db, 'personas', $persona, $fichas));
    comprobar($db->table('ciudadanos')->where('id_persona', $persona)->countAllResults() === 1, 'Se perdió la ficha personal.');
    comprobar($db->table('administrados')->where('id_persona', $persona)->countAllResults() === 1, 'Se perdió la ficha de administrado.');
    $db->table('vehiculo_propietarios')->where('id_persona', $persona)->delete();
    \App\Services\EliminacionSegura::eliminar($db, 'personas', $persona, $fichas);
    comprobar($db->table('personas')->where('id', $persona)->countAllResults() === 0, 'La persona sin vínculos no se borró.');
    comprobar($db->table('administrados')->where('id_persona', $persona)->countAllResults() === 0, 'Quedó una ficha de administrado huérfana.');
});

escenario('Asociación vinculada no se borra; asociación vacía sí', function ($db) {
    $db->table('asociaciones')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'razon_social' => 'TEST ELIMINACION', 'ruc' => 'TEST-' . bin2hex(random_bytes(3))]);
    $id = (int)$db->insertID();
    $db->table('vehiculos')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'placa' => 'TEST-' . bin2hex(random_bytes(4)), 'id_asociacion' => $id]);
    $vehiculo = (int)$db->insertID();
    bloqueado(fn() => \App\Services\EliminacionSegura::eliminar($db, 'asociaciones', $id));
    comprobar($db->table('asociaciones')->where('id', $id)->countAllResults() === 1, 'Se perdió la asociación.');
    $db->table('vehiculos')->where('id', $vehiculo)->delete();
    \App\Services\EliminacionSegura::eliminar($db, 'asociaciones', $id);
    comprobar($db->table('asociaciones')->where('id', $id)->countAllResults() === 0, 'La asociación vacía no se borró.');
});

$db = \Config\Database::connect();
$db->transException(true)->transBegin();
try {
    $db->table('personas')->insert(['uuid' => \App\Libraries\Identificador::nuevo(), 'numero' => 'TEST-' . bin2hex(random_bytes(4))]);
    $id = (int)$db->insertID();
    $db->table('trabajadores')->insert(['id_persona' => $id, 'tipo' => 'INTERNO', 'estado' => 'ACTIVO']);
    $controller = new \App\Controllers\Api\PersonalController();
    $controller->initController(\Config\Services::incomingrequest(null, false), \Config\Services::response(null, false), \Config\Services::logger());
    comprobar($controller->delete($id)->getStatusCode() === 200, 'No se pudo desactivar el trabajador.');
    comprobar($db->table('trabajadores')->where('id_persona', $id)->get()->getRow('estado') === 'INACTIVO', 'El trabajador sigue activo.');
    comprobar($db->table('personas')->where('id', $id)->countAllResults() === 1, 'Se borró la persona al desactivar.');
    comprobar($controller->delete(0)->getStatusCode() === 404, 'Un trabajador inexistente muestra éxito.');
    echo "PASS Desactivar trabajador conserva la persona y rechaza inexistentes\n";
} finally { $db->query('ROLLBACK'); $db->close(); }
echo "Datos temporales revertidos.\n";
