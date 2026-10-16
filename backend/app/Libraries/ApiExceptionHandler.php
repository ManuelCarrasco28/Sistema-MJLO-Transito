<?php

namespace App\Libraries;

use CodeIgniter\Debug\ExceptionHandler;
use CodeIgniter\Debug\ExceptionHandlerInterface;
use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Exceptions as ExceptionsConfig;
use Throwable;

class ApiExceptionHandler implements ExceptionHandlerInterface
{
    private const MENSAJES = [
        400 => 'Solicitud inválida.',
        401 => 'Sesión no válida o expirada.',
        403 => 'No tienes permisos para acceder a este recurso.',
        404 => 'Recurso no encontrado.',
        405 => 'Método no permitido.',
    ];

    private ExceptionHandler $porDefecto;

    public function __construct(ExceptionsConfig $config)
    {
        $this->porDefecto = new ExceptionHandler($config);
    }

    public function handle(
        Throwable $exception,
        RequestInterface $request,
        ResponseInterface $response,
        int $statusCode,
        int $exitCode,
    ): void {
// No exponer trazas ni rutas internas en ninguna respuesta.
        if (! $request instanceof IncomingRequest) {
            $this->porDefecto->handle($exception, $request, $response, $statusCode, $exitCode);

            return;
        }

        $codigo = ($statusCode >= 400 && $statusCode < 600) ? $statusCode : 500;

        $response
            ->setStatusCode($codigo)
            ->setJSON([
                'status' => false,
                'message' => self::MENSAJES[$codigo] ?? 'Ocurrió un error en el servidor. Intente nuevamente.',
            ])
            ->send();

        if (ENVIRONMENT !== 'testing') {
            exit($exitCode);
        }
    }

    private function esRutaApi(IncomingRequest $request): bool
    {

        $ruta = preg_replace('#^index\.php/#', '', trim($request->getUri()->getPath(), '/'));

        return $ruta === 'api' || str_starts_with($ruta, 'api/');
    }
}
