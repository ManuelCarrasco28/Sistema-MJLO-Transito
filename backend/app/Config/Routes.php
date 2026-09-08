<?php

use CodeIgniter\Router\RouteCollection;

$routes->get('/', 'Home::index');

$routes->group('api', ['namespace' => 'App\Controllers\Api'], static function ($routes): void {
    $routes->options('login', 'AuthController::options');
    $routes->post('login', 'AuthController::login');

    $routes->get('status', 'StatusController::index');
    $routes->get('dashboard', 'DashboardController::index');
    
    $routes->resource('vehiculos', ['controller' => 'VehiculosController']);
    $routes->resource('personas', ['controller' => 'PersonasController']);
    $routes->resource('personal', ['controller' => 'PersonalController', 'only' => ['index', 'create', 'update']]);
    $routes->resource('organizaciones', ['controller' => 'OrganizacionesController']);
    $routes->resource('documentos', ['controller' => 'DocumentosController']);
    $routes->resource('papeletas', ['controller' => 'PapeletasController']);
    $routes->post('papeletas/(:num)/pagar', 'PapeletasController::pagar/$1');
    $routes->post('papeletas/(:num)/regularizar', 'PapeletasController::regularizar/$1');
    $routes->get('tipos-infraccion', 'PapeletasController::tipos');
    $routes->resource('pagos', ['controller' => 'PagosController']);
    $routes->resource('cursos', ['controller' => 'CursosController']);
    $routes->resource('inspecciones', ['controller' => 'InspeccionesController']);
    $routes->get('inspeccion-criterios', 'InspeccionesController::criterios');
});
