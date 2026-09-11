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
                COALESCE(o.razon_social, 'Independiente') AS asociacion,
                COALESCE(c.nombres, '') AS propietarioNombres,
                COALESCE(c.apellido_paterno, '') AS propietarioPaterno,
                COALESCE(c.apellido_materno, '') AS propietarioMaterno
            ", false)
            ->join('vehiculos v', 'v.id = d.id_vehiculo', 'left')
            ->join('organizaciones o', 'o.id = v.id_asociacion', 'left')
            ->join('vehiculo_propietarios vp', 'vp.id_vehiculo = v.id AND vp.fecha_fin IS NULL', 'left')
            ->join('personas p', 'p.id = vp.id_persona', 'left')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->orderBy('d.id', 'DESC')
            ->get()
            ->getResultArray();

        $data = array_map(static function (array $row): array {
            $row['propietario'] = trim(($row['propietarioNombres'] ?? '') . ' ' . ($row['propietarioPaterno'] ?? '') . ' ' . ($row['propietarioMaterno'] ?? '')) ?: 'Propietario Registrado';
            unset($row['propietarioNombres'], $row['propietarioPaterno'], $row['propietarioMaterno']);
            return $row;
        }, $rows);

        return $this->respond(['data' => $data]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getPost();

        if (empty($input['codigo'])) {
            return $this->failValidationErrors('El número o código del documento es obligatorio.');
        }

        $placa = strtoupper(trim($input['vehiculoPlaca'] ?? ''));
        $vehiculoId = null;

        if ($placa !== '') {
            $vehiculoRow = $db->table('vehiculos')->where('placa', $placa)->get()->getRowArray();
            if ($vehiculoRow) {
                $vehiculoId = (int)$vehiculoRow['id'];
            } else {
                
                $tipoRow = $db->table('tipos_vehiculo')->limit(1)->get()->getRowArray();
                $tipoId = $tipoRow ? (int)$tipoRow['id'] : null;
                $db->table('vehiculos')->insert([
                    'placa'                => $placa,
                    'id_tipo_vehiculo'     => $tipoId,
                    'estado_formalizacion' => 'FORMALIZADO',
                ]);
                $vehiculoId = (int)$db->insertID();
            }
        }

        if (!$vehiculoId) {
            $firstVehiculo = $db->table('vehiculos')->limit(1)->get()->getRowArray();
            if ($firstVehiculo) {
                $vehiculoId = (int)$firstVehiculo['id'];
                $placa = $firstVehiculo['placa'];
            } else {
                $tipoRow = $db->table('tipos_vehiculo')->limit(1)->get()->getRowArray();
                $tipoId = $tipoRow ? (int)$tipoRow['id'] : null;
                $placa = 'M1-' . random_int(1000, 9999);
                $db->table('vehiculos')->insert([
                    'placa'                => $placa,
                    'id_tipo_vehiculo'     => $tipoId,
                    'estado_formalizacion' => 'FORMALIZADO',
                ]);
                $vehiculoId = (int)$db->insertID();
            }
        }

        $record = [
            'id_vehiculo'      => $vehiculoId,
            'tipo_documento'   => $input['tipoDocumento'] ?? 'TARJETA_OPERATIVIDAD',
            'codigo'           => trim($input['codigo']),
            'fecha_expedicion' => !empty($input['fechaExpedicion']) ? $input['fechaExpedicion'] : date('Y-m-d'),
            'fecha_expiracion' => !empty($input['fechaExpiracion']) ? $input['fechaExpiracion'] : date('Y-m-d', strtotime('+1 year')),
            'estado'           => strtoupper($input['estado'] ?? 'VIGENTE'),
        ];

        $db->table('documentos_vehiculo')->insert($record);
        $insertId = (int)$db->insertID();

        $newDoc = [
            'id'              => $insertId,
            'vehiculoPlaca'   => $placa,
            'tipoDocumento'   => $record['tipo_documento'],
            'codigo'          => $record['codigo'],
            'fechaExpedicion' => $record['fecha_expedicion'],
            'fechaExpiracion' => $record['fecha_expiracion'],
            'estado'          => $record['estado'],
            'propietario'     => $input['propietario'] ?? 'Propietario Registrado',
            'asociacion'      => $input['asociacion'] ?? 'Independiente',
        ];

        return $this->respondCreated(['status' => true, 'message' => 'Documento emitido con éxito', 'data' => $newDoc]);
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getRawInput();

        if (!$id) {
            return $this->failNotFound('ID de documento no especificado.');
        }

        $record = [];
        if (isset($input['tipoDocumento'])) $record['tipo_documento'] = $input['tipoDocumento'];
        if (isset($input['codigo'])) $record['codigo'] = trim($input['codigo']);
        if (isset($input['fechaExpedicion'])) $record['fecha_expedicion'] = $input['fechaExpedicion'];
        if (isset($input['fechaExpiracion'])) $record['fecha_expiracion'] = $input['fechaExpiracion'];
        if (isset($input['estado'])) $record['estado'] = strtoupper($input['estado']);

        if (!empty($record)) {
            $db->table('documentos_vehiculo')->where('id', $id)->update($record);
        }

        return $this->respond(['status' => true, 'message' => 'Documento actualizado con éxito']);
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();

        if (!$id) {
            return $this->failNotFound('ID de documento no especificado.');
        }

        $db->table('documentos_vehiculo')->where('id', $id)->delete();

        return $this->respondDeleted(['status' => true, 'message' => 'Documento anulado con éxito']);
    }
}
