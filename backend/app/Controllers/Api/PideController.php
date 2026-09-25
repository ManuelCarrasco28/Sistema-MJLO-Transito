<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PideController extends ResourceController
{
    private function getToken()
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

    private function rateLimited(): bool
    {
        $cookie = $this->request->getCookie('session_user');
        $user = \App\Services\AuthSession::resolveActiveUser($cookie);
        $key = ($user['id'] ?? 'anon') . '|' . $this->request->getIPAddress();
        $blocked = \App\Services\AuthSession::checkRateLimit('pide', $key, 20, 60, 300);
        return $blocked !== null;
    }

    public function reniec($dni)
    {
        if (!preg_match("/^\d{8}$/", $dni)) {
            return $this->failValidationErrors("El DNI debe tener exactamente 8 digitos.");
        }

        if ($this->rateLimited()) {
            return service('response')->setStatusCode(429)->setJSON([
                'status' => 429,
                'messages' => ['error' => 'Demasiadas consultas RENIEC en poco tiempo. Intenta de nuevo en unos minutos.'],
            ]);
        }

        $token = $this->getToken();
        if (!$token) {
            return $this->failServerError("El token de la API PIDE no esta configurado para el anio actual.");
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
        $curlError = curl_error($curl);
        curl_close($curl);

        if ($response === false || !empty($curlError)) {
            return $this->failServerError("Error de conexion con MTC/PIDE: " . $curlError);
        }

        return $this->response->setStatusCode($httpCode)->setJSON(json_decode($response));
    }

    public function sunarp()
    {
        $input = $this->request->getJSON(true) ?: [];
        $placa = strtoupper(trim($input["placa"] ?? ""));
        $codeZona = trim($input["codeZona"] ?? "");
        $codeOficina = trim($input["codeOficina"] ?? "");

        if (empty($placa)) {
            return $this->failValidationErrors("La placa es requerida.");
        }

        if ($this->rateLimited()) {
            return service('response')->setStatusCode(429)->setJSON([
                'status' => 429,
                'messages' => ['error' => 'Demasiadas consultas SUNARP en poco tiempo. Intenta de nuevo en unos minutos.'],
            ]);
        }

        $token = $this->getToken();
        if (!$token) {
            return $this->failServerError("El token de la API PIDE no esta configurado para el anio actual.");
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
        $curlError = curl_error($curl);
        curl_close($curl);

        if ($response === false || !empty($curlError)) {
            return $this->failServerError("Error de conexion con MTC/PIDE: " . $curlError);
        }

        return $this->response->setStatusCode($httpCode)->setJSON(json_decode($response));
    }
}
