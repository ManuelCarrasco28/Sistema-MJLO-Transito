<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class RucController extends ResourceController
{
    public function consultar(string $ruc)
    {
        if (!preg_match('/^\d{11}$/', $ruc)) {
            return $this->failValidationErrors('El RUC debe tener 11 dígitos.');
        }
        if (!str_starts_with($ruc, '20')) {
            return $this->failValidationErrors('OpenRUC solo consulta RUC que empiezan en 20. Ingresa los datos manualmente.');
        }
        $usuario = \App\Libraries\Acceso::usuario();
        $key = ($usuario['id'] ?? 'anon') . '|' . $this->request->getIPAddress();
        if (\App\Services\AuthSession::checkRateLimit('openruc', $key, 20, 60, 60) !== null) {
            return $this->fail('Demasiadas consultas. Intenta nuevamente en un minuto.', 429);
        }
        $cache = cache();
        $cacheKey = 'openruc_' . $ruc;
        $cached = $cache->get($cacheKey);
        if (is_array($cached)) {
            return $this->respond(['data' => $cached]);
        }
        $curl = curl_init('https://openruc.com/api/ruc/' . $ruc);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $raw = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        if ($status === 404) {
            return $this->failNotFound('RUC no encontrado. Puedes ingresar los datos manualmente.');
        }
        if ($status === 429) {
            return $this->fail('OpenRUC tiene demasiadas consultas. Intenta más tarde.', 429);
        }
        $data = is_string($raw) ? json_decode($raw, true) : null;
        if ($status !== 200 || !is_array($data) || ($data['ruc'] ?? '') !== $ruc || empty($data['razon_social'])) {
            return $this->fail('No se pudo consultar OpenRUC. Ingresa los datos manualmente o intenta más tarde.', 502);
        }
        $resultado = [
            'ruc' => $ruc,
            'razonSocial' => trim((string) $data['razon_social']),
            'direccion' => trim((string) ($data['direccion'] ?? '')),
            'estadoSunat' => (string) ($data['estado'] ?? ''),
            'condicion' => (string) ($data['condicion'] ?? ''),
            'ubigeo' => (string) ($data['ubigeo'] ?? ''),
            'fechaDatos' => (string) ($data['as_of'] ?? ''),
        ];
        $cache->save($cacheKey, $resultado, 3600);
        return $this->respond(['data' => $resultado]);
    }
}
