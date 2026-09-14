<?php
$c = new mysqli('127.0.0.1', 'root', '', 'transitomunicipal');
$res = $c->query("DESCRIBE usuarios");
while ($r = $res->fetch_assoc()) {
    echo $r['Field'] . " - " . $r['Type'] . "\n";
}
