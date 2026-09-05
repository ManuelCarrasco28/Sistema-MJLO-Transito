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
            ->join('vehiculos v', 'v.asociacion_id = o.id', 'left')
            ->groupBy('o.id')
            ->orderBy('o.id', 'DESC')
            ->get()
            ->getResultArray();

        return $this->respond(['data' => $rows]);
    }
}
