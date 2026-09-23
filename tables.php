<?php
$db = new PDO('mysql:host=localhost;dbname=transito', 'root', '');
$stmt = $db->query('SHOW TABLES');
print_r($stmt->fetchAll(PDO::FETCH_COLUMN));
