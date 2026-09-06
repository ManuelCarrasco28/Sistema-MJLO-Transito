<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PapeletasController extends ResourceController
{
    protected $format = 'json';

    public function tipos()
    {
        $db = \Config\Database::connect();
        try {
            $rows = $db->table('tipos_infraccion')
                ->select('id, codigo, descripcion, gravedad, monto_base as montoBase, estado')
                ->where('estado', 'ACTIVO')
                ->orderBy('id', 'ASC')
                ->get()
                ->getResultArray();

            $data = array_map(static function (array $r) {
                $r['id'] = (int)$r['id'];
                $r['montoBase'] = (float)$r['montoBase'];
                return $r;
            }, $rows);

            return $this->respond(['data' => $data]);
        } catch (\Exception $e) {
            return $this->failServerError('Error al cargar tipos de infracción: ' . $e->getMessage());
        }
    }

    public function index()
    {
        $db = \Config\Database::connect();
        
        try {
            $rows = $db->table('papeletas p')
                ->select("
                    p.id,
                    p.numero_papeleta as numeroPapeleta,
                    v.placa as vehiculoPlaca,
                    COALESCE(NULLIF(p.nombre_autoridad, ''), CONCAT(per.nombres, ' ', per.apellido_paterno), 'Conductor No Identificado') as infractor,
                    COALESCE(CONCAT(ins.nombres, ' ', ins.apellidos), 'Inspector Municipal') as inspector,
                    p.fecha_hora as fechaHora,
                    p.lugar,
                    p.observacion_autoridad as observacionesAutoridad,
                    p.observaciones_conductor as observacionesConductor,
                    p.monto_total as montoTotal,
                    p.estado
                ")
                ->join('vehiculos v', 'v.id = p.vehiculo_id', 'left')
                ->join('personas per', 'per.id = p.persona_infractor_id', 'left')
                ->join('personal ins', 'ins.id = p.inspector_id', 'left')
                ->orderBy('p.id', 'DESC')
                ->get()
                ->getResultArray();

            $data = [];
            foreach ($rows as $row) {
                $row['id'] = (int)$row['id'];
                $row['montoTotal'] = (float)$row['montoTotal'];
                
                
                $detalles = $db->table('papeleta_detalles pd')
                    ->select('pd.tipo_infraccion_id as tipoInfraccionId, ti.codigo, pd.monto, pd.descuento, pd.monto_final as montoFinal')
                    ->join('tipos_infraccion ti', 'ti.id = pd.tipo_infraccion_id', 'left')
                    ->where('pd.papeleta_id', $row['id'])
                    ->get()
                    ->getResultArray();

                $row['detalles'] = array_map(static function (array $d) {
                    $d['tipoInfraccionId'] = (int)$d['tipoInfraccionId'];
                    $d['monto'] = (float)$d['monto'];
                    $d['descuento'] = (float)$d['descuento'];
                    $d['montoFinal'] = (float)$d['montoFinal'];
                    return $d;
                }, $detalles);

                $data[] = $row;
            }

            return $this->respond(['data' => $data]);
        } catch (\Exception $e) {
            return $this->failServerError('Error consultando papeletas: ' . $e->getMessage());
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
        $infractor = trim($input['infractor'] ?? '');
        $lugar = trim($input['lugar'] ?? '');
        $tipoInfraccionId = (int)($input['tipoInfraccionId'] ?? 1);
        $obsAutoridad = trim($input['observacionesAutoridad'] ?? '');
        $obsConductor = trim($input['observacionesConductor'] ?? '');

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
                        'estado' => 'ACTIVO'
                    ]);
                    $vehiculoId = $db->insertID();
                }
            } else {
                $vehiculoId = (int)$vehiculo['id'];
            }

            
            $inspector = $db->table('personal')->where('estado', 'ACTIVO')->limit(1)->get()->getRowArray();
            $inspectorId = $inspector ? (int)$inspector['id'] : 1;
            $inspectorNombre = $inspector ? ($inspector['nombres'] . ' ' . $inspector['apellidos']) : 'Inspector Municipal';

            
            $persona = $db->table('personas')->limit(1)->get()->getRowArray();
            $personaId = $persona ? (int)$persona['id'] : null;

            
            $infraccion = $db->table('tipos_infraccion')->where('id', $tipoInfraccionId)->limit(1)->get()->getRowArray();
            $monto = $infraccion ? (float)$infraccion['monto_base'] : 350.00;
            $codigoInfr = $infraccion ? $infraccion['codigo'] : 'G01';

            $numeroPapeleta = 'PAP-' . date('Y') . '-' . str_pad((string)random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $fechaHora = date('Y-m-d H:i:s');

            
            $papeletaData = [
                'numero_papeleta' => $numeroPapeleta,
                'vehiculo_id' => $vehiculoId,
                'persona_infractor_id' => $personaId,
                'inspector_id' => $inspectorId,
                'fecha_hora' => $fechaHora,
                'lugar' => $lugar,
                'servicio' => 'ESPECIAL',
                'nombre_autoridad' => $infractor,
                'observacion_autoridad' => $obsAutoridad,
                'observaciones_conductor' => $obsConductor,
                'monto_total' => $monto,
                'estado' => 'PENDIENTE_PAGO',
            ];
            $db->table('papeletas')->insert($papeletaData);
            $papeletaId = $db->insertID();

            
            $detalleData = [
                'papeleta_id' => $papeletaId,
                'tipo_infraccion_id' => $tipoInfraccionId,
                'monto' => $monto,
                'descuento' => 0.00,
                'monto_final' => $monto,
            ];
            $db->table('papeleta_detalles')->insert($detalleData);

            $response = [
                'id' => $papeletaId,
                'numeroPapeleta' => $numeroPapeleta,
                'vehiculoPlaca' => $placa,
                'infractor' => $infractor,
                'inspector' => $inspectorNombre,
                'fechaHora' => $fechaHora,
                'lugar' => $lugar,
                'observacionesAutoridad' => $obsAutoridad,
                'observacionesConductor' => $obsConductor,
                'montoTotal' => $monto,
                'estado' => 'PENDIENTE_PAGO',
                'detalles' => [
                    [
                        'tipoInfraccionId' => $tipoInfraccionId,
                        'codigo' => $codigoInfr,
                        'monto' => $monto,
                        'descuento' => 0.00,
                        'montoFinal' => $monto
                    ]
                ]
            ];

            return $this->respondCreated(['status' => 201, 'data' => $response]);
        } catch (\Exception $e) {
            return $this->failServerError('Error creando la papeleta: ' . $e->getMessage());
        }
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?? $this->request->getPost();

        try {
            $data = [];
            if (isset($input['infractor'])) {
                $data['nombre_autoridad'] = trim($input['infractor']);
            }
            if (isset($input['lugar'])) {
                $data['lugar'] = trim($input['lugar']);
            }
            if (isset($input['observacionesAutoridad'])) {
                $data['observacion_autoridad'] = trim($input['observacionesAutoridad']);
            }
            if (isset($input['observacionesConductor'])) {
                $data['observaciones_conductor'] = trim($input['observacionesConductor']);
            }
            if (isset($input['tipoInfraccionId'])) {
                $tipoInfraccionId = (int)$input['tipoInfraccionId'];
                $infraccion = $db->table('tipos_infraccion')->where('id', $tipoInfraccionId)->limit(1)->get()->getRowArray();
                if ($infraccion) {
                    $monto = (float)$infraccion['monto_base'];
                    $data['monto_total'] = $monto;
                    $db->table('papeleta_detalles')->where('papeleta_id', $id)->delete();
                    $db->table('papeleta_detalles')->insert([
                        'papeleta_id' => $id,
                        'tipo_infraccion_id' => $tipoInfraccionId,
                        'monto' => $monto,
                        'descuento' => 0.00,
                        'monto_final' => $monto,
                    ]);
                }
            }

            if (!empty($data)) {
                $db->table('papeletas')->where('id', $id)->update($data);
            }

            return $this->respond(['status' => 200, 'message' => 'Actualizado correctamente']);
        } catch (\Exception $e) {
            return $this->failServerError('Error actualizando la papeleta: ' . $e->getMessage());
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $db->table('papeletas')->where('id', $id)->update(['estado' => 'ANULADA']);
            return $this->respondDeleted(['status' => 200, 'message' => 'Papeleta anulada correctamente']);
        } catch (\Exception $e) {
            return $this->failServerError('Error anulando la papeleta: ' . $e->getMessage());
        }
    }
}
