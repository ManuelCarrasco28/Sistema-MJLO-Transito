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
                    i.numero_registro as numeroInspeccion,
                    v.placa as vehiculoPlaca,
                    COALESCE(CONCAT(c.nombres, ' ', c.apellido_paterno), 'Inspector Técnico Municipal') as inspector,
                    i.fecha as fecha,
                    i.resultado,
                    i.observaciones,
                    i.estado
                ")
                ->join('vehiculos v', 'v.id = i.id_vehiculo', 'left')
                ->join('ciudadanos c', 'c.id_persona = i.id_tecnico', 'left')
                ->orderBy('i.id', 'DESC')
                ->get()
                ->getResultArray();

            $data = [];
            foreach ($rows as $row) {
                $row['id'] = (int)$row['id'];
                
                $detalles = $db->table('certicav_detalles id')
                    ->select('id.id_criterio as criterioId, id.estado_revision as estado, id.observacion as obs')
                    ->where('id.id_certicav', $row['id'])
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
                    $tipoRow = $db->table('tipos_vehiculo')->limit(1)->get()->getRowArray();
                    $tipoId = $tipoRow ? (int)$tipoRow['id'] : null;
                    $db->table('vehiculos')->insert([
                        'placa'                => $placa ?: ('NC-' . random_int(1000, 9999)),
                        'id_tipo_vehiculo'     => $tipoId,
                        'estado_formalizacion' => 'FORMALIZADO'
                    ]);
                    $vehiculoId = (int)$db->insertID();
                }
            } else {
                $vehiculoId = (int)$vehiculo['id'];
            }

            $tecnico = $db->table('trabajadores')->where('estado', 'ACTIVO')->limit(1)->get()->getRowArray();
            $tecnicoId = $tecnico ? (int)$tecnico['id_persona'] : null;

            $numeroInspeccion = 'INSP-' . date('Y') . '-' . str_pad((string)random_int(1, 999), 3, '0', STR_PAD_LEFT);
            $fecha = date('Y-m-d');

            $db->transStart();

            $inspData = [
                'numero_registro' => $numeroInspeccion,
                'id_vehiculo'     => $vehiculoId,
                'id_tecnico'      => $tecnicoId,
                'fecha'           => $fecha,
                'resultado'       => $resultado,
                'observaciones'   => $observaciones,
                'estado'          => 'ACTIVO',
            ];
            $db->table('certicav')->insert($inspData);
            $inspeccionId = (int)$db->insertID();

            $savedDetalles = [];
            if (is_array($detalles) && !empty($detalles)) {
                foreach ($detalles as $det) {
                    $criterioId = (int)($det['criterioId'] ?? 0);
                    if ($criterioId <= 0) continue;

                    // Ensure criterio exists in inspeccion_criterios for FK constraint
                    $criterioExists = $db->table('inspeccion_criterios')->where('id', $criterioId)->countAllResults();
                    if (!$criterioExists) {
                        $db->table('inspeccion_criterios')->insert([
                            'codigo'      => 'CRIT-' . str_pad((string)$criterioId, 2, '0', STR_PAD_LEFT),
                            'nombre'      => 'Criterio ' . $criterioId,
                            'descripcion' => 'Evaluación de seguridad e inspección técnica',
                            'obligatorio' => 1,
                            'orden'       => $criterioId,
                            'estado'      => 'ACTIVO'
                        ]);
                        $criterioId = (int)$db->insertID();
                    }

                    $estadoRev = trim($det['estado'] ?? 'BIEN');
                    $obs = trim($det['obs'] ?? '');
                    $db->table('certicav_detalles')->insert([
                        'id_certicav'     => $inspeccionId,
                        'id_criterio'     => $criterioId,
                        'estado_revision' => $estadoRev,
                        'observacion'     => $obs
                    ]);
                    $savedDetalles[] = [
                        'criterioId' => $criterioId,
                        'estado'     => $estadoRev,
                        'obs'        => $obs
                    ];
                }
            }
            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->failServerError('Error guardando inspección técnica.');
            }

            return $this->respondCreated([
                'status' => true,
                'message' => 'Inspección registrada con éxito',
                'data' => [
                    'id' => $inspeccionId,
                    'numeroInspeccion' => $numeroInspeccion,
                    'vehiculoPlaca' => $placa,
                    'resultado' => $resultado,
                    'estado' => 'ACTIVO',
                    'detalles' => $savedDetalles
                ]
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Error al crear inspección técnica: ' . $e->getMessage());
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        
        if (!$id) {
            return $this->failNotFound('ID de inspección no especificado.');
        }

        try {
            $insp = $db->table('certicav')->where('id', $id)->get()->getRowArray();
            if (!$insp) {
                return $this->failNotFound('Inspección no encontrada.');
            }

            $db->table('certicav')->where('id', $id)->update(['estado' => 'ANULADA']);

            return $this->respondDeleted([
                'status' => true,
                'message' => 'Inspección técnica anulada con éxito'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Error anulando inspección técnica: ' . $e->getMessage());
        }
    }
}
