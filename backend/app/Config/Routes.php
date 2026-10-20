<?php

use CodeIgniter\Router\RouteCollection;

$routes->get('/', 'Home::index');

$routes->group('api', ['namespace' => 'App\Controllers\Api'], static function ($routes): void {
    $routes->options('(:any)', 'AuthController::options');
    $routes->post('login', 'AuthController::login');
    $routes->get('status', 'StatusController::index');
    $routes->match(['get', 'head'], 'files/(:segment)/(:segment)', 'FilesController::ver/$1/$2');
    $routes->match(['get', 'head'], 'inspecciones/(:segment)/pdf', 'InspeccionesController::pdf/$1');
    $routes->match(['get', 'head'], 'mobile/inspecciones/(:segment)/pdf', 'InspeccionesController::pdf/$1');

// Solo jefatura elimina; resolver estas rutas antes del grupo general.
    $routes->group('', ['filter' => 'sessionauth:SUPERADMIN,GERENTE,SUBGERENTE'], static function ($routes): void {
        $routes->post('catalogo-procedimientos', 'ProcedimientosController::create');
        $routes->put('catalogo-procedimientos/(:num)', 'ProcedimientosController::update/$1');
        $routes->delete('catalogo-procedimientos/(:num)', 'ProcedimientosController::delete/$1');
        $recursosEliminables = [
            'vehiculos' => 'VehiculosController',
            'personal' => 'PersonalController',
            'personas' => 'PersonasController',
            'asociaciones' => 'AsociacionesController',
            'documentos' => 'DocumentosController',
            'papeletas' => 'PapeletasController',
            'operativos' => 'OperativosController',
            'pagos' => 'PagosController',
            'cursos' => 'CursosController',
            'inspecciones' => 'InspeccionesController',
            'internamientos' => 'InternamientosController',
            'permisos' => 'PermisosController',
        ];
        $routes->put('internamientos/tarifas', 'InternamientosController::guardarTarifas');
        foreach ($recursosEliminables as $recurso => $controlador) {
            $routes->delete("{$recurso}/(:segment)", "{$controlador}::delete/$1");
        }
    });

// El encargado del depósito (app móvil) ve los internamientos y completa su inventario; nada más del módulo.
    $routes->group('', ['filter' => 'sessionauth:SUPERADMIN,GERENTE,SUBGERENTE,SECRETARIA,ENCARGADO DE DEPÓSITO'], static function ($routes): void {
        $routes->get('internamientos', 'InternamientosController::index');
        // Solo id numérico o uuid (hexadecimal con guiones): así «estadisticas» y «tarifas» siguen yendo a sus rutas
        $routes->get('internamientos/([0-9a-fA-F-]+)', 'InternamientosController::show/$1');
        $routes->put('internamientos/([0-9a-fA-F-]+)', 'InternamientosController::update/$1');
        $routes->patch('internamientos/([0-9a-fA-F-]+)', 'InternamientosController::update/$1');
        $routes->get('inventario-criterios', 'InternamientosController::criterios');
    });

// Rutas de oficina con permisos de servidor; preceden al grupo general.
    $routes->group('', ['filter' => 'sessionauth:SUPERADMIN,GERENTE,SUBGERENTE,SECRETARIA'], static function ($routes): void {
        $routes->post('vehiculos', 'VehiculosController::create');
        $routes->put('vehiculos/(:segment)', 'VehiculosController::update/$1');
        $routes->patch('vehiculos/(:segment)', 'VehiculosController::update/$1');
        $routes->post('personas', 'PersonasController::create');
        $routes->put('personas/(:segment)', 'PersonasController::update/$1');
        $routes->patch('personas/(:segment)', 'PersonasController::update/$1');
        $routes->get('personal/catalogos', 'PersonalController::catalogos');
        $routes->get('personal/estadisticas', 'PersonalController::estadisticas');
        $routes->post('personal', 'PersonalController::create');
        $routes->put('personal/(:segment)', 'PersonalController::update/$1');
        $routes->patch('personal/(:segment)', 'PersonalController::update/$1');
        $routes->get('asociaciones/socios', 'AsociacionesController::socios');
        $routes->get('asociaciones/estadisticas', 'AsociacionesController::estadisticas');
        $routes->post('asociaciones', 'AsociacionesController::create');
        $routes->put('asociaciones/(:segment)', 'AsociacionesController::update/$1');
        $routes->patch('asociaciones/(:segment)', 'AsociacionesController::update/$1');

        $routes->get('documentos/estadisticas', 'DocumentosController::estadisticas');
        $routes->get('documentos/vehiculo/(:segment)', 'DocumentosController::resumenVehiculo/$1');
        $routes->resource('documentos', ['controller' => 'DocumentosController']);

        $routes->get('pagos/origen', 'PagosController::origen');
        $routes->get('permisos/tramites-disponibles', 'PermisosController::tramitesDisponibles');
        $routes->get('permisos/buscar-administrados', 'PermisosController::buscarAdministrados');
        $routes->get('permisos/estadisticas', 'PermisosController::estadisticas');
        $routes->resource('permisos', ['controller' => 'PermisosController']);
        $routes->get('procedimientos-admin', 'PermisosController::procedimientos');
        $routes->get('catalogo-procedimientos', 'ProcedimientosController::index');
        $routes->get('catalogo-procedimientos/(:num)', 'ProcedimientosController::show/$1');

        $routes->post('papeletas/(:segment)/pagar', 'PapeletasController::pagar/$1');
        $routes->get('pagos/origenes', 'PagosController::origenes');
        $routes->get('pagos/deudas', 'PagosController::deudasPorPersona');
        $routes->get('pagos/arqueo-diario', 'PagosController::arqueoDiario');
        $routes->get('pagos/estadisticas', 'PagosController::estadisticas');
        $routes->post('pagos/(:segment)/confirmar', 'PagosController::confirmar/$1');
        $routes->resource('pagos', ['controller' => 'PagosController', 'only' => ['index', 'create', 'delete']]);

        $routes->get('cursos/personas-vigentes', 'CursosController::personasConCursoVigente');
        $routes->get('cursos/carnets', 'CursosController::listarCarnets');
        $routes->get('cursos/vigencias', 'CursosController::listarVigenciaCarnets');
        $routes->get('cursos/finalizados', 'CursosController::listarCursosFinalizados');
        $routes->post('cursos/(:segment)/participantes', 'CursosController::inscribirParticipante/$1');
        $routes->put('cursos/(:segment)/participantes/(:segment)', 'CursosController::registrarNota/$1/$2');
        $routes->put('cursos/inscripciones/(:segment)/entrega', 'CursosController::marcarEntregaCarnet/$1');
        $routes->put('cursos/inscripciones/(:segment)/retiro', 'CursosController::retirarInscripcion/$1');
        $routes->resource('cursos', ['controller' => 'CursosController']);
    });

    $routes->group('', ['filter' => 'sessionauth'], static function ($routes): void {
        $routes->get('operativos', 'OperativosController::index');
        $routes->get('operativos/activo/(:segment)', 'OperativosController::activo/$1');
        $routes->get('operativos/(:segment)', 'OperativosController::show/$1');
        $routes->get('vehiculos/persona/dni', 'VehiculosController::getVehiculosByPersonaDni');
    });

    $routes->group('', ['filter' => 'sessionauth:SUPERADMIN,GERENTE,SUBGERENTE,SECRETARIA'], static function ($routes): void {
        $routes->get('dashboard', 'DashboardController::index');
        $routes->get('vehiculos/estadisticas', 'VehiculosController::estadisticas');
        $routes->get('vehiculos/qr', 'VehiculosController::listarParaQr');
        $routes->resource('vehiculos', ['controller' => 'VehiculosController', 'only' => ['index', 'show']]);
        $routes->get('personas/estadisticas', 'PersonasController::estadisticas');
        $routes->resource('personal', ['controller' => 'PersonalController', 'only' => ['index']]);
        $routes->get('asociaciones/opciones', 'AsociacionesController::opciones');
        $routes->resource('asociaciones', ['controller' => 'AsociacionesController', 'only' => ['index', 'show']]);
        $routes->get('papeletas/estadisticas', 'PapeletasController::estadisticas');
        $routes->put('papeletas/(:segment)', 'PapeletasController::update/$1');
        $routes->patch('papeletas/(:segment)', 'PapeletasController::update/$1');
        $routes->get('operativos/estadisticas', 'OperativosController::estadisticas');
        $routes->post('operativos/(:segment)/cancelar', 'OperativosController::cancelar/$1');
        $routes->resource('operativos', ['controller' => 'OperativosController', 'placeholder' => '(:segment)']);
        $routes->get('inspecciones/siguiente-correlativo', 'InspeccionesController::siguienteCorrelativo');
        $routes->get('inspecciones/estadisticas', 'InspeccionesController::estadisticas');
        $routes->get('inspecciones/certicav-estado', 'InspeccionesController::certicavEstado');
        $routes->get('inspecciones/certicav-solicitudes', 'InspeccionesController::certicavSolicitudes');
        $routes->post('inspecciones/certicav-solicitar', 'InspeccionesController::certicavSolicitar');
        $routes->resource('inspecciones', ['controller' => 'InspeccionesController']);
        $routes->get('inspeccion-criterios', 'InspeccionesController::criterios');
        $routes->get('internamientos/estadisticas', 'InternamientosController::estadisticas');
        $routes->get('internamientos/tarifas', 'InternamientosController::tarifas');
        $routes->post('internamientos/(:segment)/liberar', 'InternamientosController::liberar/$1');
        $routes->resource('internamientos', ['controller' => 'InternamientosController']);
        $routes->get('inventario-criterios', 'InternamientosController::criterios');
        $routes->post('reportes-intervencion/(:segment)/convertir', 'ReportesIntervencionController::convertir/$1');
        $routes->post('reportes-intervencion/(:segment)/rechazar', 'ReportesIntervencionController::rechazar/$1');
        $routes->get('notificaciones/resumen', 'NotificacionesController::resumen');
        $routes->get('ruc/(:segment)', 'RucController::consultar/$1');
    });

// Lista blanca de lo que necesita la app móvil (inspector). Todo lo demás es solo de oficina.
    $routes->group('', ['filter' => 'sessionauth'], static function ($routes): void {
        $routes->get('mobile/config', 'MunicipalidadController::mobileConfig');
        $routes->get('municipalidad/config-mobile', 'MunicipalidadController::mobileConfig');
        $routes->get('mobile/dashboard', 'MunicipalidadController::mobileDashboard');
        $routes->get('mobile/vehiculos/buscar', 'VehiculosController::buscarMobile');
        $routes->get('mobile/vehiculos-formales', 'VehiculosController::formalesMobile');
        $routes->get('mobile/inspeccion-criterios', 'InspeccionesController::criterios');
        $routes->get('mobile/inspecciones', 'InspeccionesController::historialMovil');
        $routes->post('mobile/inspecciones', 'InspeccionesController::registrarDesdeMovil');
        $routes->put('mobile/inspecciones/(:segment)', 'InspeccionesController::modificarDesdeMovil/$1');
        $routes->put('mobile/papeletas/(:segment)', 'PapeletasController::modificarDesdeMovil/$1');
        $routes->put('mobile/reportes-intervencion/(:segment)', 'ReportesIntervencionController::update/$1');
        $routes->put('reportes-intervencion/(:segment)', 'ReportesIntervencionController::update/$1');
        $routes->get('papeletas/(:segment)/fotos', 'PapeletasController::fotos/$1');

        $routes->get('pide/reniec/(:segment)', 'PideController::reniec/$1');
        $routes->get('pide/oficinas-registrales', 'PideController::oficinasRegistrales');
        $routes->post('pide/sunarp', 'PideController::sunarp');
        $routes->get('me', 'AuthController::me');
        $routes->post('logout', 'AuthController::logout');
        $routes->post('perfil/password', 'AuthController::cambiarPassword');
        $routes->put('perfil/preferencias', 'AuthController::guardarPreferencias');

        $routes->get('tipo-documentos', 'PersonasController::tiposDocumento');

        $routes->resource('personas', ['controller' => 'PersonasController', 'only' => ['index', 'show']]);
        $routes->resource('papeletas', ['controller' => 'PapeletasController', 'only' => ['index', 'create']]);
        $routes->post('papeletas/(:segment)/firma', 'PapeletasController::firma/$1');
        $routes->get('tipos-infraccion', 'PapeletasController::tipos');
        $routes->get('municipalidad/config', 'MunicipalidadController::config');
        $routes->get('reportes-intervencion', 'ReportesIntervencionController::index');
        $routes->post('reportes-intervencion', 'ReportesIntervencionController::create');
        $routes->get('reportes-intervencion/(:segment)/fotos', 'ReportesIntervencionController::fotos/$1');
    });

    $routes->group('', ['filter' => 'sessionauth:SUPERADMIN,GERENTE,SUBGERENTE,SECRETARIA'], static function ($routes): void {
        $routes->post('export-pdf', 'ExportPdfController::generar');
    });

    $routes->group('', ['filter' => 'sessionauth:SUPERADMIN,GERENTE,SUBGERENTE'], static function ($routes): void {
        $routes->get('catalogo-infracciones', 'TiposInfraccionController::index');
        $routes->post('catalogo-infracciones', 'TiposInfraccionController::create');
        $routes->put('catalogo-infracciones/(:num)', 'TiposInfraccionController::update/$1');
        $routes->patch('catalogo-infracciones/(:num)', 'TiposInfraccionController::update/$1');
        $routes->delete('catalogo-infracciones/(:num)', 'TiposInfraccionController::delete/$1');
    });

// El token de PIDE es un secreto: quitarlo es solo del SuperAdmin.
    $routes->group('', ['filter' => 'sessionauth:SUPERADMIN'], static function ($routes): void {
        $routes->delete('municipalidad/anios/(:num)/token', 'MunicipalidadController::quitarTokenAnio/$1');
    });

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
