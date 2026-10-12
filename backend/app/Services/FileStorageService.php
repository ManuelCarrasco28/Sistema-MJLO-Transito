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

    private const TAMANO_MAXIMO_BYTES = 8 * 1024 * 1024; // 8 MB
    private const LADO_MAXIMO_PX = 10000;
    // Una foto de 64 megapíxeles ocupa ~256 MB al decodificarse: se limita la superficie total (50 MP cubre los celulares actuales; la app debe reducir las fotos antes de enviarlas)
    private const PIXELES_MAXIMOS = 50000000;

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

        // Solo letras/números/guiones: evita path traversal (../) si en el
        // futuro $subcarpeta llegara a depender de un valor externo.
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

        // El tipo se decide por el contenido real (no por lo que declare el cliente) y la imagen se vuelve a
        // codificar: así se descartan EXIF/GPS y cualquier carga extra escondida en el archivo.
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

    /** Archivos escritos en esta petición: si la transacción falla se borran para no dejar fotos sin registro. */
    private static array $escritosEnPeticion = [];

    public static function descartarEscritos(): void
    {
        foreach (self::$escritosEnPeticion as $ruta) {
            @unlink($ruta);
        }
        self::$escritosEnPeticion = [];
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
