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

    /**
     * Decodifica una imagen en base64 (con o sin prefijo data:image/...) y la
     * guarda en writable/uploads/{subcarpeta}/. Devuelve la ruta relativa
     * (ej. "papeletas/6f1a....jpg") que se debe persistir en la base de datos,
     * en vez del base64 completo.
     */
    public function guardarImagenBase64(string $base64, string $subcarpeta): ?string
    {
        $base64 = trim($base64);
        if ($base64 === '') {
            return null;
        }

        $mime = 'image/jpeg';
        if (preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/', $base64, $m)) {
            $mime = strtolower($m[1]);
            $base64 = $m[2];
        }

        $extension = self::MIME_EXT[$mime] ?? 'jpg';
        $binario = base64_decode($base64, true);
        if ($binario === false || $binario === '') {
            return null;
        }

        $subcarpeta = trim($subcarpeta, '/');
        $directorio = WRITEPATH . 'uploads/' . $subcarpeta . '/';
        if (!is_dir($directorio) && !mkdir($directorio, 0755, true) && !is_dir($directorio)) {
            return null;
        }

        $nombre = bin2hex(random_bytes(16)) . '.' . $extension;
        file_put_contents($directorio . $nombre, $binario);

        return $subcarpeta . '/' . $nombre;
    }

    /**
     * Convierte una ruta relativa guardada en BD en una URL servible por la API.
     * Si ya es una URL completa (ej. foto de RENIEC/PIDE), la deja intacta.
     */
    public function urlPublica(?string $ruta): ?string
    {
        if (empty($ruta)) {
            return null;
        }
        if (str_starts_with($ruta, 'http://') || str_starts_with($ruta, 'https://') || str_starts_with($ruta, 'data:')) {
            return $ruta;
        }

        return rtrim(base_url('api/files'), '/') . '/' . ltrim($ruta, '/');
    }
}
