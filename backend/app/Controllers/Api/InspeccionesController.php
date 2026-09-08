<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class InspeccionesController extends ResourceController
{
    protected $format = 'json';

    public function criterios()
    {
        $db = \Config\Database::connect();
        try {
            $rows = $db->table('inspeccion_criterios')
                ->select('id, codigo, nombre, descripcion, obligatorio, orden, estado')
                ->where('estado', 'ACTIVO')
                ->orderBy('orden', 'ASC')
                ->get()
                ->getResultArray();

            $data = array_map(static function (array $r) {
                $r['id'] = (int)$r['id'];
                $r['obligatorio'] = (bool)$r['obligatorio'];
                $r['orden'] = (int)$r['orden'];
                return $r;
            }, $rows);

            return $this->respond(['data' => $data]);
        } catch (\Exception $e) {
            return $this->failServerError('Error consultando criterios de inspección: ' . $e->getMessage());
        }
    }

    public function index()
    {
        $db = \Config\Database::connect();
        
        try {
            $rows = $db->table('certicav i')
                ->select("
                    i.id,
                    i.numero_serie_certicav as numeroInspeccion,
                    v.placa as vehiculoPlaca,
                    COALESCE(CONCAT(p.nombres, ' ', p.apellidos), 'Inspector Técnico Municipal') as inspector,
                    i.fecha,
                    i.resultado,
                    i.observaciones,
                    i.estado
                ")
                ->join('vehiculos v', 'v.id = i.vehiculo_id', 'left')
                ->join('personal p', 'p.id = i.tecnico_id', 'left')
                ->orderBy('i.id', 'DESC')
                ->get()
                ->getResultArray();

            $data = [];
            foreach ($rows as $row) {
                $row['id'] = (int)$row['id'];
                
                
                $detalles = $db->table('certicav_detalles id')
                    ->select('id.criterio_id as criterioId, id.estado_revision as estado, id.observacion as obs')
                    ->where('id.certicav_id', $row['id'])
                    ->get()
                    ->getResultArray();

                $row['detalles'] = array_map(static function (array $d) {
                    $d['criterioId'] = (int)$d['criterioId'];
                    return $d;
                }, $detalles);

                $data[] = $row;
            }

            return $this->respond(['data' => $data]);
        } catch (\Exception $e) {
            return $this->failServerError('Error consultando inspecciones: ' . $e->getMessage());
        }
    }

    public function create()
    {
        $db = \Config\Database::connect();
        try {
            $input = $this->request->getJSON(true);
        } catch (\Throwable $e) {
            $input = null;
        }
        if (!is_array($input)) {
            $input = json_decode($this->request->getBody() ?: '', true) ?? $this->request->getPost();
        }

        $placa = strtoupper(trim($input['vehiculoPlaca'] ?? ''));
        $resultado = trim($input['resultado'] ?? 'APROBADO');
        $observaciones = trim($input['observaciones'] ?? '');
        $detalles = $input['detalles'] ?? [];

        try {
            
            $vehiculo = $db->table('vehiculos')->where('placa', $placa)->limit(1)->get()->getRowArray();
            if (!$vehiculo) {
                $firstVeh = $db->table('vehiculos')->limit(1)->get()->getRowArray();
                if ($firstVeh) {
                    $vehiculoId = (int)$firstVeh['id'];
                    $placa = $firstVeh['placa'];
                } else {
                    $db->table('vehiculos')->insert([
                        'placa' => $placa ?: 'NC-' . rand(1000, 9999),
                        'tipo_vehiculo_id' => 1,
                        'estado_formalizacion' => 'INFORMAL'
                    ]);
                    $vehiculoId = $db->insertID();
                }
            } else {
                $vehiculoId = (int)$vehiculo['id'];
            }

            
            $tecnico = $db->table('personal')->where('estado', 'ACTIVO')->limit(1)->get()->getRowArray();
            $tecnicoId = $tecnico ? (int)$tecnico['id'] : 1;
            $tecnicoNombre = $tecnico ? ($tecnico['nombres'] . ' ' . $tecnico['apellidos']) : 'Inspector Técnico Municipal';

            $numeroInspeccion = 'CERT-' . date('Y') . '-' . str_pad((string)random_int(1, 999), 3, '0', STR_PAD_LEFT);
            $fecha = date('Y-m-d H:i:s');

            
            $inspData = [
                'numero_serie_certicav' => $numeroInspeccion,
                'vehiculo_id' => $vehiculoId,
                'tecnico_id' => $tecnicoId,
                'fecha' => date('Y-m-d'),
                'resultado' => $resultado,
                'observaciones' => $observaciones,
                'estado' => 'ACTIVO',
            ];
            $db->table('certicav')->insert($inspData);
            $inspeccionId = $db->insertID();

            
            $savedDetalles = [];
            if (is_array($detalles) && !empty($detalles)) {
                foreach ($detalles as $det) {
                    $criterioId = (int)($det['criterioId'] ?? 0);
                    if ($criterioId <= 0) continue;
                    $estadoRev = trim($det['estado'] ?? 'BIEN');
                    $obs = trim($det['obs'] ?? '');
                    $db->table('certicav_detalles')->insert([
                        'certicav_id' => $inspeccionId,
                        'criterio_id' => $criterioId,
                        'estado_revision' => $estadoRev,
                        'observacion' => $obs
                    ]);
                    $savedDetalles[] = [
                        'criterioId' => $criterioId,
                        'estado' => $estadoRev,
                        'obs' => $obs
                    ];
                }
            }

            $response = [
                'id' => $inspeccionId,
                'numeroInspeccion' => $numeroInspeccion,
                'vehiculoPlaca' => $placa,
                'inspector' => $tecnicoNombre,
                'fecha' => $fecha,
                'resultado' => $resultado,
                'observaciones' => $observaciones,
                'estado' => 'ACTIVO',
                'detalles' => $savedDetalles,
            ];

            return $this->respondCreated(['status' => 201, 'data' => $response]);
        } catch (\Exception $e) {
            return $this->failServerError('Error creando la inspección: ' . $e->getMessage());
        }
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $input = $this->request->getJSON(true);
        } catch (\Throwable $e) {
            $input = null;
        }
        if (!is_array($input)) {
            $input = json_decode($this->request->getBody() ?: '', true) ?? $this->request->getPost();
        }

        try {
            $data = [];
            if (isset($input['resultado'])) {
                $data['resultado'] = trim($input['resultado']);
            }
            if (isset($input['observaciones'])) {
                $data['observaciones'] = trim($input['observaciones']);
            }

            if (!empty($data)) {
                $db->table('certicav')->where('id', $id)->update($data);
            }

            if (isset($input['detalles']) && is_array($input['detalles'])) {
                $db->table('certicav_detalles')->where('certicav_id', $id)->delete();
                foreach ($input['detalles'] as $det) {
                    $criterioId = (int)($det['criterioId'] ?? 0);
                    if ($criterioId <= 0) continue;
                    $db->table('certicav_detalles')->insert([
                        'certicav_id' => $id,
                        'criterio_id' => $criterioId,
                        'estado_revision' => trim($det['estado'] ?? 'BIEN'),
                        'observacion' => trim($det['obs'] ?? '')
                    ]);
                }
            }

            return $this->respond(['status' => 200, 'message' => 'Inspección actualizada correctamente']);
        } catch (\Exception $e) {
            return $this->failServerError('Error actualizando la inspección: ' . $e->getMessage());
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $db->table('certicav')->where('id', $id)->update(['estado' => 'ANULADO']);
            return $this->respondDeleted(['status' => 200, 'message' => 'Inspección anulada correctamente']);
        } catch (\Exception $e) {
            return $this->failServerError('Error anulando la inspección: ' . $e->getMessage());
        }
    }
}
