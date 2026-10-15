<?php

namespace App\Services;

class PideService
{
    private static function getToken()
    {
        $db = \Config\Database::connect();
        $currentYear = date("Y");

        $anio = $db->table("municipalidad_anio")
                   ->where("anio", $currentYear)
                   ->get()
                   ->getRowArray();

        if (!$anio || empty($anio["token"])) {
            return null;
        }

// El token se guarda cifrado en la base: se descifra solo aquí, para la llamada a PIDE.
        return \App\Libraries\SecretoCifrado::descifrar($anio["token"]);
    }

    private static function bloqueada(string $accion, string $detalle): bool
    {
        try {
            $user = \App\Libraries\Acceso::usuario();
            $key = ($user['id'] ?? 'anon') . '|' . service('request')->getIPAddress();
            if (\App\Services\AuthSession::checkRateLimit('pide', $key, 20, 60, 300) !== null) {
                \App\Services\AuditoriaService::registrar('PIDE', 'CONSULTA_BLOQUEADA', 'Demasiadas consultas a PIDE en poco tiempo (' . $accion . ')', ['detalle' => $detalle]);
                return true;
            }
            \App\Services\AuditoriaService::registrar('PIDE', $accion, 'Consulta a PIDE: ' . $detalle, ['detalle' => $detalle]);
        } catch (\Throwable $e) {
            log_message('error', 'No se pudo aplicar el límite de consultas a PIDE: ' . $e->getMessage());
        }

        return false;
    }

    public static function reniec($dni)
    {
        if (!preg_match("/^\d{8}$/", $dni)) {
            return null;
        }
        if (self::bloqueada('CONSULTA_RENIEC', 'DNI ' . substr($dni, 0, 2) . '****' . substr($dni, -2))) {
            return null;
        }

        $token = self::getToken();
        if (!$token) {
            return null;
        }

        $sslVerify = filter_var(env('app.pideSslVerify', true), FILTER_VALIDATE_BOOLEAN);

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => "https://pide.munijlo.gob.pe/api/v1/services/reniec/dni/" . $dni,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "GET",
            CURLOPT_SSL_VERIFYPEER => $sslVerify,
            CURLOPT_SSL_VERIFYHOST => $sslVerify ? 2 : 0,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer " . $token,
                "Accept: application/json"
            ],
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($response === false || $httpCode !== 200) {
            return null;
        }

        $decoded = json_decode($response, true);
        $data = $decoded['data'] ?? $decoded;
        if (is_array($data)) {
            if (isset($data['direccion']) && is_string($data['direccion'])) {
                $data['direccion'] = mb_convert_case(preg_replace('/\s+/', ' ', trim($data['direccion'])), MB_CASE_TITLE, 'UTF-8');
            }
        }
        return $data;
    }

    public static function sunarp($placa, $codeZona = '11', $codeOficina = '01')
    {
        $placa = strtoupper(str_replace([' ', '-'], '', trim($placa)));
        if (empty($placa)) {
            return null;
        }
        $codeZona = trim((string)$codeZona) ?: '11';
        $codeOficina = trim((string)$codeOficina) ?: '01';

        if (self::bloqueada('CONSULTA_SUNARP', "placa {$placa} (zona: {$codeZona}, oficina: {$codeOficina})")) {
            return null;
        }

        $token = self::getToken();
        if (!$token) {
            return null;
        }

        $data = [
            "placa" => $placa,
            "codeZona" => $codeZona,
            "codeOficina" => $codeOficina
        ];

        $sslVerify = filter_var(env('app.pideSslVerify', true), FILTER_VALIDATE_BOOLEAN);

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => "https://pide.munijlo.gob.pe/api/v1/services/sunarp/placa",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_SSL_VERIFYPEER => $sslVerify,
            CURLOPT_SSL_VERIFYHOST => $sslVerify ? 2 : 0,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer " . $token,
                "Content-Type: application/json",
                "Accept: application/json"
            ],
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($response === false || $httpCode !== 200) {
            return null;
        }

        $decoded = json_decode($response, true);
        return $decoded['data'] ?? $decoded;
    }
}
