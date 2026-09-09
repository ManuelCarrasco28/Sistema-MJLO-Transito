<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class OrganizacionesController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();

        $rows = $db->table('organizaciones o')
            ->select("
                o.id,
                o.tipo,
                o.razon_social AS razonSocial,
                COALESCE(o.ruc, '') AS ruc,
                COALESCE(o.partida_registral, '') AS partidaRegistral,
                COALESCE(o.representante_legal, '') AS representanteLegal,
                COALESCE(o.direccion, '') AS direccion,
                COALESCE(o.telefono_contacto, '') AS telefono,
                COALESCE(o.email_contacto, '') AS email,
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
            'representante_legal'  => trim($input['representanteLegal'] ?? ''),
            'direccion'            => trim($input['direccion'] ?? ''),
            'telefono_contacto'    => trim($input['telefono'] ?? ''),
            'email_contacto'       => trim($input['email'] ?? ''),
            'estado'               => strtoupper($input['estado'] ?? 'ACTIVO'),
        ];

        $db->table('organizaciones')->insert($record);
        $insertId = $db->insertID();

        $newOrg = [
            'id'                 => (int)$insertId,
            'tipo'               => $record['tipo'],
            'razonSocial'        => $record['razon_social'],
            'ruc'                => $record['ruc'],
            'partidaRegistral'   => $record['partida_registral'],
            'representanteLegal' => $record['representante_legal'],
            'direccion'          => $record['direccion'],
            'telefono'           => $record['telefono_contacto'],
            'email'              => $record['email_contacto'],
            'estado'             => $record['estado'],
            'flotaTotal'         => (int)($input['flotaTotal'] ?? 0),
        ];

        return $this->respondCreated(['status' => true, 'message' => 'Organización registrada con éxito', 'data' => $newOrg]);
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getRawInput();

        if (!$id) {
            return $this->failNotFound('ID de organización no especificado.');
        }

        $record = [];
        if (isset($input['tipo'])) $record['tipo'] = strtoupper($input['tipo']);
        if (isset($input['razonSocial'])) $record['razon_social'] = trim($input['razonSocial']);
        if (isset($input['ruc'])) $record['ruc'] = trim($input['ruc']);
        if (isset($input['partidaRegistral'])) $record['partida_registral'] = trim($input['partidaRegistral']);
        if (isset($input['representanteLegal'])) $record['representante_legal'] = trim($input['representanteLegal']);
        if (isset($input['direccion'])) $record['direccion'] = trim($input['direccion']);
        if (isset($input['telefono'])) $record['telefono_contacto'] = trim($input['telefono']);
        if (isset($input['email'])) $record['email_contacto'] = trim($input['email']);
        if (isset($input['estado'])) $record['estado'] = strtoupper($input['estado']);

        if (!empty($record)) {
            $db->table('organizaciones')->where('id', $id)->update($record);
        }

        return $this->respond(['status' => true, 'message' => 'Organización actualizada con éxito']);
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();

        if (!$id) {
            return $this->failNotFound('ID de organización no especificado.');
        }

        $db->table('organizaciones')->where('id', $id)->delete();

        return $this->respondDeleted(['status' => true, 'message' => 'Organización eliminada del padrón']);
    }
}
