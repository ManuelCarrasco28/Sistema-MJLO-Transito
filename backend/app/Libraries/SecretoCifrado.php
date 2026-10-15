<?php

namespace App\Libraries;

class SecretoCifrado
{
    private const PREFIJO = 'enc:v1:';

    public static function estaCifrado(?string $valor): bool
    {
        return is_string($valor) && str_starts_with($valor, self::PREFIJO);
    }

    public static function cifrar(?string $plano): ?string
    {
        $plano = trim((string) $plano);
        if ($plano === '') {
            return null;
        }
        if (self::estaCifrado($plano)) {
            return $plano;
        }

        return self::PREFIJO . base64_encode(self::encrypter()->encrypt($plano));
    }

    public static function descifrar(?string $valor): ?string
    {
        if ($valor === null || $valor === '') {
            return null;
        }
        if (!self::estaCifrado($valor)) {
            return $valor;
        }

        $binario = base64_decode(substr($valor, strlen(self::PREFIJO)), true);
        if ($binario === false) {
            return null;
        }

        try {
            return self::encrypter()->decrypt($binario);
        } catch (\Throwable $e) {
            log_message('error', 'No se pudo descifrar un secreto guardado: ¿cambió la clave encryption.key?');

            return null;
        }
    }

    private static function encrypter()
    {
        if ((string) config('Encryption')->key === '') {
            throw new \RuntimeException('Falta encryption.key en el .env: no se puede cifrar ni descifrar secretos.');
        }

        return service('encrypter');
    }
}
