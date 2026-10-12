<?php

use CodeIgniter\Router\RouteCollection;

$routes->get('/', 'Home::index');

$routes->group('api', ['namespace' => 'App\Controllers\Api'], static function ($routes): void {
    $routes->options('(:any)', 'AuthController::options');
    $routes->post('login', 'AuthController::login');
    $routes->get('status', 'StatusController::index');
    $routes->match(['get', 'head'], 'files/(:segment)/(:segment)', 'FilesController::ver/$1/$2');

    // Eliminaciones y anulaciones: solo la jefatura (Super Admin, Gerente y Subgerente). Secretaría cobra y registra,
    // pero no borra ni anula; el frontend oculta estas acciones y aquí se exige también en el servidor.
    // Va antes del grupo general para que estas rutas DELETE se resuelvan primero.
    $routes->group('', ['filter' => 'sessionauth:SUPERADMIN,GERENTE,SUBGERENTE'], static function ($routes): void {
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

    // Módulos que la interfaz ya restringe a personal de oficina (Documentos, Permisos, Cursos, Pagos) y las
    // escrituras sobre el padrón (personas, vehículos, asociaciones, trabajadores). Aquí también se exige en
    // el servidor: antes cualquier usuario con sesión (p. ej. un Trabajador) podía llamar estas rutas
    // directamente aunque la pantalla no se las mostrara. Las lecturas del padrón que usan las pantallas y la
    // app móvil (buscar personas, vehículos, asociaciones) siguen abiertas en el grupo general.
    // Va antes del grupo general para que estas rutas se resuelvan primero.
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

        $routes->get('permisos/tramites-disponibles', 'PermisosController::tramitesDisponibles');
        $routes->get('permisos/buscar-administrados', 'PermisosController::buscarAdministrados');
        $routes->get('permisos/estadisticas', 'PermisosController::estadisticas');
        $routes->resource('permisos', ['controller' => 'PermisosController']);
        $routes->get('procedimientos-admin', 'PermisosController::procedimientos');

        // Cobrar una papeleta es del personal de oficina: los inspectores emiten papeletas pero no cobran.
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

    // Rutas accesibles por inspectores y personal móvil que deben resolverse antes de los recursos de oficina
    $routes->group('', ['filter' => 'sessionauth'], static function ($routes): void {
        $routes->get('operativos/activo/(:segment)', 'OperativosController::activo/$1');
    });

    // Resto del sistema: solo oficina (el inspector no ve dashboards, padrones ni gestión).
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
        $routes->get('papeletas/(:segment)/fotos', 'PapeletasController::fotos/$1');

        $routes->get('pide/reniec/(:segment)', 'PideController::reniec/$1');
        $routes->get('pide/oficinas-registrales', 'PideController::oficinasRegistrales');
        $routes->post('pide/sunarp', 'PideController::sunarp');
        $routes->get('me', 'AuthController::me');
        $routes->post('logout', 'AuthController::logout');
        $routes->post('perfil/password', 'AuthController::cambiarPassword');
        $routes->put('perfil/preferencias', 'AuthController::guardarPreferencias');

        $routes->get('vehiculos/persona/dni', 'VehiculosController::getVehiculosByPersonaDni');
        $routes->get('tipo-documentos', 'PersonasController::tiposDocumento');
        // Para no-oficina el controlador solo admite búsqueda exacta por numeroDocumento y nunca show por id.
        $routes->resource('personas', ['controller' => 'PersonasController', 'only' => ['index', 'show']]);
        $routes->resource('papeletas', ['controller' => 'PapeletasController', 'only' => ['index', 'create']]);
        $routes->post('papeletas/(:segment)/firma', 'PapeletasController::firma/$1');
        $routes->get('tipos-infraccion', 'PapeletasController::tipos');
        $routes->get('municipalidad/config', 'MunicipalidadController::config');
        $routes->get('reportes-intervencion', 'ReportesIntervencionController::index');
        $routes->post('reportes-intervencion', 'ReportesIntervencionController::create');
        $routes->get('reportes-intervencion/(:segment)/fotos', 'ReportesIntervencionController::fotos/$1');
    });

    // Rutas de exportación y reportes sensibles: restringidas a personal de oficina autorizado
    $routes->group('', ['filter' => 'sessionauth:SUPERADMIN,GERENTE,SUBGERENTE,SECRETARIA'], static function ($routes): void {
        $routes->post('export-pdf', 'ExportPdfController::generar');
    });

    // Catálogo de infracciones y sus multas (porcentaje de UIT): lo administran los cargos de dirección.
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
