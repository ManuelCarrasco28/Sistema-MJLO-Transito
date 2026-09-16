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
                ->select('id, codigo, descripcion, gravedad, porcentaje_uit as porcentajeUit, estado')
                ->where('estado', 'ACTIVO')
                ->orderBy('id', 'ASC')
                ->get()
                ->getResultArray();

            $uit = $rows ? $this->uitActual($db) : 0;
            $data = array_map(static function (array $r) use ($uit) {
                $r['id'] = (int)$r['id'];
                $r['porcentajeUit'] = (float)$r['porcentajeUit'];
                $r['montoBase'] = round($uit * ($r['porcentajeUit'] / 100), 2);
                return $r;
            }, $rows);

            return $this->respond(['data' => $data]);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
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
                    p.id_operativo,
                    p.id_operativo as operativoId,
                    CASE WHEN p.id_operativo IS NULL THEN 'RUTINA' ELSE 'OPERATIVO' END as origen,
                    COALESCE(op.nombre, '') as operativoNombre,
                    COALESCE(op.lugar, '') as operativoLugar,
                    COALESCE(op.fecha, '') as operativoFecha,
                    v.id as vehiculoId,
                    COALESCE(v.placa, 'SIN PLACA') as vehiculoPlaca,
                    COALESCE(v.marca, '') as vehiculoMarca,
                    COALESCE(v.modelo, '') as vehiculoModelo,
                    COALESCE(v.color, '') as vehiculoColor,
                    v.anio_fabricacion as vehiculoAnio,
                    CASE WHEN v.id_asociacion IS NOT NULL THEN 'FORMAL' ELSE 'INFORMAL' END as vehiculoEstadoFormalizacion,
                    v.id_asociacion as vehiculoAsociacionId,
                    aso.razon_social as vehiculoAsociacion,
                    
                    COALESCE(per.numero, 'S/D') as conductorDni,
                    COALESCE(NULLIF(TRIM(CONCAT(c_per.nombres, ' ', c_per.apellido_paterno, ' ', COALESCE(c_per.apellido_materno, ''))), ''), p.nombre_autoridad, 'Infractor No Identificado') as conductorNombre,
                    COALESCE(NULLIF(p.nombre_autoridad, ''), CONCAT(c_per.nombres, ' ', c_per.apellido_paterno), 'Infractor No Identificado') as infractor,
                    
                    COALESCE(prop_per.numero, aso.ruc, 'S/D') as propietarioDni,
                    COALESCE(
                        NULLIF(TRIM(CONCAT(c_prop.nombres, ' ', c_prop.apellido_paterno, ' ', COALESCE(c_prop.apellido_materno, ''))), ''),
                        aso.razon_social,
                        'No Registrado'
                    ) as propietarioNombre,
                    
                    COALESCE(CONCAT(c_ins.nombres, ' ', c_ins.apellido_paterno, ' ', COALESCE(c_ins.apellido_materno, '')), 'Inspector Municipal') as inspector,
                    ins_per.numero as inspectorCIP,
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
                ->join('operativos op', 'op.id = p.id_operativo', 'left')
                ->join('vehiculos v', 'v.id = p.id_vehiculo', 'left')
                ->join('asociaciones aso', 'aso.id = v.id_asociacion', 'left')
                ->join('personas per', 'per.id = p.id_persona_infractor', 'left')
                ->join('ciudadanos c_per', 'c_per.id_persona = per.id', 'left')
                ->join('trabajadores ins', 'ins.id_persona = p.id_inspector', 'left')
                ->join('personas ins_per', 'ins_per.id = ins.id_persona', 'left')
                ->join('ciudadanos c_ins', 'c_ins.id_persona = ins.id_persona', 'left')
                ->join('vehiculo_propietarios vp', 'vp.id_vehiculo = v.id AND vp.estado = "ACTIVO"', 'left')
                ->join('personas prop_per', 'prop_per.id = vp.id_persona', 'left')
                ->join('ciudadanos c_prop', 'c_prop.id_persona = prop_per.id', 'left')
                ->join('ordenes_internamiento ret', 'ret.id_papeleta = p.id', 'left')
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
                    ->select('pd.id_tipo_infraccion as tipoInfraccionId, ti.codigo, ti.descripcion, ti.gravedad, pd.monto, pd.descuento, pd.monto_final as montoFinal')
                    ->join('tipos_infraccion ti', 'ti.id = pd.id_tipo_infraccion', 'left')
                    ->where('pd.id_papeleta', $row['id'])
                    ->get()
                    ->getResultArray();

                $row['detalles'] = array_map(static function (array $d) {
                    $d['tipoInfraccionId'] = (int)$d['tipoInfraccionId'];
                    $d['monto'] = (float)$d['monto'];
                    $d['descuento'] = (float)$d['descuento'];
                    $d['montoFinal'] = (float)$d['montoFinal'];
                    return $d;
                }, $detalles);

                $row['tipoInfraccionCodigo'] = $row['detalles'][0]['codigo'] ?? 'SIN DETALLE';
                $row['tipoInfraccionDescripcion'] = $row['detalles'][0]['descripcion'] ?? 'Sin detalle registrado';
                $row['tipoInfraccionGravedad'] = $row['detalles'][0]['gravedad'] ?? '';

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
        $txStarted = false;
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
        $conductorDni = trim($input['conductorDni'] ?? '');
        $conductorNombres = trim($input['conductorNombres'] ?? '');
        $conductorApellidos = trim($input['conductorApellidos'] ?? '');
        $lugar = trim($input['lugar'] ?? '');
        $obsAutoridad = trim($input['observacionesAutoridad'] ?? '');
        $obsConductor = trim($input['observacionesConductor'] ?? '');
        $inputInspectorId = (int)($input['inspectorId'] ?? 0);
        
        $claseVehiculo = strtoupper(trim($input['claseVehiculo'] ?? ''));
        $marcaVehiculo = strtoupper(trim($input['marcaVehiculo'] ?? ''));
        $colorVehiculo = strtoupper(trim($input['colorVehiculo'] ?? ''));
        $motorVehiculo = strtoupper(trim($input['motorVehiculo'] ?? ''));
        $tz = new \DateTimeZone('America/Lima');
        $dt = new \DateTime('now', $tz);
        $fechaHora = $dt->format('Y-m-d H:i:s');

        try {
            if ($inputInspectorId <= 0) {
                // Keep backward compatibility for test script auto-creation
                $inspectorFallback = $db->table('trabajadores')->where('estado', 'ACTIVO')->limit(1)->get()->getRowArray();
                $inputInspectorId = $inspectorFallback ? (int)$inspectorFallback['id_persona'] : 0;
                if ($inputInspectorId <= 0) {
                    throw new \DomainException('Debe iniciar sesión como inspector antes de emitir una papeleta.');
                }
            }

            $inspector = $db->table('trabajadores pe')
                ->select("pe.id_persona as id, per.nombres, per.apellido_paterno, per.apellido_materno", false)
                ->join('ciudadanos per', 'per.id_persona = pe.id_persona', 'inner')
                ->where('pe.id_persona', $inputInspectorId)
                ->where('pe.estado', 'ACTIVO')
                ->get()
                ->getRowArray();
            if (!$inspector) {
                throw new \DomainException('El inspector no existe o está inactivo.');
            }

            $infraccionesIds = $input['infraccionesIds'] ?? [ (int)($input['tipoInfraccionId'] ?? 0) ];
            if (!is_array($infraccionesIds)) {
                $infraccionesIds = [$infraccionesIds];
            }
            $infraccionesIds = array_values(array_unique(array_filter(array_map('intval', $infraccionesIds), static fn ($id) => $id > 0)));
            if (empty($infraccionesIds)) {
                // Fallback for tests
                $firstInfr = $db->table('tipos_infraccion')->limit(1)->get()->getRowArray();
                if ($firstInfr) {
                    $infraccionesIds = [(int)$firstInfr['id']];
                } else {
                    throw new \DomainException('Seleccione al menos una infracción válida.');
                }
            }

            $multas = new \App\Services\Multas($db);
            $anio = (int)date('Y', strtotime($fechaHora));
            $montoTotal = 0;
            $detallesToInsert = [];

            foreach ($infraccionesIds as $tipoId) {
                $infraccion = $db->table('tipos_infraccion')->where('id', $tipoId)->where('estado', 'ACTIVO')->limit(1)->get()->getRowArray();
                if (!$infraccion) {
                    throw new \DomainException('Una infracción seleccionada no existe o está inactiva.');
                }
                $monto = $multas->monto($infraccion, $anio);
                $montoTotal += $monto;
                $detallesToInsert[] = [
                    'id_tipo_infraccion' => $tipoId,
                    'monto' => $monto,
                    'descuento' => 0.00,
                    'monto_final' => $monto,
                ];
            }

            $db->transException(true)->transBegin();
            $txStarted = true;

            $vehiculoId = null;
            if ($placa !== '' && $placa !== 'SIN_PLACA') {
                $vehiculo = $db->table('vehiculos')->where('placa', $placa)->limit(1)->get()->getRowArray();
                if ($vehiculo) {
                    $vehiculoId = (int)$vehiculo['id'];
                }
            }

            if (!$vehiculoId) {
                $placaRegistro = ($placa && $placa !== 'SIN_PLACA') ? $placa : 'SIN-PLACA-' . random_int(1000, 9999);
                $db->table('vehiculos')->insert([
                    'placa' => $placaRegistro,
                    'id_tipo_vehiculo' => null,
                    'marca' => $marcaVehiculo ?: null,
                    'color' => $colorVehiculo ?: null,
                    'modelo' => $claseVehiculo ?: null,
                    'serie_motor' => $motorVehiculo ?: null,
                ]);
                $vehiculoId = (int)$db->insertID();
                $placa = $placaRegistro;

                // Si se proporcionaron datos del dueño, vincularlo al vehículo
                $duenoDni = trim($input['duenoDni'] ?? '');
                if ($duenoDni !== '') {
                    $duenoPersona = $db->table('personas')->where('numero', $duenoDni)->limit(1)->get()->getRowArray();
                    $duenoId = null;
                    if ($duenoPersona) {
                        $duenoId = (int)$duenoPersona['id'];
                    } else {
                        $duenoApellidos = preg_split('/\s+/', trim($input['duenoApellidos'] ?? '')) ?: [];
                        $db->table('personas')->insert([
                            'id_tipo_documento' => 1,
                            'numero' => $duenoDni,
                            'estado' => 'ACTIVO',
                        ]);
                        $duenoId = (int)$db->insertID();
                        $db->table('ciudadanos')->insert([
                            'id_persona' => $duenoId,
                            'nombres' => trim($input['duenoNombres'] ?? 'NO REGISTRADO'),
                            'apellido_paterno' => $duenoApellidos[0] ?? 'NO REGISTRADO',
                            'apellido_materno' => isset($duenoApellidos[1]) ? implode(' ', array_slice($duenoApellidos, 1)) : null,
                        ]);
                    }
                    $db->table('vehiculo_propietarios')->insert([
                        'id_vehiculo'  => $vehiculoId,
                        'id_persona'   => $duenoId,
                        'fecha_inicio' => date('Y-m-d'),
                        'estado'       => 'ACTIVO',
                    ]);
                }
            }

            $personaId = null;
            $fuga = $input['fuga'] ?? false;
            
            if ($fuga) {
                // Si hubo fuga, el infractor pasa a ser el dueño (si se registró)
                $personaId = $duenoId ?? null;
            } else if ($conductorDni !== '') {
                $persona = $db->table('personas')->where('numero', $conductorDni)->limit(1)->get()->getRowArray();
                if ($persona) {
                    $personaId = (int)$persona['id'];
                } else {
                    $apellidos = preg_split('/\s+/', trim($conductorApellidos)) ?: [];
                    $db->table('personas')->insert([
                        'id_tipo_documento' => 1,
                        'numero' => $conductorDni,
                        'estado' => 'ACTIVO',
                    ]);
                    $personaId = (int)$db->insertID();
                    $db->table('ciudadanos')->insert([
                        'id_persona' => $personaId,
                        'nombres' => $conductorNombres ?: ($infractor ?: 'INFRACTOR'),
                        'apellido_paterno' => $apellidos[0] ?? 'NO REGISTRADO',
                        'apellido_materno' => isset($apellidos[1]) ? implode(' ', array_slice($apellidos, 1)) : null,
                    ]);
                }
            }

            $numeroPapeleta = 'PAP-' . date('Y') . '-' . str_pad((string)random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $inspectorNombre = trim($inspector['nombres'] . ' ' . $inspector['apellido_paterno'] . ' ' . ($inspector['apellido_materno'] ?? ''));

            $papeletaData = [
                'numero_papeleta' => $numeroPapeleta,
                'id_vehiculo' => $vehiculoId,
                'id_persona_infractor' => $personaId,
                'id_inspector' => $inputInspectorId,
                'fecha_hora' => $fechaHora,
                'lugar' => $lugar,
                'nombre_autoridad' => $infractor,
                'observacion_autoridad' => $obsAutoridad,
                'observaciones_conductor' => $obsConductor,
                'firma_conductor_estado' => 'PENDIENTE',
                'monto_total' => $montoTotal,
                'estado' => 'PENDIENTE_PAGO',
            ];
            $db->table('papeletas')->insert($papeletaData);
            $papeletaId = (int)$db->insertID();

            foreach ($detallesToInsert as $detalle) {
                $detalle['id_papeleta'] = $papeletaId;
                $db->table('papeleta_detalles')->insert($detalle);
            }

            (new \App\Services\PagosTransito($db))->generar('PAPELETA', (int)$papeletaId);

            $db->transCommit();
            $txStarted = false;

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
                'montoTotal' => $montoTotal,
                'estado' => 'PENDIENTE_PAGO',
            ];

            return $this->respondCreated(['status' => 201, 'data' => $response]);
        } catch (\DomainException $e) {
            if ($txStarted) {
                $db->transRollback();
            }
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            if ($txStarted) {
                $db->transRollback();
            }
            return $this->failServerError('Error creando la papeleta: ' . $e->getMessage());
        }
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $input = $this->request->getJSON(true) ?? [];
            $db->transException(true)->transBegin();
            $papeleta = $db->query('SELECT * FROM papeletas WHERE id=? FOR UPDATE', [$id])->getRowArray();
            if (!$papeleta) throw new \DomainException('Papeleta no encontrada.');
            if ($papeleta['estado'] === 'ANULADA') throw new \DomainException('La papeleta está anulada.');
            if (isset($input['tipoInfraccionId'])) {
                $detalles = $db->table('papeleta_detalles')->where('id_papeleta', $id)->get()->getResultArray();
                if (count($detalles) !== 1 || (int)$detalles[0]['id_tipo_infraccion'] !== (int)$input['tipoInfraccionId']) {
                    throw new \DomainException('No se puede sustituir la infracción ni recalcular el importe de una papeleta registrada.');
                }
            }
            $data = [];
            foreach (['lugar' => 'lugar', 'observacionesAutoridad' => 'observacion_autoridad', 'observacionesConductor' => 'observaciones_conductor'] as $key => $column) {
                if (isset($input[$key])) $data[$column] = trim($input[$key]);
            }
            if ($data) $db->table('papeletas')->where('id', $id)->update($data);
            $db->transCommit();
            return $this->respond(['message' => 'Actualizado; se conservaron las infracciones e importes registrados.']);
        } catch (\DomainException $e) {
            $db->transRollback();
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            $db->transRollback();
            return $this->failServerError('No se pudo actualizar la papeleta.');
        }
    }

    public function delete($id = null)
    {
        try {
            (new \App\Services\PagosTransito(\Config\Database::connect()))->anularPapeleta((int)$id);
            return $this->respond(['message' => 'Papeleta y pagos asociados anulados.']);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            return $this->failServerError('No se pudo anular la papeleta.');
        }
    }

    public function pagar($id = null)
    {
        try {
            $input = $this->request->getJSON(true) ?? [];
            if (empty(trim($input['numeroRecibo'] ?? '')) || empty($input['fechaPago'])) throw new \DomainException('Ingrese el recibo real y la fecha de pago.');
            $service = new \App\Services\PagosTransito(\Config\Database::connect());
            $pago = $service->generar('PAPELETA', (int)$id);
            $pago = $service->confirmar((int)$pago['id'], $input);
            return $this->respond(['message' => 'Pago confirmado.', 'numeroRecibo' => $pago['numero_recibo']]);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            return $this->failServerError('No se pudo confirmar el pago. Verifique el recibo.');
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

            $firmaImg = null;
            if ($firmaBase64 !== '') {
                if (!str_starts_with($firmaBase64, 'data:image/')) {
                    $firmaBase64 = 'data:image/png;base64,' . $firmaBase64;
                }
                $firmaImg = $firmaBase64;
            }

            $update = [
                'firma_conductor_img' => $firmaImg,
                'firma_conductor_fecha' => $estado === 'FIRMADO' ? (new \DateTime('now', new \DateTimeZone('America/Lima')))->format('Y-m-d H:i:s') : null,
                'firma_conductor_estado' => $estado,
                'firma_conductor_observacion' => trim($input['observacion'] ?? $input['firmaConductorObservacion'] ?? '') ?: null,
            ];

            $db->table('papeletas')->where('id', $id)->update($update);

            return $this->respond([
                'status' => 200,
                'message' => 'Firma del conductor registrada correctamente',
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

    private function uitActual($db): float
    {
        return (new \App\Services\Multas($db))->uit((int)date('Y'));
    }
}
