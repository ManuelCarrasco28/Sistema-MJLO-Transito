<?php
require 'system/bootstrap.php';
$db = \Config\Database::connect();
$fields = $db->getFieldData('papeletas');
foreach($fields as $f) {
    echo $f->name . ' - ' . $f->type . ' - len: ' . $f->max_length . "\n";
}
