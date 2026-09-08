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
                    v.id as vehiculoId,
                    COALESCE(v.placa, 'SIN PLACA') as vehiculoPlaca,
                    COALESCE(v.marca, '') as vehiculoMarca,
                    COALESCE(v.modelo, '') as vehiculoModelo,
                    COALESCE(v.color, '') as vehiculoColor,
                    v.anio_fabricacion as vehiculoAnio,
                    COALESCE(v.estado_formalizacion, 'INFORMAL') as vehiculoEstadoFormalizacion,
                    v.asociacion_id as vehiculoAsociacionId,
                    aso.razon_social as vehiculoAsociacion,
                    
                    COALESCE(per.numero_documento, 'S/D') as conductorDni,
                    COALESCE(NULLIF(TRIM(CONCAT(per.nombres, ' ', per.apellido_paterno, ' ', COALESCE(per.apellido_materno, ''))), ''), p.nombre_autoridad, 'Conductor No Identificado') as conductorNombre,
                    COALESCE(NULLIF(p.nombre_autoridad, ''), CONCAT(per.nombres, ' ', per.apellido_paterno), 'Conductor No Identificado') as infractor,
                    
                    COALESCE(prop_per.numero_documento, prop_org.ruc, 'S/D') as propietarioDni,
                    COALESCE(
                        NULLIF(TRIM(CONCAT(prop_per.nombres, ' ', prop_per.apellido_paterno, ' ', COALESCE(prop_per.apellido_materno, ''))), ''),
                        prop_org.razon_social,
                        'No Registrado'
                    ) as propietarioNombre,
                    
                    COALESCE(CONCAT(ins_per.nombres, ' ', ins_per.apellido_paterno, ' ', COALESCE(ins_per.apellido_materno, '')), 'Inspector Municipal') as inspector,
                    ins_per.numero_documento as inspectorCIP,
                    p.fecha_hora as fechaHora,
                    p.lugar,
                    p.observacion_autoridad as observacionesAutoridad,
                    p.observaciones_conductor as observacionesConductor,
                    p.firma_conductor_img as firmaConductorImg,
                    p.firma_conductor_fecha as firmaConductorFecha,
                    p.firma_conductor_estado as firmaConductorEstado,
                    p.firma_conductor_observacion as firmaConductorObservacion,
                    p.monto_total as montoTotal,
                    p.estado,
                    
                    ret.id as retencionId,
                    ret.estado as retencionEstado
                ")
                ->join('vehiculos v', 'v.id = p.vehiculo_id', 'left')
                ->join('organizaciones aso', 'aso.id = v.asociacion_id', 'left')
                ->join('personas per', 'per.id = p.persona_infractor_id', 'left')
                ->join('personal ins', 'ins.id = p.inspector_id', 'left')
                ->join('personas ins_per', 'ins_per.id = ins.persona_id', 'left')
                ->join('vehiculo_propietarios vp', 'vp.vehiculo_id = v.id AND vp.estado = "ACTIVO"', 'left')
                ->join('personas prop_per', 'prop_per.id = vp.persona_id', 'left')
                ->join('organizaciones prop_org', 'prop_org.id = vp.organizacion_id', 'left')
                ->join('internamientos ret', 'ret.papeleta_id = p.id', 'left')
                ->groupBy('p.id')
                ->orderBy('p.id', 'DESC')
                ->get()
                ->getResultArray();

            $data = [];
            foreach ($rows as $row) {
                $row['id'] = (int)$row['id'];
                $row['montoTotal'] = (float)$row['montoTotal'];
                
                $isFormal = !empty($row['vehiculoAsociacionId']);
                $row['tipoInfractor'] = $isFormal ? 'FORMAL' : 'INFORMAL';
                
                $isRetenido = (!empty($row['retencionId']) && $row['retencionEstado'] !== 'LIBERADO');
                $row['vehiculoRetenido'] = $isRetenido ? 'SI' : 'NO';
                
                $descPartes = array_filter([$row['vehiculoMarca'] ?? '', $row['vehiculoModelo'] ?? '']);
                $caract = trim(implode(' ', $descPartes));
                if (!empty($row['vehiculoColor'])) {
                    $caract .= ($caract ? ' · ' : '') . $row['vehiculoColor'];
                }
                $row['vehiculoCaracteristicas'] = $caract ?: 'Características no especificadas';
                
                $detalles = $db->table('papeleta_detalles pd')
                    ->select('pd.tipo_infraccion_id as tipoInfraccionId, ti.codigo, ti.descripcion, ti.gravedad, pd.monto, pd.descuento, pd.monto_final as montoFinal')
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

                $row['tipoInfraccionCodigo'] = $row['detalles'][0]['codigo'] ?? 'G01';
                $row['tipoInfraccionDescripcion'] = $row['detalles'][0]['descripcion'] ?? 'Infracción al Reglamento';
                $row['tipoInfraccionGravedad'] = $row['detalles'][0]['gravedad'] ?? 'LEVE';

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

            
            $inspector = $db->table('personal pe')
                ->select("pe.id, per.nombres, per.apellido_paterno, per.apellido_materno", false)
                ->join('personas per', 'per.id = pe.persona_id', 'inner')
                ->where('pe.estado', 'ACTIVO')
                ->limit(1)
                ->get()
                ->getRowArray();
            $inspectorId = $inspector ? (int)$inspector['id'] : 1;
            $inspectorNombre = $inspector ? trim($inspector['nombres'] . ' ' . $inspector['apellido_paterno'] . ' ' . ($inspector['apellido_materno'] ?? '')) : 'Inspector Municipal';

            
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
                'firma_conductor_estado' => 'PENDIENTE',
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

    public function pagar($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $papeleta = $db->table('papeletas')->where('id', $id)->get()->getRowArray();
            if (!$papeleta) {
                return $this->failNotFound('Papeleta no encontrada');
            }

            if ($papeleta['estado'] === 'ANULADA') {
                return $this->fail('No se puede pagar una papeleta que ha sido anulada', 400);
            }

            if ($papeleta['estado'] === 'PAGADA') {
                return $this->fail('Esta papeleta ya se encuentra pagada', 400);
            }

            $db->table('papeletas')->where('id', $id)->update(['estado' => 'PAGADA']);

            $numRecibo = 'REC-' . date('Y') . '-' . str_pad((string)random_int(1000, 9999), 5, '0', STR_PAD_LEFT);
            $db->table('pagos')->insert([
                'tipo_pago' => 'PAPELETA',
                'papeleta_id' => $id,
                'numero_recibo' => $numRecibo,
                'medio_pago' => trim($input['metodoPago'] ?? 'EFECTIVO'),
                'referencia_pago' => trim($input['referenciaPago'] ?? '') ?: null,
                'fecha_pago' => date('Y-m-d'),
                'hora_pago' => date('H:i:s'),
                'cajero' => 'Caja Central Municipal',
                'caja' => 'Caja 01',
                'codigo_contribuyente' => (string)($papeleta['persona_infractor_id'] ?: 'CONTRIB-01'),
                'concepto' => 'Pago de Papeleta N° ' . $papeleta['numero_papeleta'],
                'subtotal' => $papeleta['monto_total'],
                'reajuste' => 0.00,
                'intereses' => 0.00,
                'descuento_aplicado' => 0.00,
                'redondeo' => 0.00,
                'total' => $papeleta['monto_total'],
                'estado' => 'REGISTRADO',
            ]);

            return $this->respond([
                'status' => 200,
                'message' => 'Papeleta pagada exitosamente',
                'numeroRecibo' => $numRecibo
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Error al procesar el pago: ' . $e->getMessage());
        }
    }

    public function firma($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?? $this->request->getPost();

        try {
            $papeleta = $db->table('papeletas')->where('id', $id)->get()->getRowArray();
            if (!$papeleta) {
                return $this->failNotFound('Papeleta no encontrada');
            }

            $estado = strtoupper(trim($input['estado'] ?? $input['firmaConductorEstado'] ?? 'FIRMADO'));
            if (!in_array($estado, ['PENDIENTE', 'FIRMADO', 'SE_NEGO_A_FIRMAR', 'NO_PRESENTE'], true)) {
                return $this->failValidationErrors('Estado de firma no válido.');
            }

            $firmaBase64 = trim($input['firmaBase64'] ?? $input['firmaConductorBase64'] ?? '');

            if ($estado === 'FIRMADO' && $firmaBase64 === '') {
                return $this->failValidationErrors('La firma capturada en el aplicativo es requerida cuando el estado es FIRMADO.');
            }

            $firmaUrl = '';
            if ($firmaBase64 !== '') {
                if (str_contains($firmaBase64, ',')) {
                    [, $firmaBase64] = explode(',', $firmaBase64, 2);
                }

                $binary = base64_decode($firmaBase64, true);
                if ($binary === false || strlen($binary) < 50) {
                    return $this->failValidationErrors('La imagen de firma no es válida.');
                }

                $uploadDir = WRITEPATH . 'uploads/firmas-papeletas';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0775, true);
                }

                $fileName = 'papeleta-' . (int)$id . '-firma-' . date('YmdHis') . '.png';
                $filePath = $uploadDir . DIRECTORY_SEPARATOR . $fileName;
                file_put_contents($filePath, $binary);
                $firmaUrl = 'uploads/firmas-papeletas/' . $fileName;
            }

            $update = [
                'firma_conductor_img' => $firmaUrl !== '' ? $firmaUrl : null,
                'firma_conductor_fecha' => $estado === 'FIRMADO' ? date('Y-m-d H:i:s') : null,
                'firma_conductor_estado' => $estado,
                'firma_conductor_observacion' => trim($input['observacion'] ?? $input['firmaConductorObservacion'] ?? '') ?: null,
            ];

            $db->table('papeletas')->where('id', $id)->update($update);

            return $this->respond([
                'status' => 200,
                'message' => 'Firma de conductor registrada correctamente',
                'data' => [
                    'firmaConductorImg' => $update['firma_conductor_img'],
                    'firmaConductorFecha' => $update['firma_conductor_fecha'],
                    'firmaConductorEstado' => $update['firma_conductor_estado'],
                    'firmaConductorObservacion' => $update['firma_conductor_observacion'],
                ],
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Error registrando firma: ' . $e->getMessage());
        }
    }

}
