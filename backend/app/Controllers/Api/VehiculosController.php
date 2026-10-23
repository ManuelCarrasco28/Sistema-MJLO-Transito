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
        return preg_replace('/[^A-Z0-9]/', '', strtoupper(trim($value))) ?? '';
    }

    public function estadisticas()
    {
        $db = \Config\Database::connect();
        $total = (int) $db->table('vehiculos')->countAllResults();
        $formales = (int) $db->table('vehiculos')->where('id_asociacion IS NOT NULL', null, false)->countAllResults();
        $suspendidos = (int) $db->table('vehiculos')->where('estado', 'INACTIVO')->countAllResults();

        return $this->respond(['data' => [
            'total' => $total,
            'formales' => $formales,
            'informales' => $total - $formales,
            'suspendidos' => $suspendidos,
        ]]);
    }

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
                COALESCE(td.codigo, '') AS propietarioTipoDocumento,
                COALESCE(c.nombres, '') AS propietarioNombres,
                COALESCE(c.apellido_paterno, '') AS propietarioPaterno,
                COALESCE(c.apellido_materno, '') AS propietarioMaterno,
                COALESCE(p.numero, '') AS propietarioDni,
                v.estado AS estado,
                CASE WHEN v.id_asociacion IS NOT NULL THEN 'FORMAL' ELSE 'INFORMAL' END AS formalidad
            ", false)
            ->join('tipos_vehiculo tv', 'tv.id = v.id_tipo_vehiculo', 'left')
            ->join('asociaciones o', 'o.id = v.id_asociacion', 'left')
            ->join('vehiculo_propietarios vp', "vp.id_vehiculo = v.id AND vp.fecha_fin IS NULL AND vp.estado = 'ACTIVO'", 'left')
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
                ->orderBy('fecha_expedicion', 'DESC')
                ->orderBy('id', 'DESC')
                ->get()
                ->getResultArray();

            foreach ($documentos as $doc) {
                if (!empty($doc['fechaExpiracion'])) {
                    if ($doc['fechaExpiracion'] < \App\Libraries\ReglasCurso::hoy()) {
                        $doc['estado'] = 'VENCIDO';
                    } elseif (in_array($doc['estado'], ['VENCIDO', 'APROBADO'], true)) {
                        $doc['estado'] = 'VIGENTE';
                    }
                }
                $vehiculoId = (int)$doc['id_vehiculo'];
                unset($doc['id_vehiculo']);
                $documentosPorVehiculo[$vehiculoId][] = $doc;
            }

            $papeletas = $db->table('papeletas p')
                ->select("
                    p.id_vehiculo,
                    p.id as papeletaId,
                    p.numero_papeleta as numeroPapeleta,
                    p.fecha_hora as fechaHora,
                    p.lugar,
                    p.monto_total as montoTotal,
                    p.estado
                ", false)
                ->whereIn('id_vehiculo', $vehiculoIds)
                ->orderBy('p.fecha_hora', 'DESC')
                ->get()
                ->getResultArray();

            $detallesPorPapeleta = [];
            if (!empty($papeletas)) {
                $detalles = $db->table('papeleta_detalles pd')
                    ->select('pd.id_papeleta, ti.codigo, ti.descripcion, ti.gravedad')
                    ->join('tipos_infraccion ti', 'ti.id = pd.id_tipo_infraccion', 'left')
                    ->whereIn('pd.id_papeleta', array_column($papeletas, 'papeletaId'))
                    ->orderBy('ti.codigo', 'ASC')->get()->getResultArray();
                foreach ($detalles as $detalle) {
                    $detallesPorPapeleta[$detalle['id_papeleta']][] = $detalle;
                }
            }
            foreach ($papeletas as $papeleta) {
                $detalles = $detallesPorPapeleta[$papeleta['papeletaId']] ?? [];
                $papeleta['codigoInfraccion'] = implode(', ', array_filter(array_column($detalles, 'codigo'))) ?: 'SIN CODIGO';
                $papeleta['tipoInfraccion'] = implode(' | ', array_map(static fn($d) => ($d['codigo'] ?? '') . ': ' . ($d['descripcion'] ?? ''), $detalles)) ?: 'Infracción no especificada';
                $papeleta['gravedad'] = implode(', ', array_unique(array_filter(array_column($detalles, 'gravedad')))) ?: 'SIN GRAVEDAD';
                $vehiculoId = (int)$papeleta['id_vehiculo'];
                unset($papeleta['id_vehiculo']);
                $papeleta['montoTotal'] = (float)$papeleta['montoTotal'];
                $papeletasPorVehiculo[$vehiculoId][] = $papeleta;
            }

            $certicavs = $db->table('certicav')
                ->select('id_vehiculo, numero_registro as numeroRegistro, numero_serie_certicav as numeroSerieCerticav, fecha, primera_evaluacion as primeraEvaluacion, segunda_evaluacion as segundaEvaluacion, fecha_segunda_evaluacion as fechaSegundaEvaluacion, resultado, estado')
                ->whereIn('id_vehiculo', $vehiculoIds)
                ->where('estado !=', 'ANULADA')
                ->orderBy('fecha', 'DESC')
                ->orderBy('id', 'DESC')
                ->get()
                ->getResultArray();

            foreach ($certicavs as $certicav) {
                $vehiculoId = (int)$certicav['id_vehiculo'];
                if (!isset($certicavPorVehiculo[$vehiculoId])) {
                    unset($certicav['id_vehiculo']);
                    $base = $certicav['resultado'] === 'APROBADO' && $certicav['segundaEvaluacion'] === 'APROBADO' && !empty($certicav['fechaSegundaEvaluacion']) ? $certicav['fechaSegundaEvaluacion'] : $certicav['fecha'];
                    $certicav['fechaVencimiento'] = \App\Libraries\VigenciaCertificado::vencimiento($base);
                    $certicav['estadoVigencia'] = in_array($certicav['estado'], ['ANULADA', 'ANULADO', 'INACTIVO'], true) ? $certicav['estado'] : ($certicav['resultado'] === 'APROBADO' ? ($certicav['fechaVencimiento'] < \App\Libraries\ReglasCurso::hoy() ? 'VENCIDO' : 'VIGENTE') : $certicav['resultado']);
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
                    lugar_intervencion,
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

            $propietarios = $db->table('vehiculo_propietarios vp')
                ->select("
                    vp.id_vehiculo,
                    vp.fecha_inicio,
                    vp.fecha_fin,
                    vp.estado,
                    td.codigo as tipoDocumento,
                    COALESCE(p.numero, '') as dni,
                    TRIM(CONCAT(COALESCE(c.nombres, ''), ' ', COALESCE(c.apellido_paterno, ''), ' ', COALESCE(c.apellido_materno, ''))) as nombre
                ", false)
                ->join('personas p', 'p.id = vp.id_persona', 'left')
                ->join('tipo_documentos_identidad td', 'td.id = p.id_tipo_documento', 'left')
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
                'tucNumero' => 'TUC-' . date('Y') . '-' . str_pad($row['id'], 3, '0', STR_PAD_LEFT),
            ];
        }, $rows);

        return $data;
    }

    public function listarParaQr()
    {
        $db = \Config\Database::connect();
        $builder = $db->table('vehiculos v')
            ->select("v.id, v.placa, COALESCE(tv.nombre, 'Mototaxi') AS tipo, COALESCE(v.codigo_qr, '') AS codigoQr, v.id_asociacion AS asociacionId, o.razon_social AS asociacion, COALESCE(v.marca, '') AS marca, COALESCE(v.modelo, '') AS modelo, COALESCE(p.numero, '') AS propietarioDni, p.uuid AS propietarioPersonaId, TRIM(CONCAT_WS(' ', c.nombres, c.apellido_paterno, c.apellido_materno)) AS propietario", false)
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

        $buscar = trim((string) $this->request->getGet('buscar'));
        if ($buscar !== '') {
            $builder->groupStart()

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

        $formalidad = strtoupper((string) $this->request->getGet('formalidad'));
        if ($formalidad === 'FORMAL') {
            $builder->where('v.id_asociacion IS NOT NULL', null, false);
        } elseif ($formalidad === 'INFORMAL') {
            $builder->where('v.id_asociacion IS NULL', null, false);
        }

        $tipoFiltro = trim((string) $this->request->getGet('tipo'));
        if ($tipoFiltro !== '' && strtoupper($tipoFiltro) !== 'TODOS') {

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
                    'tucNumero' => 'TUC-' . date('Y') . '-' . str_pad($row['id'], 3, '0', STR_PAD_LEFT),
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

// que solo necesitan columnas planas, no el historial por vehículo.
        $rows = $builder->orderBy('v.id', 'DESC')->get()->getResultArray();
        $data = array_map(static function (array $row): array {
            $propietario = trim(($row['propietarioNombres'] ?? '') . ' ' . ($row['propietarioPaterno'] ?? '') . ' ' . ($row['propietarioMaterno'] ?? ''));
            unset($row['propietarioNombres'], $row['propietarioPaterno'], $row['propietarioMaterno']);
            return $row + ['propietario' => $propietario ?: 'Sin Propietario Asignado'];
        }, $rows);

        if ($this->request->getGet('ligero')) {
            $campos = array_flip(['id', 'uuid', 'placa', 'tipo', 'marca', 'modelo', 'color', 'anio', 'serieMotor', 'asociacionId', 'asociacion', 'propietarioDni', 'propietario', 'estado', 'formalidad', 'tucNumero']);
            $data = array_map(static fn (array $r) => array_intersect_key($r, $campos), $data);
        }

        return $this->respond(['data' => $data]);
    }

    public function show($id = null)
    {
        $db = \Config\Database::connect();

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
        $codeZona = trim((string)($this->request->getGet('codeZona') ?? '11')) ?: '11';
        $codeOficina = trim((string)($this->request->getGet('codeOficina') ?? '01')) ?: '01';
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

                \App\Services\AuditoriaService::registrar('PIDE', 'CONSULTA_SUNARP', "Consulta de placa en SUNARP (búsqueda móvil): {$normalizado} (zona {$codeZona}, oficina {$codeOficina})", ['placa' => $normalizado, 'origen' => 'buscarMobile', 'codeZona' => $codeZona, 'codeOficina' => $codeOficina]);
                $sunarpData = \App\Services\PideService::sunarp($normalizado, $codeZona, $codeOficina);
                if ($sunarpData && !isset($sunarpData['error'])) {
                    $rawProps = $sunarpData['propietarios'] ?? [];
                    $propNames = array_filter(array_map(function($p) {
                        return is_string($p) ? trim($p) : trim($p['nombre'] ?? $p['razon_social'] ?? $p['apellidos_nombres'] ?? '');
                    }, is_array($rawProps) ? $rawProps : []));

                    $propietario = empty($propNames) ? 'Sin Propietario Asignado' : implode(', ', $propNames);

                    $cat = strtoupper(trim($sunarpData['categoria'] ?? ''));
                    $carr = strtoupper(trim($sunarpData['carroceria'] ?? ''));
                    $inferredTipo = $sunarpData['clase'] ?? $sunarpData['tipo'] ?? 'Vehículo';

                    if ($cat === 'L5' && strpos($carr, 'CARG') !== false) {
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
                        'tucNumero' => 'TUC-' . date('Y') . '-000',
                    ]]);
                }
            }

            return $this->failNotFound('No se encontró vehículo con esa placa en la sede seleccionada. Verifica que la placa esté bien escrita o prueba seleccionando otra sede de registro.');
        }

        $data = $this->appendVehiculoRelations($rows)[0];

        if ($tipo === 'PLACA' && ($data['formalidad'] ?? '') === 'INFORMAL' && (empty($data['propietario']) || $data['propietario'] === 'Sin Propietario Asignado' || $data['propietario'] === 'No Registrado' || $data['propietario'] === 'Sin Propietario')) {

            \App\Services\AuditoriaService::registrar('PIDE', 'CONSULTA_SUNARP', "Consulta de placa en SUNARP (búsqueda móvil): {$normalizado} (zona {$codeZona}, oficina {$codeOficina})", ['placa' => $normalizado, 'origen' => 'buscarMobile', 'codeZona' => $codeZona, 'codeOficina' => $codeOficina]);
            $sunarpData = \App\Services\PideService::sunarp($normalizado, $codeZona, $codeOficina);
            if ($sunarpData && !isset($sunarpData['error'])) {
                $rawProps = $sunarpData['propietarios'] ?? [];
                $propNames = array_filter(array_map(function($p) {
                    return is_string($p) ? trim($p) : trim($p['nombre'] ?? $p['razon_social'] ?? $p['apellidos_nombres'] ?? '');
                }, is_array($rawProps) ? $rawProps : []));

                if (!empty($propNames)) {
                    $data['propietario'] = implode(', ', $propNames);
                }

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
            return $this->failValidationErrors('El vehículo con placa ' . $placa . ' ya se encuentra registrado en el sistema.');
        }

        if (isset($input['anio']) && $input['anio'] !== '' && (!filter_var($input['anio'], FILTER_VALIDATE_INT) || (int)$input['anio'] < 1900 || (int)$input['anio'] > (int)date('Y') + 1)) {
            return $this->failValidationErrors('El año de fabricación no es válido.');
        }
        if (isset($input['estado']) && !in_array(strtoupper(trim($input['estado'])), ['ACTIVO', 'INACTIVO'], true)) {
            return $this->failValidationErrors('El estado del vehículo debe ser Activo o Inactivo.');
        }
        $tipoNombre = !empty($input['tipo']) ? trim($input['tipo']) : 'Mototaxi';
        $tipoRow = $db->table('tipos_vehiculo')->where('nombre', $tipoNombre)->get()->getRowArray();
        if (!$tipoRow) {
            return $this->failValidationErrors('Seleccione un tipo de vehículo válido de la lista.');
        } else {
            $tipoVehiculoId = $tipoRow['id'];
        }

        $orgName = trim($input['asociacion'] ?? '');
        $asociacionId = $this->resolverAsociacionId($db, $orgName);

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
            return $this->failValidationErrors('El propietario indicado con documento ' . $propietarioDni . ' no está registrado. Regístrelo en Personas o selecciónelo de la lista.');
        }
        $personaId = (int)$personaRow['id'];

        $db->transException(true)->transBegin();
        try {
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
                'tucNumero'        => $input['tucNumero'] ?? ('TUC-' . date('Y') . '-' . str_pad($vehiculoId, 3, '0', STR_PAD_LEFT)),
            ];

            if (!$db->transStatus()) throw new \RuntimeException('Error guardando vehículo.');
            $db->transCommit();
            return $this->respondCreated(['status' => true, 'message' => 'Vehículo registrado con éxito', 'data' => $newVehiculo]);
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('No se pudo guardar el vehículo. No se modificó ningún dato.');
        }
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getRawInput();

        if (!$id) {
            return $this->failNotFound('ID de vehículo no especificado.');
        }

        if (!$db->table('vehiculos')->where('id', $id)->countAllResults()) {
            return $this->failNotFound('Vehículo no encontrado.');
        }
        if (isset($input['anio']) && (!filter_var($input['anio'], FILTER_VALIDATE_INT) || (int)$input['anio'] < 1900 || (int)$input['anio'] > (int)date('Y') + 1)) {
            return $this->failValidationErrors('Año de fabricación no válido.');
        }
        if (isset($input['estado']) && !in_array(strtoupper(trim($input['estado'])), ['ACTIVO', 'INACTIVO'], true)) {
            return $this->failValidationErrors('Estado de vehículo no válido.');
        }
        $propietarioDni = trim($input['propietarioDni'] ?? '');
        if ($propietarioDni !== '' && !$db->table('personas')->where('numero', $propietarioDni)->countAllResults()) {
            return $this->failValidationErrors('El propietario indicado con documento ' . $propietarioDni . ' no está registrado. Regístrelo en Personas o selecciónelo de la lista.');
        }
        if (!empty($input['tipo']) && !$db->table('tipos_vehiculo')->where('nombre', trim($input['tipo']))->countAllResults()) {
            return $this->failValidationErrors('Seleccione un tipo de vehículo válido de la lista.');
        }

        $db->transException(true)->transBegin();
        try {
            if (!$db->query('SELECT id FROM vehiculos WHERE id = ? FOR UPDATE', [(int)$id])->getRowArray()) {
                $db->transRollback();
                return $this->failNotFound('Vehículo no encontrado.');
            }

            $record = [];
            if (isset($input['placa'])) {
                $placa = \App\Libraries\Placa::normalizar($input['placa']);
                if ($placa === '') {
                    $db->transRollback();
                    return $this->failValidationErrors('La placa del vehículo es requerida.');
                } else {
                    if (!preg_match('/^[A-Z0-9]{6}$/', $placa)) {
                        $db->transRollback();
                        return $this->failValidationErrors('La placa de rodaje debe tener exactamente 6 caracteres alfanuméricos.');
                    }
                    if ($db->table('vehiculos')->where('placa', $placa)->where('id !=', $id)->countAllResults() > 0) {
                        $db->transRollback();
                        return $this->failValidationErrors('El vehículo con placa ' . $placa . ' ya se encuentra registrado en el sistema.');
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
                    $db->transRollback();
                    return $this->failValidationErrors('Seleccione un tipo de vehículo registrado.');
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
                    $db->transRollback();
                    return $this->failValidationErrors('El propietario no existe. Regístrelo primero en el módulo Personas.');
                }
                $personaId = (int)$personaRow['id'];

// Cerrar el propietario anterior sin borrar su historial.
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

            if (!$db->transStatus()) {
                throw new \RuntimeException('Error actualizando vehículo.');
            }
            $db->transCommit();
            return $this->respond(['status' => true, 'message' => 'Vehículo actualizado con éxito']);
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('No se pudo guardar el vehículo. No se modificó ningún dato.');
        }
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

        try {
            \App\Services\EliminacionSegura::eliminar($db, 'vehiculos', (int)$id, [
                'vehiculo_propietarios' => 'id_vehiculo', 'documentos_vehiculo' => 'id_vehiculo',
            ]);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('No se pudo eliminar el vehículo. No se ha borrado ningún dato.');
        }

        \App\Services\AuditoriaService::registrar(
            'VEHICULOS',
            'ELIMINAR',
            "Se eliminó el vehículo con placa '$placa' (ID: $id)",
            ['id' => $id, 'placa' => $placa]
        );

        return $this->respondDeleted(['status' => true, 'message' => 'Vehículo eliminado con éxito']);
    }

    public function formalesMobile()
    {
        $db = \Config\Database::connect();
        $builder = $db->table('vehiculos v')
            ->select("
                v.id,
                v.uuid,
                v.placa,
                COALESCE(tv.nombre, 'Mototaxi') AS tipo,
                COALESCE(v.marca, '') AS marca,
                COALESCE(v.modelo, '') AS modelo,
                COALESCE(v.color, '') AS color,
                COALESCE(v.anio_fabricacion, '') AS anio,
                COALESCE(v.serie_motor, '') AS serieMotor,
                v.id_asociacion AS asociacionId,
                COALESCE(o.razon_social, '') AS asociacion,
                COALESCE(o.ruc, '') AS asociacionRuc,
                COALESCE(p.numero, '') AS propietarioDni,
                TRIM(CONCAT(COALESCE(c.nombres, ''), ' ', COALESCE(c.apellido_paterno, ''), ' ', COALESCE(c.apellido_materno, ''))) AS propietario,
                v.estado AS estado,
                'FORMAL' AS formalidad
            ", false)
            ->join('tipos_vehiculo tv', 'tv.id = v.id_tipo_vehiculo', 'left')
            ->join('asociaciones o', 'o.id = v.id_asociacion', 'inner')
            ->join('vehiculo_propietarios vp', "vp.id_vehiculo = v.id AND vp.fecha_fin IS NULL AND vp.estado = 'ACTIVO'", 'left')
            ->join('personas p', 'p.id = vp.id_persona', 'left')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->where('v.estado', 'ACTIVO')
            ->where('v.id_asociacion IS NOT NULL', null, false);

        $buscar = trim((string) $this->request->getGet('buscar'));
        if ($buscar !== '') {
            $builder->groupStart()
                ->like('v.placa', \App\Libraries\Placa::paraBusqueda($buscar))
                ->orLike('v.marca', $buscar)
                ->orLike('v.modelo', $buscar)
                ->orLike('o.razon_social', $buscar)
                ->orLike('p.numero', $buscar)
                ->orLike('c.nombres', $buscar)
                ->orLike('c.apellido_paterno', $buscar)
                ->orWhere(\App\Libraries\Busqueda::nombreCompleto($buscar, 'c.nombres', 'c.apellido_paterno', 'c.apellido_materno'), null, false)
                ->groupEnd();
        }

        $page = max(1, (int) $this->request->getGet('page'));
        $porPagina = max(1, min(100, (int) ($this->request->getGet('porPagina') ?: 30)));

        $total = (clone $builder)->countAllResults(false);
        $rows = $builder->orderBy('v.placa', 'ASC')
            ->limit($porPagina, ($page - 1) * $porPagina)
            ->get()
            ->getResultArray();

        $rows = array_map(static function (array $r) {
            $r['id'] = (int) $r['id'];
            $r['asociacionId'] = (int) $r['asociacionId'];
            $r['propietario'] = !empty(trim($r['propietario'])) ? trim($r['propietario']) : 'Sin Propietario Asignado';
            return $r;
        }, $rows);

        return $this->respond([
            'status' => true,
            'data' => $rows,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'porPagina' => $porPagina,
                'totalPaginas' => (int) ceil($total / $porPagina),
            ],
        ]);
    }
}
