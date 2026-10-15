<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class CsrfOriginFilter implements FilterInterface
{
    private const METODOS_SEGUROS = ['get', 'head', 'options'];

    private array $origenesPorDefecto = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ];

    public function before(RequestInterface $request, $arguments = null)
    {
        if (in_array(strtolower($request->getMethod()), self::METODOS_SEGUROS, true)) {
            return null;
        }

        $origin = trim($request->getHeaderLine('Origin'));
        if ($origin === '') {
            return null;
        }

        if ($this->origenPermitido($origin, $request)) {
            return null;
        }

        log_message('warning', 'CSRF: petición bloqueada con Origin no permitido: ' . $origin);

        return service('response')
            ->setStatusCode(403)
            ->setJSON([
                'status' => false,
                'message' => 'Origen de la petición no permitido.',
            ]);
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }

    private function origenPermitido(string $origin, RequestInterface $request): bool
    {
        $envOrigins = env('app.corsAllowedOrigins');
        $permitidos = $envOrigins
            ? array_map('trim', explode(',', $envOrigins))
            : $this->origenesPorDefecto;

        if (in_array($origin, $permitidos, true)) {
            return true;
        }

        $hostOrigen = parse_url($origin, PHP_URL_HOST);
        $puertoOrigen = parse_url($origin, PHP_URL_PORT);
        if (!$hostOrigen) {
            return false;
        }

        $hostPeticion = $request->getServer('HTTP_HOST') ?? '';
        $origenNormalizado = $puertoOrigen ? "{$hostOrigen}:{$puertoOrigen}" : $hostOrigen;

        return strcasecmp($origenNormalizado, $hostPeticion) === 0;
    }
}
