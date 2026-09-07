<?php
$db = new PDO('mysql:host=127.0.0.1;dbname=transitomunicipal', 'root', '');
$tables = ['tipos_infraccion', 'personal'];
foreach ($tables as $t) {
    echo "TABLE: $t\n";
    $cols = $db->query("DESCRIBE $t")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $c) {
        echo " - {$c['Field']} ({$c['Type']})\n";
    }
}
