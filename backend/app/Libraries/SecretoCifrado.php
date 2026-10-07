<?php

namespace App\Libraries;

/**
 * Cifrado de secretos que se guardan en la base de datos (p. ej. el token de la API PIDE).
 *
 * Se cifra con AES-256 (servicio `encrypter` de CodeIgniter) usando la clave `encryption.key` del `.env`,
 * que vive solo en el servidor: quien copie un volcado o un respaldo de la base solo ve texto ilegible.
 * El valor guardado lleva el prefijo "enc:v1:" para distinguirlo de un secreto antiguo sin cifrar.
 */
class SecretoCifrado
{
    private const PREFIJO = 'enc:v1:';

    public static function estaCifrado(?string $valor): bool
    {
        return is_string($valor) && str_starts_with($valor, self::PREFIJO);
    }

    /**
     * Devuelve el valor cifrado listo para guardar. Si ya estaba cifrado lo deja igual; si no hay clave
     * configurada lanza una excepción en vez de guardar el secreto en claro.
     */
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

    /**
     * Devuelve el secreto en claro para usarlo (nunca debe enviarse al cliente ni escribirse en logs).
     * Un valor sin el prefijo se considera un secreto antiguo sin cifrar y se devuelve tal cual, para que el
     * sistema siga funcionando hasta que se cifre. Si no se puede descifrar (clave equivocada) devuelve null.
     */
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
