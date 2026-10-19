<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class InspeccionesController extends ResourceController
{
    use \App\Libraries\ResuelveUuid;

    protected string $tablaUuid = 'certicav';
    protected array $tablasUuidPorMetodo = [];
    protected array $soloUuidEnEstricto = [];

    protected $format = 'json';

    public function estadisticas()
    {
        $db = \Config\Database::connect();
        $row = $db->table('certicav')
            ->select("
                COUNT(*) as total,
                SUM(CASE WHEN resultado = 'APROBADO' AND estado != 'PENDIENTE_REVISION' THEN 1 ELSE 0 END) as aprobados,
                SUM(CASE WHEN resultado = 'OBSERVADO' AND estado != 'PENDIENTE_REVISION' THEN 1 ELSE 0 END) as observados,
                SUM(CASE WHEN resultado = 'DESAPROBADO' AND estado != 'PENDIENTE_REVISION' THEN 1 ELSE 0 END) as desaprobados,
                SUM(CASE WHEN estado = 'PENDIENTE_REVISION' THEN 1 ELSE 0 END) as pendientes_revision
            ", false)
            ->get()->getRowArray();

        return $this->respond(['data' => [
            'totales' => (int) ($row['total'] ?? 0),
            'aprobados' => (int) ($row['aprobados'] ?? 0),
            'observados' => (int) ($row['observados'] ?? 0),
            'desaprobados' => (int) ($row['desaprobados'] ?? 0),
            'pendientes_revision' => (int) ($row['pendientes_revision'] ?? 0),
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

    public function certicavEstado()
    {
        $db = \Config\Database::connect();
        $placa = \App\Libraries\Placa::normalizar((string) $this->request->getGet('placa'));
        $vehiculo = $placa !== '' ? $db->table('vehiculos')->where('placa', $placa)->limit(1)->get()->getRowArray() : null;
        if (!$vehiculo) {
            return $this->respond(['data' => null]);
        }
        try {
            $servicio = new \App\Services\CerticavPago($db);
            $estado = $servicio->estado($vehiculo);
            return $this->respond(['data' => $estado + ['mensaje' => $servicio->bloqueo($estado)]]);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        }
    }

    public function certicavSolicitudes()
    {
        $db = \Config\Database::connect();
        try {
            $idProc = (int) (new \App\Services\CerticavPago($db))->procedimiento()['id'];
            $filas = $db->query(
                "SELECT t.id, t.numero_expediente, t.fecha_solicitud, v.placa, v.marca, v.modelo,
                        p.total, p.estado AS estado_pago, p.numero_recibo,
                        (SELECT TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', IFNULL(c.apellido_materno, ''))) FROM vehiculo_propietarios vp
                         JOIN ciudadanos c ON c.id_persona = vp.id_persona WHERE vp.id_vehiculo = v.id AND vp.estado = 'ACTIVO' ORDER BY vp.id DESC LIMIT 1) AS propietario
                 FROM tramites_documentarios t
                 JOIN vehiculos v ON v.id = t.id_vehiculo
                 JOIN pagos_transito p ON p.id_tramite = t.id AND p.estado IN ('PENDIENTE', 'PAGADO')
                 WHERE t.id_procedimiento_admin = ?
                   AND NOT EXISTS (SELECT 1 FROM certicav c WHERE c.id_pago = p.id)
                   AND NOT EXISTS (SELECT 1 FROM certicav c3 WHERE c3.id_vehiculo = v.id AND c3.estado <> 'ANULADA' AND c3.fecha >= t.fecha_solicitud)
                   AND NOT EXISTS (
                       SELECT 1 FROM certicav v2 WHERE v2.id_vehiculo = v.id AND v2.resultado = 'APROBADO' AND v2.estado <> 'ANULADA'
                         AND DATE_ADD(CASE WHEN v2.segunda_evaluacion = 'APROBADO' AND v2.fecha_segunda_evaluacion IS NOT NULL THEN v2.fecha_segunda_evaluacion ELSE v2.fecha END, INTERVAL 6 MONTH) >= CURDATE()
                   )
                 ORDER BY t.id DESC",
                [$idProc]
            )->getResultArray();
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        }

        return $this->respond(['data' => array_map(static fn ($f) => [
            'id' => (int) $f['id'],
            'placa' => $f['placa'],
            'vehiculo' => trim(($f['marca'] ?? '') . ' ' . ($f['modelo'] ?? '')),
            'propietario' => $f['propietario'] ?? null,
            'expediente' => $f['numero_expediente'],
            'fecha' => $f['fecha_solicitud'],
            'monto' => (float) $f['total'],
            'pagado' => $f['estado_pago'] === 'PAGADO',
            'numeroRecibo' => $f['numero_recibo'],
        ], $filas)]);
    }

    public function certicavSolicitar()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: [];
        $placa = \App\Libraries\Placa::normalizar((string) ($input['placa'] ?? $input['vehiculoPlaca'] ?? ''));
        $vehiculo = $placa !== '' ? $db->table('vehiculos')->where('placa', $placa)->limit(1)->get()->getRowArray() : null;
        if (!$vehiculo) {
            return $this->failNotFound('La placa no está registrada en el padrón vehicular.');
        }
        try {
            $servicio = new \App\Services\CerticavPago($db);
            $estado = $servicio->solicitar($vehiculo);
            return $this->respondCreated(['data' => $estado + ['mensaje' => $servicio->bloqueo($estado)]]);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            log_message('error', 'No se pudo solicitar el CERTICAV: ' . $e->getMessage());
            return $this->failServerError('No se pudo solicitar el CERTICAV. Intente nuevamente.');
        }
    }

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
            $historial = strtoupper((string) $this->request->getGet('historial'));
            if ($historial === 'ACTUALES') {
                $builder->where($this->esActualSql(), null, false);
            } elseif ($historial === 'HISTORICAS') {
                $builder->where('NOT (' . $this->esActualSql() . ')', null, false);
            }

            $buscar = trim((string)$this->request->getGet('buscar'));
            if ($buscar !== '') {
                $builder->groupStart()
                    ->like('i.numero_registro', $buscar)
                    ->orLike('i.numero_serie_certicav', $buscar)
                    ->orLike('v.placa', \App\Libraries\Placa::paraBusqueda($buscar))
                    ->orLike('pc.numero', $buscar)
                    ->orLike('cc.nombres', $buscar)
                    ->orLike('cc.apellido_paterno', $buscar)
                    ->orLike('cc.apellido_materno', $buscar)
                    ->orWhere(\App\Libraries\Busqueda::nombreCompleto($buscar, 'cc.nombres', 'cc.apellido_paterno', 'cc.apellido_materno'), null, false)
                    ->orLike('a.razon_social', $buscar)
                    ->groupEnd();
            }

            $resultado = strtoupper(trim((string)$this->request->getGet('resultado')));
            if (in_array($resultado, ['APROBADO', 'OBSERVADO', 'DESAPROBADO'], true)) {
                $builder->where('i.resultado', $resultado);
            }

            $estadoFiltro = strtoupper(trim((string)$this->request->getGet('estado')));
            if ($estadoFiltro === 'PENDIENTE_REVISION') {
                $builder->where('i.estado', 'PENDIENTE_REVISION');
            } elseif ($estadoFiltro === 'ACTIVO') {
                $builder->where('i.estado', 'ACTIVO');
            }

            $vigencia = strtoupper(trim((string)$this->request->getGet('vigencia')));
            $baseVigencia = "CASE WHEN i.resultado = 'APROBADO' AND i.segunda_evaluacion = 'APROBADO' AND i.fecha_segunda_evaluacion IS NOT NULL THEN i.fecha_segunda_evaluacion ELSE i.fecha END";
            if ($vigencia === 'VIGENTE') {
                $builder->where('i.resultado', 'APROBADO')->where("DATE_ADD($baseVigencia, INTERVAL 6 MONTH) >= CURDATE()", null, false);
            } elseif ($vigencia === 'POR_VENCER') {
                $builder->where('i.resultado', 'APROBADO')
                    ->where("DATE_ADD($baseVigencia, INTERVAL 6 MONTH) >= CURDATE()", null, false)
                    ->where("DATE_ADD($baseVigencia, INTERVAL 6 MONTH) <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)", null, false);
            } elseif ($vigencia === 'VENCIDO') {
                $builder->where('i.resultado', 'APROBADO')->where("DATE_ADD($baseVigencia, INTERVAL 6 MONTH) < CURDATE()", null, false);
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
        if (!empty($input['fecha'])) {
            $erroresFecha = \App\Services\ValidacionRegistro::fechas($input, ['fecha']);
            if ($erroresFecha) return $this->failValidationErrors($erroresFecha);
        }

        $placa = \App\Libraries\Placa::normalizar($input['vehiculoPlaca'] ?? '');
        $resultado = trim($input['resultado'] ?? 'APROBADO');
        $observaciones = trim($input['observaciones'] ?? '');
        $detalles = $input['detalles'] ?? [];
        $conductorDniEntrada = trim((string)($input['conductorDni'] ?? ''));
        if ($conductorDniEntrada !== '' && !preg_match('/^[A-Za-z0-9]{8,15}$/', $conductorDniEntrada)) {
            return $this->failValidationErrors('El documento del conductor no es válido (8 a 15 letras o números).');
        }
        if (mb_strlen($observaciones) > 500) {
            return $this->failValidationErrors('Las observaciones no pueden superar los 500 caracteres.');
        }

        $candado = false;
        $candadoPersona = false;
        try {
            $vehiculo = $placa !== '' ? $db->table('vehiculos')->where('placa', $placa)->limit(1)->get()->getRowArray() : null;
            if (!$vehiculo) {
                throw new \DomainException("La placa {$placa} no está registrada en el padrón vehicular. Regístrela primero en Vehículos.");
            }
            $vehiculoId = (int)$vehiculo['id'];

            $certicavPago = new \App\Services\CerticavPago($db);
            $mensajeBloqueo = $certicavPago->bloqueo($certicavPago->estado($vehiculo));
            if ($mensajeBloqueo !== null) {
                throw new \DomainException($mensajeBloqueo);
            }
            $pagoCerticav = $certicavPago->pagoDisponible($vehiculoId);

            $candado = (int)($db->query("SELECT GET_LOCK('mjlo_certicav', 10) AS l")->getRowArray()['l'] ?? 0) === 1;
            if (!$candado) {
                throw new \DomainException('El sistema está registrando otra inspección. Intente de nuevo en unos segundos.');
            }
// Crear el conductor bajo el mismo bloqueo del padrón.
            \App\Services\CandadoPersona::adquirir($db);
            $candadoPersona = true;
            $db->transException(true)->transBegin();

            $vehUpdate = [];
            if (!empty($input['vehiculoMarca'])) $vehUpdate['marca'] = trim($input['vehiculoMarca']);
            if (!empty($input['vehiculoModelo'])) $vehUpdate['modelo'] = trim($input['vehiculoModelo']);
            if (!empty($input['vehiculoAnio'])) $vehUpdate['anio_fabricacion'] = trim($input['vehiculoAnio']);
            if (!empty($input['vehiculoMotor'])) $vehUpdate['serie_motor'] = trim($input['vehiculoMotor']);
            if (!empty($input['asociacionId']) && (int)$input['asociacionId'] > 0) $vehUpdate['id_asociacion'] = (int)$input['asociacionId'];
            if (!empty($vehUpdate)) {
                $db->table('vehiculos')->where('id', $vehiculoId)->update($vehUpdate);
            }

            [$tecnicoId, $inspectorNombre] = $this->resolverTecnicoInspeccion($db, $input);

            $detalles = $this->validarDetalles($db, $detalles);

            $fecha = !empty($input['fecha']) ? trim($input['fecha']) : date('Y-m-d');
            $numeroInspeccion = trim((string)($input['numeroRegistro'] ?? ($input['numeroInspeccion'] ?? '')));
            $numeroSerieCerticav = trim((string)($input['numeroSerieCerticav'] ?? ''));
            $this->validarCorrelativos($db, $numeroInspeccion, $numeroSerieCerticav);

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

            $fechaVencimiento = \App\Libraries\VigenciaCertificado::vencimiento($fecha);
            $hoy = date('Y-m-d');

            $inspData = [
                'numero_registro'       => $numeroInspeccion,
                'numero_serie_certicav' => $numeroSerieCerticav,
                'primera_evaluacion'    => $primeraEvaluacion,
                'segunda_evaluacion'    => $segundaEvaluacion,
                'id_conductor'          => $conductorId,
                'id_vehiculo'           => $vehiculoId,
                'id_pago'               => (int) $pagoCerticav['id'],
                'id_tecnico'            => $tecnicoId,
                'nombre_tecnico'        => $inspectorNombre,
                'fecha'                 => $fecha,
                'resultado'             => $resultado,
                'observaciones'         => $observaciones,
                'estado'                => 'ACTIVO',
            ];
            $inspData['uuid'] = \App\Libraries\Identificador::nuevo();
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
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('Error creando la inspección.');
        } finally {
            if ($candadoPersona) {
                \App\Services\CandadoPersona::liberar($db);
            }
            if ($candado) {
                $db->query("SELECT RELEASE_LOCK('mjlo_certicav')");
            }
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
        if (array_key_exists('fecha', $input)) {
            if (trim((string)$input['fecha']) === '') return $this->failValidationErrors(['fecha' => 'La fecha de inspección es obligatoria.']);
            $erroresFecha = \App\Services\ValidacionRegistro::fechas($input, ['fecha']);
            if ($erroresFecha) return $this->failValidationErrors($erroresFecha);
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
            if (array_key_exists('inspector', $input) || array_key_exists('tecnicoId', $input)) {
                [$data['id_tecnico'], $data['nombre_tecnico']] = $this->resolverTecnicoInspeccion($db, $input);
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
            if (!$db->table('certicav')->where('id', $id)->countAllResults()) {
                return $this->failNotFound('Inspección técnica no encontrada.');
            }
            $db->table('certicav')->where('id', $id)->update(['estado' => 'ANULADA']);
            \App\Services\AuditoriaService::registrar('INSPECCIONES', 'ANULAR', 'Inspección técnica anulada (id ' . (int)$id . ')', ['id' => (int)$id]);
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

        $nombre = trim($nombre);
        if (mb_strlen($nombre) < 3 || mb_strlen($nombre) > 150) {
            throw new \DomainException('El conductor no está registrado: escriba su nombre completo (3 a 150 caracteres) para crearlo.');
        }
        if ($licencia !== '' && mb_strlen($licencia) > 20) {
            throw new \DomainException('El número de licencia no puede superar los 20 caracteres.');
        }

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
            'uuid' => \App\Libraries\Identificador::nuevo(),
            'id_tipo_documento' => 1,
            'numero'            => $dni,
            'estado'            => 'ACTIVO',
        ]);
        $conductorId = (int)$db->insertID();

        $db->table('ciudadanos')->insert([
            'id_persona'       => $conductorId,
            'nombres'          => mb_strtoupper($nombres, 'UTF-8'),
            'apellido_paterno' => mb_strtoupper($apellidoPaterno, 'UTF-8'),
            'apellido_materno' => $apellidoMaterno === null ? null : mb_strtoupper($apellidoMaterno, 'UTF-8'),
            'numero_licencia'  => ($licencia !== '' && $licencia !== $dni) ? $licencia : null,
        ]);

        return $conductorId;
    }

    private function esActualSql(): string
    {
        return "NOT EXISTS (SELECT 1 FROM certicav mas WHERE mas.id_vehiculo = i.id_vehiculo AND mas.estado != 'ANULADA' AND (mas.fecha > i.fecha OR (mas.fecha = i.fecha AND mas.id > i.id)))";
    }

    private function consultaInspeccion($db)
    {
        return $db->table('certicav i')
            ->select("(" . $this->esActualSql() . ") AS esActual, i.uuid AS uuid,
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
                v.id as vehiculoId,
                COALESCE(v.marca, '') as vehiculoMarca,
                COALESCE(v.modelo, '') as vehiculoModelo,
                COALESCE(v.color, '') as vehiculoColor,
                COALESCE(v.serie_motor, '') as vehiculoMotor,
                COALESCE(v.anio_fabricacion, '') as vehiculoAnio,
                COALESCE(a.razon_social, '') as transportador,
                COALESCE(CONCAT(cp.nombres, ' ', cp.apellido_paterno, ' ', COALESCE(cp.apellido_materno, '')), '') as propietario,
                COALESCE(pp.numero, '') as propietarioDni,
                COALESCE(NULLIF(i.nombre_tecnico, ''), CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, '')), 'Inspector Técnico Municipal') as inspector,
                i.fecha as fecha,
                i.fecha_segunda_evaluacion as fechaSegundaEvaluacion,
                i.resultado,
                i.observaciones,
                i.estado,
                i.fecha_modificacion as fechaModificacion,
                TIMESTAMPDIFF(SECOND, i.fecha_modificacion, NOW()) as segundosDesdeCreacion,
                GREATEST(0, 300 - TIMESTAMPDIFF(SECOND, i.fecha_modificacion, NOW())) as segundosRestantesTolerancia,
                CASE WHEN i.estado = 'PENDIENTE_REVISION' AND TIMESTAMPDIFF(SECOND, i.fecha_modificacion, NOW()) <= 300 THEN 1 ELSE 0 END as puedeEditar
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

    private function consultaDetalles($db)
    {
        return $db->table('certicav_detalles d')
            ->select('d.id_criterio as criterioId, d.estado_revision as estado, d.observacion as obs, ic.codigo, ic.nombre, ic.seccion, ic.orden')
            ->join('inspeccion_criterios ic', 'ic.id = d.id_criterio', 'left')
            ->orderBy('ic.orden', 'ASC');
    }

    private function aplicarVigencia(array $row): array
    {
        $row['id'] = (int)$row['id'];
        $base = ($row['resultado'] === 'APROBADO' && ($row['segundaEvaluacion'] ?? '') === 'APROBADO' && !empty($row['fechaSegundaEvaluacion']))
            ? $row['fechaSegundaEvaluacion']
            : ($row['fecha'] ?: date('Y-m-d'));
        $fechaVencimiento = \App\Libraries\VigenciaCertificado::vencimiento($base);
        $hoy = date('Y-m-d');

        $row['fechaVencimiento'] = $fechaVencimiento;
        $row['vigenciaMeses'] = 6;
        $row['diasRestantes'] = 0;

        if (($row['estado'] ?? '') === 'ANULADA') {
            $row['estadoVigencia'] = 'ANULADA';
        } elseif (($row['estado'] ?? '') === 'PENDIENTE_REVISION') {
            $row['estadoVigencia'] = 'PENDIENTE_REVISION';
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
        return $prefijo . str_pad((string)(((int)($row['n'] ?? 0)) + 1), 5, '0', STR_PAD_LEFT);
    }

    private function siguienteSerieCerticav($db): string
    {
        $row = $db->query(
            "SELECT MAX(CAST(numero_serie_certicav AS UNSIGNED)) AS n FROM certicav WHERE numero_serie_certicav REGEXP '^[0-9]+$'"
        )->getRowArray();
        return str_pad((string)(((int)($row['n'] ?? 0)) + 1), 7, '0', STR_PAD_LEFT);
    }

    private function resolverTecnicoInspeccion($db, array $input): array
    {
        $id = (int)($input['tecnicoId'] ?? 0);
        $nombre = trim((string)($input['inspector'] ?? ''));
        if ($id > 0) {
            $tecnico = $db->table('trabajadores t')
                ->select('c.nombres, c.apellido_paterno, c.apellido_materno')
                ->join('ciudadanos c', 'c.id_persona = t.id_persona', 'inner')
                ->where('t.id_persona', $id)->where('t.estado', 'ACTIVO')
                ->where(\App\Libraries\TipoInspector::sqlTieneRol('t', 'TECNICO'), null, false)
                ->get()->getRowArray();
            if (!$tecnico) throw new \DomainException('El responsable debe estar registrado como inspector de inspección técnica activo.');
            $nombre = trim($tecnico['nombres'] . ' ' . $tecnico['apellido_paterno'] . ' ' . ($tecnico['apellido_materno'] ?? ''));
        }
        if ($nombre === '' || mb_strlen($nombre) > 200) {
            throw new \DomainException('Escriba el nombre del inspector técnico (máximo 200 caracteres).');
        }
        return [$id > 0 ? $id : null, $nombre];
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
        if (count($seen) !== count($existentes)) throw new \DomainException('Debes evaluar todos los ítems del checklist.');
        return $detalles;
    }

    public function registrarDesdeMovil()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getPost();

        $vehiculoId = (int)($input['vehiculoId'] ?? 0);
        if ($vehiculoId <= 0 && !empty($input['vehiculoPlaca'])) {
            $vRow = $db->table('vehiculos')->where('placa', \App\Libraries\Placa::paraBusqueda($input['vehiculoPlaca']))->get()->getRowArray();
            if ($vRow) {
                $vehiculoId = (int)$vRow['id'];
            }
        }
        if ($vehiculoId <= 0) {
            return $this->failValidationErrors('Debe seleccionar un vehículo válido.');
        }

        // VALIDACIÓN ESTRICTA: Solo vehículos FORMALES (con id_asociacion)
        $vehiculo = $db->table('vehiculos')
            ->select('id, placa, id_asociacion, estado')
            ->where('id', $vehiculoId)
            ->where('estado', 'ACTIVO')
            ->get()
            ->getRowArray();

        if (!$vehiculo) {
            return $this->failNotFound('El vehículo seleccionado no existe o se encuentra inactivo.');
        }

        if (empty($vehiculo['id_asociacion'])) {
            return $this->failValidationErrors('Solo se permite realizar inspecciones técnicas a vehículos FORMALES debidamente autorizados con asociación.');
        }

        $placa = $vehiculo['placa'];

        $detalles = $input['detalles'] ?? [];
        try {
            $detalles = $this->validarDetalles($db, $detalles);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        }

        $cookieUser = \App\Services\AuthSession::resolveActiveUser($this->request->getCookie('session_user'));
        $tecnicoPersonaId = (int)($cookieUser['id_persona'] ?? 0);
        $tecnicoNombre = trim(($cookieUser['nombres'] ?? '') . ' ' . ($cookieUser['apellidos'] ?? ''));

        if ($tecnicoPersonaId > 0 && empty($tecnicoNombre)) {
            $tecnicoDb = $db->table('ciudadanos')->where('id_persona', $tecnicoPersonaId)->get()->getRowArray();
            if ($tecnicoDb) {
                $tecnicoNombre = trim($tecnicoDb['nombres'] . ' ' . $tecnicoDb['apellido_paterno'] . ' ' . ($tecnicoDb['apellido_materno'] ?? ''));
            }
        }
        if (empty($tecnicoNombre)) {
            $tecnicoNombre = trim((string)($input['inspector'] ?? 'Inspector Técnico'));
        }

        $fecha = !empty($input['fecha']) ? trim($input['fecha']) : date('Y-m-d');
        $numeroInspeccion = trim((string)($input['numeroRegistro'] ?? ($input['numeroInspeccion'] ?? '')));
        $numeroSerieCerticav = trim((string)($input['numeroSerieCerticav'] ?? ''));

        if ($numeroInspeccion === '') {
            $numeroInspeccion = $this->siguienteNumeroRegistro($db, substr($fecha, 0, 4));
        }
        if ($numeroSerieCerticav === '') {
            $numeroSerieCerticav = $this->siguienteSerieCerticav($db);
        }

        try {
            $this->validarCorrelativos($db, $numeroInspeccion, $numeroSerieCerticav);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        }

        $primeraEvaluacion = trim($input['primeraEvaluacion'] ?? 'APROBADO');
        if (!in_array($primeraEvaluacion, ['APROBADO', 'DESAPROBADO', 'OBSERVADO'], true)) {
            $primeraEvaluacion = 'APROBADO';
        }
        $resultado = trim($input['resultado'] ?? $primeraEvaluacion);
        if (!in_array($resultado, ['APROBADO', 'DESAPROBADO', 'OBSERVADO'], true)) {
            $resultado = 'APROBADO';
        }

        $conductorNombre = trim($input['conductorNombre'] ?? ($input['conductor'] ?? ''));
        $conductorDni = trim($input['conductorDni'] ?? '');
        $conductorLicencia = trim($input['conductorLicencia'] ?? '');
        $conductorId = null;
        if (!empty($conductorNombre) || !empty($conductorDni)) {
            $conductorId = $this->resolverConductor($db, $conductorNombre, $conductorDni, $conductorLicencia);
        }

        $observaciones = !empty($input['observaciones']) ? trim($input['observaciones']) : null;

        // Si ya hay un pago CERTICAV libre para este vehículo, lo vinculamos
        $idPago = null;
        try {
            $certicavPago = new \App\Services\CerticavPago($db);
            $pagoDisp = $certicavPago->pagoDisponible($vehiculoId);
            if ($pagoDisp) {
                $idPago = (int)$pagoDisp['id'];
            }
        } catch (\Throwable $e) {
            // No bloquea el guardado en estado pendiente de revisión
        }

        $candado = (int)($db->query("SELECT GET_LOCK('mjlo_certicav', 10) AS l")->getRowArray()['l'] ?? 0) === 1;
        if (!$candado) {
            return $this->failServerError('El sistema está procesando otra inspección. Intente nuevamente en unos segundos.');
        }

        try {
            $db->transException(true)->transBegin();

            $inspData = [
                'uuid'                  => \App\Libraries\Identificador::nuevo(),
                'numero_registro'       => $numeroInspeccion,
                'numero_serie_certicav' => $numeroSerieCerticav,
                'primera_evaluacion'    => $primeraEvaluacion,
                'segunda_evaluacion'    => null,
                'id_conductor'          => $conductorId,
                'id_vehiculo'           => $vehiculoId,
                'id_pago'               => $idPago,
                'id_tecnico'            => $tecnicoPersonaId > 0 ? $tecnicoPersonaId : null,
                'nombre_tecnico'        => $tecnicoNombre,
                'fecha'                 => $fecha,
                'resultado'             => $resultado,
                'observaciones'         => $observaciones,
                'estado'                => 'PENDIENTE_REVISION',
            ];

            $db->table('certicav')->insert($inspData);
            $inspeccionId = (int)$db->insertID();

            $filasDetalles = [];
            foreach ($detalles as $det) {
                $filasDetalles[] = [
                    'id_certicav'     => $inspeccionId,
                    'id_criterio'     => (int)$det['criterioId'],
                    'estado_revision' => trim($det['estado'] ?? 'BIEN'),
                    'observacion'     => trim($det['obs'] ?? ''),
                ];
            }
            if (!empty($filasDetalles)) {
                $db->table('certicav_detalles')->insertBatch($filasDetalles);
            }

            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->failServerError('Error guardando los datos de la inspección técnica.');
            }

            \App\Services\AuditoriaService::registrar(
                'INSPECCION_TECNICA',
                'REGISTRO_MOVIL',
                "El inspector técnico {$tecnicoNombre} registró la inspección de campo para el vehículo {$placa} (Registro: {$numeroInspeccion}). Enviada a revisión del Administrador.",
                ['id' => $inspeccionId, 'placa' => $placa, 'registro' => $numeroInspeccion, 'resultado' => $resultado]
            );

            return $this->respondCreated([
                'status'  => true,
                'message' => 'Inspección técnica enviada con éxito en estado pendiente de revisión para la aprobación del Administrador.',
                'data'    => [
                    'id'                  => $inspeccionId,
                    'numeroRegistro'      => $numeroInspeccion,
                    'numeroSerieCerticav' => $numeroSerieCerticav,
                    'vehiculoPlaca'       => $placa,
                    'fecha'               => $fecha,
                    'resultado'           => $resultado,
                    'primeraEvaluacion'   => $primeraEvaluacion,
                    'estado'              => 'PENDIENTE_REVISION',
                    'inspector'           => $tecnicoNombre,
                ],
            ]);
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', 'Error al registrar inspección desde móvil: ' . $e->getMessage());
            return $this->failServerError('Ocurrió un error al guardar la inspección técnica.');
        } finally {
            if ($candado) {
                $db->query("SELECT RELEASE_LOCK('mjlo_certicav')");
            }
        }
    }

    public function modificarDesdeMovil($id = null)
    {
        $db = \Config\Database::connect();
        $cookieUser = \App\Services\AuthSession::resolveActiveUser($this->request->getCookie('session_user'));
        if (!$cookieUser) {
            return $this->failUnauthorized('Sesión no válida o expirada.');
        }
        $tecnicoPersonaId = (int)($cookieUser['id_persona'] ?? 0);
        $tecnicoNombre = trim(($cookieUser['nombres'] ?? '') . ' ' . ($cookieUser['apellidos'] ?? ''));

        $id = (int)$id;
        if ($id <= 0) {
            return $this->failNotFound('ID de inspección no válido.');
        }

        $row = $db->table('certicav')->where('id', $id)->get()->getRowArray();
        if (!$row) {
            return $this->failNotFound('Inspección no encontrada.');
        }

        if ($row['estado'] !== 'PENDIENTE_REVISION') {
            return $this->failValidationErrors('La inspección ya no puede modificarse porque ha sido aprobada u oficializada.');
        }

        if ($tecnicoPersonaId > 0 && !empty($row['id_tecnico']) && (int)$row['id_tecnico'] !== $tecnicoPersonaId) {
            return $this->failForbidden('No tiene permisos para modificar una inspección realizada por otro inspector.');
        }

        // Tolerancia estricta de 5 minutos (300 segundos) desde la creación
        $segundosTranscurridos = (int)($db->query("SELECT TIMESTAMPDIFF(SECOND, ?, NOW()) AS seg", [$row['fecha_modificacion']])->getRowArray()['seg'] ?? 999);
        if ($segundosTranscurridos > 300) {
            return $this->failValidationErrors('Ha superado el tiempo de tolerancia de 5 minutos para modificar esta inspección técnica.');
        }

        $input = $this->request->getJSON(true) ?: $this->request->getPost();
        if (empty($input)) {
            return $this->failValidationErrors('Datos no proporcionados.');
        }

        $primeraEvaluacion = trim($input['primeraEvaluacion'] ?? ($row['primera_evaluacion'] ?? 'APROBADO'));
        if (!in_array($primeraEvaluacion, ['APROBADO', 'DESAPROBADO', 'OBSERVADO'], true)) {
            $primeraEvaluacion = 'APROBADO';
        }
        $resultado = trim($input['resultado'] ?? $primeraEvaluacion);
        if (!in_array($resultado, ['APROBADO', 'DESAPROBADO', 'OBSERVADO'], true)) {
            $resultado = 'APROBADO';
        }

        $observaciones = isset($input['observaciones']) ? trim($input['observaciones']) : $row['observaciones'];
        $detalles = $input['detalles'] ?? [];

        try {
            $db->transException(true)->transBegin();

            $updateData = [
                'primera_evaluacion' => $primeraEvaluacion,
                'resultado'          => $resultado,
                'observaciones'      => $observaciones,
                // Preservar la fecha_modificacion original para que la tolerancia sea estrictamente desde el inicio
                'fecha_modificacion' => $row['fecha_modificacion'],
            ];

            $db->table('certicav')->where('id', $id)->update($updateData);

            if (!empty($detalles) && is_array($detalles)) {
                $db->table('certicav_detalles')->where('id_certicav', $id)->delete();
                $filasDetalles = [];
                foreach ($detalles as $det) {
                    $filasDetalles[] = [
                        'id_certicav'     => $id,
                        'id_criterio'     => (int)$det['criterioId'],
                        'estado_revision' => trim($det['estado'] ?? 'BIEN'),
                        'observacion'     => trim($det['obs'] ?? ''),
                    ];
                }
                $db->table('certicav_detalles')->insertBatch($filasDetalles);
            }

            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->failServerError('Error guardando las modificaciones de la inspección.');
            }

            \App\Services\AuditoriaService::registrar(
                'INSPECCION_TECNICA',
                'MODIFICACION_TOLERANCIA_MOVIL',
                "El inspector técnico {$tecnicoNombre} modificó dentro de los 5 minutos de tolerancia la inspección ID {$id} (Registro: {$row['numero_registro']}).",
                ['id' => $id, 'registro' => $row['numero_registro'], 'resultado' => $resultado]
            );

            return $this->respond([
                'status'  => true,
                'message' => 'Inspección técnica modificada exitosamente dentro del período de tolerancia.',
                'data'    => array_merge($row, $updateData),
            ]);
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', 'Error modificando inspección desde móvil: ' . $e->getMessage());
            return $this->failServerError('Ocurrió un error al modificar la inspección técnica.');
        }
    }

    public function historialMovil()
    {
        $db = \Config\Database::connect();
        $cookieUser = \App\Services\AuthSession::resolveActiveUser($this->request->getCookie('session_user'));
        $tecnicoPersonaId = (int)($cookieUser['id_persona'] ?? 0);

        $builder = $this->consultaInspeccion($db)
            ->where('i.estado !=', 'ANULADA');

        if ($tecnicoPersonaId > 0) {
            $builder->where('i.id_tecnico', $tecnicoPersonaId);
        }

        $buscar = trim((string)$this->request->getGet('buscar'));
        if ($buscar !== '') {
            $builder->groupStart()
                ->like('i.numero_registro', $buscar)
                ->orLike('v.placa', \App\Libraries\Placa::paraBusqueda($buscar))
                ->orLike('a.razon_social', $buscar)
                ->groupEnd();
        }

        $rows = $builder->groupBy('i.id')
            ->orderBy('i.id', 'DESC')
            ->limit(50)
            ->get()
            ->getResultArray();

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

        return $this->respond(['status' => true, 'data' => $data]);
    }

    public function aprobar($id = null)
    {
        $db = \Config\Database::connect();
        $id = (int)$id;
        if ($id <= 0) {
            return $this->failNotFound('ID de inspección no válido.');
        }

        $row = $db->table('certicav')->where('id', $id)->get()->getRowArray();
        if (!$row) {
            return $this->failNotFound('Inspección no encontrada.');
        }

        if ($row['estado'] === 'ACTIVO') {
            return $this->respond(['status' => true, 'message' => 'La inspección ya se encuentra aprobada y activa.']);
        }

        $vehiculoId = (int)$row['id_vehiculo'];
        $idPago = $row['id_pago'];

        if (empty($idPago)) {
            try {
                $certicavPago = new \App\Services\CerticavPago($db);
                $pagoDisp = $certicavPago->pagoDisponible($vehiculoId);
                if ($pagoDisp) {
                    $idPago = (int)$pagoDisp['id'];
                }
            } catch (\Throwable $e) {}
        }

        $updateData = [
            'estado' => 'ACTIVO',
        ];
        if (!empty($idPago)) {
            $updateData['id_pago'] = $idPago;
        }

        $db->table('certicav')->where('id', $id)->update($updateData);

        \App\Services\AuditoriaService::registrar(
            'INSPECCION_TECNICA',
            'APROBACION_ADMIN',
            "El administrador aprobó la inspección técnica ID {$id} (Registro: {$row['numero_registro']}), pasando de PENDIENTE_REVISION a ACTIVO.",
            ['id' => $id, 'numero_registro' => $row['numero_registro'], 'estado' => 'ACTIVO']
        );

        return $this->respond([
            'status'  => true,
            'message' => 'Inspección técnica aprobada y oficializada con éxito.',
            'data'    => array_merge($row, $updateData),
        ]);
    }
}
