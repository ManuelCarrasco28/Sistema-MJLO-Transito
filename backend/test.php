<?php
require 'vendor/autoload.php';
$paths = new \Config\Paths();
$app = new \CodeIgniter\CodeIgniter(new \Config\App());
$app->initialize();

// Also need Database to be initialized
\Config\Database::connect();

print_r("RENIEC RESPONSE:\n");
print_r(\App\Services\PideService::reniec('73129239'));

print_r("\nSUNARP RESPONSE:\n");
print_r(\App\Services\PideService::sunarp('Z1A123'));
