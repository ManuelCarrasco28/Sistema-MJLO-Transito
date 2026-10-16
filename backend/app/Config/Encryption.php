<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

class Encryption extends BaseConfig
{

    public string $key = '';

/**
     * --------------------------------------------------------------------------
     * Previous Encryption Keys
     * --------------------------------------------------------------------------
     *
     * When rotating encryption keys, add old keys here to maintain ability
     * to decrypt data encrypted with previous keys. Encryption always uses
     * the current $key. Decryption tries current key first, then falls back
     * to previous keys if decryption fails.
     *
     * In .env file, use comma-separated string:
     *   encryption.previousKeys = hex2bin:9be8c64fcea509867...,hex2bin:3f5a1d8e9c2b7a4f6...
     *
     * @var list<string>|string
     */
    public array|string $previousKeys = '';

    public string $driver = 'OpenSSL';

    public int $blockSize = 16;

    public string $digest = 'SHA512';

    public bool $rawData = true;

    public string $encryptKeyInfo = '';

    public string $authKeyInfo = '';

    public string $cipher = 'AES-256-CTR';
}
