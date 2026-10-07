<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class VehiculosController extends ResourceController
{
    use \App\Libraries\ResuelveUuid;

    protected string $tablaUuid = 'vehiculos';
    protected array $tablasUuidPorMetodo = [];
    protected array $soloUuidEnEstricto = [];

    protected $format = 'json';

    private function normalizeSearchValue(string $value): string
    {
        // Primero se pasa a mayúsculas: antes se quitaban las letras minúsculas (un UUID o una placa en minúsculas quedaba sin letras).
        return preg_replace('/[^A-Z0-9]/', '', strtoupper(trim($value))) ?? '';
    }

    /** Contadores agregados vía COUNT() en SQL (ver PersonasController::estadisticas para el motivo). */
    public function estadisticas()
    {
        $db = \Config\Database::connect();
        $total = (int) $db->table('vehiculos')->countAllResults();
        $formales = (int) $db->table('vehiculos')->where('id_asociacion IS NOT NULL', null, false)->countAllResults();
        $suspendidos = (int) $db->table('vehiculos')->whereIn('estado', ['SUSPENDIDO', 'BAJA'])->countAllResults();

        return $this->respond(['data' => [
            'total' => $total,
            'formales' => $formales,
            'informales' => $total - $formales,
            'suspendidos' => $suspendidos,
        ]]);
    }

    /**
     * Resuelve el id de asociaciones a partir del nombre escrito en el
     * formulario, descartando las etiquetas de "sin asociación / particular".
     */
    private function resolverAsociacionId($db, string $orgName): ?int
    {
        $sinAsociacion = ['Sin Asociación (Informal)', 'Sin Asociación', 'Independiente', 'Independiente / Particular'];
        if (empty($orgName) || in_array($orgName, $sinAsociacion, true)) {
            return null;
        }

        $orgRow = $db->table('asociaciones')->like('razon_social', $orgName)->get()->getRowArray();
        return $orgRow ? (int)$orgRow['id'] : null;
    }

    private function vehiculosBaseQuery($db)
    {
        return $db->table('vehiculos v')
            ->select("
                v.id,
                v.uuid,
                v.placa,
                COALESCE(tv.nombre, 'Mototaxi') AS tipo,
                COALESCE(v.marca, '') AS marca,
                COALESCE(v.modelo, '') AS modelo,
                COALESCE(v.color, '') AS color,
                COALESCE(v.anio_fabricacion, '') AS anio,
                COALESCE(v.categoria, '') AS categoria,
                COALESCE(v.carroceria, '') AS carroceria,
                COALESCE(v.sede_registro, '') AS sedeRegistro,
                COALESCE(v.tipo_carroceria, '') AS tipoCarroceria,
                COALESCE(v.numero_serie, '') AS numeroSerie,
                COALESCE(v.serie_motor, '') AS serieMotor,
                COALESCE(v.partida_registral, '') AS partidaRegistral,
                COALESCE(v.codigo_qr, '') AS codigoQr,
                v.id_asociacion AS asociacionId,
                o.razon_social AS asociacion,
                COALESCE(o.ruc, '') AS asociacionRuc,
                COALESCE(o.resolucion_alcaldia, '') AS asociacionResolucionAlcaldia,
                COALESCE(td.nombre, 'DNI') AS propietarioTipoDocumento,
                COALESCE(c.nombres, '') AS propietarioNombres,
                COALESCE(c.apellido_paterno, '') AS propietarioPaterno,
                COALESCE(c.apellido_materno, '') AS propietarioMaterno,
                COALESCE(p.numero, '') AS propietarioDni,
                v.estado AS estado,
                CASE WHEN v.id_asociacion IS NOT NULL THEN 'FORMAL' ELSE 'INFORMAL' END AS formalidad
            ", false)
            ->join('tipos_vehiculo tv', 'tv.id = v.id_tipo_vehiculo', 'left')
            ->join('asociaciones o', 'o.id = v.id_asociacion', 'left')
            ->join('vehiculo_propietarios vp', 'vp.id_vehiculo = v.id AND vp.fecha_fin IS NULL', 'left')
            ->join('personas p', 'p.id = vp.id_persona', 'left')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->join('tipo_documentos_identidad td', 'td.id = p.id_tipo_documento', 'left');
    }

    private function appendVehiculoRelations(array $rows): array
    {
        $db = \Config\Database::connect();

        $vehiculoIds = array_map(static fn (array $row): int => (int)$row['id'], $rows);
        $documentosPorVehiculo = [];
        $papeletasPorVehiculo = [];
        $certicavPorVehiculo = [];
        $internamientosPorVehiculo = [];
        $propietariosPorVehiculo = [];

        if (!empty($vehiculoIds)) {
            $documentos = $db->table('documentos_vehiculo')
                ->select('id_vehiculo, tipo_documento as tipoDocumento, codigo, fecha_expedicion as fechaExpedicion, fecha_expiracion as fechaExpiracion, estado')
                ->whereIn('id_vehiculo', $vehiculoIds)
                ->orderBy('fecha_expiracion', 'DESC')
                ->get()
                ->getResultArray();

            foreach ($documentos as $doc) {
                $vehiculoId = (int)$doc['id_vehiculo'];
                unset($doc['id_vehiculo']);
                $documentosPorVehiculo[$vehiculoId][] = $doc;
            }

            $papeletas = $db->table('papeletas p')
                ->select("
                    p.id_vehiculo,
                    p.numero_papeleta as numeroPapeleta,
                    p.fecha_hora as fechaHora,
                    p.lugar,
                    p.monto_total as montoTotal,
                    p.estado,
                    COALESCE(ti.codigo, 'SIN CODIGO') as codigoInfraccion,
                    COALESCE(ti.descripcion, 'Infraccion no especificada') as tipoInfraccion,
                    COALESCE(ti.gravedad, 'SIN GRAVEDAD') as gravedad
                ", false)
                ->join('papeleta_detalles pd', 'pd.id_papeleta = p.id', 'left')
                ->join('tipos_infraccion ti', 'ti.id = pd.id_tipo_infraccion', 'left')
                ->whereIn('id_vehiculo', $vehiculoIds)
                ->groupBy('p.id')
                ->orderBy('p.fecha_hora', 'DESC')
                ->get()
                ->getResultArray();

            foreach ($papeletas as $papeleta) {
                $vehiculoId = (int)$papeleta['id_vehiculo'];
                unset($papeleta['id_vehiculo']);
                $papeleta['montoTotal'] = (float)$papeleta['montoTotal'];
                $papeletasPorVehiculo[$vehiculoId][] = $papeleta;
            }

            $certicavs = $db->table('certicav')
                ->select('id_vehiculo, numero_registro as numeroRegistro, numero_serie_certicav as numeroSerieCerticav, fecha, primera_evaluacion as primeraEvaluacion, segunda_evaluacion as segundaEvaluacion, resultado, estado')
                ->whereIn('id_vehiculo', $vehiculoIds)
                ->orderBy('fecha', 'DESC')
                ->orderBy('id', 'DESC')
                ->get()
                ->getResultArray();

            foreach ($certicavs as $certicav) {
                $vehiculoId = (int)$certicav['id_vehiculo'];
                if (!isset($certicavPorVehiculo[$vehiculoId])) {
                    unset($certicav['id_vehiculo']);
                    $certicavPorVehiculo[$vehiculoId] = $certicav;
                }
            }
            
            // Historial de Internamientos
            $internamientos = $db->table('ordenes_internamiento')
                ->select("
                    id_vehiculo,
                    numero_boleta as numero_orden,
                    fecha_ingreso,
                    fecha_salida,
                    motivo,
                    estado
                ")
                ->whereIn('id_vehiculo', $vehiculoIds)
                ->orderBy('fecha_ingreso', 'DESC')
                ->get()
                ->getResultArray();
                
            foreach ($internamientos as $int) {
                $vehiculoId = (int)$int['id_vehiculo'];
                unset($int['id_vehiculo']);
                $internamientosPorVehiculo[$vehiculoId][] = $int;
            }

            // Historial de propietarios: todos los registros (activos e
            // históricos ya cerrados con fecha_fin), del más reciente al más
            // antiguo, para ver quién tuvo el vehículo antes que el dueño actual.
            $propietarios = $db->table('vehiculo_propietarios vp')
                ->select("
                    vp.id_vehiculo,
                    vp.fecha_inicio,
                    vp.fecha_fin,
                    vp.estado,
                    COALESCE(p.numero, '') as dni,
                    TRIM(CONCAT(COALESCE(c.nombres, ''), ' ', COALESCE(c.apellido_paterno, ''), ' ', COALESCE(c.apellido_materno, ''))) as nombre
                ", false)
                ->join('personas p', 'p.id = vp.id_persona', 'left')
                ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                ->whereIn('vp.id_vehiculo', $vehiculoIds)
                ->orderBy('vp.fecha_inicio', 'DESC')
                ->orderBy('vp.id', 'DESC')
                ->get()
                ->getResultArray();

            foreach ($propietarios as $prop) {
                $vehiculoId = (int)$prop['id_vehiculo'];
                unset($prop['id_vehiculo']);
                $prop['nombre'] = $prop['nombre'] !== '' ? $prop['nombre'] : 'Persona no identificada';
                $propietariosPorVehiculo[$vehiculoId][] = $prop;
            }
        }

        $data = array_map(static function (array $row) use ($documentosPorVehiculo, $papeletasPorVehiculo, $certicavPorVehiculo, $internamientosPorVehiculo, $propietariosPorVehiculo): array {
            $propietario = trim(($row['propietarioNombres'] ?? '') . ' ' . ($row['propietarioPaterno'] ?? '') . ' ' . ($row['propietarioMaterno'] ?? ''));
            unset($row['propietarioNombres'], $row['propietarioPaterno'], $row['propietarioMaterno']);
            $vehiculoId = (int)$row['id'];

            $soat = null;
            foreach ($documentosPorVehiculo[$vehiculoId] ?? [] as $doc) {
                if (($doc['tipoDocumento'] ?? '') === 'SOAT') {
                    $soat = $doc;
                    break;
                }
            }

            return $row + [
                'propietario' => $propietario ?: 'Sin Propietario Asignado',
                'documentosVehiculo' => $documentosPorVehiculo[$vehiculoId] ?? [],
                'certicav' => $certicavPorVehiculo[$vehiculoId] ?? null,
                'historialPapeletas' => $papeletasPorVehiculo[$vehiculoId] ?? [],
                'historialInternamientos' => $internamientosPorVehiculo[$vehiculoId] ?? [],
                'historialPropietarios' => $propietariosPorVehiculo[$vehiculoId] ?? [],
                'soatEstado' => $soat['estado'] ?? 'SIN_REGISTRO',
                'tucNumero' => 'TUC-2026-' . str_pad($row['id'], 3, '0', STR_PAD_LEFT),
            ];
        }, $rows);

        return $data;
    }

    /**
     * Listado liviano para la impresión de QR: solo lo que lleva la plantilla (placa, tipo, asociación y
     * código QR), sin propietario ni historial, para que paginar sea instantáneo incluso con 14,000 unidades.
     */
    public function listarParaQr()
    {
        $db = \Config\Database::connect();
        $builder = $db->table('vehiculos v')
            ->select("v.id, v.placa, COALESCE(tv.nombre, 'Mototaxi') AS tipo, COALESCE(v.codigo_qr, '') AS codigoQr, v.id_asociacion AS asociacionId, o.razon_social AS asociacion, COALESCE(v.marca, '') AS marca, COALESCE(v.modelo, '') AS modelo, COALESCE(p.numero, '') AS propietarioDni, TRIM(CONCAT_WS(' ', c.nombres, c.apellido_paterno, c.apellido_materno)) AS propietario", false)
            ->join('tipos_vehiculo tv', 'tv.id = v.id_tipo_vehiculo', 'left')
            ->join('asociaciones o', 'o.id = v.id_asociacion', 'left')
            ->join('vehiculo_propietarios vp', 'vp.id_vehiculo = v.id AND vp.fecha_fin IS NULL', 'left')
            ->join('personas p', 'p.id = vp.id_persona', 'left')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left');

        $tipos = array_filter(array_map('trim', explode(',', (string) $this->request->getGet('tipo'))));
        if ($tipos) {
            $builder->groupStart();
            foreach ($tipos as $tipo) {
                $builder->orLike('tv.nombre', $tipo);
            }
            $builder->groupEnd();
        }

        // Los vehículos informales (sin asociación) no generan QR.
        $builder->where('v.id_asociacion IS NOT NULL', null, false);

        $asociacionId = (int) $this->request->getGet('asociacionId');
        if ($asociacionId > 0) {
            $builder->where('v.id_asociacion', $asociacionId);
        }

        $buscar = trim((string) $this->request->getGet('buscar'));
        if ($buscar !== '') {
            $builder->groupStart()
                ->where('v.uuid', \App\Libraries\Identificador::esValido($buscar) ? strtolower($buscar) : '__no_es_uuid__')
                ->orLike('v.placa', \App\Libraries\Placa::paraBusqueda($buscar))
                ->orLike('o.razon_social', $buscar)
                ->orLike('p.numero', $buscar)
                ->orLike('c.nombres', $buscar)
                ->orLike('c.apellido_paterno', $buscar)
                ->orLike('c.apellido_materno', $buscar)
                ->orWhere(\App\Libraries\Busqueda::nombreCompleto($buscar, 'c.nombres', 'c.apellido_paterno', 'c.apellido_materno'), null, false)
                ->orLike('c.apellido_materno', $buscar)
                ->groupEnd();
        }

        $page = max(1, (int) $this->request->getGet('page'));
        $porPagina = max(1, min(1000, (int) ($this->request->getGet('porPagina') ?: 20)));

        $total = (clone $builder)->countAllResults(false);
        $rows = $builder->orderBy('v.placa', 'ASC')->orderBy('v.id', 'ASC')
            ->limit($porPagina, ($page - 1) * $porPagina)
            ->get()->getResultArray();

        return $this->respond([
            'data' => $rows,
            'meta' => ['total' => $total, 'page' => $page, 'porPagina' => $porPagina, 'totalPaginas' => (int) ceil($total / $porPagina)],
        ]);
    }

    public function index()
    {
        \App\Libraries\Acceso::limitarListadoCompleto($this->request);

        $db = \Config\Database::connect();
        $builder = $this->vehiculosBaseQuery($db);

        // Búsqueda en SQL (antes se traía TODO el padrón y se filtraba en el
        // navegador; con 14,000+ vehículos eso, sumado al WHERE IN masivo de
        // abajo, era el cuello de botella principal del módulo).
        $buscar = trim((string) $this->request->getGet('buscar'));
        if ($buscar !== '') {
            $builder->groupStart()
                // Un uuid pegado completo (el código QR del vehículo) se busca exacto, con el índice único.
                ->where('v.uuid', \App\Libraries\Identificador::esValido($buscar) ? strtolower($buscar) : '__no_es_uuid__')
                ->orLike('v.placa', \App\Libraries\Placa::paraBusqueda($buscar))
                ->orLike('v.marca', $buscar)
                ->orLike('v.modelo', $buscar)
                ->orLike('c.nombres', $buscar)
                ->orLike('c.apellido_paterno', $buscar)
                ->orLike('c.apellido_materno', $buscar)
                ->orWhere(\App\Libraries\Busqueda::nombreCompleto($buscar, 'c.nombres', 'c.apellido_paterno', 'c.apellido_materno'), null, false)
                ->orLike('p.numero', $buscar)
                ->orLike('v.numero_serie', $buscar)
                ->orLike('o.razon_social', $buscar)
                ->groupEnd();
        }

        $estadoFiltro = strtoupper((string) $this->request->getGet('estado'));
        if (in_array($estadoFiltro, ['ACTIVO', 'INACTIVO', 'SUSPENDIDO', 'BAJA'], true)) {
            $builder->where('v.estado', $estadoFiltro);
        }

        // Formal = tiene asociación/empresa asignada; informal = independiente.
        $formalidad = strtoupper((string) $this->request->getGet('formalidad'));
        if ($formalidad === 'FORMAL') {
            $builder->where('v.id_asociacion IS NOT NULL', null, false);
        } elseif ($formalidad === 'INFORMAL') {
            $builder->where('v.id_asociacion IS NULL', null, false);
        }

        $tipoFiltro = trim((string) $this->request->getGet('tipo'));
        if ($tipoFiltro !== '' && strtoupper($tipoFiltro) !== 'TODOS') {
            // Admite varios tipos separados por coma (p. ej. "Mototaxi,Motocarguera").
            $tipos = array_filter(array_map('trim', explode(',', $tipoFiltro)));
            $builder->groupStart();
            foreach ($tipos as $tipoItem) {
                $builder->orLike('tv.nombre', $tipoItem);
            }
            $builder->groupEnd();
        }

        $asociacionFiltro = (int) $this->request->getGet('asociacionId');
        if ($asociacionFiltro > 0) {
            $builder->where('v.id_asociacion', $asociacionFiltro);
        }

        $page = (int) $this->request->getGet('page');
        $porPagina = max(1, min(200, (int) ($this->request->getGet('porPagina') ?: 20)));

        $columnasOrdenables = [
            'placa' => 'v.placa',
            'marca' => 'v.marca',
            'propietario' => 'c.nombres',
            'estado' => 'v.estado',
        ];

        if ($page > 0) {
            $total = (clone $builder)->countAllResults(false);
            $rows = \App\Libraries\QuerySort::aplicar($builder, $this->request, $columnasOrdenables, 'v.id')
                ->limit($porPagina, ($page - 1) * $porPagina)
                ->get()->getResultArray();

            $data = array_map(static function (array $row): array {
                $propietario = trim(($row['propietarioNombres'] ?? '') . ' ' . ($row['propietarioPaterno'] ?? '') . ' ' . ($row['propietarioMaterno'] ?? ''));
                unset($row['propietarioNombres'], $row['propietarioPaterno'], $row['propietarioMaterno']);
                return $row + [
                    'propietario' => $propietario ?: 'Sin Propietario Asignado',
                    'tucNumero' => 'TUC-2026-' . str_pad($row['id'], 3, '0', STR_PAD_LEFT),
                ];
            }, $rows);

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

        // Modo legacy (sin "page"): usado por las exportaciones a Excel/PDF,
        // que solo necesitan columnas planas, no el historial por vehículo.
        $rows = $builder->orderBy('v.id', 'DESC')->get()->getResultArray();
        $data = array_map(static function (array $row): array {
            $propietario = trim(($row['propietarioNombres'] ?? '') . ' ' . ($row['propietarioPaterno'] ?? '') . ' ' . ($row['propietarioMaterno'] ?? ''));
            unset($row['propietarioNombres'], $row['propietarioPaterno'], $row['propietarioMaterno']);
            return $row + ['propietario' => $propietario ?: 'Sin Propietario Asignado'];
        }, $rows);

        // ?ligero=1: solo lo que usan los autocompletados de placa de los formularios.
        if ($this->request->getGet('ligero')) {
            $campos = array_flip(['id', 'uuid', 'placa', 'tipo', 'marca', 'modelo', 'color', 'anio', 'serieMotor', 'asociacionId', 'asociacion', 'propietarioDni', 'propietario', 'estado', 'formalidad', 'tucNumero']);
            $data = array_map(static fn (array $r) => array_intersect_key($r, $campos), $data);
        }

        return $this->respond(['data' => $data]);
    }

    /** Detalle de un vehículo con su historial completo (documentos, papeletas, CERTICAV, internamientos). */
    public function show($id = null)
    {
        $db = \Config\Database::connect();

        // Se acepta el uuid público (/vehiculos/{uuid}) además del id numérico interno.
        if (\App\Libraries\Identificador::esValido($id)) {
            $rows = $this->vehiculosBaseQuery($db)->where('v.uuid', strtolower((string) $id))->get()->getResultArray();
            if (empty($rows)) {
                return $this->failNotFound('Vehículo no encontrado.');
            }

            $data = $this->appendVehiculoRelations($rows);
            return $this->respond(['data' => $data[0]]);
        }

        $id = (int) $id;
        if ($id <= 0) {
            return $this->failNotFound('Vehículo no encontrado.');
        }

        $rows = $this->vehiculosBaseQuery($db)->where('v.id', $id)->get()->getResultArray();
        if (empty($rows)) {
            return $this->failNotFound('Vehículo no encontrado.');
        }

        $data = $this->appendVehiculoRelations($rows);
        return $this->respond(['data' => $data[0]]);
    }

    public function buscarMobile()
    {
        $tipo = strtoupper(trim((string)$this->request->getGet('tipo')));
        $valor = trim((string)$this->request->getGet('valor'));
        $normalizado = $this->normalizeSearchValue($valor);

        if ($normalizado === '') {
            return $this->failValidationErrors('Ingrese un dato para buscar.');
        }

        $db = \Config\Database::connect();
        $builder = $this->vehiculosBaseQuery($db);

        if ($tipo === 'PLACA') {
            $builder->where("REPLACE(REPLACE(UPPER(v.placa), '-', ''), ' ', '') =", $normalizado);
        } elseif ($tipo === 'DNI') {
            $builder->where("REPLACE(REPLACE(UPPER(p.numero), '-', ''), ' ', '') =", $normalizado);
        } else {
            // El código QR es un uuid: búsqueda exacta con el índice único (antes se normalizaba la columna con REPLACE/UPPER
            // y se recorría toda la tabla en cada escaneo). Un valor que no sea un uuid no puede coincidir.
            $uuidBuscado = strtolower(trim($valor));
            $builder->where('v.codigo_qr', \App\Libraries\Identificador::esValido($uuidBuscado) ? $uuidBuscado : '__no_es_uuid__');
        }

        $rows = $builder
            ->orderBy('v.id', 'DESC')
            ->limit(1)
            ->get()
            ->getResultArray();

        if (empty($rows)) {
            if ($tipo === 'PLACA') {
                // Consulta externa hecha por el sistema: queda registrada igual que las consultas directas a SUNARP.
                \App\Services\AuditoriaService::registrar('PIDE', 'CONSULTA_SUNARP', "Consulta de placa en SUNARP (búsqueda móvil): {$normalizado}", ['placa' => $normalizado, 'origen' => 'buscarMobile']);
                $sunarpData = \App\Services\PideService::sunarp($normalizado);
                if ($sunarpData && !isset($sunarpData['error'])) {
                    $rawProps = $sunarpData['propietarios'] ?? [];
                    $propNames = array_filter(array_map(function($p) {
                        return is_string($p) ? trim($p) : trim($p['nombre'] ?? $p['razon_social'] ?? $p['apellidos_nombres'] ?? '');
                    }, is_array($rawProps) ? $rawProps : []));
                    
                    $propietario = empty($propNames) ? 'Sin Propietario Asignado' : implode(', ', $propNames);

                    $cat = strtoupper(trim($sunarpData['categoria'] ?? ''));
                    $carr = strtoupper(trim($sunarpData['carroceria'] ?? ''));
                    $inferredTipo = $sunarpData['clase'] ?? $sunarpData['tipo'] ?? 'Vehículo';
                    
                    if (in_array($cat, ['L1', 'L2', 'L3']) || strpos($carr, 'LINEAL') !== false) {
                        $inferredTipo = 'Moto Lineal';
                    } elseif ($cat === 'L5' && strpos($carr, 'CARG') !== false) {
                        $inferredTipo = 'Motocarguera';
                    } elseif ($cat === 'L5' || strpos($carr, 'TRIMOVIL') !== false || strpos($carr, 'MOTOTAXI') !== false || strpos($carr, 'MOTOKAR') !== false) {
                        $inferredTipo = 'Mototaxi';
                    } elseif ($cat === 'M1' || strpos($carr, 'SEDAN') !== false || strpos($carr, 'HATCHBACK') !== false || strpos($carr, 'SUV') !== false) {
                        $inferredTipo = 'Automóvil';
                    } elseif ($cat === 'M2' || strpos($carr, 'COMBI') !== false || strpos($carr, 'RURAL') !== false || strpos($carr, 'MICROBUS') !== false) {
                        $inferredTipo = 'Camioneta Rural';
                    }

                    return $this->respond(['data' => [
                        'id' => 0,
                        'placa' => $sunarpData['placa'] ?? $normalizado,
                        'tipo' => $inferredTipo,
                        'marca' => $sunarpData['marca'] ?? '',
                        'modelo' => $sunarpData['modelo'] ?? '',
                        'color' => $sunarpData['color'] ?? '',
                        'anio' => $sunarpData['ano_fabricacion'] ?? $sunarpData['anio_fabricacion'] ?? $sunarpData['anio'] ?? '',
                        'categoria' => $sunarpData['categoria'] ?? '',
                        'carroceria' => $sunarpData['carroceria'] ?? '',
                        'sedeRegistro' => $sunarpData['sede'] ?? '',
                        'tipoCarroceria' => $sunarpData['tipo_carroceria'] ?? '',
                        'numeroSerie' => $sunarpData['serie'] ?? $sunarpData['vin'] ?? '',
                        'serieMotor' => $sunarpData['nro_motor'] ?? '',
                        'partidaRegistral' => $sunarpData['partida'] ?? $sunarpData['partida_registral'] ?? '',
                        'codigoQr' => '',
                        'asociacionId' => null,
                        'asociacion' => null,
                        'asociacionRuc' => '',
                        'propietarioTipoDocumento' => '',
                        'propietarioDni' => '',
                        'estado' => 'ACTIVO',
                        'formalidad' => 'INFORMAL',
                        'propietario' => $propietario,
                        'documentosVehiculo' => [],
                        'certicav' => null,
                        'historialPapeletas' => [],
                        'historialInternamientos' => [],
                        'historialPropietarios' => [],
                        'soatEstado' => 'SIN_REGISTRO',
                        'tucNumero' => 'TUC-2026-000',
                    ]]);
                }
            }

            return $this->failNotFound('No se encontró vehículo con el dato ingresado.');
        }

        $data = $this->appendVehiculoRelations($rows)[0];

        // Si existe en BD pero no tiene dueño asignado, intentamos consultar a Sunarp para mostrarlo visualmente
        if ($tipo === 'PLACA' && ($data['formalidad'] ?? '') === 'INFORMAL' && (empty($data['propietario']) || $data['propietario'] === 'Sin Propietario Asignado' || $data['propietario'] === 'No Registrado' || $data['propietario'] === 'Sin Propietario')) {
            // Consulta externa hecha por el sistema: queda registrada igual que las consultas directas a SUNARP.
            \App\Services\AuditoriaService::registrar('PIDE', 'CONSULTA_SUNARP', "Consulta de placa en SUNARP (búsqueda móvil): {$normalizado}", ['placa' => $normalizado, 'origen' => 'buscarMobile']);
            $sunarpData = \App\Services\PideService::sunarp($normalizado);
            if ($sunarpData && !isset($sunarpData['error'])) {
                $rawProps = $sunarpData['propietarios'] ?? [];
                $propNames = array_filter(array_map(function($p) {
                    return is_string($p) ? trim($p) : trim($p['nombre'] ?? $p['razon_social'] ?? $p['apellidos_nombres'] ?? '');
                }, is_array($rawProps) ? $rawProps : []));
                
                if (!empty($propNames)) {
                    $data['propietario'] = implode(', ', $propNames);
                }
                
                // Rellenar datos técnicos si están vacíos
                $data['marca'] = $data['marca'] ?: ($sunarpData['marca'] ?? '');
                $data['modelo'] = $data['modelo'] ?: ($sunarpData['modelo'] ?? '');
                $data['color'] = $data['color'] ?: ($sunarpData['color'] ?? '');
            }
        }

        return $this->respond(['data' => $data]);
    }

    public function getVehiculosByPersonaDni()
    {
        $dni = trim((string)$this->request->getGet('dni'));
        $normalizado = $this->normalizeSearchValue($dni);

        if ($normalizado === '') {
            return $this->failValidationErrors('Ingrese el DNI para buscar sus vehículos.');
        }

        $db = \Config\Database::connect();
        $builder = $this->vehiculosBaseQuery($db);
        $builder->where("REPLACE(REPLACE(UPPER(p.numero), '-', ''), ' ', '') =", $normalizado);

        $rows = $builder
            ->orderBy('v.id', 'DESC')
            ->get()
            ->getResultArray();

        return $this->respond(['data' => $this->appendVehiculoRelations($rows)]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getPost();
        if (isset($input['placa'])) {
            $input['placa'] = \App\Libraries\Placa::normalizar($input['placa']);
        }

        $rules = [
            'placa' => [
                'rules' => 'required|exact_length[6]|alpha_numeric',
                'errors' => [
                    'required' => 'La placa del vehículo es requerida.',
                    'exact_length' => 'La placa de rodaje debe tener exactamente 6 caracteres alfanuméricos.',
                    'alpha_numeric' => 'La placa de rodaje solo debe contener letras y números sin caracteres especiales.'
                ]
            ],
            'marca' => [
                'rules' => 'required',
                'errors' => ['required' => 'La marca del vehículo es requerida.']
            ],
            'modelo' => [
                'rules' => 'required',
                'errors' => ['required' => 'El modelo del vehículo es requerido.']
            ],
            'color' => [
                'rules' => 'required',
                'errors' => ['required' => 'El color del vehículo es requerido.']
            ],
            'propietarioDni' => [
                'rules' => 'required',
                'errors' => ['required' => 'Debe seleccionar un propietario registrado en Personas.']
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $placa = \App\Libraries\Placa::normalizar($input['placa']);
        if ($db->table('vehiculos')->where('placa', $placa)->countAllResults() > 0) {
            return $this->failValidationErrors('La placa del vehículo ya se encuentra registrada en el sistema.');
        }

        
        $tipoNombre = !empty($input['tipo']) ? trim($input['tipo']) : 'Mototaxi';
        $tipoRow = $db->table('tipos_vehiculo')->where('nombre', $tipoNombre)->get()->getRowArray();
        if (!$tipoRow) {
            $db->table('tipos_vehiculo')->insert(['nombre' => $tipoNombre]);
            $tipoVehiculoId = $db->insertID();
        } else {
            $tipoVehiculoId = $tipoRow['id'];
        }


        $orgName = trim($input['asociacion'] ?? '');
        $asociacionId = $this->resolverAsociacionId($db, $orgName);

        // El código QR es siempre el uuid del vehículo y lo genera el servidor: el codigoQr que mande el cliente se ignora.
        $qrCode = \App\Libraries\Identificador::nuevo();

        $estadoInput = strtoupper(trim($input['estado'] ?? 'ACTIVO'));
        if (!in_array($estadoInput, ['ACTIVO', 'INACTIVO'], true)) {
            $estadoInput = 'ACTIVO';
        }

        $record = [
            'placa'                => $placa,
            'id_tipo_vehiculo'     => $tipoVehiculoId,
            'marca'                => trim($input['marca'] ?? ''),
            'modelo'               => trim($input['modelo'] ?? ''),
            'color'                => trim($input['color'] ?? ''),
            'anio_fabricacion'     => !empty($input['anio']) ? (int)$input['anio'] : date('Y'),
            'categoria'            => trim($input['categoria'] ?? ''),
            'carroceria'           => trim($input['carroceria'] ?? ''),
            'sede_registro'        => trim($input['sedeRegistro'] ?? ''),
            'tipo_carroceria'      => trim($input['tipoCarroceria'] ?? ''),
            'numero_serie'         => trim($input['numeroSerie'] ?? ''),
            'serie_motor'          => trim($input['serieMotor'] ?? ''),
            'partida_registral'    => trim($input['partidaRegistral'] ?? ''),
            'codigo_qr'            => $qrCode,
            'id_asociacion'        => $asociacionId,
            'estado'               => $estadoInput,
        ];

        $propietarioNombre = trim($input['propietario'] ?? '');
        $propietarioDni = trim($input['propietarioDni'] ?? '');

        $personaRow = $db->table('personas')->where('numero', $propietarioDni)->get()->getRowArray();
        if (!$personaRow) {
            return $this->failValidationErrors('El propietario no existe. Regístrelo primero en el módulo Personas.');
        }
        $personaId = (int)$personaRow['id'];

        // Si el código QR es un UUID, el vehículo usa ese mismo valor como su uuid público.
        $record['uuid'] = $qrCode;
        $db->table('vehiculos')->insert($record);
        $vehiculoId = (int)$db->insertID();

        $db->table('vehiculo_propietarios')->insert([
            'id_vehiculo'  => $vehiculoId,
            'id_persona'   => $personaId,
            'fecha_inicio' => date('Y-m-d'),
            'estado'       => 'ACTIVO',
        ]);

        \App\Services\AuditoriaService::registrar(
            'VEHICULOS',
            'CREAR',
            "Se registró el vehículo placa '{$record['placa']}' (" . ($asociacionId ? "Asociación: $orgName" : "Particular/Informal") . ")",
            ['id' => $vehiculoId, 'placa' => $record['placa'], 'asociacion' => $orgName, 'propietario' => $propietarioNombre]
        );

        $newVehiculo = [
            'id'               => $vehiculoId,
            'uuid'             => $record['uuid'],
            'placa'            => $record['placa'],
            'tipo'             => $tipoNombre,
            'marca'            => $record['marca'],
            'modelo'           => $record['modelo'],
            'color'            => $record['color'],
            'anio'             => $record['anio_fabricacion'],
            'categoria'        => $record['categoria'],
            'carroceria'       => $record['carroceria'],
            'sedeRegistro'     => $record['sede_registro'],
            'tipoCarroceria'   => $record['tipo_carroceria'],
            'numeroSerie'      => $record['numero_serie'],
            'serieMotor'       => $record['serie_motor'],
            'partidaRegistral' => $record['partida_registral'],
            'codigoQr'         => $record['codigo_qr'],
            'asociacionId'     => $asociacionId,
            'asociacion'     => $asociacionId ? $orgName : null,
            'propietario'      => $propietarioNombre ?: 'Sin Propietario',
            'propietarioDni'   => $propietarioDni,
            'estado'           => $record['estado'],
            'formalidad'       => $asociacionId ? 'FORMAL' : 'INFORMAL',
            'soatEstado'       => $input['soatEstado'] ?? 'VIGENTE',
            'tucNumero'        => $input['tucNumero'] ?? ('TUC-2026-' . str_pad($vehiculoId, 3, '0', STR_PAD_LEFT)),
        ];

        return $this->respondCreated(['status' => true, 'message' => 'Vehículo registrado con éxito', 'data' => $newVehiculo]);
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getRawInput();

        if (!$id) {
            return $this->failNotFound('ID de vehículo no especificado.');
        }

        $record = [];
        if (isset($input['placa'])) {
            $placa = \App\Libraries\Placa::normalizar($input['placa']);
            if ($placa !== '') {
                if (!preg_match('/^[A-Z0-9]{6}$/', $placa)) {
                    return $this->failValidationErrors('La placa de rodaje debe tener exactamente 6 caracteres alfanuméricos.');
                }
                if ($db->table('vehiculos')->where('placa', $placa)->where('id !=', $id)->countAllResults() > 0) {
                    return $this->failValidationErrors('La placa del vehículo ya se encuentra registrada en el sistema.');
                }
            }
            $record['placa'] = $placa;
        }
        if (isset($input['marca'])) $record['marca'] = trim($input['marca']);
        if (isset($input['modelo'])) $record['modelo'] = trim($input['modelo']);
        if (isset($input['color'])) $record['color'] = trim($input['color']);
        if (isset($input['anio'])) $record['anio_fabricacion'] = (int)$input['anio'];
        if (isset($input['categoria'])) $record['categoria'] = trim($input['categoria']);
        if (isset($input['carroceria'])) $record['carroceria'] = trim($input['carroceria']);
        if (isset($input['sedeRegistro'])) $record['sede_registro'] = trim($input['sedeRegistro']);
        if (isset($input['tipoCarroceria'])) $record['tipo_carroceria'] = trim($input['tipoCarroceria']);
        if (isset($input['numeroSerie'])) $record['numero_serie'] = trim($input['numeroSerie']);
        if (isset($input['serieMotor'])) $record['serie_motor'] = trim($input['serieMotor']);
        if (isset($input['partidaRegistral'])) $record['partida_registral'] = trim($input['partidaRegistral']);
        if (isset($input['estado'])) {
            $estadoInput = strtoupper(trim($input['estado']));
            if (in_array($estadoInput, ['ACTIVO', 'INACTIVO'], true)) {
                $record['estado'] = $estadoInput;
            }
        }

        if (array_key_exists('asociacion', $input)) {
            $record['id_asociacion'] = $this->resolverAsociacionId($db, trim((string)$input['asociacion']));
        }

        if (!empty($input['tipo'])) {
            $tipoNombre = trim($input['tipo']);
            $tipoRow = $db->table('tipos_vehiculo')->where('nombre', $tipoNombre)->get()->getRowArray();
            if (!$tipoRow) {
                $db->table('tipos_vehiculo')->insert(['nombre' => $tipoNombre, 'estado' => 'ACTIVO']);
                $record['id_tipo_vehiculo'] = $db->insertID();
            } else {
                $record['id_tipo_vehiculo'] = $tipoRow['id'];
            }
        }

        if (!empty($record)) {
            $db->table('vehiculos')->where('id', $id)->update($record);
        }

        $propietarioNombre = trim($input['propietario'] ?? '');
        $propietarioDni = trim($input['propietarioDni'] ?? '');
        if ($propietarioDni !== '') {
            $personaRow = $db->table('personas')->where('numero', $propietarioDni)->get()->getRowArray();
            if (!$personaRow) {
                return $this->failValidationErrors('El propietario no existe. Regístrelo primero en el módulo Personas.');
            }
            $personaId = (int)$personaRow['id'];

            // El propietario activo actual (si existe y es distinto al nuevo)
            // se cierra con fecha_fin en vez de borrarse, para conservar el
            // historial de quién tuvo el vehículo antes.
            $propietarioActivo = $db->table('vehiculo_propietarios')
                ->where('id_vehiculo', $id)
                ->where('fecha_fin IS NULL')
                ->orderBy('id', 'DESC')
                ->get()->getRowArray();

            if (!$propietarioActivo || (int)$propietarioActivo['id_persona'] !== $personaId) {
                if ($propietarioActivo) {
                    $db->table('vehiculo_propietarios')
                        ->where('id', $propietarioActivo['id'])
                        ->update(['fecha_fin' => date('Y-m-d'), 'estado' => 'INACTIVO']);
                }
                $db->table('vehiculo_propietarios')->insert([
                    'id_vehiculo'  => $id,
                    'id_persona'   => $personaId,
                    'fecha_inicio' => date('Y-m-d'),
                    'estado'       => 'ACTIVO',
                ]);
            }
        }

        $vehPlaca = $record['placa'] ?? ($db->table('vehiculos')->where('id', $id)->get()->getRowArray()['placa'] ?? "ID $id");
        \App\Services\AuditoriaService::registrar(
            'VEHICULOS',
            'MODIFICAR',
            "Se modificó la información del vehículo placa '$vehPlaca'",
            ['id' => $id, 'cambios' => $record]
        );

        return $this->respond(['status' => true, 'message' => 'Vehículo actualizado con éxito']);
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();

        if (!$id) {
            return $this->failNotFound('ID de vehículo no especificado.');
        }

        $veh = $db->table('vehiculos')->where('id', $id)->get()->getRowArray();
        if (!$veh) {
            return $this->failNotFound('Vehículo no encontrado.');
        }
        $placa = $veh['placa'] ?? "ID $id";

        $db->table('vehiculo_propietarios')->where('id_vehiculo', $id)->delete();
        $db->table('documentos_vehiculo')->where('id_vehiculo', $id)->delete();
        $db->table('vehiculos')->where('id', $id)->delete();

        \App\Services\AuditoriaService::registrar(
            'VEHICULOS',
            'ELIMINAR',
            "Se eliminó el vehículo con placa '$placa' (ID: $id)",
            ['id' => $id, 'placa' => $placa]
        );

        return $this->respondDeleted(['status' => true, 'message' => 'Vehículo eliminado con éxito']);
    }
}
