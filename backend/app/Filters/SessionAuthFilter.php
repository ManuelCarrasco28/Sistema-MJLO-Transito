<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class SessionAuthFilter implements FilterInterface
{
    private function decodeSessionCookie(?string $cookie): ?array
    {
        if (!$cookie || !str_contains($cookie, '.')) {
            return null;
        }

        [$payload, $signature] = explode('.', $cookie, 2);
        $secret = (string) env('app.sessionSecret', '');

        if ($secret === '') {
            return null;
        }

        $expectedSignature = hash_hmac('sha256', $payload, $secret);
        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $base64 = strtr($payload, '-_', '+/');
        $base64 .= str_repeat('=', (4 - strlen($base64) % 4) % 4);
        $json = base64_decode($base64, true);
        $user = $json ? json_decode($json, true) : null;

        if (!is_array($user)) {
            return null;
        }

        if (empty($user['exp']) || (int) $user['exp'] < time()) {
            return null;
        }

        return $user;
    }

    public function before(RequestInterface $request, $arguments = null)
    {
        if (strtolower($request->getMethod()) === 'options') {
            return null;
        }

        $user = $this->decodeSessionCookie($request->getCookie('session_user'));

        if (!is_array($user) || empty($user['id']) || empty($user['usuario']) || empty($user['id_persona'])) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON([
                    'status' => false,
                    'message' => 'Sesión no válida o expirada.',
                ]);
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}
