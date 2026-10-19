<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class InternamientosController extends ResourceController
{

    private const DEPOSITO_OFICIAL = \App\Services\InternamientoAutomatico::DEPOSITO_OFICIAL;

    use \App\Libraries\ResuelveUuid;

    protected string $tablaUuid = 'ordenes_internamiento';
    protected array $tablasUuidPorMetodo = [];
    protected array $soloUuidEnEstricto = [];

    protected $format = 'json';

    public function tarifas()
    {
        $db = \Config\Database::connect();

        return $this->respond(['data' => \App\Libraries\TarifasDeposito::obtener($db) + ['puedeEditar' => \App\Libraries\TarifasDeposito::esJefatura()]]);
    }

    public function guardarTarifas()
    {
        $input = $this->request->getJSON(true) ?? [];
        $deposito = round((float) ($input['guardianiaDia'] ?? -1), 2);
        if ($deposito < 0 || $deposito > 10000) {
            return $this->failValidationErrors('La tarifa del depósito debe estar entre 0 y 10,000 soles por día.');
        }
        $db = \Config\Database::connect();
        $actual = \App\Libraries\TarifasDeposito::obtener($db);
        \App\Libraries\TarifasDeposito::guardar($db, $deposito, $actual['remolque']);
        \App\Services\AuditoriaService::registrar('INTERNAMIENTOS', 'TARIFAS', 'Tarifa del depósito actualizada: S/ ' . $deposito . ' por día (antes S/ ' . $actual['guardianiaDia'] . ')', ['depositoDia' => $deposito, 'anterior' => $actual['guardianiaDia']]);

        return $this->respond(['data' => \App\Libraries\TarifasDeposito::obtener($db) + ['puedeEditar' => true], 'message' => 'Tarifa del depósito actualizada.']);
    }

    public function estadisticas()
    {
        $db = \Config\Database::connect();
        $row = $db->table('ordenes_internamiento')
            ->select("
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'RETENIDO' THEN 1 ELSE 0 END) as en_deposito,
                SUM(CASE WHEN estado = 'LIBERADO' THEN 1 ELSE 0 END) as liberados,
                AVG(CASE WHEN estado = 'RETENIDO' THEN GREATEST(1, DATEDIFF(CURDATE(), DATE(fecha_ingreso))) ELSE COALESCE(total_dias, 1) END) as avg_dias
            ", false)
            ->get()->getRowArray();

        return $this->respond(['data' => [
            'total' => (int) ($row['total'] ?? 0),
            'enDeposito' => (int) ($row['en_deposito'] ?? 0),
            'liberados' => (int) ($row['liberados'] ?? 0),
            'avgDias' => (int) round((float) ($row['avg_dias'] ?? 0)),
        ]]);
    }

    public function index()
    {
        $db = \Config\Database::connect();

        try {
            $builder = $db->table('ordenes_internamiento oi')
                ->select("oi.uuid AS uuid, 
                    oi.id,
                    oi.id_papeleta as papeletaId,
                    oi.id_vehiculo as vehiculoId,
                    v.placa as vehiculoPlaca,
                    COALESCE(v.marca, '') as vehiculoMarca,
                    COALESCE(v.modelo, '') as vehiculoModelo,
                    COALESCE(v.color, '') as vehiculoColor,
                    COALESCE(tv.nombre, '') as vehiculoTipo,
                    COALESCE(v.serie_motor, '') as vehiculoMotor,
                    CASE WHEN v.id_asociacion IS NOT NULL THEN 'FORMAL' ELSE 'INFORMAL' END as vehiculoFormalidad,
                    COALESCE(aso.razon_social, 'Sin Asociación (Informal)') as vehiculoAsociacion,
                    p.numero_papeleta as numeroPapeleta,
                    p.monto_total as montoPapeleta,
                    p.estado as papeletaEstado,
                    oi.fecha_ingreso as fechaIngreso,
                    oi.fecha_salida as fechaSalida,
                    oi.deposito,
                    oi.motivo,
                    oi.lugar_intervencion as lugarIntervencion,
                    oi.numero_boleta as numeroBoleta,
                    CASE WHEN oi.estado = 'RETENIDO'
                         THEN GREATEST(1, DATEDIFF(CURDATE(), DATE(oi.fecha_ingreso)))
                         ELSE COALESCE(oi.total_dias, GREATEST(1, DATEDIFF(COALESCE(DATE(oi.fecha_salida), CURDATE()), DATE(oi.fecha_ingreso))))
                    END as totalDias,
                    oi.estado,
                    oi.observaciones,
                    oi.grado_remisor as gradoRemisor,
                    oi.carnet_remisor as carnetRemisor,
                    oi.autoridad_que_dispone as autoridadQueDispone,
                    oi.estado_carroceria as estadoCarroceria,
                    COALESCE(CONCAT(rem_c.nombres, ' ', rem_c.apellido_paterno, ' ', COALESCE(rem_c.apellido_materno, '')), 'Inspector Remisor') as remisorNombre,
                    COALESCE(CONCAT(inte_c.nombres, ' ', inte_c.apellido_paterno, ' ', COALESCE(inte_c.apellido_materno, '')), 'Conductor / Interesado') as interesadoNombre,
                    COALESCE(inte.numero, 'S/D') as interesadoDni,
                    COALESCE(inte_c.nombres, '') as interesadoNombres,
                    TRIM(CONCAT_WS(' ', inte_c.apellido_paterno, inte_c.apellido_materno)) as interesadoApellidos,
                    COALESCE(
                        NULLIF(TRIM(CONCAT_WS(' ', con_c.nombres, con_c.apellido_paterno, con_c.apellido_materno)), ''),
                        NULLIF(p.conductor_informal_nombres, ''),
                        'Conductor no identificado'
                    ) as conductorNombre,
                    COALESCE(con.numero, NULLIF(p.conductor_informal_dni, ''), 'S/D') as conductorDni,
                    COALESCE(inte.direccion, '') as interesadoDireccion,
                    CASE WHEN aut.id IS NOT NULL THEN COALESCE(NULLIF(TRIM(CONCAT_WS(' ', aut_c.nombres, aut_c.apellido_paterno, aut_c.apellido_materno)), ''), '') ELSE COALESCE(NULLIF(TRIM(CONCAT_WS(' ', inte_c.nombres, inte_c.apellido_paterno, inte_c.apellido_materno)), ''), '') END as autorizadoNombre,
                    CASE WHEN aut.id IS NOT NULL THEN COALESCE(aut.numero, '') ELSE COALESCE(inte.numero, '') END as autorizadoDni,
                    CASE WHEN aut.id IS NOT NULL THEN COALESCE(aut.direccion, '') ELSE COALESCE(inte.direccion, '') END as autorizadoDireccion,
                    COALESCE(v.anio_fabricacion, '') as vehiculoAnio,
                    COALESCE(inte_c.fecha_nacimiento, '') as interesadoFechaNacimiento,
                    ol.id as ordenLibertadId,
                    ol.numero_orden as numeroOrdenLibertad,
                    ol.fecha_emision as fechaLiberacion,
                    ol.numero_recibo_papeleta as reciboPapeleta,
                    ol.monto_papeleta as montoPapeletaCobrada,
                    ol.numero_recibo_guardiania as reciboGuardiania,
                    ol.monto_guardiania as montoGuardiania,
                    ol.numero_recibo_remolque as reciboRemolque,
                    ol.monto_remolque as montoRemolque,
                    ol.monto_total as montoTotalLiberacion
                ", false)
                ->join('vehiculos v', 'v.id = oi.id_vehiculo', 'left')
                ->join('tipos_vehiculo tv', 'tv.id = v.id_tipo_vehiculo', 'left')
                ->join('asociaciones aso', 'aso.id = v.id_asociacion', 'left')
                ->join('papeletas p', 'p.id = oi.id_papeleta', 'left')
                ->join('personas rem', 'rem.id = oi.id_remisor', 'left')
                ->join('ciudadanos rem_c', 'rem_c.id_persona = rem.id', 'left')
                ->join('personas con', 'con.id = p.id_persona_infractor', 'left')
                ->join('ciudadanos con_c', 'con_c.id_persona = con.id', 'left')
                ->join('personas inte', 'inte.id = oi.id_interesado', 'left')
                ->join('ciudadanos inte_c', 'inte_c.id_persona = inte.id', 'left')
                ->join('ordenes_libertad ol', 'ol.id_internamiento = oi.id', 'left')
                ->join('personas aut', 'aut.id = ol.id_persona_autorizada', 'left')
                ->join('ciudadanos aut_c', 'aut_c.id_persona = aut.id', 'left');

            $internamientoId = (int)$this->request->getGet('internamientoId');
            if ($internamientoId > 0) $builder->where('oi.id', $internamientoId);
            $buscar = trim((string)$this->request->getGet('buscar'));
            if ($buscar !== '') {
                $builder->groupStart()
                    ->like('oi.numero_boleta', $buscar)
                    ->orLike('v.placa', \App\Libraries\Placa::paraBusqueda($buscar))
                    ->orLike('p.numero_papeleta', $buscar)
                    ->orLike('inte.numero', $buscar)
                    ->orLike('inte_c.nombres', $buscar)
                    ->orLike('inte_c.apellido_paterno', $buscar)
                    ->orLike('inte_c.apellido_materno', $buscar)
                    ->orWhere(\App\Libraries\Busqueda::nombreCompleto($buscar, 'inte_c.nombres', 'inte_c.apellido_paterno', 'inte_c.apellido_materno'), null, false)
                    ->orLike('con.numero', $buscar)
                    ->orWhere(\App\Libraries\Busqueda::nombreCompleto($buscar, 'con_c.nombres', 'con_c.apellido_paterno', 'con_c.apellido_materno'), null, false)
                    ->groupEnd();
            }

            $estado = strtoupper(trim((string)$this->request->getGet('estado')));
            if ($estado !== '' && $estado !== 'TODOS') {
                $builder->where('oi.estado', $estado);
            }

            $page = (int)$this->request->getGet('page');
            $porPagina = max(1, min(200, (int)($this->request->getGet('porPagina') ?: 20)));

            $columnasOrdenables = [
                'numeroBoleta' => 'oi.numero_boleta',
                'vehiculoPlaca' => 'vehiculoPlaca',
                'conductorNombre' => 'conductorNombre',
                'fechaIngreso' => 'oi.fecha_ingreso',
                'estado' => 'oi.estado',
                'totalDias' => 'oi.total_dias',
            ];

            $total = 0;
            if ($page > 0) {
                $total = (clone $builder)->countAllResults(false);
                $rows = \App\Libraries\QuerySort::aplicar($builder, $this->request, $columnasOrdenables, 'oi.id')
                    ->limit($porPagina, ($page - 1) * $porPagina)
                    ->get()
                    ->getResultArray();
            } else {
                $rows = $builder->orderBy('oi.id', 'DESC')
                    ->get()
                    ->getResultArray();
            }

            $internamientoIds = array_map(static fn (array $r): int => (int)$r['id'], $rows);
            $inventariosPorOrden = [];

            if (!empty($internamientoIds)) {
                $invRows = $db->table('orden_internamiento_inventario oii')
                    ->select("
                        oii.id_orden_internamiento as ordenId,
                        oii.id_criterio as criterioId,
                        ic.codigo,
                        ic.nombre,
                        ic.seccion,
                        oii.cantidad,
                        oii.estado
                    ", false)
                    ->join('inventario_criterios ic', 'ic.id = oii.id_criterio', 'inner')
                    ->whereIn('oii.id_orden_internamiento', $internamientoIds)
                    ->orderBy('ic.orden', 'ASC')
                    ->get()
                    ->getResultArray();

                foreach ($invRows as $inv) {
                    $ordenId = (int)$inv['ordenId'];
                    unset($inv['ordenId']);
                    $inventariosPorOrden[$ordenId][] = $inv;
                }
            }

            $infraccionesPorPapeleta = [];
            $codigosPorPapeleta = [];
            $descripcionesPorPapeleta = [];
            $papeletaIds = array_values(array_unique(array_filter(array_map(static fn (array $r): int => (int)($r['papeletaId'] ?? 0), $rows))));
            if (!empty($papeletaIds)) {
                $detRows = $db->table('papeleta_detalles pd')
                    ->select('pd.id_papeleta AS papeletaId, ti.codigo, ti.descripcion, ti.gravedad, ti.porcentaje_uit AS porcentajeUit, pd.monto_final AS monto')
                    ->join('tipos_infraccion ti', 'ti.id = pd.id_tipo_infraccion', 'inner')
                    ->whereIn('pd.id_papeleta', $papeletaIds)
                    ->orderBy('pd.id', 'ASC')
                    ->get()->getResultArray();
                foreach ($detRows as $d) {
                    $idPap = (int)$d['papeletaId'];
                    unset($d['papeletaId']);
                    $d['monto'] = (float)$d['monto'];
                    $d['porcentajeUit'] = (float)$d['porcentajeUit'];
                    $codigosPorPapeleta[$idPap][] = $d['codigo'];
                    $descripcionesPorPapeleta[$idPap][] = $d['descripcion'];
                    $infraccionesPorPapeleta[$idPap][] = $d;
                }
            }

            $data = array_map(static function (array $r) use ($inventariosPorOrden, $infraccionesPorPapeleta, $codigosPorPapeleta, $descripcionesPorPapeleta): array {
                $r['id'] = (int)$r['id'];
                $r['papeletaId'] = $r['papeletaId'] ? (int)$r['papeletaId'] : null;
                $r['vehiculoId'] = (int)$r['vehiculoId'];
                $r['montoPapeleta'] = (float)($r['montoPapeleta'] ?? 0);
                $r['totalDias'] = (int)($r['totalDias'] ?? 0);
                $r['montoTotalLiberacion'] = $r['montoTotalLiberacion'] ? (float)$r['montoTotalLiberacion'] : null;
                $r['inventario'] = $inventariosPorOrden[$r['id']] ?? [];
                $r['infracciones'] = $infraccionesPorPapeleta[$r['papeletaId'] ?? 0] ?? [];
                $r['infraccionCodigo'] = isset($codigosPorPapeleta[$r['papeletaId'] ?? 0]) ? implode(', ', $codigosPorPapeleta[$r['papeletaId']]) : null;
                $r['infraccionDescripcion'] = isset($descripcionesPorPapeleta[$r['papeletaId'] ?? 0]) ? implode('; ', $descripcionesPorPapeleta[$r['papeletaId']]) : null;
                return $r;
            }, $rows);

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
        } catch (\Throwable $e) {
            return $this->failServerError('Error consultando internamientos.');
        }
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true);
        if (!is_array($input)) {
            $input = json_decode($this->request->getBody() ?: '', true) ?? $this->request->getPost();
        }

        $rules = [
            'idPapeleta' => [
                'rules' => 'required|is_natural_no_zero',
                'errors' => [
                    'required' => 'Debe seleccionar la papeleta que origina el internamiento.',
                    'is_natural_no_zero' => 'La papeleta seleccionada no es válida.'
                ]
            ],
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $candadoNumero = false;
        try {
            $idPapeleta = (int)$input['idPapeleta'];

            $papeleta = $db->table('papeletas')->where('id', $idPapeleta)->get()->getRowArray();
            if (!$papeleta) {
                return $this->failNotFound('No se encontró la papeleta indicada.');
            }
            if (!$papeleta['id_vehiculo']) {
                return $this->failValidationErrors('Esta papeleta no tiene un vehículo identificado; no se puede generar el internamiento.');
            }
            if ($papeleta['estado'] === 'ANULADA') {
                return $this->failValidationErrors('La papeleta está anulada: no se puede internar un vehículo por una papeleta anulada.');
            }
            $yaRetenido = $db->table('ordenes_internamiento')->select('numero_boleta')->where('id_vehiculo', (int)$papeleta['id_vehiculo'])->where('estado', 'RETENIDO')->get()->getRowArray();
            if ($yaRetenido) {
                return $this->failValidationErrors('Este vehículo ya está retenido en el depósito (boleta ' . ($yaRetenido['numero_boleta'] ?? 's/n') . '). Libérelo antes de registrar otro internamiento.');
            }

            $existe = $db->table('ordenes_internamiento')->where('id_papeleta', $idPapeleta)->countAllResults();
            if ($existe > 0) {
                return $this->failValidationErrors('Esta papeleta ya tiene un internamiento registrado.');
            }

            $idInteresado = null;
            $interesadoDni = trim($input['interesadoDni'] ?? '');
            if ($interesadoDni !== '') {
                $persona = $db->table('personas')->where('numero', $interesadoDni)->get()->getRowArray();
                if (!$persona) {
                    return $this->failNotFound('No se encontró una persona con el DNI del interesado proporcionado.');
                }
                $idInteresado = (int)$persona['id'];
            }

            $idRemisor = (int)($input['idRemisor'] ?? 0);
            if ($idRemisor > 0) {
                $remisor = $db->table('trabajadores')->where('id_persona', $idRemisor)->where('estado', 'ACTIVO')->get()->getRowArray();
                if (!$remisor) {
                    return $this->failValidationErrors('El inspector remisor no existe o está inactivo.');
                }
            } else {
                $idRemisor = null;
            }

// Generar correlativos de orden y boleta bajo bloqueo.
            $candadoNumero = (int) ($db->query("SELECT GET_LOCK('mjlo_numero_internamiento', 10) AS ok")->getRowArray()['ok'] ?? 0) === 1;
            if (!$candadoNumero) {
                return $this->failServerError('El sistema está generando otro internamiento. Intente nuevamente.');
            }
            $ultimaBoleta = (int) ($db->query("SELECT COALESCE(MAX(CAST(SUBSTRING(numero_boleta, 5) AS UNSIGNED)), 0) AS m FROM ordenes_internamiento WHERE numero_boleta REGEXP '^BOL-[0-9]+$'")->getRowArray()['m'] ?? 0);
            $numeroBoleta = 'BOL-' . str_pad((string)($ultimaBoleta + 1), 6, '0', STR_PAD_LEFT);

            $record = [
                'id_papeleta' => $idPapeleta,
                'id_vehiculo' => (int)$papeleta['id_vehiculo'],
                'numero_boleta' => $numeroBoleta,
                'id_remisor' => $idRemisor,
                'id_interesado' => $idInteresado,
                'fecha_ingreso' => date('Y-m-d H:i:s'),

                'deposito' => self::DEPOSITO_OFICIAL,
                'motivo' => trim($input['motivo'] ?? ''),

                'lugar_intervencion' => trim((string)($papeleta['lugar'] ?? '')),
                'grado_remisor' => $this->cargoDelInspector($db, $papeleta),

                'carnet_remisor' => $this->carneDelInspector($db, $papeleta),
                'autoridad_que_dispone' => $this->cargoDelInspector($db, $papeleta),
                'estado_carroceria' => $this->carroceriaDelVehiculo($db, (int)$papeleta['id_vehiculo']),
                'observaciones' => trim($input['observaciones'] ?? ''),
                'estado' => 'RETENIDO',
            ];

            $inventario = [];
            foreach ((array)($input['inventario'] ?? []) as $fila) {
                $idCriterio = (int)($fila['idCriterio'] ?? 0);
                $cantidad = $fila['cantidad'] ?? null;
                if ($idCriterio <= 0 || !is_numeric($cantidad) || (int)$cantidad < 0 || (int)$cantidad > 99) {
                    return $this->failValidationErrors('El inventario tiene un elemento o una cantidad no válidos.');
                }
                $inventario[$idCriterio] = (int)$cantidad;
            }
            if ($inventario) {
                $validos = $db->table('inventario_criterios')->select('id')->whereIn('id', array_keys($inventario))->get()->getResultArray();
                if (count($validos) !== count($inventario)) {
                    return $this->failValidationErrors('El inventario incluye elementos que no existen.');
                }
            }

            $record['uuid'] = \App\Libraries\Identificador::nuevo();
            $db->transStart();
            $db->table('ordenes_internamiento')->insert($record);
            $insertId = $db->insertID();
            foreach ($inventario as $idCriterio => $cantidad) {
                $db->table('orden_internamiento_inventario')->insert([
                    'id_orden_internamiento' => $insertId,
                    'id_criterio' => $idCriterio,
                    'cantidad' => $cantidad,
                    'estado' => 'REGISTRADO',
                ]);
            }
            $db->transComplete();
            if ($db->transStatus() === false) {
                return $this->failServerError('No se pudo registrar el internamiento.');
            }

            if (class_exists('\App\Services\AuditoriaService')) {
                \App\Services\AuditoriaService::registrar(
                    'INTERNAMIENTOS',
                    'REGISTRAR',
                    "Se registró el internamiento {$numeroBoleta} para el vehículo de la papeleta #{$idPapeleta}",
                    ['id' => $insertId, 'numeroBoleta' => $numeroBoleta, 'idPapeleta' => $idPapeleta]
                );
            }

            return $this->respondCreated(['status' => 201, 'message' => 'Internamiento registrado exitosamente.', 'data' => [
                'id' => $insertId,
                'numeroBoleta' => $numeroBoleta,
            ]]);
        } catch (\Throwable $e) {
            if (str_contains($e->getMessage(), 'Duplicate entry')) {
                return $this->failValidationErrors('Este vehículo o esta papeleta ya tiene un internamiento activo.');
            }
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('Error al registrar el internamiento.');
        } finally {
            if ($candadoNumero) {
                $db->query("SELECT RELEASE_LOCK('mjlo_numero_internamiento')");
            }
        }
    }

/**
     * Cobro y liberación de un vehículo internado: registra el pago de la papeleta (si aún no está pagada), la
     * guardianía y el remolque, emite la ORDEN DE LIBERTAD y pasa el internamiento a LIBERADO. Todo en una sola
     * transacción: o se hace completo o no se hace nada.
     */
    public function liberar($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?? [];

        try {
            $fechaPago = trim((string)($input['fechaPago'] ?? date('Y-m-d')));
            $reciboPapeleta = trim((string)($input['reciboPapeleta'] ?? ''));
            // Un solo recibo de la M.J.L.O. cubre la papeleta y el depósito por día; ya no hay guardianía ni remolque aparte
            $montoGuardiania = round((float)($input['montoGuardiania'] ?? 0), 2);
            $montoRemolque = 0.0;
            $observaciones = trim((string)($input['observaciones'] ?? ''));
            $dniAutorizado = trim((string)($input['autorizadoDni'] ?? ''));

            if ($montoGuardiania < 0 || $montoRemolque < 0 || $montoGuardiania > 100000 || $montoRemolque > 100000) {
                throw new \DomainException('Los montos no son válidos.');
            }
            if (strlen($reciboPapeleta) > 50) {
                throw new \DomainException('El número de recibo supera los 50 caracteres.');
            }

// Serializar el correlativo de libertad hasta finalizar la operación.
            $candadoLibertad = (int) ($db->query("SELECT GET_LOCK('mjlo_numero_libertad', 10) AS ok")->getRowArray()['ok'] ?? 0) === 1;
            if (!$candadoLibertad) {
                throw new \DomainException('El sistema está generando otra orden de libertad. Intente nuevamente.');
            }
            $db->transException(true)->transBegin();

            $orden = $db->query('SELECT * FROM ordenes_internamiento WHERE id = ? FOR UPDATE', [(int)$id])->getRowArray();
            if (!$orden) {
                $db->transRollback();
                return $this->failNotFound('Internamiento no encontrado.');
            }
            if ($orden['estado'] !== 'RETENIDO') {
                throw new \DomainException('Este vehículo ya fue liberado.');
            }

            $diasCustodia = max(1, (int)(new \DateTime(substr($orden['fecha_ingreso'], 0, 10)))->diff(new \DateTime(date('Y-m-d')))->days);
            $huboRebaja = \App\Libraries\TarifasDeposito::validar(
                \App\Libraries\TarifasDeposito::obtener($db), $diasCustodia, $montoGuardiania, $montoRemolque, \App\Libraries\TarifasDeposito::esJefatura()
            );

            $idAutorizada = (int)($orden['id_interesado'] ?? 0);
            if ($dniAutorizado !== '') {
                $persona = $db->table('personas')->where('numero', $dniAutorizado)->get()->getRowArray();
                if (!$persona) {
                    throw new \DomainException('No se encontró a la persona que retira el vehículo (DNI ' . $dniAutorizado . '). Regístrela primero en Personas.');
                }
                $idAutorizada = (int)$persona['id'];
            }
            if ($idAutorizada <= 0) {
                throw new \DomainException('Indique el DNI de la persona que retira el vehículo.');
            }

            $montoPapeleta = 0.0;
            $papeleta = $orden['id_papeleta'] ? $db->table('papeletas')->where('id', (int)$orden['id_papeleta'])->get()->getRowArray() : null;
            if ($papeleta) {
                if ($papeleta['estado'] === 'ANULADA') {
                    throw new \DomainException('La papeleta del internamiento está anulada.');
                }
                $montoPapeleta = (float)$papeleta['monto_total'];
                if ($papeleta['estado'] !== 'PAGADA') {
                    // Sin N° de recibo escrito, el sistema emite el recibo automático (REC-…), igual que en Pagos
                    $servicio = new \App\Services\PagosTransito($db);
                    $pago = $servicio->generar('PAPELETA', (int)$papeleta['id']);
                    $confirmado = $servicio->confirmar((int)$pago['id'], [
                        'numeroRecibo' => $reciboPapeleta,
                        'fechaPago' => $fechaPago,
                        'metodoPago' => trim((string)($input['metodoPago'] ?? '')),
                        'numeroVoucher' => trim((string)($input['numeroVoucher'] ?? '')),
                    ]);
                    $reciboPapeleta = (string)($confirmado['numero_recibo'] ?? $reciboPapeleta);
                } else {
                    $pagado = $db->table('pagos_transito')->select('numero_recibo')
                        ->where('id_papeleta', (int)$papeleta['id'])->where('estado', 'PAGADO')->get()->getRowArray();
                    $reciboPapeleta = $pagado['numero_recibo'] ?? $reciboPapeleta;
                }
            }

            if ($montoGuardiania > 0 && $reciboPapeleta === '') {
                throw new \DomainException('Ingrese el N° de recibo de la M.J.L.O.');
            }

            $siguiente = (int)($db->query("SELECT COALESCE(MAX(CAST(SUBSTRING(numero_orden, 5) AS UNSIGNED)), 0) AS m FROM ordenes_libertad WHERE numero_orden LIKE 'LIB-%'")->getRowArray()['m'] ?? 0) + 1;
            $numeroOrden = 'LIB-' . str_pad((string)$siguiente, 6, '0', STR_PAD_LEFT);
            $total = round($montoPapeleta + $montoGuardiania + $montoRemolque, 2);

            $db->table('ordenes_libertad')->insert([
                'uuid' => \App\Libraries\Identificador::nuevo(),
                'id_internamiento' => (int)$orden['id'],
                'id_persona_autorizada' => $idAutorizada,
                'fecha_emision' => date('Y-m-d'),
                'numero_orden' => $numeroOrden,
                'numero_recibo_papeleta' => $reciboPapeleta !== '' ? $reciboPapeleta : null,
                'monto_papeleta' => $montoPapeleta,
                'numero_recibo_guardiania' => $montoGuardiania > 0 ? $reciboPapeleta : null,
                'monto_guardiania' => $montoGuardiania,
                'numero_recibo_remolque' => null,
                'monto_remolque' => $montoRemolque,
                'monto_total' => $total,
                'observaciones' => $observaciones !== '' ? $observaciones : null,
                'estado' => 'EMITIDA',
            ]);

            $dias = max(1, (int)(new \DateTime(substr($orden['fecha_ingreso'], 0, 10)))->diff(new \DateTime(date('Y-m-d')))->days);
            $db->table('ordenes_internamiento')->where('id', (int)$orden['id'])->update([
                'estado' => 'LIBERADO',
                'fecha_salida' => date('Y-m-d H:i:s'),
                'total_dias' => $dias,
            ]);

            $db->transCommit();

            \App\Services\AuditoriaService::registrar(
                'INTERNAMIENTOS',
                'LIBERAR',
                "Se cobró y liberó el vehículo del internamiento {$orden['numero_boleta']} (orden {$numeroOrden}, total S/ {$total})" . ($huboRebaja ? ' con rebaja de la tarifa autorizada por jefatura' : ''),
                ['idInternamiento' => (int)$orden['id'], 'numeroOrden' => $numeroOrden, 'total' => $total]
            );

            return $this->respondCreated(['status' => 201, 'message' => 'Pago registrado y vehículo liberado.', 'data' => [
                'numeroOrdenLibertad' => $numeroOrden,
                'montoTotal' => $total,
                'totalDias' => $dias,
            ]]);
        } catch (\DomainException $e) {
            $db->transRollback();
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('No se pudo registrar el pago y la liberación.');
        } finally {
            $db->query("SELECT RELEASE_LOCK('mjlo_numero_libertad')");
        }
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true);
        if (!is_array($input)) {
            return $this->failValidationErrors('Datos no válidos.');
        }

        try {
            $db->transException(true)->transBegin();

            $orden = $db->query('SELECT * FROM ordenes_internamiento WHERE id = ? FOR UPDATE', [(int)$id])->getRowArray();
            if (!$orden) {
                $db->transRollback();
                return $this->failNotFound('Internamiento no encontrado.');
            }
// No modificar los datos de una orden ya liberada.
            if ($orden['estado'] !== 'RETENIDO') {
                unset($input['motivo'], $input['interesadoDni'], $input['inventario']);
            }
            // El encargado del depósito completa el inventario y las observaciones; el motivo y el interesado son de oficina.
            if (\App\Libraries\Acceso::esEncargadoDeposito()) {
                unset($input['motivo'], $input['interesadoDni']);
            }
            $cambios = [];
            $mapa = [
                'motivo' => 'motivo',
                'observaciones' => 'observaciones',
            ];
            foreach ($mapa as $clave => $columna) {
                if (array_key_exists($clave, $input)) {
                    $cambios[$columna] = trim((string)$input[$clave]);
                }
            }

            if (array_key_exists('interesadoDni', $input)) {
                $dni = trim((string)$input['interesadoDni']);
                if ($dni === '') {
                    $cambios['id_interesado'] = null;
                } else {
                    $persona = $db->table('personas')->where('numero', $dni)->get()->getRowArray();
                    if (!$persona) {
                        throw new \DomainException('No se encontró una persona con el DNI del interesado indicado.');
                    }
                    $cambios['id_interesado'] = (int)$persona['id'];
                }
            }

            $inventario = null;
            if (array_key_exists('inventario', $input)) {
                $inventario = [];
                foreach ((array)$input['inventario'] as $fila) {
                    $idCriterio = (int)($fila['idCriterio'] ?? 0);
                    $cantidad = $fila['cantidad'] ?? null;
                    if ($idCriterio <= 0 || !is_numeric($cantidad) || (int)$cantidad < 0 || (int)$cantidad > 99) {
                        throw new \DomainException('El inventario tiene un elemento o una cantidad no válidos.');
                    }
                    $inventario[$idCriterio] = (int)$cantidad;
                }
                if ($inventario) {
                    $validos = $db->table('inventario_criterios')->select('id')->whereIn('id', array_keys($inventario))->get()->getResultArray();
                    if (count($validos) !== count($inventario)) {
                        throw new \DomainException('El inventario incluye elementos que no existen.');
                    }
                }
            }

            if ($cambios) {
                $db->table('ordenes_internamiento')->where('id', (int)$orden['id'])->update($cambios);
            }
            if ($inventario !== null) {
                $db->table('orden_internamiento_inventario')->where('id_orden_internamiento', (int)$orden['id'])->delete();
                foreach ($inventario as $idCriterio => $cantidad) {
                    $db->table('orden_internamiento_inventario')->insert([
                        'id_orden_internamiento' => (int)$orden['id'],
                        'id_criterio' => $idCriterio,
                        'cantidad' => $cantidad,
                        'estado' => 'REGISTRADO',
                    ]);
                }
            }

            $db->transCommit();

            \App\Services\AuditoriaService::registrar(
                'INTERNAMIENTOS',
                'EDITAR',
                "Se editó el internamiento {$orden['numero_boleta']}",
                ['id' => (int)$orden['id'], 'campos' => array_keys($cambios), 'inventario' => $inventario !== null]
            );

            return $this->respond(['status' => 200, 'message' => 'Internamiento actualizado.']);
        } catch (\DomainException $e) {
            $db->transRollback();
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('No se pudo actualizar el internamiento.');
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();

        try {
            $db->transException(true)->transBegin();

            $orden = $db->query('SELECT * FROM ordenes_internamiento WHERE id = ? FOR UPDATE', [(int)$id])->getRowArray();
            if (!$orden) {
                $db->transRollback();
                return $this->failNotFound('Internamiento no encontrado.');
            }
            if ($db->table('ordenes_libertad')->where('id_internamiento', (int)$orden['id'])->countAllResults() > 0) {
                throw new \DomainException('No se puede eliminar un internamiento con orden de libertad. Debe conservarse su historial y sus cobros.');
            }
            $db->table('orden_internamiento_inventario')->where('id_orden_internamiento', (int)$orden['id'])->delete();
            $db->table('ordenes_internamiento')->where('id', (int)$orden['id'])->delete();
            $db->transCommit();

            \App\Services\AuditoriaService::registrar(
                'INTERNAMIENTOS',
                'ELIMINAR',
                "Se eliminó el internamiento {$orden['numero_boleta']}",
                ['id' => (int)$orden['id'], 'numeroBoleta' => $orden['numero_boleta']]
            );

            return $this->respondDeleted(['status' => 200, 'message' => 'Internamiento eliminado.']);
        } catch (\DomainException $e) {
            $db->transRollback();
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('No se pudo eliminar el internamiento.');
        }
    }

    private function cargoDelInspector($db, array $papeleta): string
    {
        if (empty($papeleta['id_inspector'])) {
            return 'Inspector de Tránsito Municipal';
        }
        $fila = $db->table('desplazamiento_oficina d')
            ->select('c.nombre')
            ->join('cargos c', 'c.id = d.id_cargo', 'inner')
            ->where('d.id_trabajador', (int)$papeleta['id_inspector'])
            ->where('d.fecha_termino IS NULL', null, false)
            ->orderBy('d.id', 'DESC')
            ->get()->getRowArray();

        return trim((string)($fila['nombre'] ?? '')) ?: 'Inspector de Tránsito Municipal';
    }

    private function carroceriaDelVehiculo($db, int $idVehiculo): string
    {
        $v = $db->table('vehiculos')->select('carroceria, tipo_carroceria')->where('id', $idVehiculo)->get()->getRowArray();
        $partes = array_filter([trim((string)($v['carroceria'] ?? '')), trim((string)($v['tipo_carroceria'] ?? ''))]);

        return implode(' - ', array_unique($partes));
    }

    private function carneDelInspector($db, array $papeleta): string
    {
        if (empty($papeleta['id_inspector'])) {
            return '';
        }
        $fila = $db->table('personas')->select('numero')->where('id', (int)$papeleta['id_inspector'])->get()->getRowArray();

        return trim((string)($fila['numero'] ?? ''));
    }

    public function criterios()
    {
        $db = \Config\Database::connect();
        try {
            $rows = $db->table('inventario_criterios')
                ->select('id, codigo, nombre, seccion, orden')
                ->orderBy('orden', 'ASC')
                ->get()
                ->getResultArray();
            return $this->respond(['data' => $rows]);
        } catch (\Throwable $e) {
            return $this->failServerError('Error consultando criterios.');
        }
    }
}
