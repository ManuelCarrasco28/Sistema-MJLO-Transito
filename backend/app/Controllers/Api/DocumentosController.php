<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class DocumentosController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();

        $rows = $db->table('documentos_vehiculo d')
            ->select("
                d.id,
                COALESCE(v.placa, '') AS vehiculoPlaca,
                d.tipo_documento AS tipoDocumento,
                d.codigo,
                d.fecha_expedicion AS fechaExpedicion,
                d.fecha_expiracion AS fechaExpiracion,
                d.estado,
                COALESCE(o.razon_social, '') AS asociacion,
                COALESCE(p.nombres, '') AS propietarioNombres,
                COALESCE(p.apellido_paterno, '') AS propietarioPaterno,
                COALESCE(p.apellido_materno, '') AS propietarioMaterno
            ", false)
            ->join('vehiculos v', 'v.id = d.vehiculo_id', 'left')
            ->join('organizaciones o', 'o.id = v.asociacion_id', 'left')
            ->join('vehiculo_propietarios vp', 'vp.vehiculo_id = v.id AND vp.fecha_fin IS NULL', 'left')
            ->join('personas p', 'p.id = vp.persona_id', 'left')
            ->orderBy('d.id', 'DESC')
            ->get()
            ->getResultArray();

        $data = array_map(static function (array $row): array {
            $row['propietario'] = trim(($row['propietarioNombres'] ?? '') . ' ' . ($row['propietarioPaterno'] ?? '') . ' ' . ($row['propietarioMaterno'] ?? ''));
            unset($row['propietarioNombres'], $row['propietarioPaterno'], $row['propietarioMaterno']);
            return $row;
        }, $rows);

        return $this->respond(['data' => $data]);
    }
}
