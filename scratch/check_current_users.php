<?php
$c = new mysqli('127.0.0.1', 'root', '', 'transitomunicipal');
$res = $c->query("SELECT * FROM usuarios");
echo "Users in DB:\n";
while ($r = $res->fetch_assoc()) {
    echo json_encode($r) . "\n";
}
