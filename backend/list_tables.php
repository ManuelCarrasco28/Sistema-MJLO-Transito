<?php
require 'system/bootstrap.php';
$db = \Config\Database::connect();
print_r($db->listTables());
