<?php

use CodeIgniter\Router\RouteCollection;

$routes->get('/', 'Home::index');

$routes->group('api', ['namespace' => 'App\Controllers\Api'], static function ($routes): void {
    $routes->options('(:any)', 'AuthController::options');
    $routes->post('login', 'AuthController::login');

    $routes->get('status', 'StatusController::index');
    $routes->group('', ['filter' => 'sessionauth'], static function ($routes): void {
        $routes->get('me', 'AuthController::me');
        $routes->post('logout', 'AuthController::logout');
        $routes->post('perfil/password', 'AuthController::cambiarPassword');
        $routes->get('dashboard', 'DashboardController::index');
        
        $routes->resource('vehiculos', ['controller' => 'VehiculosController']);
        $routes->resource('personas', ['controller' => 'PersonasController']);
        $routes->get('personal/catalogos', 'PersonalController::catalogos');
        $routes->resource('personal', ['controller' => 'PersonalController', 'only' => ['index', 'create', 'update']]);
        $routes->resource('asociaciones', ['controller' => 'AsociacionesController']);
        $routes->resource('documentos', ['controller' => 'DocumentosController']);
        $routes->resource('papeletas', ['controller' => 'PapeletasController']);
        $routes->resource('operativos', ['controller' => 'OperativosController']);
        $routes->post('papeletas/(:num)/pagar', 'PapeletasController::pagar/$1');
        $routes->post('papeletas/(:num)/firma', 'PapeletasController::firma/$1');
        $routes->get('tipos-infraccion', 'PapeletasController::tipos');
        $routes->get('pagos/origenes', 'PagosController::origenes');
        $routes->post('pagos/(:num)/confirmar', 'PagosController::confirmar/$1');
        $routes->resource('pagos', ['controller' => 'PagosController', 'only' => ['index', 'create', 'delete']]);
        $routes->resource('cursos', ['controller' => 'CursosController']);
        $routes->resource('inspecciones', ['controller' => 'InspeccionesController']);
        $routes->get('inspeccion-criterios', 'InspeccionesController::criterios');
        $routes->resource('internamientos', ['controller' => 'InternamientosController']);
        $routes->get('inventario-criterios', 'InternamientosController::criterios');
        $routes->resource('permisos', ['controller' => 'PermisosController']);
        $routes->get('procedimientos-admin', 'PermisosController::procedimientos');
        $routes->get('usuarios', 'UsuariosController::index');
        $routes->post('usuarios', 'UsuariosController::create');
        $routes->put('usuarios/(:num)', 'UsuariosController::update/$1');
        $routes->put('usuarios/(:num)/password', 'UsuariosController::updatePassword/$1');
    });
});
