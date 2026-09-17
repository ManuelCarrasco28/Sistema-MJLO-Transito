<?php

namespace App\Controllers\Api;

use App\Models\UsuarioModel;
use CodeIgniter\RESTful\ResourceController;

class AuthController extends ResourceController
{
    protected $format = 'json';

    private function encodeSessionCookie(array $userData): string
    {
        $payload = rtrim(strtr(base64_encode(json_encode($userData)), '+/', '-_'), '=');
        $secret = (string) env('app.sessionSecret', '');

        if ($secret === '') {
            throw new \RuntimeException('No se configuró app.sessionSecret.');
        }

        return $payload . '.' . hash_hmac('sha256', $payload, $secret);
    }

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

    private function getUserDataById(int $userId): ?array
    {
        $usuarioModel = new UsuarioModel();
        $userRecord = $usuarioModel->asArray()
            ->select('usuarios.*, ciudadanos.nombres, TRIM(CONCAT(ciudadanos.apellido_paterno, " ", IFNULL(ciudadanos.apellido_materno, ""))) as apellidos, COALESCE(ciudadanos.foto, "") as foto_img, cargos.nombre as cargo, trabajadores.id_persona as id_persona')
            ->join('trabajadores', 'trabajadores.id_persona = usuarios.id_trabajador', 'inner')
            ->join('ciudadanos', 'ciudadanos.id_persona = trabajadores.id_persona', 'inner')
            ->join('desplazamiento_oficina', 'desplazamiento_oficina.id_trabajador = trabajadores.id_persona AND (desplazamiento_oficina.fecha_termino IS NULL OR desplazamiento_oficina.fecha_termino > CURDATE())', 'left')
            ->join('cargos', 'cargos.id = desplazamiento_oficina.id_cargo', 'left')
            ->where('usuarios.id', $userId)
            ->first();

        if (!$userRecord || ($userRecord['estado'] ?? '') !== 'ACTIVO') {
            return null;
        }

        return [
            'id'          => $userRecord['id'],
            'nombres'     => $userRecord['nombres'],
            'apellidos'   => $userRecord['apellidos'],
            'usuario'     => $userRecord['nombre_usuario'],
            'cargo'       => $userRecord['cargo'],
            'id_persona'  => (int) $userRecord['id_persona'],
            'foto_img'    => $userRecord['foto_img'] ?? '',
        ];
    }

    private function rateLimitDirectory(): string
    {
        $dir = WRITEPATH . 'login_rate_limits' . DIRECTORY_SEPARATOR;

        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        return $dir;
    }

    private function rateLimitKey(string $usuario): string
    {
        $ip = $this->request->getIPAddress() ?: 'unknown';

        return hash('sha256', strtolower(trim($usuario)) . '|' . $ip);
    }

    private function rateLimitPath(string $usuario): string
    {
        return $this->rateLimitDirectory() . $this->rateLimitKey($usuario) . '.json';
    }

    private function readRateLimit(string $usuario): array
    {
        $path = $this->rateLimitPath($usuario);
        if (!is_file($path)) {
            return [
                'attempts' => 0,
                'first_attempt_at' => time(),
                'blocked_until' => 0,
            ];
        }

        $data = json_decode((string) file_get_contents($path), true);

        return is_array($data) ? $data : [
            'attempts' => 0,
            'first_attempt_at' => time(),
            'blocked_until' => 0,
        ];
    }

    private function writeRateLimit(string $usuario, array $data): void
    {
        try {
            @file_put_contents($this->rateLimitPath($usuario), json_encode($data), LOCK_EX);
        } catch (\Throwable $e) {
            log_message('warning', 'No se pudo escribir rate-limit de login: ' . $e->getMessage());
        }
    }

    private function ensureLoginIsNotRateLimited(string $usuario)
    {
        $data = $this->readRateLimit($usuario);
        $blockedUntil = (int) ($data['blocked_until'] ?? 0);

        if ($blockedUntil > time()) {
            $minutes = max(1, (int) ceil(($blockedUntil - time()) / 60));

            return service('response')
                ->setStatusCode(429)
                ->setJSON([
                    'status' => 429,
                    'error' => 429,
                    'messages' => [
                        'error' => "Demasiados intentos fallidos. Intenta nuevamente en {$minutes} min.",
                    ],
                ]);
        }

        return null;
    }

    private function registerFailedLogin(string $usuario): void
    {
        $now = time();
        $windowSeconds = 300;
        $maxAttempts = 5;
        $blockSeconds = 900;
        $data = $this->readRateLimit($usuario);

        if (($now - (int) ($data['first_attempt_at'] ?? $now)) > $windowSeconds) {
            $data = [
                'attempts' => 0,
                'first_attempt_at' => $now,
                'blocked_until' => 0,
            ];
        }

        $data['attempts'] = ((int) ($data['attempts'] ?? 0)) + 1;

        if ($data['attempts'] >= $maxAttempts) {
            $data['blocked_until'] = $now + $blockSeconds;
        }

        $this->writeRateLimit($usuario, $data);
    }

    private function clearFailedLogins(string $usuario): void
    {
        $path = $this->rateLimitPath($usuario);
        if (is_file($path)) {
            unlink($path);
        }
    }

