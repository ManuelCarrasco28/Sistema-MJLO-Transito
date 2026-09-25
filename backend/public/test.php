<?php
require '../vendor/autoload.php';
$app = new \CodeIgniter\CodeIgniter(new \Config\Paths());
$app->initialize();
print_r(\App\Services\PideService::reniec('73129239'));
print_r(\App\Services\PideService::sunarp('Z1A123')); // Testing a plate
