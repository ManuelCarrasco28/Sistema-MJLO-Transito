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
        return \App\Services\AuthSession::resolveActiveUser($cookie);
    }

    private function getUserDataById(int $userId): ?array
    {
        $usuarioModel = new UsuarioModel();
        $userRecord = $usuarioModel->asArray()
            ->select('usuarios.*, ciudadanos.nombres, TRIM(CONCAT(ciudadanos.apellido_paterno, " ", IFNULL(ciudadanos.apellido_materno, ""))) as apellidos, COALESCE(ciudadanos.foto, "") as foto_img, roles.nombre as rol, cargos.nombre as cargo')
            ->join('ciudadanos', 'ciudadanos.id_persona = usuarios.id_persona', 'inner')
            ->join('roles', 'roles.id = usuarios.id_rol', 'inner')
            ->join('trabajadores', 'trabajadores.id_persona = usuarios.id_persona', 'left')
            ->join('desplazamiento_oficina', 'desplazamiento_oficina.id_trabajador = usuarios.id_persona AND (desplazamiento_oficina.fecha_termino IS NULL OR desplazamiento_oficina.fecha_termino > CURDATE())', 'left')
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
            'usuario'     => $userRecord['usuario'],
            'rol'         => $userRecord['rol'],
            'id_rol'      => (int) $userRecord['id_rol'],
            'cargo'       => $userRecord['cargo'],
            'id_persona'  => (int) $userRecord['id_persona'],
            'foto_img'    => $userRecord['foto_img'] ?? '',
            'sv'          => (int) $userRecord['session_version'],
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

    private function rateLimitIpKey(): string
    {
        $ip = $this->request->getIPAddress() ?: 'unknown';

        return hash('sha256', 'global_ip|' . $ip);
    }

    private function rateLimitPath(string $key): string
    {
        return $this->rateLimitDirectory() . $key . '.json';
    }

    private function freshRateLimitData(): array
    {
        return [
            'attempts' => 0,
            'first_attempt_at' => time(),
            'blocked_until' => 0,
        ];
    }

    private function readRateLimitByKey(string $key): array
    {
        $path = $this->rateLimitPath($key);
        if (!is_file($path)) {
            return $this->freshRateLimitData();
        }

        $data = json_decode((string) file_get_contents($path), true);

        return is_array($data) ? $data : $this->freshRateLimitData();
    }

    private function writeRateLimitByKey(string $key, array $data): void
    {
        try {
            @file_put_contents($this->rateLimitPath($key), json_encode($data), LOCK_EX);
        } catch (\Throwable $e) {
            log_message('warning', 'No se pudo escribir rate-limit de login: ' . $e->getMessage());
        }
    }

    private function checkRateLimitByKey(string $key, string $errorMessagePrefix = 'Demasiados intentos fallidos.')
    {
        $data = $this->readRateLimitByKey($key);
        $blockedUntil = (int) ($data['blocked_until'] ?? 0);

        if ($blockedUntil > time()) {
            $minutes = max(1, (int) ceil(($blockedUntil - time()) / 60));

            return service('response')
                ->setStatusCode(429)
                ->setJSON([
                    'status' => 429,
                    'error' => 429,
                    'messages' => [
                        'error' => "{$errorMessagePrefix} Intenta nuevamente en {$minutes} min.",
                    ],
                ]);
        }

        return null;
    }

    private function ensureLoginIsNotRateLimited(string $usuario)
    {
        // 1. Protección contra password spraying / fuerza bruta: límite por IP (20 fallos globales)
        $ipCheck = $this->checkRateLimitByKey($this->rateLimitIpKey(), 'Demasiados intentos fallidos desde esta conexión.');
        if ($ipCheck) {
            return $ipCheck;
        }

        // 2. Límite específico por cuenta + IP (5 fallos)
        return $this->checkRateLimitByKey($this->rateLimitKey($usuario), 'Demasiados intentos fallidos.');
    }

    private function recordFailedAttempt(string $key, int $maxAttempts, int $windowSeconds, int $blockSeconds): void
    {
        $now = time();
        $data = $this->readRateLimitByKey($key);

        if (($now - (int) ($data['first_attempt_at'] ?? $now)) > $windowSeconds) {
            $data = $this->freshRateLimitData();
            $data['first_attempt_at'] = $now;
        }

        $data['attempts'] = ((int) ($data['attempts'] ?? 0)) + 1;

        if ($data['attempts'] >= $maxAttempts) {
            $data['blocked_until'] = $now + $blockSeconds;
        }

        $this->writeRateLimitByKey($key, $data);
    }

    private function registerFailedLogin(string $usuario): void
    {
        // 5 intentos por usuario e IP dentro de 5 minutos bloquean la cuenta para esa IP por 15 minutos
        $this->recordFailedAttempt($this->rateLimitKey($usuario), 5, 300, 900);

        // 20 intentos globales por IP dentro de 5 minutos bloquean la IP por 15 minutos (mitiga password spraying)
        $this->recordFailedAttempt($this->rateLimitIpKey(), 20, 300, 900);
    }

    private function clearFailedLogins(string $usuario): void
    {
        $path = $this->rateLimitPath($this->rateLimitKey($usuario));
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
            ->where('usuarios.usuario', $usuario)
            ->first();

        // Mitigación de timing attack: si el usuario no existe, se calcula bcrypt contra un hash válido
        // para que el tiempo de respuesta sea indistinguible entre usuarios existentes e inexistentes.
        $dummyHash = '$2y$10$uC6yLnBuSCPOiqRse39Ifupcrvx6zZJ5e/.sK.Pa340hQGwjbQFJG';
        $hashToCheck = $userRecord ? ($userRecord['clave'] ?? $dummyHash) : $dummyHash;
        $passwordMatches = password_verify($password, $hashToCheck);

        if (!$userRecord || !$passwordMatches) {
            $this->registerFailedLogin($usuario);
            \App\Services\AuditoriaService::registrar(
                'SEGURIDAD',
                'LOGIN_FALLIDO',
                "Intento de acceso fallido para el usuario '$usuario' (credenciales incorrectas)",
                ['usuario' => $usuario]
            );
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

        $usuarioModel->update((int) $userRecord['id'], ['fecha_logueo' => date('Y-m-d H:i:s')]);

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

        \App\Services\AuditoriaService::registrar(
            'SEGURIDAD',
            'LOGIN',
            "Inicio de sesión exitoso del usuario '{$userData['usuario']}' ({$userData['rol']})",
            ['usuario' => $userData['usuario'], 'rol' => $userData['rol']],
            ['id' => $userData['id'], 'usuario' => $userData['usuario'], 'rol' => $userData['rol']]
        );

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
        $cookieUser = $this->decodeSessionCookie($this->request->getCookie('session_user'));
        if ($cookieUser) {
            \App\Services\AuditoriaService::registrar(
                'SEGURIDAD',
                'LOGOUT',
                "Cierre de sesión del usuario '{$cookieUser['usuario']}'",
                null,
                ['id' => $cookieUser['id'] ?? null, 'usuario' => $cookieUser['usuario'] ?? 'desconocido', 'rol' => $cookieUser['rol'] ?? '']
            );

            if (!empty($cookieUser['id'])) {
                \App\Services\AuthSession::invalidateSessions((int) $cookieUser['id']);
            }
        }

        helper('cookie');
        delete_cookie('session_user', '', '/');

        return $this->respond([
            'status'  => true,
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    public function cambiarPassword()
    {
        // Solo se permite cambiar la propia contraseña: el id de sesión manda,
        // nunca un id_usuario arbitrario enviado por el cliente.
        $cookieUser = $this->decodeSessionCookie($this->request->getCookie('session_user'));
        if (!$cookieUser || empty($cookieUser['id'])) {
            return $this->failUnauthorized('Sesión no válida o expirada.');
        }
        $userId = (int) $cookieUser['id'];

        $rateLimitKey = 'user-' . $userId . '|' . $this->request->getIPAddress();
        $blocked = \App\Services\AuthSession::checkRateLimit('cambiar-password', $rateLimitKey, 6, 300, 900);
        if ($blocked) {
            return service('response')
                ->setStatusCode(429)
                ->setJSON([
                    'status' => 429,
                    'messages' => ['error' => "Demasiados intentos. Intenta nuevamente en {$blocked['retryAfterMinutes']} min."],
                ]);
        }

        $json = $this->request->getJSON();
        $actual = $json->password_actual ?? '';
        $nuevo = $json->password_nuevo ?? '';

        if ($actual === '' || $nuevo === '') {
            return $this->failValidationErrors('Debe proporcionar la contraseña actual y la nueva contraseña.');
        }

        if (strlen($nuevo) < 8) {
            return $this->failValidationErrors('La nueva contraseña debe tener al menos 8 caracteres.');
        }

        $usuarioModel = new UsuarioModel();
        $userRecord = $usuarioModel->asArray()->find($userId);

        if (!$userRecord || !password_verify($actual, $userRecord['clave'])) {
            return $this->failUnauthorized('La contraseña actual es incorrecta.');
        }

        $usuarioModel->update($userId, [
            'clave' => password_hash($nuevo, PASSWORD_DEFAULT),
        ]);
        \App\Services\AuthSession::invalidateSessions($userId);

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
