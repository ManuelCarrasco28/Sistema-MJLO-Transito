<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class StatusController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        return $this->respond([
            'status'  => 'ok',
            'service' => 'Sistema MJLO Tránsito API',
            'database' => 'not_configured',
        ]);
    }
}
