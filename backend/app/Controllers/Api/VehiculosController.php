<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class VehiculosController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();

        $rows = $db->table('vehiculos v')
            ->select("
                v.id,
                v.placa,
                COALESCE(tv.nombre, '') AS tipo,
                COALESCE(v.marca, '') AS marca,
                COALESCE(v.modelo, '') AS modelo,
                COALESCE(v.color, '') AS color,
                COALESCE(v.anio_fabricacion, '') AS anio,
                COALESCE(v.numero_serie, '') AS numeroSerie,
                COALESCE(v.serie_motor, '') AS serieMotor,
                COALESCE(v.partida_registral, '') AS partidaRegistral,
                COALESCE(v.codigo_qr, '') AS codigoQr,
                COALESCE(o.razon_social, 'Independiente') AS organizacion,
                COALESCE(p.nombres, '') AS propietarioNombres,
                COALESCE(p.apellido_paterno, '') AS propietarioPaterno,
                COALESCE(p.apellido_materno, '') AS propietarioMaterno,
                COALESCE(p.numero_documento, '') AS propietarioDni,
                v.estado_formalizacion AS estado
            ", false)
            ->join('tipos_vehiculo tv', 'tv.id = v.tipo_vehiculo_id', 'left')
            ->join('organizaciones o', 'o.id = v.asociacion_id', 'left')
            ->join('vehiculo_propietarios vp', 'vp.vehiculo_id = v.id AND vp.fecha_fin IS NULL', 'left')
            ->join('personas p', 'p.id = vp.persona_id', 'left')
            ->orderBy('v.id', 'DESC')
            ->get()
            ->getResultArray();

        $data = array_map(static function (array $row): array {
            $propietario = trim(($row['propietarioNombres'] ?? '') . ' ' . ($row['propietarioPaterno'] ?? '') . ' ' . ($row['propietarioMaterno'] ?? ''));
            unset($row['propietarioNombres'], $row['propietarioPaterno'], $row['propietarioMaterno']);

            return $row + [
                'propietario' => $propietario,
                'soatEstado' => '',
                'tucNumero' => '',
            ];
        }, $rows);

        return $this->respond(['data' => $data]);
    }
}
