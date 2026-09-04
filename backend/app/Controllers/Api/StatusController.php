<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class StatusController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $dbStatus = 'not_configured';
        try {
            $db = \Config\Database::connect();
            $db->initialize();
            $dbStatus = 'connected';
        } catch (\Throwable $e) {
            $dbStatus = 'error: ' . $e->getMessage();
        }

        return $this->respond([
            'status'   => 'ok',
            'service'  => 'Sistema MJLO Tránsito API',
            'database' => $dbStatus,
        ]);
    }
}
