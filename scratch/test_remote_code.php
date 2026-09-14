<?php
define('FCPATH', __DIR__ . '/../backend/public');
chdir(__DIR__ . '/../backend');
require 'vendor/autoload.php';

// Setup CodeIgniter environment
$paths = new Config\Paths();
require SYSTEMPATH . 'bootstrap.php';

$db = \Config\Database::connect();
$tables = ['ordenes_internamiento', 'vehiculos', 'organizaciones', 'papeletas', 'personas', 'ciudadanos', 'ordenes_libertad', 'orden_internamiento_inventario', 'inventario_criterios', 'permisos_operacion', 'resoluciones_autorizacion'];
foreach ($tables as $t) {
    echo $t . ': ' . ($db->tableExists($t) ? 'OK' : 'MISSING') . PHP_EOL;
}
