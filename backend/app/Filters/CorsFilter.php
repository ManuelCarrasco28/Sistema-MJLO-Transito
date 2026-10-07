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
        $envOrigins = env('app.corsAllowedOrigins');
        $allowed = $envOrigins ? array_map('trim', explode(',', $envOrigins)) : $this->allowedOrigins;

        if ($origin && in_array($origin, $allowed, true)) {
            $response->setHeader('Access-Control-Allow-Origin', $origin);
        }

        $response->setHeader('Vary', 'Origin');
        $response->setHeader('Access-Control-Allow-Headers', 'X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method, Authorization');
        $response->setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        $response->setHeader('Access-Control-Allow-Credentials', 'true');
        $response->setHeader('Connection', 'close');

        if (strtolower($_SERVER['REQUEST_METHOD'] ?? '') === 'options') {
            return $response->setStatusCode(204);
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        $origin = $request->getHeaderLine('Origin');
        $envOrigins = env('app.corsAllowedOrigins');
        $allowed = $envOrigins ? array_map('trim', explode(',', $envOrigins)) : $this->allowedOrigins;

        if ($origin && in_array($origin, $allowed, true)) {
            $response->setHeader('Access-Control-Allow-Origin', $origin);
        }

        $response->setHeader('Vary', 'Origin');
        $response->setHeader('Access-Control-Allow-Credentials', 'true');
        $response->setHeader('Connection', 'close');

        // Las respuestas JSON traen datos personales: que ni el navegador ni un proxy las guarden en caché.
        // (Los archivos, p. ej. fotos, fijan su propia política de caché privada y no se tocan.)
        if (!$response->hasHeader('Cache-Control') && str_contains(strtolower($response->getHeaderLine('Content-Type')), 'json')) {
            $response->setHeader('Cache-Control', 'no-store');
        }

        return $response;
    }
}
