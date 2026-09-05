<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class CorsFilter implements FilterInterface
{
    private array $allowedOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ];

    public function before(RequestInterface $request, $arguments = null)
    {
        $response = service('response');
        $origin = $request->getHeaderLine('Origin');

        if (in_array($origin, $this->allowedOrigins, true)) {
            $response->setHeader('Access-Control-Allow-Origin', $origin);
        }

        $response->setHeader('Vary', 'Origin');
        $response->setHeader('Access-Control-Allow-Headers', 'X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method, Authorization');
        $response->setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        $response->setHeader('Access-Control-Allow-Credentials', 'true');

        if ($request->getMethod() === 'options') {
            return $response->setStatusCode(204);
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        $origin = $request->getHeaderLine('Origin');

        if (in_array($origin, $this->allowedOrigins, true)) {
            $response->setHeader('Access-Control-Allow-Origin', $origin);
        }

        $response->setHeader('Vary', 'Origin');
        $response->setHeader('Access-Control-Allow-Credentials', 'true');

        return $response;
    }
}
