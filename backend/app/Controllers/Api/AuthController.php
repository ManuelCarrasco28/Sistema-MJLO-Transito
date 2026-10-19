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

        if ($secret === '' || strlen($secret) < 32) {
            throw new \RuntimeException('La clave app.sessionSecret debe tener al menos 32 caracteres para garantizar seguridad criptográfica.');
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
            ->select('usuarios.*, personas.numero as dni, personas.email, personas.celular, personas.direccion, ciudadanos.nombres, TRIM(CONCAT(ciudadanos.apellido_paterno, " ", IFNULL(ciudadanos.apellido_materno, ""))) as apellidos, COALESCE(ciudadanos.foto, "") as foto_img, roles.nombre as rol, cargos.nombre as cargo, unidades_organicas.nombre as unidad_organica, unidades_organicas.siglas as uo_siglas, trabajadores.tipo as tipo_contrato')
            ->join('personas', 'personas.id = usuarios.id_persona', 'inner')
            ->join('ciudadanos', 'ciudadanos.id_persona = usuarios.id_persona', 'inner')
            ->join('roles', 'roles.id = usuarios.id_rol', 'inner')
            ->join('trabajadores', 'trabajadores.id_persona = usuarios.id_persona', 'left')
            ->join('desplazamiento_oficina', 'desplazamiento_oficina.id_trabajador = usuarios.id_persona AND (desplazamiento_oficina.fecha_termino IS NULL OR desplazamiento_oficina.fecha_termino > CURDATE())', 'left')
            ->join('cargos', 'cargos.id = desplazamiento_oficina.id_cargo', 'left')
            ->join('unidades_organicas', 'unidades_organicas.id = desplazamiento_oficina.id_unidad_organica', 'left')
            ->where('usuarios.id', $userId)
            ->first();

        if (!$userRecord || ($userRecord['estado'] ?? '') !== 'ACTIVO') {
            return null;
        }

        return [
            'id'              => $userRecord['id'],
            'dni'             => $userRecord['dni'] ?? '',
            'nombres'         => $userRecord['nombres'],
            'apellidos'       => $userRecord['apellidos'],
            'usuario'         => $userRecord['usuario'],
            'rol'             => $userRecord['rol'],
            'id_rol'          => (int) $userRecord['id_rol'],
            'cargo'           => $userRecord['cargo'] ?? 'Inspector Técnico',
            'unidad_organica' => $userRecord['unidad_organica'] ?? 'Subgerencia de Tránsito, Transporte y Seguridad Vial',
            'uo_siglas'       => $userRecord['uo_siglas'] ?? 'STTS',
            'email'           => $userRecord['email'] ?? '',
            'celular'         => $userRecord['celular'] ?? '',
            'direccion'       => $userRecord['direccion'] ?? '',
            'tipo_contrato'   => $userRecord['tipo_contrato'] ?? '',
            'id_persona'      => (int) $userRecord['id_persona'],
            'tipo_inspector'  => (strcasecmp((string) $userRecord['rol'], 'Inspector Técnico') === 0 || str_contains(strtoupper((string) ($userRecord['cargo'] ?? '')), 'TÉCNICO')) ? 'TECNICO' : ((strcasecmp((string) $userRecord['rol'], 'Inspector de Tránsito') === 0 || strcasecmp((string) $userRecord['rol'], 'Trabajador') === 0) ? 'TRANSITO' : null),

            'foto_img'        => (new \App\Services\FileStorageService())->urlPublica($userRecord['foto_img'] ?? null) ?? '',
            'sv'              => (int) $userRecord['session_version'],
            'preferencias'    => json_decode((string) ($userRecord['preferencias'] ?? ''), true) ?: new \stdClass(),
        ];
    }

    public function guardarPreferencias()
    {
        $cookieUser = $this->decodeSessionCookie($this->request->getCookie('session_user'));
        $userId = (int) ($cookieUser['id'] ?? 0);
        if ($userId <= 0) {
            return $this->failUnauthorized('Sesión no válida o expirada.');
        }

        $input = $this->request->getJSON(true) ?: [];
        if (!is_array($input) || empty($input)) {
            return $this->failValidationErrors('No se recibieron preferencias válidas.');
        }

        if (strlen(json_encode($input)) > 20000) {
            return $this->failValidationErrors('Las preferencias son demasiado grandes.');
        }

        $usuarioModel = new UsuarioModel();
        $actual = $usuarioModel->asArray()->select('preferencias')->find($userId);
        $actuales = json_decode((string) ($actual['preferencias'] ?? ''), true) ?: [];

        $fusionadas = array_replace_recursive($actuales, $input);
        if (strlen(json_encode($fusionadas)) > 20000) {
            return $this->failValidationErrors('Las preferencias son demasiado grandes.');
        }
        $usuarioModel->update($userId, ['preferencias' => json_encode($fusionadas, JSON_UNESCAPED_UNICODE)]);

        return $this->respond(['status' => true, 'data' => $fusionadas]);
    }

    private function rateLimitDirectory(): string
    {
        $dir = WRITEPATH . 'login_rate_limits' . DIRECTORY_SEPARATOR;

        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        if (random_int(1, 100) === 1) {
            $this->purgeStaleRateLimitFiles($dir);
        }

        return $dir;
    }

    private function purgeStaleRateLimitFiles(string $dir): void
    {
        $limite = time() - 86400;
        foreach (glob($dir . '*.json') ?: [] as $archivo) {
            if ((@filemtime($archivo) ?: 0) < $limite) {
                @unlink($archivo);
            }
        }
    }

    private function rateLimitKey(string $usuario): string
    {
        $ip = $this->request->getIPAddress() ?: 'unknown';

        return hash('sha256', $this->normalizarUsuario($usuario) . '|' . $ip);
    }

    private function normalizarUsuario(string $usuario): string
    {
        $u = mb_strtolower(trim($usuario), 'UTF-8');
        $u = strtr($u, ['á' => 'a', 'à' => 'a', 'ä' => 'a', 'â' => 'a', 'é' => 'e', 'è' => 'e', 'ë' => 'e', 'ê' => 'e',
            'í' => 'i', 'ì' => 'i', 'ï' => 'i', 'î' => 'i', 'ó' => 'o', 'ò' => 'o', 'ö' => 'o', 'ô' => 'o',
            'ú' => 'u', 'ù' => 'u', 'ü' => 'u', 'û' => 'u']);

        return preg_replace('/\s+/', ' ', $u) ?? $u;
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

        $fp = @fopen($path, 'rb');
        if (!$fp) {
            return $this->freshRateLimitData();
        }

        @flock($fp, LOCK_SH);
        $content = stream_get_contents($fp);
        @flock($fp, LOCK_UN);
        @fclose($fp);

        $data = json_decode((string) $content, true);

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

        $ipCheck = $this->checkRateLimitByKey($this->rateLimitIpKey(), 'Demasiados intentos fallidos desde esta conexión.');
        if ($ipCheck) {
            return $ipCheck;
        }

        return $this->checkRateLimitByKey($this->rateLimitKey($usuario), 'Demasiados intentos fallidos.');
    }

    private function recordFailedAttempt(string $key, int $maxAttempts, int $windowSeconds, int $blockSeconds): void
    {
// Actualizar el contador bajo un único bloqueo.
        $fp = @fopen($this->rateLimitPath($key), 'c+');
        if (!$fp) {
            log_message('warning', 'No se pudo abrir el contador de intentos de login.');
            return;
        }
        try {
            if (!flock($fp, LOCK_EX)) {
                return;
            }
            $now = time();
            $data = json_decode((string) stream_get_contents($fp), true);
            if (!is_array($data)) {
                $data = $this->freshRateLimitData();
            }
            if (($now - (int) ($data['first_attempt_at'] ?? $now)) > $windowSeconds) {
                $data = $this->freshRateLimitData();
                $data['first_attempt_at'] = $now;
            }
            $data['attempts'] = ((int) ($data['attempts'] ?? 0)) + 1;
            if ($data['attempts'] >= $maxAttempts) {
                $data['blocked_until'] = $now + $blockSeconds;
            }
            rewind($fp);
            ftruncate($fp, 0);
            fwrite($fp, json_encode($data));
            fflush($fp);
        } finally {
            flock($fp, LOCK_UN);
            fclose($fp);
        }
    }

    private function registerFailedLogin(string $usuario): void
    {

        $this->recordFailedAttempt($this->rateLimitKey($usuario), 5, 300, 900);

// Bloquear la IP tras 20 fallos en 5 minutos.
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
        try {
            $json = $this->request->getJSON();
        } catch (\Throwable $e) {
            $json = null;
        }

        $usuario = trim($json->usuario ?? (string) ($this->request->getPost('usuario') ?? ''));
        $password = (string) ($json->password ?? $this->request->getPost('password') ?? '');
        $captchaToken = (string) ($json->captchaToken ?? $this->request->getPost('captchaToken') ?? '');

        if ($usuario === '' || $password === '') {
            return $this->failValidationErrors('Debe proporcionar usuario y contraseña.');
        }

        if (strlen($usuario) > 50 || strlen($password) > 128) {
            return $this->failValidationErrors('El usuario o contraseña exceden la longitud permitida.');
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
// Omitir captcha móvil solo con la clave compartida válida, si está configurada.
        $mobileKey = trim((string) env('app.mobileKey', ''));
        if ($isMobileApp && $mobileKey !== '') {
            $isMobileApp = hash_equals($mobileKey, $this->request->getHeaderLine('X-Mobile-Key'));
        }
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

        $dummyHash = (string) env('auth.dummyBcryptHash', '$2y$10$uC6yLnBuSCPOiqRse39Ifupcrvx6zZJ5e/.sK.Pa340hQGwjbQFJG');
        $hashToCheck = $userRecord ? ($userRecord['clave'] ?? $dummyHash) : $dummyHash;
        $passwordMatches = password_verify($password, $hashToCheck);

        if (!$userRecord || !$passwordMatches) {
            $this->registerFailedLogin($usuario);

            $usuarioAuditoria = mb_substr(preg_replace('/[^\P{C}]/u', '', $usuario) ?? '', 0, 40);
            \App\Services\AuditoriaService::registrar(
                'SEGURIDAD',
                'LOGIN_FALLIDO',
                "Intento de acceso fallido para el usuario '$usuarioAuditoria' (credenciales incorrectas)",
                ['usuario' => $usuarioAuditoria]
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

        if (\App\Libraries\Acceso::esRolCampo($userData['rol'] ?? '') && !\App\Libraries\Acceso::esClienteMovil($this->request)) {
            return $this->failForbidden('El acceso al sistema web está restringido para este rol. Por favor, utilice la aplicación móvil.');
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

        $errorPassword = \App\Libraries\Acceso::errorDePassword((string) $nuevo, (string) ($cookieUser['usuario'] ?? ''));
        if ($errorPassword) {
            return $this->failValidationErrors($errorPassword);
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
