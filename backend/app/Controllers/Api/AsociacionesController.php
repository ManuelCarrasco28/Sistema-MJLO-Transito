<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class AsociacionesController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();

        $rows = $db->table('asociaciones o')
            ->select("
                o.id,
                CASE WHEN o.tipo = 'EMPRESA' THEN 'PARTICULAR' ELSE o.tipo END AS tipo,
                o.razon_social AS razonSocial,
                COALESCE(o.ruc, '') AS ruc,
                COALESCE(o.partida_registral, '') AS partidaRegistral,
                COALESCE(o.fecha_creacion, '') AS fechaCreacion,
                COALESCE(o.direccion, '') AS direccion,
                COALESCE(o.coordenadas, '') AS coordenadas,
                COALESCE(o.telefono_contacto, '') AS telefono,
                COALESCE(o.email_contacto, '') AS email,
                COALESCE(o.tipo_ambiente, '') AS tipoAmbiente,
                COALESCE(o.numero_licencia, '') AS numeroLicencia,
                o.estado,
                COUNT(v.id) AS flotaTotal
            ", false)
            ->join('vehiculos v', 'v.id_asociacion = o.id', 'left')
            ->groupBy('o.id')
            ->orderBy('o.id', 'DESC')
            ->get()
            ->getResultArray();

        return $this->respond(['data' => $rows]);
    }

    public function show($id = null)
    {
        $db = \Config\Database::connect();

        if (!$id) {
            return $this->failNotFound('ID de asociación no especificado.');
        }

        $asociacion = $db->table('asociaciones o')
            ->select("
                o.id,
                CASE WHEN o.tipo = 'EMPRESA' THEN 'PARTICULAR' ELSE o.tipo END AS tipo,
                o.razon_social AS razonSocial,
                COALESCE(o.ruc, '') AS ruc,
                COALESCE(o.partida_registral, '') AS partidaRegistral,
                COALESCE(o.fecha_creacion, '') AS fechaCreacion,
                COALESCE(o.direccion, '') AS direccion,
                COALESCE(o.coordenadas, '') AS coordenadas,
                COALESCE(o.telefono_contacto, '') AS telefono,
                COALESCE(o.email_contacto, '') AS email,
                COALESCE(o.tipo_ambiente, '') AS tipoAmbiente,
                COALESCE(o.numero_licencia, '') AS numeroLicencia,
                o.estado,
                COUNT(v.id) AS flotaTotal
            ", false)
            ->join('vehiculos v', 'v.id_asociacion = o.id', 'left')
            ->where('o.id', $id)
            ->groupBy('o.id')
            ->get()
            ->getRowArray();

        if (!$asociacion) {
            return $this->failNotFound('Asociación no encontrada.');
        }

        $socios = $db->table('vehiculo_propietarios vp')
            ->select("
                p.id AS idPersona,
                COALESCE(p.numero, '') AS documento,
                TRIM(CONCAT(COALESCE(c.nombres, ''), ' ', COALESCE(c.apellido_paterno, ''), ' ', COALESCE(c.apellido_materno, ''))) AS nombre,
                COALESCE(NULLIF(p.telefono, ''), NULLIF(p.celular, ''), '') AS telefono,
                COALESCE(p.email, '') AS email,
                COUNT(DISTINCT vp.id_vehiculo) AS vehiculosTotal,
                GROUP_CONCAT(DISTINCT v.placa ORDER BY v.placa SEPARATOR ', ') AS placas
            ", false)
            ->join('personas p', 'p.id = vp.id_persona', 'inner')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->join('vehiculos v', 'v.id = vp.id_vehiculo', 'inner')
            ->where('v.id_asociacion', $id)
            ->where('vp.estado', 'ACTIVO')
            ->groupBy('p.id')
            ->orderBy('nombre', 'ASC')
            ->get()
            ->getResultArray();

        $vehiculos = $db->table('vehiculos v')
            ->select("
                v.id,
                COALESCE(v.placa, '') AS placa,
                COALESCE(v.marca, '') AS marca,
                COALESCE(v.modelo, '') AS modelo,
                COALESCE(v.color, '') AS color,
                CASE WHEN v.id_asociacion IS NOT NULL THEN 'FORMAL' ELSE 'INFORMAL' END AS estado,
                COALESCE(p.numero, '') AS propietarioDocumento,
                TRIM(CONCAT(COALESCE(c.nombres, ''), ' ', COALESCE(c.apellido_paterno, ''), ' ', COALESCE(c.apellido_materno, ''))) AS propietario
            ", false)
            ->join('vehiculo_propietarios vp', 'vp.id_vehiculo = v.id AND vp.estado = "ACTIVO"', 'left')
            ->join('personas p', 'p.id = vp.id_persona', 'left')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->where('v.id_asociacion', $id)
            ->orderBy('v.placa', 'ASC')
            ->get()
            ->getResultArray();

        return $this->respond([
            'data' => array_merge($asociacion, [
                'socios' => $socios,
                'vehiculos' => $vehiculos,
            ]),
        ]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getPost();

        if (empty($input['razonSocial'])) {
            return $this->failValidationErrors('La razón social es obligatoria.');
        }

        $record = [
            'tipo'                 => strtoupper($input['tipo'] ?? 'ASOCIACION'),
            'razon_social'         => trim($input['razonSocial']),
            'ruc'                  => trim($input['ruc'] ?? ''),
            'partida_registral'    => trim($input['partidaRegistral'] ?? ''),
            'fecha_creacion'       => $input['fechaCreacion'] ?? null,
            'direccion'            => trim($input['direccion'] ?? ''),
            'coordenadas'          => trim($input['coordenadas'] ?? ''),
            'telefono_contacto'    => trim($input['telefono'] ?? ''),
            'email_contacto'       => trim($input['email'] ?? ''),
            'tipo_ambiente'        => trim($input['tipoAmbiente'] ?? ''),
            'numero_licencia'      => trim($input['numeroLicencia'] ?? ''),
            'estado'               => strtoupper($input['estado'] ?? 'ACTIVO'),
        ];

        $db->table('asociaciones')->insert($record);
        $insertId = $db->insertID();

        $newOrg = [
            'id'                 => (int)$insertId,
            'tipo'               => $record['tipo'],
            'razonSocial'        => $record['razon_social'],
            'ruc'                => $record['ruc'],
            'partidaRegistral'   => $record['partida_registral'],
            'fechaCreacion'      => $record['fecha_creacion'] ?? '',
            'direccion'          => $record['direccion'],
            'coordenadas'        => $record['coordenadas'],
            'telefono'           => $record['telefono_contacto'],
            'email'              => $record['email_contacto'],
            'tipoAmbiente'       => $record['tipo_ambiente'],
            'numeroLicencia'     => $record['numero_licencia'],
            'estado'             => $record['estado'],
            'flotaTotal'         => 0,
        ];

        return $this->respondCreated(['status' => true, 'message' => 'Asociación registrada con éxito', 'data' => $newOrg]);
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getRawInput();

        if (!$id) {
            return $this->failNotFound('ID de asociación no especificado.');
        }

        $record = [];
        if (isset($input['tipo'])) $record['tipo'] = strtoupper($input['tipo']);
        if (isset($input['razonSocial'])) $record['razon_social'] = trim($input['razonSocial']);
        if (isset($input['ruc'])) $record['ruc'] = trim($input['ruc']);
        if (isset($input['partidaRegistral'])) $record['partida_registral'] = trim($input['partidaRegistral']);
        if (array_key_exists('fechaCreacion', $input)) $record['fecha_creacion'] = $input['fechaCreacion'] ?: null;
        if (isset($input['direccion'])) $record['direccion'] = trim($input['direccion']);
        if (isset($input['coordenadas'])) $record['coordenadas'] = trim($input['coordenadas']);
        if (isset($input['telefono'])) $record['telefono_contacto'] = trim($input['telefono']);
        if (isset($input['email'])) $record['email_contacto'] = trim($input['email']);
        if (isset($input['tipoAmbiente'])) $record['tipo_ambiente'] = trim($input['tipoAmbiente']);
        if (isset($input['numeroLicencia'])) $record['numero_licencia'] = trim($input['numeroLicencia']);
        if (isset($input['estado'])) $record['estado'] = strtoupper($input['estado']);

        if (!empty($record)) {
            $db->table('asociaciones')->where('id', $id)->update($record);
        }

        return $this->respond(['status' => true, 'message' => 'Asociación actualizada con éxito']);
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();

        if (!$id) {
            return $this->failNotFound('ID de asociación no especificado.');
        }

        $db->table('asociaciones')->where('id', $id)->delete();

        return $this->respondDeleted(['status' => true, 'message' => 'Asociación eliminada del padrón']);
    }
}
