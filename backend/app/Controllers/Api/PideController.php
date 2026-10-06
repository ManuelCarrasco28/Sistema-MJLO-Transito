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
        $curlError = curl_error($curl);
        curl_close($curl);

        if ($response === false || !empty($curlError)) {
            return $this->failServerError("El servicio de consulta RENIEC no responde en este momento. Ingrese los datos manualmente.");
        }

        $decoded = json_decode($response, true);
        if (is_array($decoded)) {
            $formatTitle = function ($str) {
                if (!is_string($str) || trim($str) === '') return $str;
                return mb_convert_case(preg_replace('/\s+/', ' ', trim($str)), MB_CASE_TITLE, 'UTF-8');
            };
            if (isset($decoded['data']) && is_array($decoded['data'])) {
                if (isset($decoded['data']['direccion'])) {
                    $decoded['data']['direccion'] = $formatTitle($decoded['data']['direccion']);
                }
            }
            if (isset($decoded['direccion'])) {
                $decoded['direccion'] = $formatTitle($decoded['direccion']);
            }
            return $this->response->setStatusCode($httpCode)->setJSON($decoded);
        }

        return $this->response->setStatusCode($httpCode)->setJSON(json_decode($response));
    }

    public function oficinasRegistrales()
    {
        $rows = \Config\Database::connect()
            ->table('oficina_registral')
            ->select('cod_zona AS codeZona, cod_oficina AS codeOficina, descripcion')
            ->orderBy('descripcion', 'ASC')
            ->get()
            ->getResultArray();

        return $this->respond(['status' => 200, 'data' => $rows]);
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

        $sslVerify = filter_var(env('app.pideSslVerify', true), FILTER_VALIDATE_BOOLEAN);

        // La placa solo se encuentra en la oficina donde fue registrada: se prueba primero la
        // oficina indicada y luego el resto de oficinas de la misma zona.
        $candidatas = [[$codeZona, $codeOficina]];
        if ($codeZona !== '') {
            $otras = \Config\Database::connect()
                ->table('oficina_registral')
                ->select('cod_oficina')
                ->where('cod_zona', $codeZona)
                ->where('cod_oficina !=', $codeOficina)
                ->orderBy('cod_oficina', 'ASC')
                ->get()
                ->getResultArray();
            foreach ($otras as $o) {
                $candidatas[] = [$codeZona, $o['cod_oficina']];
            }
        }

        $ultimo = null;
        $ultimoHttp = 200;
        foreach ($candidatas as [$zona, $oficina]) {
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
                CURLOPT_POSTFIELDS => json_encode(["placa" => $placa, "codeZona" => $zona, "codeOficina" => $oficina]),
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
                return $this->failServerError("El servicio de consulta SUNARP no responde en este momento. Ingrese los datos manualmente.");
            }

            $decoded = json_decode($response, true);
            if (is_array($decoded) && !empty($decoded['success']) && !empty($decoded['data'])) {
                $decoded['data']['oficina_consultada'] = ['codeZona' => $zona, 'codeOficina' => $oficina];
                return $this->response->setStatusCode($httpCode)->setJSON($decoded);
            }

            $ultimo = $decoded;
            $ultimoHttp = $httpCode;
            // Un error distinto de "sin registros" (token, validación, etc.) no mejora probando otras oficinas.
            if (!is_array($decoded) || ($ultimoHttp >= 400 && $ultimoHttp !== 404)) {
                break;
            }
        }

        if (is_array($ultimo)) {
            unset($ultimo['raw_xml']);
            if ($codeZona !== '' && !empty($ultimo) && array_key_exists('data', $ultimo) && $ultimo['data'] === null) {
                $ultimo['message'] = "No se encontró la placa en ninguna oficina registral de la zona {$codeZona}. Puede buscar en otra zona o ingresar los datos manualmente.";
            }
        }

        return $this->response->setStatusCode($ultimoHttp)->setJSON($ultimo);
    }
}
