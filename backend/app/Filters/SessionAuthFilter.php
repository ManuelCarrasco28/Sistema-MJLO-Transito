<?php

namespace App\Filters;

use App\Services\AuthSession;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class SessionAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (strtolower($request->getMethod()) === 'options') {
            return null;
        }

        $user = AuthSession::resolveActiveUser($request->getCookie('session_user'));

        if (!is_array($user) || empty($user['id']) || empty($user['usuario']) || empty($user['id_persona'])) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON([
                    'status' => false,
                    'message' => 'Sesión no válida o expirada.',
                ]);
        }

        if (is_array($arguments) && !empty($arguments)) {
            $rol = strtoupper((string) ($user['rol'] ?? ''));
            $allowedRoles = array_map('strtoupper', $arguments);
            if (!in_array($rol, $allowedRoles, true)) {
                return service('response')
                    ->setStatusCode(403)
                    ->setJSON([
                        'status' => false,
                        'message' => 'No tienes permisos para acceder a este recurso.',
                    ]);
            }
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}
