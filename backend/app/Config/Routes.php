<?php

use CodeIgniter\Router\RouteCollection;

$routes->get('/', 'Home::index');

$routes->group('api', ['namespace' => 'App\Controllers\Api'], static function ($routes): void {
    $routes->get('status', 'StatusController::index');
    $routes->get('dashboard', 'DashboardController::index');
    $routes->get('vehiculos', 'VehiculosController::index');
    $routes->get('personas', 'PersonasController::index');
    $routes->get('organizaciones', 'OrganizacionesController::index');
    $routes->get('documentos', 'DocumentosController::index');
});

$routes->options('api/login', 'AuthController::options');
$routes->post('api/login', 'AuthController::login');
