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
        $secret = (string) env('app.sessionSecret', 'un_secreto_super_seguro_para_sesiones_12345');

        if ($secret === '' || strlen($secret) < 32) {
            $secret = 'un_secreto_super_seguro_para_sesiones_12345';
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
            if (!@mkdir($dir, 0775, true) && !is_dir($dir)) {
                throw new \RuntimeException('No se pudo crear el directorio de intentos.');
            }
        }
        return $dir;
    }

    private static function rateLimitPath(string $bucket, string $key): string
    {
        return self::rateLimitDirectory($bucket) . hash('sha256', $key) . '.json';
    }

    public static function checkRateLimit(string $bucket, string $key, int $maxAttempts = 8, int $windowSeconds = 300, int $blockSeconds = 900): ?array
    {
        $path = self::rateLimitPath($bucket, $key);
        $now = time();
        $fp = fopen($path, 'c+');
        if (!$fp) {
            throw new \RuntimeException('No se pudo abrir el contador de intentos.');
        }
        try {
            if (!flock($fp, LOCK_EX)) {
                throw new \RuntimeException('No se pudo bloquear el contador de intentos.');
            }
            $data = json_decode((string)stream_get_contents($fp), true) ?: [];
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

            rewind($fp);
            ftruncate($fp, 0);
            fwrite($fp, json_encode($data));
            fflush($fp);

            return null;
        } finally {
            flock($fp, LOCK_UN);
            fclose($fp);
        }
    }

    public static function clearRateLimit(string $bucket, string $key): void
    {
        $path = self::rateLimitPath($bucket, $key);
        $fp = fopen($path, 'c+');
        if ($fp) {
            try {
                if (flock($fp, LOCK_EX)) {
                    ftruncate($fp, 0);
                    fflush($fp);
                }
            } finally {
                flock($fp, LOCK_UN);
                fclose($fp);
            }
        }
    }
}
