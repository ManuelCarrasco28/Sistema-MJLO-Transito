<?php

namespace App\Services;

class FileStorageService
{
    private const MIME_EXT = [
        'image/jpeg' => 'jpg',
        'image/jpg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    private const TAMANO_MAXIMO_BYTES = 8 * 1024 * 1024;
    private const LADO_MAXIMO_PX = 10000;

    private const PIXELES_MAXIMOS = 50000000;

    private const HOST_PIDE = 'pide.munijlo.gob.pe';

    public function guardarFotoPide(string $url, string $subcarpeta): ?string
    {
        $partes = parse_url(trim($url));
        if (!$partes || ($partes['scheme'] ?? '') !== 'https' || strtolower($partes['host'] ?? '') !== self::HOST_PIDE
            || !empty($partes['port']) || !empty($partes['user'])
            || !preg_match('#^/api/v1/services/reniec/photo/[A-Za-z0-9-]+$#', $partes['path'] ?? '')) {
            return null;
        }

        $sslVerify = filter_var(env('app.pideSslVerify', true), FILTER_VALIDATE_BOOLEAN);
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => $sslVerify,
            CURLOPT_SSL_VERIFYHOST => $sslVerify ? 2 : 0,
            CURLOPT_MAXFILESIZE => 2 * 1024 * 1024,
            CURLOPT_HTTPHEADER => ['Accept: image/*'],
        ]);
        $cuerpo = curl_exec($curl);
        $codigo = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $tipo = (string) curl_getinfo($curl, CURLINFO_CONTENT_TYPE);
        curl_close($curl);

        if ($cuerpo === false || $codigo !== 200 || $cuerpo === '' || strlen($cuerpo) > 2 * 1024 * 1024 || !str_starts_with(strtolower($tipo), 'image/')) {
            log_message('warning', 'No se pudo descargar la foto de RENIEC (HTTP ' . $codigo . ').');
            return null;
        }

        return $this->guardarImagenBase64('data:image/jpeg;base64,' . base64_encode($cuerpo), $subcarpeta);
    }

    public function guardarImagenBase64(string $base64, string $subcarpeta): ?string
    {
        $base64 = trim($base64);
        if ($base64 === '') {
            return null;
        }

        $subcarpeta = preg_replace('/[^a-zA-Z0-9_-]/', '', trim($subcarpeta, '/'));
        if ($subcarpeta === '') {
            return null;
        }

        $mime = 'image/jpeg';
        if (preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/', $base64, $m)) {
            $mime = strtolower($m[1]);
            $base64 = $m[2];
        }

        $binario = base64_decode($base64, true);
        if ($binario === false || $binario === '' || strlen($binario) > self::TAMANO_MAXIMO_BYTES) {
            return null;
        }

        $info = @getimagesizefromstring($binario);
        if ($info === false || !isset(self::MIME_EXT[$info['mime'] ?? ''])) {
            return null;
        }
        if ($info[0] > self::LADO_MAXIMO_PX || $info[1] > self::LADO_MAXIMO_PX || ($info[0] * $info[1]) > self::PIXELES_MAXIMOS) {
            return null;
        }
        $extension = self::MIME_EXT[$info['mime']];

        $imagen = @imagecreatefromstring($binario);
        if ($imagen === false) {
            return null;
        }
        ob_start();
        $ok = match ($extension) {
            'png' => imagepng($imagen),
            'webp' => imagewebp($imagen, null, 85),
            default => imagejpeg($imagen, null, 88),
        };
        $recodificado = (string) ob_get_clean();
        imagedestroy($imagen);
        if (!$ok || $recodificado === '') {
            return null;
        }
        $binario = $recodificado;

        $directorio = WRITEPATH . 'uploads/' . $subcarpeta . '/';
        if (!is_dir($directorio) && !mkdir($directorio, 0755, true) && !is_dir($directorio)) {
            return null;
        }

        $nombre = bin2hex(random_bytes(16)) . '.' . $extension;
        $rutaCompleta = $directorio . $nombre;
        $escrito = @file_put_contents($rutaCompleta, $binario, LOCK_EX);
        if ($escrito === false || $escrito !== strlen($binario)) {
            @unlink($rutaCompleta);
            log_message('error', "No se pudo escribir archivo en disco: {$rutaCompleta}");
            return null;
        }

        self::$escritosEnPeticion[] = $rutaCompleta;

        return $subcarpeta . '/' . $nombre;
    }

    private static array $escritosEnPeticion = [];

    public static function descartarEscritos(): void
    {
        foreach (self::$escritosEnPeticion as $ruta) {
            @unlink($ruta);
        }
        self::$escritosEnPeticion = [];
    }

    public function urlPublica(?string $ruta): ?string
    {
        if (empty($ruta)) {
            return null;
        }
        if (str_starts_with($ruta, 'http://') || str_starts_with($ruta, 'https://') || str_starts_with($ruta, 'data:')) {

            if (str_contains($ruta, '://backend/')) {
                return preg_replace('#^https?://backend#', '', $ruta);
            }
            return $ruta;
        }

        $request = \Config\Services::request();
        $forwarded = $request->getHeaderLine('X-Forwarded-Host');
        $host = !empty($forwarded) ? $forwarded : (string) $request->getServer('HTTP_HOST');

        if (empty($host) || $host === 'backend') {
            return '/api/files/' . ltrim($ruta, '/');
        }

        $scheme = ($request->getServer('HTTPS') === 'on' || (int)$request->getServer('SERVER_PORT') === 443 || $request->getHeaderLine('X-Forwarded-Proto') === 'https') ? 'https' : 'http';
        return "{$scheme}://{$host}/api/files/" . ltrim($ruta, '/');
    }
}
