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

    public function reniec($dni)
    {
        if (!preg_match("/^\d{8}$/", $dni)) {
            return $this->failValidationErrors("El DNI debe tener exactamente 8 digitos.");
        }

        $token = $this->getToken();
        if (!$token) {
            return $this->failServerError("El token de la API PIDE no esta configurado para el anio actual.");
        }

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => "https://pide.munijlo.gob.pe/api/v1/services/reniec/dni/" . $dni,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "GET",
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
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

        $token = $this->getToken();
        if (!$token) {
            return $this->failServerError("El token de la API PIDE no esta configurado para el anio actual.");
        }

        $data = [
            "placa" => $placa,
            "codeZona" => $codeZona,
            "codeOficina" => $codeOficina
        ];

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
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
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
