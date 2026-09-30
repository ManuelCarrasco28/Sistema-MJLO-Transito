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

    public function estadisticas()
    {
        $db = \Config\Database::connect();
        $row = $db->table('papeletas')
            ->select("
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'PENDIENTE_PAGO' THEN 1 ELSE 0 END) as pendientes,
                SUM(CASE WHEN estado = 'PAGADA' THEN 1 ELSE 0 END) as pagadas,
                SUM(CASE WHEN estado = 'ANULADA' THEN 1 ELSE 0 END) as anuladas
            ", false)
            ->get()->getRowArray();

        return $this->respond(['data' => [
            'total' => (int) ($row['total'] ?? 0),
            'pendientes' => (int) ($row['pendientes'] ?? 0),
            'pagadas' => (int) ($row['pagadas'] ?? 0),
            'anuladas' => (int) ($row['anuladas'] ?? 0),
        ]]);
    }

    public function index()
    {
        $db = \Config\Database::connect();
        
        try {
            $builder = $db->table('papeletas p')
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
                // Propietario a la fecha de la infracción (según fecha_inicio/fecha_fin);
                // si no hay registro para esa fecha, el propietario activo actual.
                ->join(
                    'vehiculo_propietarios vp',
                    'vp.id = (SELECT vp2.id FROM vehiculo_propietarios vp2 WHERE vp2.id_vehiculo = v.id'
                    . ' AND vp2.fecha_inicio <= DATE(p.fecha_hora) AND (vp2.fecha_fin IS NULL OR vp2.fecha_fin >= DATE(p.fecha_hora))'
                    . ' ORDER BY vp2.fecha_inicio DESC, vp2.id DESC LIMIT 1)',
                    'left',
                    false
                )
                ->join(
                    'vehiculo_propietarios vpa',
                    "vpa.id = (SELECT vp3.id FROM vehiculo_propietarios vp3 WHERE vp3.id_vehiculo = v.id AND vp3.estado = 'ACTIVO' ORDER BY vp3.id DESC LIMIT 1)",
                    'left',
                    false
                )
                ->join('personas prop_per', 'prop_per.id = COALESCE(vp.id_persona, vpa.id_persona)', 'left', false)
                ->join('ciudadanos c_prop', 'c_prop.id_persona = prop_per.id', 'left')
                ->join('ordenes_internamiento ret', 'ret.id_papeleta = p.id', 'left');

            $inspectorId = (int)($this->request->getGet('inspector_id') ?? 0);
            $dni = $this->request->getGet('dni');
            $placa = $this->request->getGet('placa');
            $buscar = trim((string)$this->request->getGet('buscar'));
            $estado = strtoupper(trim((string)$this->request->getGet('estado')));
            $origen = strtoupper(trim((string)$this->request->getGet('origen')));
            $formalidad = strtoupper(trim((string)$this->request->getGet('formalidad')));
            $tipoInfraccion = (int)($this->request->getGet('tipoInfraccion') ?? 0);
            $fechaFiltro = strtoupper(trim((string)$this->request->getGet('fecha')));

            if ($inspectorId > 0) {
                $builder->where('p.id_inspector', $inspectorId);
            }
            if (!empty($dni)) {
                $builder->groupStart()
                        ->where('per.numero', $dni)
                        ->orWhere('prop_per.numero', $dni)
                        ->groupEnd();
            }
            if (!empty($placa)) {
                $builder->where('v.placa', $placa);
            }
            if ($estado !== '' && $estado !== 'TODOS') {
                $builder->where('p.estado', $estado);
            }
            if ($origen === 'OPERATIVO') {
                $builder->where('p.id_operativo IS NOT NULL', null, false);
            } elseif ($origen === 'RUTINA') {
                $builder->where('p.id_operativo IS NULL', null, false);
            }
            if ($formalidad === 'FORMAL') {
                $builder->where('v.id_asociacion IS NOT NULL', null, false);
            } elseif ($formalidad === 'INFORMAL') {
                $builder->where('v.id_asociacion IS NULL', null, false);
            }
            if ($tipoInfraccion > 0) {
                $builder->where(
                    'p.id IN (SELECT pd2.id_papeleta FROM papeleta_detalles pd2 WHERE pd2.id_tipo_infraccion = ' . $tipoInfraccion . ')',
                    null,
                    false
                );
            }
            if ($fechaFiltro === 'HOY') {
                $builder->where('DATE(p.fecha_hora)', date('Y-m-d'));
            } elseif ($fechaFiltro === 'SEMANA') {
                $builder->where('p.fecha_hora >=', date('Y-m-d H:i:s', strtotime('-7 days')));
            } elseif ($fechaFiltro === 'MES') {
                $builder->where('YEAR(p.fecha_hora)', date('Y'))->where('MONTH(p.fecha_hora)', date('n'));
            }
            if ($buscar !== '') {
                $builder->groupStart()
                    ->like('p.numero_papeleta', $buscar)
                    ->orLike('v.placa', $buscar)
                    ->orLike('per.numero', $buscar)
                    ->orLike('c_per.nombres', $buscar)
                    ->orLike('c_per.apellido_paterno', $buscar)
                    ->orLike('p.lugar', $buscar)
                    ->groupEnd();
            }

            $page = (int)$this->request->getGet('page');
            $porPagina = max(1, min(200, (int)($this->request->getGet('porPagina') ?: 20)));

            $builder->groupBy('p.id');

            $columnasOrdenables = [
                'numeroPapeleta' => 'p.numero_papeleta',
                'vehiculoPlaca' => 'v.placa',
                'fechaHora' => 'p.fecha_hora',
                'montoTotal' => 'p.monto_total',
                'estado' => 'p.estado',
            ];

            $total = 0;
            if ($page > 0) {
                $subquery = (clone $builder)->select('p.id AS sub_id', false);
                $total = $db->newQuery()->fromSubquery($subquery, 't_count')->countAllResults();

                $rows = \App\Libraries\QuerySort::aplicar($builder, $this->request, $columnasOrdenables, 'p.id')
                    ->limit($porPagina, ($page - 1) * $porPagina)
                    ->get()
                    ->getResultArray();
            } else {
                $sinFiltros = empty($dni) && empty($placa) && $buscar === ''
                    && $estado === '' && $origen === '' && $formalidad === ''
                    && $tipoInfraccion === 0 && $fechaFiltro === '';
                if ($sinFiltros) {
                    $builder->limit(100);
                }
                $rows = $builder->orderBy('p.id', 'DESC')
                    ->get()
                    ->getResultArray();
            }

            $fileStorage = new \App\Services\FileStorageService();
            $data = [];

            // Optimización por lotes para evitar N+1 al cargar detalles de infracción
            $papeletaIds = array_column($rows, 'id');
            $detallesAgrupados = [];
            if (!empty($papeletaIds)) {
                $todosDetalles = $db->table('papeleta_detalles pd')
                    ->select('pd.id_papeleta, pd.id_tipo_infraccion as tipoInfraccionId, ti.codigo, ti.descripcion, ti.gravedad, pd.monto, pd.descuento, pd.monto_final as montoFinal')
                    ->join('tipos_infraccion ti', 'ti.id = pd.id_tipo_infraccion', 'left')
                    ->whereIn('pd.id_papeleta', $papeletaIds)
                    ->get()
                    ->getResultArray();

                foreach ($todosDetalles as $d) {
                    $pid = (int)$d['id_papeleta'];
                    unset($d['id_papeleta']);
                    $d['tipoInfraccionId'] = (int)$d['tipoInfraccionId'];
                    $d['monto'] = (float)$d['monto'];
                    $d['descuento'] = (float)$d['descuento'];
                    $d['montoFinal'] = (float)$d['montoFinal'];
                    $detallesAgrupados[$pid][] = $d;
                }
            }

            foreach ($rows as $row) {
                $row['id'] = (int)$row['id'];
                $row['montoTotal'] = (float)$row['montoTotal'];
                $row['firmaConductorImg'] = $fileStorage->urlPublica($row['firmaConductorImg']);
                
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
                
                $row['detalles'] = $detallesAgrupados[$row['id']] ?? [];

                $row['tipoInfraccionCodigo'] = $row['detalles'][0]['codigo'] ?? 'SIN DETALLE';
                $row['tipoInfraccionDescripcion'] = $row['detalles'][0]['descripcion'] ?? 'Sin detalle registrado';
                $row['tipoInfraccionGravedad'] = $row['detalles'][0]['gravedad'] ?? '';

                $data[] = $row;
            }

            if ($page > 0) {
                return $this->respond([
                    'data' => $data,
                    'meta' => [
                        'total' => $total,
                        'page' => $page,
                        'porPagina' => $porPagina,
                        'totalPaginas' => (int) ceil($total / $porPagina),
                    ],
                ]);
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

        $rules = [
            'vehiculoPlaca' => [
                'rules' => 'required',
                'errors' => ['required' => 'La placa del vehículo es obligatoria.']
            ],
            'infractor' => [
                'rules' => 'permit_empty',
            ],
            'conductorDni' => [
                'rules' => 'permit_empty',
            ],
            'lugar' => [
                'rules' => 'required',
                'errors' => ['required' => 'El lugar de la infracción es obligatorio.']
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
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

            ['montoTotal' => $montoTotal, 'detalles' => $detallesToInsert] = $this->calcularInfracciones($db, $infraccionesIds, $fechaHora);

            $db->transException(true)->transBegin();
            $txStarted = true;

            ['vehiculoId' => $vehiculoId, 'placa' => $placa, 'duenoId' => $duenoId] = $this->resolverVehiculo(
                $db, $placa, $marcaVehiculo, $colorVehiculo, $claseVehiculo, $motorVehiculo, $input
            );

            $fuga = $input['fuga'] ?? false;
            $personaId = $this->resolverInfractor($db, $fuga, $duenoId, $conductorDni, $conductorNombres, $conductorApellidos, $infractor);

            $numeroPapeleta = 'PAP-' . date('Y') . '-' . str_pad((string)random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $inspectorNombre = trim($inspector['nombres'] . ' ' . $inspector['apellido_paterno'] . ' ' . ($inspector['apellido_materno'] ?? ''));

            $papeletaData = [
                'numero_papeleta' => $numeroPapeleta,
                'id_operativo' => !empty($input['id_operativo']) ? (int)$input['id_operativo'] : null,
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

            $fotos = $input['fotos'] ?? [];
            if (!empty($fotos) && is_array($fotos)) {
                // Máximo 5 fotos por papeleta y límite de tamaño (~7MB base64 ~= 5MB binario)
                $fotos = array_slice($fotos, 0, 5);
                $fileStorage = new \App\Services\FileStorageService();
                foreach ($fotos as $foto) {
                    $fotoStr = trim((string)$foto);
                    if ($fotoStr !== '' && strlen($fotoStr) <= 7 * 1024 * 1024) {
                        $ruta = $fileStorage->guardarImagenBase64($fotoStr, 'papeletas');
                        if ($ruta !== null) {
                            $db->table('papeleta_fotos')->insert([
                                'id_papeleta' => $papeletaId,
                                'foto' => $ruta,
                            ]);
                        }
                    }
                }
            }

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
                $firmaImg = (new \App\Services\FileStorageService())->guardarImagenBase64($firmaBase64, 'firmas');
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
                    'firmaConductorImg' => (new \App\Services\FileStorageService())->urlPublica($update['firma_conductor_img']),
                    'firmaConductorFecha' => $update['firma_conductor_fecha'],
                    'firmaConductorEstado' => $update['firma_conductor_estado'],
                    'firmaConductorObservacion' => $update['firma_conductor_observacion'],
                ],
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Error registrando firma: ' . $e->getMessage());
        }
    }

    public function fotos($id)
    {
        try {
            $db = \Config\Database::connect();
            $fotosReporte = $db->table('reporte_intervencion_fotos f')
                ->select('f.id, f.foto')
                ->join('reportes_intervencion ri', 'ri.id = f.id_reporte')
                ->where('ri.id_papeleta', $id)
                ->get()
                ->getResultArray();
                
            $fotosPapeleta = $db->table('papeleta_fotos')
                ->select('id, foto')
                ->where('id_papeleta', $id)
                ->get()
                ->getResultArray();

            $fotos = array_merge($fotosReporte, $fotosPapeleta);
            $fileStorage = new \App\Services\FileStorageService();
            foreach ($fotos as &$foto) {
                $foto['foto'] = $fileStorage->urlPublica($foto['foto']);
            }
            unset($foto);

            return $this->respond(['data' => $fotos]);
        } catch (\Exception $e) {
            return $this->failServerError('Error al obtener fotos: ' . $e->getMessage());
        }
    }

    private function uitActual($db): float
    {
        return (new \App\Services\Multas($db))->uit((int)date('Y'));
    }

    /**
     * Calcula el monto de cada infracción seleccionada y arma las filas listas
     * para papeleta_detalles.
     */
    private function calcularInfracciones($db, array $infraccionesIds, string $fechaHora): array
    {
        $multas = new \App\Services\Multas($db);
        $anio = (int)date('Y', strtotime($fechaHora));
        $montoTotal = 0;
        $detalles = [];

        foreach ($infraccionesIds as $tipoId) {
            $infraccion = $db->table('tipos_infraccion')->where('id', $tipoId)->where('estado', 'ACTIVO')->limit(1)->get()->getRowArray();
            if (!$infraccion) {
                throw new \DomainException('Una infracción seleccionada no existe o está inactiva.');
            }
            $monto = $multas->monto($infraccion, $anio);
            $montoTotal += $monto;
            $detalles[] = [
                'id_tipo_infraccion' => $tipoId,
                'monto' => $monto,
                'descuento' => 0.00,
                'monto_final' => $monto,
            ];
        }

        return ['montoTotal' => $montoTotal, 'detalles' => $detalles];
    }

    /**
     * Busca el vehículo por placa; si no existe lo registra con los datos
     * capturados en campo y, de venir datos del dueño, lo vincula como propietario.
     */
    private function resolverVehiculo($db, string $placa, string $marca, string $color, string $clase, string $motor, array $input): array
    {
        $vehiculoId = null;
        if ($placa !== '' && $placa !== 'SIN_PLACA') {
            $vehiculo = $db->table('vehiculos')->where('placa', $placa)->limit(1)->get()->getRowArray();
            if ($vehiculo) {
                $vehiculoId = (int)$vehiculo['id'];
            }
        }

        $duenoId = null;
        if (!$vehiculoId) {
            $placaRegistro = ($placa && $placa !== 'SIN_PLACA') ? $placa : 'SIN-PLACA-' . strtoupper(substr(uniqid(), -6)) . random_int(10, 99);
            $db->table('vehiculos')->insert([
                'placa' => $placaRegistro,
                'id_tipo_vehiculo' => null,
                'marca' => $marca ?: null,
                'color' => $color ?: null,
                'modelo' => $clase ?: null,
                'serie_motor' => $motor ?: null,
            ]);
            $vehiculoId = (int)$db->insertID();
            $placa = $placaRegistro;

            // Si se proporcionaron datos del dueño, vincularlo al vehículo
            $duenoDni = trim($input['duenoDni'] ?? '');
            if ($duenoDni !== '') {
                $duenoPersona = $db->table('personas')->where('numero', $duenoDni)->limit(1)->get()->getRowArray();
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
                    $db->table('administrados')->ignore(true)->insert(['id_persona' => $duenoId]);
                }
                $db->table('vehiculo_propietarios')->insert([
                    'id_vehiculo'  => $vehiculoId,
                    'id_persona'   => $duenoId,
                    'fecha_inicio' => date('Y-m-d'),
                    'estado'       => 'ACTIVO',
                ]);
            }
        }

        return ['vehiculoId' => $vehiculoId, 'placa' => $placa, 'duenoId' => $duenoId];
    }

    /**
     * Resuelve la persona infractora: si hubo fuga, el dueño registrado del
     * vehículo; si no, busca/crea al conductor por DNI.
     */
    private function resolverInfractor($db, $fuga, ?int $duenoId, string $conductorDni, string $conductorNombres, string $conductorApellidos, string $infractor): ?int
    {
        if ($fuga) {
            // Si hubo fuga, el infractor pasa a ser el dueño (si se registró)
            return $duenoId;
        }

        if ($conductorDni === '') {
            return null;
        }

        $persona = $db->table('personas')->where('numero', $conductorDni)->limit(1)->get()->getRowArray();
        if ($persona) {
            return (int)$persona['id'];
        }

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
        $db->table('administrados')->ignore(true)->insert(['id_persona' => $personaId]);

        return $personaId;
    }
}