    public function login()
    {
        $json = $this->request->getJSON();

        $usuario = trim($json->usuario ?? '');
        $password = $json->password ?? '';
        $captchaToken = $json->captchaToken ?? '';

        if ($usuario === '' || $password === '') {
            return $this->failValidationErrors('Debe proporcionar usuario y contraseña.');
        }

        $rateLimitResponse = $this->ensureLoginIsNotRateLimited($usuario);
        if ($rateLimitResponse) {
            return $rateLimitResponse;
        }

        $turnstileSecret = trim((string) env('turnstile.secretKey', ''));
        $userAgent = $this->request->getUserAgent()->getAgentString();
        $isMobileApp = $this->request->getHeaderLine('X-Mobile-App') === 'MJLO-TRANSITO'
            || str_contains($userAgent, 'Dart/')
            || str_contains($userAgent, 'Dart ');
        $shouldValidateCaptcha = $turnstileSecret !== ''
            && !$isMobileApp
            && ENVIRONMENT === 'production';

        if ($shouldValidateCaptcha) {
            if ($captchaToken === '') {
                return $this->failValidationErrors('Completa la verificación de seguridad.');
            }

            try {
                $client = \Config\Services::curlrequest();
                $response = $client->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                    'form_params' => [
                        'secret'   => $turnstileSecret,
                        'response' => $captchaToken,
                        'remoteip' => $this->request->getIPAddress(),
                    ],
                    'http_errors' => false,
                    'timeout'     => 10,
                    'verify'      => ENVIRONMENT !== 'development',
                ]);
                $captchaResult = json_decode($response->getBody(), true);
            } catch (\Throwable $e) {
                return $this->failServerError('No se pudo validar el captcha. Intenta nuevamente.');
            }

            if (empty($captchaResult['success'])) {
                return $this->failUnauthorized('Captcha inválido. Intenta nuevamente.');
            }
        }

        $usuarioModel = new UsuarioModel();
        $userRecord = $usuarioModel->asArray()
            ->select('usuarios.*, ciudadanos.nombres, TRIM(CONCAT(ciudadanos.apellido_paterno, " ", IFNULL(ciudadanos.apellido_materno, ""))) as apellidos, COALESCE(ciudadanos.foto, "") as foto_img, cargos.nombre as cargo, trabajadores.id_persona as id_persona')
            ->join('trabajadores', 'trabajadores.id_persona = usuarios.id_trabajador', 'inner')
            ->join('ciudadanos', 'ciudadanos.id_persona = trabajadores.id_persona', 'inner')
            ->join('desplazamiento_oficina', 'desplazamiento_oficina.id_trabajador = trabajadores.id_persona AND (desplazamiento_oficina.fecha_termino IS NULL OR desplazamiento_oficina.fecha_termino > CURDATE())', 'left')
            ->join('cargos', 'cargos.id = desplazamiento_oficina.id_cargo', 'left')
            ->where('usuarios.nombre_usuario', $usuario)
            ->first();

        if (!$userRecord || !password_verify($password, $userRecord['password_hash'])) {
            $this->registerFailedLogin($usuario);
            return $this->failUnauthorized('El usuario o la contraseña son incorrectos.');
        }

        if (($userRecord['estado'] ?? '') !== 'ACTIVO') {
            $this->registerFailedLogin($usuario);
            return $this->failUnauthorized('El usuario se encuentra inactivo.');
        }

        $userData = $this->getUserDataById((int) $userRecord['id']);
        if (!$userData) {
            $this->registerFailedLogin($usuario);
            return $this->failUnauthorized('El usuario se encuentra inactivo.');
        }

        $this->clearFailedLogins($usuario);

        $cookieUserData = $userData;
        unset($cookieUserData['foto_img']);
        $cookieUserData['exp'] = time() + 7200;

        helper('cookie');
        set_cookie([
            'name'     => 'session_user',
            'value'    => $this->encodeSessionCookie($cookieUserData),
            'expire'   => 7200,
            'path'     => '/',
            'secure'   => ENVIRONMENT !== 'development',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);

        return $this->respond([
            'status'  => true,
            'message' => 'Inicio de sesión exitoso',
            'data'    => $userData,
        ]);
    }

    public function me()
    {
        $cookieUser = $this->decodeSessionCookie($this->request->getCookie('session_user'));
        $userId = (int) ($cookieUser['id'] ?? 0);

        if ($userId <= 0) {
            return $this->failUnauthorized('Sesión no válida o expirada.');
        }

        $userData = $this->getUserDataById($userId);
        if (!$userData) {
            return $this->failUnauthorized('Sesión no válida o expirada.');
        }

        return $this->respond([
            'status' => true,
            'data'   => $userData,
        ]);
    }

    public function logout()
    {
        helper('cookie');
        delete_cookie('session_user', '', '/');

        return $this->respond([
            'status'  => true,
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    public function cambiarPassword()
    {
        $json = $this->request->getJSON();

        $userId = (int) ($json->id_usuario ?? 0);
        $actual = $json->password_actual ?? '';
        $nuevo = $json->password_nuevo ?? '';

        if ($userId <= 0 || $actual === '' || $nuevo === '') {
            return $this->failValidationErrors('Debe proporcionar usuario, contraseña actual y nueva contraseña.');
        }

        if (strlen($nuevo) < 6) {
            return $this->failValidationErrors('La nueva contraseña debe tener al menos 6 caracteres.');
        }

        $usuarioModel = new UsuarioModel();
        $userRecord = $usuarioModel->asArray()->find($userId);

        if (!$userRecord || !password_verify($actual, $userRecord['password_hash'])) {
            return $this->failUnauthorized('La contraseña actual es incorrecta.');
        }

        $usuarioModel->update($userId, [
            'password_hash' => password_hash($nuevo, PASSWORD_DEFAULT),
        ]);

        return $this->respond([
            'status'  => true,
            'message' => 'Contraseña actualizada correctamente.',
        ]);
    }

    public function options()
    {
        return $this->respond(null, 204);
    }
}
