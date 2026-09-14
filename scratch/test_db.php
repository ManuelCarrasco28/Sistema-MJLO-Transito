<?php
$c = @new mysqli('127.0.0.1', 'root', '', 'transitomunicipal');
if ($c->connect_error) {
    echo "DB_ERROR: " . $c->connect_error . "\n";
    exit(1);
}
echo "DB_OK\n";
$tables = ['ordenes_internamiento', 'vehiculos', 'organizaciones', 'papeletas', 'personas', 'ciudadanos', 'ordenes_libertad', 'orden_internamiento_inventario', 'inventario_criterios', 'permisos_operacion', 'resoluciones_autorizacion'];
foreach ($tables as $t) {
    $res = $c->query("SHOW TABLES LIKE '$t'");
    echo $t . ": " . ($res->num_rows > 0 ? "EXISTS" : "NOT FOUND") . "\n";
}
