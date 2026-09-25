<?php

namespace App\Services;

class AuthSession
{
    public static function decodeCookie(?string $cookie): ?array
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

    /**
     * Decodifica la cookie y además verifica que la sesión no haya sido
     * revocada (logout / cambio de contraseña incrementan session_version
     * en la tabla usuarios, invalidando cualquier cookie firmada anterior).
     */
    public static function resolveActiveUser(?string $cookie): ?array
    {
        $user = self::decodeCookie($cookie);
        if (!$user || empty($user['id'])) {
            return null;
        }

        $db = \Config\Database::connect();
        $row = $db->table('usuarios')
            ->select('session_version, estado')
            ->where('id', (int) $user['id'])
            ->get()
            ->getRowArray();

        if (!$row || ($row['estado'] ?? '') !== 'ACTIVO') {
            return null;
        }

        $cookieVersion = (int) ($user['sv'] ?? -1);
        if ($cookieVersion !== (int) $row['session_version']) {
            return null;
        }

        return $user;
    }

    public static function invalidateSessions(int $userId): void
    {
        $db = \Config\Database::connect();
        $db->table('usuarios')->where('id', $userId)->set('session_version', 'session_version + 1', false)->update();
    }

    public static function currentSessionVersion(int $userId): int
    {
        $db = \Config\Database::connect();
        $row = $db->table('usuarios')->select('session_version')->where('id', $userId)->get()->getRowArray();
        return (int) ($row['session_version'] ?? 0);
    }

    private static function rateLimitDirectory(string $bucket): string
    {
        $dir = WRITEPATH . 'rate_limits_' . $bucket . DIRECTORY_SEPARATOR;
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        return $dir;
    }

    private static function rateLimitPath(string $bucket, string $key): string
    {
        return self::rateLimitDirectory($bucket) . hash('sha256', $key) . '.json';
    }

    /**
     * Limitador de intentos genérico basado en archivos, reutilizable para
     * cualquier endpoint sensible (login, cambio de contraseña, consultas
     * a servicios externos como RENIEC/SUNARP).
     *
     * Devuelve null si se puede continuar, o un array ['retryAfterMinutes' => n]
     * si el llamante debe ser bloqueado.
     */
    public static function checkRateLimit(string $bucket, string $key, int $maxAttempts = 8, int $windowSeconds = 300, int $blockSeconds = 900): ?array
    {
        $path = self::rateLimitPath($bucket, $key);
        $now = time();
        $data = is_file($path) ? (json_decode((string) file_get_contents($path), true) ?: []) : [];
        $data += ['attempts' => 0, 'first_attempt_at' => $now, 'blocked_until' => 0];

        $blockedUntil = (int) $data['blocked_until'];
        if ($blockedUntil > $now) {
            return ['retryAfterMinutes' => max(1, (int) ceil(($blockedUntil - $now) / 60))];
        }

        if (($now - (int) $data['first_attempt_at']) > $windowSeconds) {
            $data = ['attempts' => 0, 'first_attempt_at' => $now, 'blocked_until' => 0];
        }

        $data['attempts'] = ((int) $data['attempts']) + 1;
        if ($data['attempts'] >= $maxAttempts) {
            $data['blocked_until'] = $now + $blockSeconds;
        }

        @file_put_contents($path, json_encode($data), LOCK_EX);

        return null;
    }

    public static function clearRateLimit(string $bucket, string $key): void
    {
        $path = self::rateLimitPath($bucket, $key);
        if (is_file($path)) {
            unlink($path);
        }
    }
}
