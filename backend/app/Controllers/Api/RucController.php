<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class RucController extends ResourceController
{
    private const NO_DISPONIBLE = 'Servicio de consulta RUC temporalmente no disponible. Intenta más tarde o ingresa los datos manualmente.';

    public function consultar(string $ruc)
    {
        if (!preg_match('/^\d{11}$/', $ruc)) {
            return $this->failValidationErrors('El RUC debe tener 11 dígitos.');
        }
        $usuario = \App\Libraries\Acceso::usuario();
        $key = ($usuario['id'] ?? 'anon') . '|' . $this->request->getIPAddress();
if(\App\Services\AuthSession::checkRateLimit('pide-ruc',$key,20,60,60)!==null){
            return $this->fail('Demasiadas consultas. Intenta nuevamente en un minuto.', 429);
        }

// El mismo token institucional cifrado que utilizan RENIEC y SUNARP.
$anio=\Config\Database::connect()->table('municipalidad_anio')
->where('anio',date('Y'))->get()->getRowArray();
$token=!empty($anio['token'])
?\App\Libraries\SecretoCifrado::descifrar($anio['token'])
:'';
if(!$token){
return$this->fail(self::NO_DISPONIBLE,503);
        }

        $cache = cache();
$cacheKey='pide_sunat_ruc_'.$ruc;
        $cached = $cache->get($cacheKey);
        if (is_array($cached)) {
            return $this->respond(['data' => $cached]);
        }

$sslVerify=filter_var(env('app.pideSslVerify',true),FILTER_VALIDATE_BOOLEAN);
$curl=curl_init('https://pide.munijlo.gob.pe/api/v1/services/sunat/ruc/'.$ruc);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
CURLOPT_CONNECTTIMEOUT=>5,
            CURLOPT_TIMEOUT => 8,
CURLOPT_SSL_VERIFYPEER=>$sslVerify,
CURLOPT_SSL_VERIFYHOST=>$sslVerify?2:0,
CURLOPT_HTTPHEADER=>['Accept: application/json','Authorization: Bearer '.$token],
        ]);
        $raw = curl_exec($curl);
$status=(int)curl_getinfo($curl,CURLINFO_HTTP_CODE);
        curl_close($curl);
$payload=is_string($raw)?json_decode($raw,true):null;

$mensaje=is_array($payload)&&is_string($payload['message']??null)?$payload['message']:'';
$credencialInvalida=preg_match('/caduc|expir|contrase|token|credencial|unauthorized|autoriz/i',$mensaje);
if($credencialInvalida||in_array($status,[401,403],true)){
log_message('warning','PIDE RUC: credenciales del proveedor rechazadas (HTTP {status}).',['status'=>$status]);
return$this->fail(self::NO_DISPONIBLE,503);
        }
        if ($status === 404) {
            return $this->failNotFound('RUC no encontrado. Puedes ingresar los datos manualmente.');
        }
        if ($status === 429) {
return$this->fail('Servicio de consulta RUC ocupado. Intenta más tarde.',429);
        }
if($status!==200||!is_array($payload)||($payload['success']??true)===false){
log_message('warning','PIDE RUC: consulta no disponible (HTTP {status}).',['status'=>$status]);
return$this->fail(self::NO_DISPONIBLE,503);
        }

$data=$payload['data']??$payload;
if(!is_array($data)){
            return $this->failNotFound('RUC no encontrado. Puedes ingresar los datos manualmente.');
        }
$razonSocial=$data['razonSocial']??$data['razon_social']??$data['nombre_o_razon_social']??$data['nombreRazonSocial']??'';
$rucDevuelto=(string)($data['ruc']??$data['numeroRuc']??$data['numeroDocumento']??$ruc);
if($rucDevuelto!==$ruc||!is_string($razonSocial)||trim($razonSocial)===''){
return$this->fail(self::NO_DISPONIBLE,502);
        }

        // Representantes legales (presidente, gerente…): solo los que traen documento y nombre
        $representantes = [];
        foreach ((array) ($data['representantesLegales'] ?? $data['representantes_legales'] ?? []) as $r) {
            if (!is_array($r)) {
                continue;
            }
            $documento = trim((string) ($r['numeroDocumento'] ?? ''));
            $nombre = trim((string) ($r['nombreCompleto'] ?? ''));
            if ($documento === '' || $nombre === '') {
                continue;
            }
            $representantes[] = [
                'tipoDocumento' => (string) ($r['tipoDocumento'] ?? ''),
                'numeroDocumento' => $documento,
                'nombreCompleto' => $nombre,
                'cargo' => trim((string) ($r['cargoDescripcion'] ?? '')),
                'fechaNacimiento' => preg_match('/^\d{4}-\d{2}-\d{2}/', (string) ($r['fechaNacimiento'] ?? '')) ? substr((string) $r['fechaNacimiento'], 0, 10) : '',
            ];
        }

        $resultado = [
            'ruc' => $ruc,
'razonSocial'=>trim($razonSocial),
'direccion'=>trim((string)($data['direccion']??$data['domicilioFiscal']??$data['domicilio_fiscal']??'')),
'estadoSunat'=>(string)($data['estado']??$data['estadoContribuyente']??''),
'condicion'=>(string)($data['condicion']??$data['condicionDomicilio']??''),
            'ubigeo' => (string) ($data['ubigeo'] ?? ''),
'fechaDatos'=>(string)($data['fechaActualizacion']??''),
            // Fecha de inscripción en SUNAT (AAAA-MM-DD): se propone como fecha de creación de la asociación
            'fechaInscripcion' => preg_match('/^\d{4}-\d{2}-\d{2}/', (string) ($data['fechaInscripcion'] ?? '')) ? substr((string) $data['fechaInscripcion'], 0, 10) : '',
            'representantesLegales' => $representantes,
        ];
        $cache->save($cacheKey, $resultado, 3600);
        return $this->respond(['data' => $resultado]);
    }
}
