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
        
        return $anio["token"];
    }

    public static function reniec($dni)
    {
        if (!preg_match("/^\d{8}$/", $dni)) {
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
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
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
        return $decoded['data'] ?? $decoded;
    }

    public static function sunarp($placa)
    {
        $placa = strtoupper(str_replace([' ', '-'], '', trim($placa)));
        if (empty($placa)) {
            return null;
        }

        $token = self::getToken();
        if (!$token) {
            return null;
        }

        $data = [
            "placa" => $placa,
            "codeZona" => "11",
            "codeOficina" => "01"
        ];

        $sslVerify = filter_var(env('app.pideSslVerify', true), FILTER_VALIDATE_BOOLEAN);

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => "https://pide.munijlo.gob.pe/api/v1/services/sunarp/placa",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
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
