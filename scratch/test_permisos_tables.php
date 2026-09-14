<?php
$c = new mysqli('127.0.0.1', 'root', '', 'transitomunicipal');
$tables = ['permisos_circulacion', 'tramites_documentarios', 'procedimientos_administrativos'];
foreach ($tables as $t) {
    $res = $c->query("SHOW TABLES LIKE '$t'");
    echo $t . ": " . ($res->num_rows > 0 ? "EXISTS" : "NOT FOUND") . "\n";
}
