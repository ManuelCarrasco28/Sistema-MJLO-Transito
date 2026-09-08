<?php
require 'public/index.php';
$db = \Config\Database::connect();
$hash = password_hash('inspector123', PASSWORD_DEFAULT);
$db->table('usuarios')->where('nombre_usuario', 'inspector')->update(['password_hash' => $hash]);
echo 'OK';
