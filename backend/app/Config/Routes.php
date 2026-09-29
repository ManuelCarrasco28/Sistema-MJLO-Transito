<?php

use CodeIgniter\Router\RouteCollection;

$routes->get('/', 'Home::index');

$routes->group('api', ['namespace' => 'App\Controllers\Api'], static function ($routes): void {
    $routes->options('(:any)', 'AuthController::options');
    $routes->post('login', 'AuthController::login');
    $routes->get('status', 'StatusController::index');

    $routes->group('', ['filter' => 'sessionauth'], static function ($routes): void {
        $routes->get('mobile/config', 'MunicipalidadController::mobileConfig');
        $routes->get('municipalidad/config-mobile', 'MunicipalidadController::mobileConfig');
        $routes->get('mobile/dashboard', 'MunicipalidadController::mobileDashboard');
        $routes->get('mobile/vehiculos/buscar', 'VehiculosController::buscarMobile');
        $routes->get('papeletas/(:num)/fotos', 'PapeletasController::fotos/$1');
        $routes->get('files/(:segment)/(:segment)', 'FilesController::ver/$1/$2');

        $routes->get('pide/reniec/(:segment)', 'PideController::reniec/$1');
        $routes->post('pide/sunarp', 'PideController::sunarp');
        $routes->get('me', 'AuthController::me');
        $routes->post('logout', 'AuthController::logout');
        $routes->post('perfil/password', 'AuthController::cambiarPassword');
        $routes->get('dashboard', 'DashboardController::index');

        $routes->get('vehiculos/persona/dni', 'VehiculosController::getVehiculosByPersonaDni');
        $routes->resource('vehiculos', ['controller' => 'VehiculosController']);
        $routes->get('tipo-documentos', 'PersonasController::tiposDocumento');
        $routes->resource('personas', ['controller' => 'PersonasController']);
        $routes->get('personal/catalogos', 'PersonalController::catalogos');
        $routes->resource('personal', ['controller' => 'PersonalController', 'only' => ['index', 'create', 'update']]);
        $routes->resource('asociaciones', ['controller' => 'AsociacionesController']);
        $routes->resource('documentos', ['controller' => 'DocumentosController']);
        $routes->resource('papeletas', ['controller' => 'PapeletasController']);
        $routes->get('operativos/activo/(:num)', 'OperativosController::activo/$1');
        $routes->resource('operativos', ['controller' => 'OperativosController']);
        $routes->post('papeletas/(:num)/pagar', 'PapeletasController::pagar/$1');
        $routes->post('papeletas/(:num)/firma', 'PapeletasController::firma/$1');
        $routes->get('tipos-infraccion', 'PapeletasController::tipos');
        $routes->get('pagos/origenes', 'PagosController::origenes');
        $routes->get('pagos/deudas', 'PagosController::deudasPorPersona');
        $routes->get('pagos/arqueo-diario', 'PagosController::arqueoDiario');
        $routes->post('pagos/(:num)/confirmar', 'PagosController::confirmar/$1');
        $routes->resource('pagos', ['controller' => 'PagosController', 'only' => ['index', 'create', 'delete']]);
        $routes->get('cursos/personas-vigentes', 'CursosController::personasConCursoVigente');
        $routes->post('cursos/(:num)/participantes', 'CursosController::inscribirParticipante/$1');
        $routes->put('cursos/(:num)/participantes/(:num)', 'CursosController::registrarNota/$1/$2');
        $routes->resource('cursos', ['controller' => 'CursosController']);
        $routes->get('inspecciones/siguiente-correlativo', 'InspeccionesController::siguienteCorrelativo');
        $routes->resource('inspecciones', ['controller' => 'InspeccionesController']);
        $routes->get('inspeccion-criterios', 'InspeccionesController::criterios');
        $routes->resource('internamientos', ['controller' => 'InternamientosController']);
        $routes->get('inventario-criterios', 'InternamientosController::criterios');
        $routes->get('permisos/tramites-disponibles', 'PermisosController::tramitesDisponibles');
        $routes->get('permisos/buscar-administrados', 'PermisosController::buscarAdministrados');
        $routes->resource('permisos', ['controller' => 'PermisosController']);
        $routes->get('procedimientos-admin', 'PermisosController::procedimientos');
        $routes->get('municipalidad/config', 'MunicipalidadController::config');
        $routes->get('reportes-intervencion', 'ReportesIntervencionController::index');
        $routes->get('reportes-intervencion/(:num)/fotos', 'ReportesIntervencionController::fotos/$1');
        $routes->post('reportes-intervencion', 'ReportesIntervencionController::create');
        $routes->post('reportes-intervencion/(:num)/convertir', 'ReportesIntervencionController::convertir/$1');
        $routes->post('reportes-intervencion/(:num)/rechazar', 'ReportesIntervencionController::rechazar/$1');
        $routes->get('notificaciones/resumen', 'NotificacionesController::resumen');
    });

    // Rutas administrativas: solo roles con privilegios de gestión institucional.
    // (gestión de cuentas/roles de usuarios, datos de la municipalidad, token PIDE y auditoría del sistema).
    $routes->group('', ['filter' => 'sessionauth:SUPERADMIN,GERENTE,SUBGERENTE'], static function ($routes): void {
        $routes->get('auditoria', 'AuditoriaController::index');
        $routes->get('auditoria/estadisticas', 'AuditoriaController::estadisticas');
        $routes->get('usuarios', 'UsuariosController::index');
        $routes->get('usuarios/roles', 'UsuariosController::roles');
        $routes->post('usuarios', 'UsuariosController::create');
        $routes->put('usuarios/(:num)', 'UsuariosController::update/$1');
        $routes->delete('usuarios/(:num)', 'UsuariosController::delete/$1');
        $routes->put('usuarios/(:num)/password', 'UsuariosController::updatePassword/$1');
        $routes->put('municipalidad/(:num)', 'MunicipalidadController::update/$1');
        $routes->post('municipalidad/anios', 'MunicipalidadController::saveAnio');
        $routes->delete('municipalidad/anios/(:num)', 'MunicipalidadController::deleteAnio/$1');
        $routes->put('configuracion-sistema', 'MunicipalidadController::saveConfiguracion');
    });
});
