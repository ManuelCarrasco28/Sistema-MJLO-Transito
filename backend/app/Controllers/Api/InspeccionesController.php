<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class InspeccionesController extends ResourceController
{
    protected $format = 'json';

    public function estadisticas()
    {
        $db = \Config\Database::connect();
        $row = $db->table('certicav')
            ->select("
                COUNT(*) as total,
                SUM(CASE WHEN resultado = 'APROBADO' THEN 1 ELSE 0 END) as aprobados,
                SUM(CASE WHEN resultado = 'OBSERVADO' THEN 1 ELSE 0 END) as observados,
                SUM(CASE WHEN resultado = 'DESAPROBADO' THEN 1 ELSE 0 END) as desaprobados
            ", false)
            ->get()->getRowArray();

        return $this->respond(['data' => [
            'totales' => (int) ($row['total'] ?? 0),
            'aprobados' => (int) ($row['aprobados'] ?? 0),
            'observados' => (int) ($row['observados'] ?? 0),
            'desaprobados' => (int) ($row['desaprobados'] ?? 0),
        ]]);
    }

    public function criterios()
    {
        $db = \Config\Database::connect();
        try {
            $rows = $db->table('inspeccion_criterios')
                ->select('id, codigo, seccion, nombre, descripcion, obligatorio, orden, estado')
                ->where('estado', 'ACTIVO')
                ->orderBy('orden', 'ASC')
                ->get()
                ->getResultArray();

            $data = array_map(static function (array $r) {
                $r['id'] = (int)$r['id'];
                $r['obligatorio'] = (bool)$r['obligatorio'];
                $r['orden'] = (int)$r['orden'];
                $r['seccion'] = $r['seccion'] ?? 'GENERAL';
                return $r;
            }, $rows);

            return $this->respond(['data' => $data]);
        } catch (\Exception $e) {
            return $this->failServerError('Error consultando criterios de inspección.');
        }
    }

    /**
     * Vista previa de los correlativos que se asignarán al registrar. Se muestra
     * bloqueada en el formulario; el valor definitivo se reasigna al guardar.
     */
    public function siguienteCorrelativo()
    {
        $db = \Config\Database::connect();
        $anio = preg_match('/^\d{4}$/', (string)$this->request->getGet('anio')) ? $this->request->getGet('anio') : date('Y');
        return $this->respond(['data' => [
            'numeroRegistro'      => $this->siguienteNumeroRegistro($db, $anio),
            'numeroSerieCerticav' => $this->siguienteSerieCerticav($db),
        ]]);
    }

    public function show($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $builder = $this->consultaInspeccion($db)->groupBy('i.id');

            if (is_numeric($id)) {
                $builder->where('i.id', (int)$id);
            } else {
                $builder->groupStart()
                    ->where('i.numero_serie_certicav', $id)
                    ->orWhere('i.numero_registro', $id)
                    ->groupEnd();
            }

            $row = $builder->get()->getRowArray();
            if (!$row) {
                return $this->failNotFound('Inspección / CertiCAV no encontrado.');
            }

            $row = $this->aplicarVigencia($row);

            $detalles = $this->consultaDetalles($db)
                ->where('d.id_certicav', $row['id'])
                ->get()
                ->getResultArray();

            $row['detalles'] = array_map(static function (array $d) {
                $d['criterioId'] = (int)$d['criterioId'];
                return $d;
            }, $detalles);

            return $this->respond(['status' => 200, 'data' => $row]);
        } catch (\Exception $e) {
            return $this->failServerError('Error consultando CertiCAV.');
        }
    }

    public function index()
    {
        $db = \Config\Database::connect();
        
        try {
            $builder = $this->consultaInspeccion($db)
                ->where('i.estado !=', 'ANULADA');

            $buscar = trim((string)$this->request->getGet('buscar'));
            if ($buscar !== '') {
                $builder->groupStart()
                    ->like('i.numero_registro', $buscar)
                    ->orLike('i.numero_serie_certicav', $buscar)
                    ->orLike('v.placa', $buscar)
                    ->orLike('pc.numero', $buscar)
                    ->orLike('cc.nombres', $buscar)
                    ->orLike('cc.apellido_paterno', $buscar)
                    ->orLike('a.razon_social', $buscar)
                    ->groupEnd();
            }

            $resultado = strtoupper(trim((string)$this->request->getGet('resultado')));
            if (in_array($resultado, ['APROBADO', 'OBSERVADO', 'DESAPROBADO'], true)) {
                $builder->where('i.resultado', $resultado);
            }

            $page = (int)$this->request->getGet('page');
            $porPagina = max(1, min(200, (int)($this->request->getGet('porPagina') ?: 20)));

            $columnasOrdenables = [
                'numeroRegistro' => 'i.numero_registro',
                'vehiculoPlaca' => 'v.placa',
                'fecha' => 'i.fecha',
                'resultado' => 'i.resultado',
            ];

            $total = 0;
            if ($page > 0) {
                $countRow = (clone $builder)->select('COUNT(DISTINCT i.id) AS total_count', false)->get()->getRowArray();
                $total = (int)($countRow['total_count'] ?? 0);

                $builder->groupBy('i.id');
                $rows = \App\Libraries\QuerySort::aplicar($builder, $this->request, $columnasOrdenables, 'i.id')
                    ->limit($porPagina, ($page - 1) * $porPagina)
                    ->get()
                    ->getResultArray();
            } else {
                $builder->groupBy('i.id');
                $rows = $builder->orderBy('i.id', 'DESC')
                    ->get()
                    ->getResultArray();
            }

            $detallesPorInspeccion = [];
            $ids = array_map(static fn (array $r) => (int)$r['id'], $rows);
            if ($ids) {
                $todos = $this->consultaDetalles($db)
                    ->select('d.id_certicav')
                    ->whereIn('d.id_certicav', $ids)
                    ->get()
                    ->getResultArray();
                foreach ($todos as $d) {
                    $idCerticav = (int)$d['id_certicav'];
                    unset($d['id_certicav']);
                    $d['criterioId'] = (int)$d['criterioId'];
                    $detallesPorInspeccion[$idCerticav][] = $d;
                }
            }

            $data = [];
            foreach ($rows as $row) {
                $row = $this->aplicarVigencia($row);
                $row['detalles'] = $detallesPorInspeccion[$row['id']] ?? [];

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
            return $this->failServerError('Error consultando inspecciones.');
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

        $rules = [
            'vehiculoPlaca' => [
                'rules' => 'required',
                'errors' => ['required' => 'La placa del vehículo es obligatoria.']
            ],
            'resultado' => [
                'rules' => 'permit_empty|in_list[APROBADO,OBSERVADO,DESAPROBADO]',
                'errors' => ['in_list' => 'El resultado de la inspección no es válido.']
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $placa = strtoupper(trim($input['vehiculoPlaca'] ?? ''));
        $resultado = trim($input['resultado'] ?? 'APROBADO');
        $observaciones = trim($input['observaciones'] ?? '');
        $detalles = $input['detalles'] ?? [];

        try {
            $vehiculo = $placa !== '' ? $db->table('vehiculos')->where('placa', $placa)->limit(1)->get()->getRowArray() : null;
            if (!$vehiculo) {
                throw new \DomainException("La placa {$placa} no está registrada en el padrón vehicular. Regístrela primero en Vehículos.");
            }
            $vehiculoId = (int)$vehiculo['id'];

            // Actualizar datos técnicos del vehículo si se ingresaron en la inspección
            $vehUpdate = [];
            if (!empty($input['vehiculoMarca'])) $vehUpdate['marca'] = trim($input['vehiculoMarca']);
            if (!empty($input['vehiculoModelo'])) $vehUpdate['modelo'] = trim($input['vehiculoModelo']);
            if (!empty($input['vehiculoAnio'])) $vehUpdate['anio_fabricacion'] = trim($input['vehiculoAnio']);
            if (!empty($input['vehiculoMotor'])) $vehUpdate['serie_motor'] = trim($input['vehiculoMotor']);
            if (!empty($input['asociacionId']) && (int)$input['asociacionId'] > 0) $vehUpdate['id_asociacion'] = (int)$input['asociacionId'];
            if (!empty($vehUpdate)) {
                $db->table('vehiculos')->where('id', $vehiculoId)->update($vehUpdate);
            }

            $tecnicoId = (int)($input['tecnicoId'] ?? 0);
            if ($tecnicoId > 0) {
                $tecnico = $db->table('trabajadores pe')->where('id_persona', $tecnicoId)->where('estado', 'ACTIVO')->get()->getRowArray();
                if (!$tecnico) throw new \DomainException('Seleccione el técnico responsable válido.');
            } else {
                $tecnico = $db->table('trabajadores')->where('estado', 'ACTIVO')->limit(1)->get()->getRowArray();
                $tecnicoId = $tecnico ? (int)$tecnico['id_persona'] : null;
            }

            $detalles = $this->validarDetalles($db, $detalles);

            $fecha = !empty($input['fecha']) ? trim($input['fecha']) : date('Y-m-d');
            $numeroInspeccion = trim((string)($input['numeroRegistro'] ?? ($input['numeroInspeccion'] ?? '')));
            $numeroSerieCerticav = trim((string)($input['numeroSerieCerticav'] ?? ''));
            $this->validarCorrelativos($db, $numeroInspeccion, $numeroSerieCerticav);

            $db->transException(true)->transBegin();

            if ($numeroInspeccion === '') {
                $numeroInspeccion = $this->siguienteNumeroRegistro($db, substr($fecha, 0, 4));
            }
            if ($numeroSerieCerticav === '') {
                $numeroSerieCerticav = $this->siguienteSerieCerticav($db);
            }
            $primeraEvaluacion = trim($input['primeraEvaluacion'] ?? ($resultado === 'DESAPROBADO' ? 'DESAPROBADO' : 'APROBADO'));
            $segundaEvaluacion = !empty($input['segundaEvaluacion']) ? trim($input['segundaEvaluacion']) : null;
            $conductorNombre = trim($input['conductorNombre'] ?? ($input['conductor'] ?? ''));
            $conductorDni = trim($input['conductorDni'] ?? '');
            $conductorLicencia = trim($input['conductorLicencia'] ?? '');
            $conductorId = $this->resolverConductor($db, $conductorNombre, $conductorDni, $conductorLicencia);

            $fechaVencimiento = date('Y-m-d', strtotime('+6 months', strtotime($fecha)));
            $hoy = date('Y-m-d');

            $inspData = [
                'numero_registro'       => $numeroInspeccion,
                'numero_serie_certicav' => $numeroSerieCerticav,
                'primera_evaluacion'    => $primeraEvaluacion,
                'segunda_evaluacion'    => $segundaEvaluacion,
                'id_conductor'          => $conductorId,
                'id_vehiculo'           => $vehiculoId,
                'id_tecnico'            => $tecnicoId,
                'fecha'                 => $fecha,
                'resultado'             => $resultado,
                'observaciones'         => $observaciones,
                'estado'                => 'ACTIVO',
            ];
            $db->table('certicav')->insert($inspData);
            $inspeccionId = (int)$db->insertID();

            // Vigencia oficial de 6 meses
            if ($resultado === 'APROBADO') {
                $estadoVigencia = ($hoy <= $fechaVencimiento) ? 'VIGENTE' : 'VENCIDO';
                $diasRestantes = max(0, (int)((strtotime($fechaVencimiento) - strtotime($hoy)) / 86400));
            } elseif ($resultado === 'OBSERVADO') {
                $estadoVigencia = 'OBSERVADO';
                $diasRestantes = 0;
            } else {
                $estadoVigencia = 'DESAPROBADO';
                $diasRestantes = 0;
            }

            $savedDetalles = [];
            $filas = [];
            foreach ($detalles as $det) {
                $criterioId = (int)($det['criterioId'] ?? 0);
                $estadoRev = trim($det['estado'] ?? 'BIEN');
                $obs = trim($det['obs'] ?? '');
                $filas[] = [
                    'id_certicav'     => $inspeccionId,
                    'id_criterio'     => $criterioId,
                    'estado_revision' => $estadoRev,
                    'observacion'     => $obs
                ];
                $savedDetalles[] = ['criterioId' => $criterioId, 'estado' => $estadoRev, 'obs' => $obs];
            }
            if ($filas) {
                $db->table('certicav_detalles')->insertBatch($filas);
            }
            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->failServerError('Error guardando inspección técnica.');
            }

            $inspectorRow = $tecnicoId ? $db->table('ciudadanos')->where('id_persona', $tecnicoId)->get()->getRowArray() : null;
            $inspectorNombre = $inspectorRow ? trim($inspectorRow['nombres'] . ' ' . $inspectorRow['apellido_paterno'] . ' ' . ($inspectorRow['apellido_materno'] ?? '')) : 'Inspector Técnico Municipal';

            $db->transCommit();
            return $this->respondCreated([
                'status' => true,
                'message' => 'Inspección registrada con éxito',
                'data' => [
                    'id' => $inspeccionId,
                    'tecnicoId' => $tecnicoId,
                    'numeroInspeccion' => $numeroInspeccion,
                    'numeroRegistro' => $numeroInspeccion,
                    'numeroSerieCerticav' => $numeroSerieCerticav,
                    'primeraEvaluacion' => $primeraEvaluacion,
                    'segundaEvaluacion' => $segundaEvaluacion,
                    'conductorNombre' => $conductorNombre,
                    'conductorDni' => $conductorDni,
                    'conductorLicencia' => $conductorLicencia,
                    'vigenciaMeses' => 6,
                    'fechaVencimiento' => $fechaVencimiento,
                    'estadoVigencia' => $estadoVigencia,
                    'diasRestantes' => $diasRestantes,
                    'vehiculoPlaca' => $placa,
                    'inspector' => $inspectorNombre,
                    'fecha' => $fecha,
                    'resultado' => $resultado,
                    'observaciones' => $observaciones,
                    'estado' => 'ACTIVO',
                    'detalles' => $savedDetalles
                ]
            ]);
        } catch (\DomainException $e) {
            $db->transRollback();
            return $this->failValidationErrors($e->getMessage());
        } catch (\Exception $e) {
            $db->transRollback();
            return $this->failServerError('Error creando la inspección.');
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

        $rules = [
            'resultado' => [
                'rules' => 'permit_empty|in_list[APROBADO,OBSERVADO,DESAPROBADO]',
                'errors' => ['in_list' => 'El resultado de la inspección no es válido.']
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $actual = $db->table('certicav')->where('id', $id)->get()->getRowArray();
            if (!$actual) return $this->failNotFound('Inspección no encontrada.');
            if (isset($input['detalles'])) $input['detalles'] = $this->validarDetalles($db, $input['detalles']);
            $this->validarCorrelativos(
                $db,
                trim((string)($input['numeroRegistro'] ?? '')),
                trim((string)($input['numeroSerieCerticav'] ?? '')),
                (int)$id
            );
            $db->transException(true)->transBegin();
            $data = [];
            if (isset($input['resultado'])) {
                $data['resultado'] = trim($input['resultado']);
            }
            if (isset($input['observaciones'])) {
                $data['observaciones'] = trim($input['observaciones']);
            }
            if (isset($input['tecnicoId']) && (int)$input['tecnicoId'] > 0) {
                $data['id_tecnico'] = (int)$input['tecnicoId'];
            }
            if (!empty(trim((string)($input['numeroRegistro'] ?? '')))) {
                $data['numero_registro'] = trim($input['numeroRegistro']);
            }
            if (!empty(trim((string)($input['numeroSerieCerticav'] ?? '')))) {
                $data['numero_serie_certicav'] = trim($input['numeroSerieCerticav']);
            }
            if (isset($input['primeraEvaluacion'])) {
                $data['primera_evaluacion'] = trim($input['primeraEvaluacion']);
            }
            if (array_key_exists('segundaEvaluacion', $input)) {
                $segunda = trim((string)$input['segundaEvaluacion']) ?: null;
                $data['segunda_evaluacion'] = $segunda;
                // La vigencia se cuenta desde el día en que se registra la segunda evaluación.
                if ($segunda === null) {
                    $data['fecha_segunda_evaluacion'] = null;
                } elseif ($segunda !== ($actual['segunda_evaluacion'] ?? null)) {
                    $data['fecha_segunda_evaluacion'] = date('Y-m-d');
                }
            }
            if (isset($input['conductorNombre']) || isset($input['conductorDni']) || isset($input['conductorLicencia'])) {
                $conductorId = $this->resolverConductor(
                    $db,
                    trim($input['conductorNombre'] ?? ''),
                    trim($input['conductorDni'] ?? ''),
                    trim($input['conductorLicencia'] ?? '')
                );
                if ($conductorId) {
                    $data['id_conductor'] = $conductorId;
                }
            }
            if (isset($input['fecha'])) {
                $data['fecha'] = trim($input['fecha']);
            }

            if (!empty($data)) {
                $db->table('certicav')->where('id', $id)->update($data);
            }

            // Actualizar datos técnicos del vehículo si se modificaron
            $existingCert = $db->table('certicav')->where('id', $id)->get()->getRowArray();
            if ($existingCert && !empty($existingCert['id_vehiculo'])) {
                $vehId = (int)$existingCert['id_vehiculo'];
                $vehUpdate = [];
                if (!empty($input['vehiculoMarca'])) $vehUpdate['marca'] = trim($input['vehiculoMarca']);
                if (!empty($input['vehiculoModelo'])) $vehUpdate['modelo'] = trim($input['vehiculoModelo']);
                if (!empty($input['vehiculoAnio'])) $vehUpdate['anio_fabricacion'] = trim($input['vehiculoAnio']);
                if (!empty($input['vehiculoMotor'])) $vehUpdate['serie_motor'] = trim($input['vehiculoMotor']);
                if (!empty($input['asociacionId']) && (int)$input['asociacionId'] > 0) $vehUpdate['id_asociacion'] = (int)$input['asociacionId'];
                if (!empty($vehUpdate)) {
                    $db->table('vehiculos')->where('id', $vehId)->update($vehUpdate);
                }
            }

            if (isset($input['detalles']) && is_array($input['detalles'])) {
                $db->table('certicav_detalles')->where('id_certicav', $id)->delete();
                $filas = [];
                foreach ($input['detalles'] as $det) {
                    $criterioId = (int)($det['criterioId'] ?? 0);
                    if ($criterioId <= 0) continue;
                    $filas[] = [
                        'id_certicav' => $id,
                        'id_criterio' => $criterioId,
                        'estado_revision' => trim($det['estado'] ?? 'BIEN'),
                        'observacion' => trim($det['obs'] ?? '')
                    ];
                }
                if ($filas) {
                    $db->table('certicav_detalles')->insertBatch($filas);
                }
            }

            if (!$db->transStatus()) throw new \RuntimeException('No se pudo actualizar la inspección completa.');
            $db->transCommit();
            return $this->respond(['status' => 200, 'message' => 'Inspección actualizada correctamente']);
        } catch (\DomainException $e) {
            $db->transRollback();
            return $this->failValidationErrors($e->getMessage());
        } catch (\Exception $e) {
            $db->transRollback();
            return $this->failServerError('Error actualizando la inspección.');
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        
        if (!$id) {
            return $this->failNotFound('ID de inspección no especificado.');
        }

        try {
            $db->table('certicav')->where('id', $id)->update(['estado' => 'ANULADA']);
            return $this->respondDeleted(['status' => 200, 'message' => 'Inspección técnica anulada con éxito']);
        } catch (\Exception $e) {
            return $this->failServerError('Error anulando inspección técnica.');
        }
    }

    /**
     * Busca a la persona conductora por DNI; si no existe la crea con los datos
     * capturados en el formulario de CERTICAV (nombre, licencia). Devuelve el id
     * de personas.id o null si no se proporcionó DNI.
     */
    private function resolverConductor($db, string $nombre, string $dni, string $licencia): ?int
    {
        if ($dni === '') {
            return null;
        }

        $persona = $db->table('personas')->where('numero', $dni)->limit(1)->get()->getRowArray();

        if ($persona) {
            $conductorId = (int)$persona['id'];
            if ($licencia !== '' && $licencia !== $dni) {
                $db->table('ciudadanos')->where('id_persona', $conductorId)->update(['numero_licencia' => $licencia]);
            }
            return $conductorId;
        }

        // Convención peruana: los dos últimos términos son los apellidos y el
        // resto los nombres ("Juan Carlos Coronado Rojas").
        $partes = array_values(array_filter(preg_split('/\s+/', trim($nombre)) ?: [], 'strlen'));
        $total = count($partes);
        if ($total >= 3) {
            $apellidoMaterno = $partes[$total - 1];
            $apellidoPaterno = $partes[$total - 2];
            $nombres = implode(' ', array_slice($partes, 0, $total - 2));
        } elseif ($total === 2) {
            [$nombres, $apellidoPaterno] = $partes;
            $apellidoMaterno = null;
        } else {
            $nombres = $partes[0] ?? 'CONDUCTOR';
            $apellidoPaterno = 'SIN REGISTRAR';
            $apellidoMaterno = null;
        }

        $db->table('personas')->insert([
            'id_tipo_documento' => 1,
            'numero'            => $dni,
            'estado'            => 'ACTIVO',
        ]);
        $conductorId = (int)$db->insertID();

        $db->table('ciudadanos')->insert([
            'id_persona'       => $conductorId,
            'nombres'          => $nombres,
            'apellido_paterno' => $apellidoPaterno,
            'apellido_materno' => $apellidoMaterno,
            'numero_licencia'  => ($licencia !== '' && $licencia !== $dni) ? $licencia : null,
        ]);

        return $conductorId;
    }

    /**
     * Consulta base de CERTICAV con los datos de vehículo, conductor, propietario
     * y técnico. Compartida por index() y show() para evitar duplicar el SELECT/JOIN.
     */
    private function consultaInspeccion($db)
    {
        return $db->table('certicav i')
            ->select("
                i.id,
                i.id_tecnico as tecnicoId,
                i.id_conductor as conductorId,
                i.numero_registro as numeroInspeccion,
                i.numero_registro as numeroRegistro,
                i.numero_serie_certicav as numeroSerieCerticav,
                COALESCE(i.primera_evaluacion, 'APROBADO') as primeraEvaluacion,
                COALESCE(i.segunda_evaluacion, '') as segundaEvaluacion,
                COALESCE(CONCAT(cc.nombres, ' ', cc.apellido_paterno, ' ', COALESCE(cc.apellido_materno, '')), '') as conductorNombre,
                COALESCE(pc.numero, '') as conductorDni,
                COALESCE(cc.numero_licencia, '') as conductorLicencia,
                v.placa as vehiculoPlaca,
                COALESCE(v.marca, '') as vehiculoMarca,
                COALESCE(v.modelo, '') as vehiculoModelo,
                COALESCE(v.color, '') as vehiculoColor,
                COALESCE(v.serie_motor, '') as vehiculoMotor,
                COALESCE(v.anio_fabricacion, '') as vehiculoAnio,
                COALESCE(a.razon_social, '') as transportador,
                COALESCE(CONCAT(cp.nombres, ' ', cp.apellido_paterno, ' ', COALESCE(cp.apellido_materno, '')), '') as propietario,
                COALESCE(pp.numero, '') as propietarioDni,
                COALESCE(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, '')), 'Inspector Técnico Municipal') as inspector,
                i.fecha as fecha,
                i.fecha_segunda_evaluacion as fechaSegundaEvaluacion,
                i.resultado,
                i.observaciones,
                i.estado
            ")
            ->join('vehiculos v', 'v.id = i.id_vehiculo', 'left')
            ->join('asociaciones a', 'a.id = v.id_asociacion', 'left')
            ->join('vehiculo_propietarios vp', 'vp.id_vehiculo = v.id AND vp.fecha_fin IS NULL', 'left')
            ->join('personas pp', 'pp.id = vp.id_persona', 'left')
            ->join('ciudadanos cp', 'cp.id_persona = pp.id', 'left')
            ->join('ciudadanos c', 'c.id_persona = i.id_tecnico', 'left')
            ->join('personas pc', 'pc.id = i.id_conductor', 'left')
            ->join('ciudadanos cc', 'cc.id_persona = pc.id', 'left');
    }

    /**
     * Resultados del checklist con los datos del criterio con que se evaluó
     * (puede ser un criterio ya desactivado en inspecciones antiguas).
     */
    private function consultaDetalles($db)
    {
        return $db->table('certicav_detalles d')
            ->select('d.id_criterio as criterioId, d.estado_revision as estado, d.observacion as obs, ic.codigo, ic.nombre, ic.seccion, ic.orden')
            ->join('inspeccion_criterios ic', 'ic.id = d.id_criterio', 'left')
            ->orderBy('ic.orden', 'ASC');
    }

    /**
     * Vigencia oficial de 6 meses. Si la inspección se aprobó en la segunda
     * evaluación, se cuenta desde esa fecha y no desde la primera.
     */
    private function aplicarVigencia(array $row): array
    {
        $row['id'] = (int)$row['id'];
        $base = ($row['resultado'] === 'APROBADO' && ($row['segundaEvaluacion'] ?? '') === 'APROBADO' && !empty($row['fechaSegundaEvaluacion']))
            ? $row['fechaSegundaEvaluacion']
            : ($row['fecha'] ?: date('Y-m-d'));
        $fechaVencimiento = date('Y-m-d', strtotime('+6 months', strtotime($base)));
        $hoy = date('Y-m-d');

        $row['fechaVencimiento'] = $fechaVencimiento;
        $row['vigenciaMeses'] = 6;
        $row['diasRestantes'] = 0;

        if (($row['estado'] ?? '') === 'ANULADA') {
            $row['estadoVigencia'] = 'ANULADA';
        } elseif ($row['resultado'] === 'APROBADO') {
            $row['estadoVigencia'] = $hoy <= $fechaVencimiento ? 'VIGENTE' : 'VENCIDO';
            $row['diasRestantes'] = max(0, (int)((strtotime($fechaVencimiento) - strtotime($hoy)) / 86400));
        } elseif ($row['resultado'] === 'OBSERVADO') {
            $row['estadoVigencia'] = 'OBSERVADO';
        } else {
            $row['estadoVigencia'] = 'DESAPROBADO';
        }

        return $row;
    }

    private function validarCorrelativos($db, string $numeroRegistro, string $numeroSerie, ?int $excluirId = null): void
    {
        foreach (['numero_registro' => $numeroRegistro, 'numero_serie_certicav' => $numeroSerie] as $columna => $valor) {
            if ($valor === '') continue;
            $q = $db->table('certicav')->where($columna, $valor);
            if ($excluirId) $q->where('id !=', $excluirId);
            if ($q->countAllResults()) {
                $etiqueta = $columna === 'numero_registro' ? 'N° de registro' : 'N° de serie CERTICAV';
                throw new \DomainException("El {$etiqueta} {$valor} ya está usado por otra inspección.");
            }
        }
    }

    private function siguienteNumeroRegistro($db, string $anio): string
    {
        $prefijo = "INSP-{$anio}-";
        $row = $db->query(
            'SELECT MAX(CAST(SUBSTRING(numero_registro, ?) AS UNSIGNED)) AS n FROM certicav WHERE numero_registro LIKE ?',
            [strlen($prefijo) + 1, $prefijo . '%']
        )->getRowArray();
        return $prefijo . str_pad((string)(((int)($row['n'] ?? 0)) + 1), 3, '0', STR_PAD_LEFT);
    }

    private function siguienteSerieCerticav($db): string
    {
        $row = $db->query(
            "SELECT MAX(CAST(numero_serie_certicav AS UNSIGNED)) AS n FROM certicav WHERE numero_serie_certicav REGEXP '^[0-9]+$'"
        )->getRowArray();
        return str_pad((string)(((int)($row['n'] ?? 0)) + 1), 7, '0', STR_PAD_LEFT);
    }

    private function validarDetalles($db, $detalles): array
    {
        if (is_string($detalles)) $detalles = json_decode($detalles, true);
        if (!is_array($detalles)) throw new \DomainException('Los criterios de inspección no son válidos.');
        $existentes = array_flip(array_map('intval', array_column(
            $db->table('inspeccion_criterios')->select('id')->where('estado', 'ACTIVO')->get()->getResultArray(),
            'id'
        )));
        $seen = [];
        foreach ($detalles as $detalle) {
            $id = (int)($detalle['criterioId'] ?? 0);
            if ($id <= 0 || isset($seen[$id]) || !isset($existentes[$id])) throw new \DomainException('Hay criterios inexistentes o repetidos.');
            if (!in_array($detalle['estado'] ?? '', ['BIEN','MAL_ESTADO','NO_TIENE'], true)) throw new \DomainException('Estado de revisión inválido.');
            $seen[$id] = true;
        }
        return $detalles;
    }
}
