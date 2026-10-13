<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PermisosController extends ResourceController
{
    use \App\Libraries\ResuelveUuid;

    protected string $tablaUuid = 'permisos_circulacion';
    protected array $tablasUuidPorMetodo = [];
    protected array $soloUuidEnEstricto = [];

    protected $format = 'json';

    public function estadisticas()
    {
        $db = \Config\Database::connect();
        \App\Libraries\EstadosPorFecha::alDia($db);
        // "Control Vehicular" es la categoría por defecto en la UI (todo lo que
        // no es Carga/Descarga, Uso de Vías o Zonas Reservadas), no un valor de
        // enum propio — replicamos exactamente esa misma regla aquí.
        $row = $db->table('permisos_circulacion')
            ->select("
                COUNT(*) as total,
                SUM(CASE WHEN tipo_permiso = 'CARGA_DESCARGA' THEN 1 ELSE 0 END) as carga,
                SUM(CASE WHEN tipo_permiso = 'USO_VIAS' THEN 1 ELSE 0 END) as vias,
                SUM(CASE WHEN tipo_permiso IN ('ZONAS_RESERVADAS', 'ZONA_RESERVADA') THEN 1 ELSE 0 END) as zonas,
                SUM(CASE WHEN estado = 'VIGENTE' THEN 1 ELSE 0 END) as vigentes,
                SUM(CASE WHEN estado != 'VIGENTE' THEN 1 ELSE 0 END) as vencidos
            ", false)
            ->get()->getRowArray();

        $total = (int) ($row['total'] ?? 0);
        $carga = (int) ($row['carga'] ?? 0);
        $vias = (int) ($row['vias'] ?? 0);
        $zonas = (int) ($row['zonas'] ?? 0);

        return $this->respond(['data' => [
            'totalPermisos' => $total,
            'totalControl' => max(0, $total - $carga - $vias - $zonas),
            'totalCarga' => $carga,
            'totalVias' => $vias,
            'totalZonas' => $zonas,
            'vigentes' => (int) ($row['vigentes'] ?? 0),
            'vencidos' => (int) ($row['vencidos'] ?? 0),
        ]]);
    }

    private function getBaseQuery()
    {
        $db = \Config\Database::connect();
        // Placa, solicitante, expediente y recibo no son columnas propias: se
        // derivan de las FK del permiso (o del trámite vinculado) y del pago real.
        $nombreCiudadano = "TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, '')))";

        return $db->table('permisos_circulacion pc')
            ->select("pc.uuid AS uuid, 
                pc.id,
                pc.id_tramite as tramiteId,
                pc.id_persona as personaId,
                pc.id_asociacion as asociacionId,
                pc.id_vehiculo as vehiculoId,
                pc.numero_autorizacion as numeroAutorizacion,
                COALESCE(v.placa, '') as vehiculoPlaca,
                COALESCE(o.razon_social, NULLIF($nombreCiudadano, ''), '') as solicitanteNombre,
                COALESCE(o.ruc, p.numero, '') as solicitanteDocumento,
                COALESCE(NULLIF(TRIM(CONCAT(rc.nombres, ' ', rc.apellido_paterno, ' ', COALESCE(rc.apellido_materno, ''))), ''), '') as representanteLegal,
                pc.tipo_permiso as tipoPermiso,
                pc.asunto,
                pc.referencia_sisgedo as referenciaSisgedo,
                COALESCE(td.numero_expediente, pc.referencia_sisgedo, '') as expediente,
                pc.registro_numero as registroNumero,
                pc.contenido,
                pc.zona_circulacion as zonaCirculacion,
                pc.ubicacion,
                pc.recorrido_ingreso as recorridoIngreso,
                pc.flota_placas as flotaPlacas,
                COALESCE(pt.numero_recibo, '') as reciboIngresoNumero,
                pt.total as reciboIngresoMonto,
                pt.fecha_pago as reciboIngresoFecha,
                pc.tonelaje,
                pc.numero_seguridad as numeroSeguridad,
                pc.observaciones,
                pc.horario_inicio as horarioInicio,
                pc.horario_fin as horarioFin,
                pc.fecha_emision as fechaEmision,
                pc.fecha_inicio_vigencia as fechaInicioVigencia,
                pc.fecha_fin_vigencia as fechaFinVigencia,
                pc.estado,
                COALESCE(td.numero_expediente, pc.referencia_sisgedo, '') as expedienteNumero,
                td.fecha_solicitud as fechaSolicitud,
                pa.nombre as procedimientoNombre,
                pa.codigo as procedimientoCodigo,
                COALESCE(o.razon_social, NULLIF($nombreCiudadano, ''), '') as solicitante,
                COALESCE(o.ruc, p.numero, '') as solicitanteDoc,
                o.ruc as solicitanteRuc,
                p.numero as solicitanteDni
            ", false)
            ->join('tramites_documentarios td', 'td.id = pc.id_tramite', 'left')
            ->join('procedimientos_administrativos pa', 'pa.id = td.id_procedimiento_admin', 'left')
            ->join('asociaciones o', 'o.id = COALESCE(pc.id_asociacion, td.id_asociacion)', 'left', false)
            ->join('personas p', 'p.id = COALESCE(pc.id_persona, td.id_persona)', 'left', false)
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->join('ciudadanos rc', 'rc.id_persona = o.id_representante_legal', 'left')
            ->join('vehiculos v', 'v.id = COALESCE(pc.id_vehiculo, td.id_vehiculo)', 'left', false)
            ->join('(SELECT id_tramite, MAX(id) AS id FROM pagos_transito WHERE id_tramite IS NOT NULL GROUP BY id_tramite) pm', 'pm.id_tramite = pc.id_tramite', 'left', false)
            ->join('pagos_transito pt', 'pt.id = pm.id', 'left');
    }

    /**
     * Traduce los datos del formulario (placa, documento del solicitante,
     * expediente) a las columnas reales de permisos_circulacion.
     */
    private function resolverRelaciones($db, array $payload, bool $esCreacion): array
    {
        $data = [];

        if ($esCreacion || array_key_exists('vehiculoPlaca', $payload)) {
            $placa = \App\Libraries\Placa::normalizar((string)($payload['vehiculoPlaca'] ?? ''));
            $data['id_vehiculo'] = null;
            if ($placa !== '') {
                $vehiculo = $db->table('vehiculos')->select('id')->where('placa', $placa)->get()->getRowArray();
                if ($vehiculo) {
                    $data['id_vehiculo'] = (int)$vehiculo['id'];
                } elseif (empty($payload['flotaPlacas'])) {
                    // Vehículo fuera del padrón (p. ej. camión de carga): se conserva la placa.
                    $data['flota_placas'] = $placa;
                }
            }
        }

        $claveDoc = array_key_exists('solicitanteDocumento', $payload) ? 'solicitanteDocumento'
            : (array_key_exists('solicitanteDoc', $payload) ? 'solicitanteDoc' : null);
        if ($esCreacion || $claveDoc) {
            $documento = trim((string)($claveDoc ? $payload[$claveDoc] : ''));
            $data['id_persona'] = null;
            $data['id_asociacion'] = null;
            if ($documento !== '') {
                $asociacion = strlen($documento) === 11
                    ? $db->table('asociaciones')->select('id')->where('ruc', $documento)->get()->getRowArray()
                    : null;
                if ($asociacion) {
                    $data['id_asociacion'] = (int)$asociacion['id'];
                } else {
                    $persona = $db->table('personas')->select('id')->where('numero', $documento)->get()->getRowArray();
                    if (!$persona) {
                        throw new \DomainException("El solicitante con documento {$documento} no está registrado. Regístrelo en Personas o Asociaciones.");
                    }
                    $data['id_persona'] = (int)$persona['id'];
                }
            }
        }

        foreach (['referenciaSisgedo', 'expediente', 'expedienteNumero'] as $clave) {
            if (!empty($payload[$clave])) {
                $data['referencia_sisgedo'] = trim((string)$payload[$clave]);
                break;
            }
        }

        return $data;
    }

    public function index()
    {
        try {
            \App\Libraries\EstadosPorFecha::alDia(\Config\Database::connect());
            $builder = $this->getBaseQuery();

            $buscar = trim((string)$this->request->getGet('buscar'));
            if ($buscar !== '') {
                $builder->groupStart()
                    ->like('pc.numero_autorizacion', $buscar)
                    ->orLike('v.placa', \App\Libraries\Placa::paraBusqueda($buscar))
                    ->orLike('pc.flota_placas', \App\Libraries\Placa::paraBusqueda($buscar))
                    ->orLike('o.razon_social', $buscar)
                    ->orLike('p.numero', $buscar)
                    ->orLike('c.nombres', $buscar)
                    ->orLike('c.apellido_paterno', $buscar)
                    ->orLike('c.apellido_materno', $buscar)
                    ->orWhere(\App\Libraries\Busqueda::nombreCompleto($buscar, 'c.nombres', 'c.apellido_paterno', 'c.apellido_materno'), null, false)
                    ->orLike('pc.referencia_sisgedo', $buscar)
                    ->orLike('pc.zona_circulacion', $buscar)
                    ->orLike('pt.numero_recibo', $buscar)
                    ->groupEnd();
            }

            $tipoPermiso = strtoupper(trim((string)$this->request->getGet('tipoPermiso')));
            if ($tipoPermiso === 'CONTROL_VEHICULAR') {
                // Categoría por defecto: todo lo que no es Carga/Descarga, Uso de Vías ni Zonas Reservadas.
                $builder->groupStart()
                    ->whereNotIn('pc.tipo_permiso', ['CARGA_DESCARGA', 'USO_VIAS', 'ZONAS_RESERVADAS', 'ZONA_RESERVADA'])
                    ->orWhere('pc.tipo_permiso IS NULL', null, false)
                    ->groupEnd();
            } elseif ($tipoPermiso === 'ZONAS_RESERVADAS') {
                $builder->whereIn('pc.tipo_permiso', ['ZONAS_RESERVADAS', 'ZONA_RESERVADA']);
            } elseif ($tipoPermiso !== '' && $tipoPermiso !== 'TODOS') {
                $builder->where('pc.tipo_permiso', $tipoPermiso);
            }

            $estado = strtoupper(trim((string)$this->request->getGet('estado')));
            if ($estado !== '' && $estado !== 'TODOS') {
                $builder->where('pc.estado', $estado);
            }

            $page = (int)$this->request->getGet('page');
            $porPagina = max(1, min(200, (int)($this->request->getGet('porPagina') ?: 20)));

            $columnasOrdenables = [
                'tipoPermiso' => 'pc.tipo_permiso',
                'numeroAutorizacion' => 'pc.numero_autorizacion',
                'solicitanteNombre' => 'solicitanteNombre',
                'estado' => 'pc.estado',
            ];

            if ($page > 0) {
                $total = (clone $builder)->countAllResults(false);
                $rows = \App\Libraries\QuerySort::aplicar($builder, $this->request, $columnasOrdenables, 'pc.id')
                    ->limit($porPagina, ($page - 1) * $porPagina)
                    ->get()
                    ->getResultArray();

                $data = array_map([$this, 'normalizarFila'], $rows);

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

            $rows = $builder->orderBy('pc.id', 'DESC')
                ->get()
                ->getResultArray();

            $data = array_map([$this, 'normalizarFila'], $rows);

            return $this->respond(['data' => $data]);
        } catch (\Throwable $e) {
            log_message('error', 'Error consultando permisos: ' . $e->getMessage());
            return $this->failServerError('Error consultando permisos. Intente nuevamente.');
        }
    }

    public function show($id = null)
    {
        try {
            $row = $this->getBaseQuery()
                ->where('pc.id', $id)
                ->get()
                ->getRowArray();

            if (!$row) {
                return $this->failNotFound('Permiso no encontrado.');
            }

            return $this->respond(['data' => $this->normalizarFila($row)]);
        } catch (\Throwable $e) {
            log_message('error', 'Error consultando detalle del permiso: ' . $e->getMessage());
            return $this->failServerError('Error consultando detalle del permiso. Intente nuevamente.');
        }
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $payload = $this->request->getJSON(true) ?? $this->request->getRawInput();

        $rules = [
            'tipoPermiso' => [
                'rules' => 'permit_empty|in_list[CARGA_DESCARGA,USO_VIAS,OPERACION,RENOVACION_OPERACION,CONTROL_VEHICULAR,ZONAS_RESERVADAS,ZONA_RESERVADA]',
                'errors' => ['in_list' => 'Tipo de permiso no válido.']
            ]
        ];

        if (!$this->validateData($payload, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $tipoPermiso = !empty($payload['tipoPermiso']) ? trim($payload['tipoPermiso']) : 'CARGA_DESCARGA';
            $year = date('Y');

            // Si se envió un ID en el payload y dicho permiso existe, actualizarlo en lugar de insertar
            $idParam = !empty($payload['id']) ? (int)$payload['id'] : null;
            if ($idParam && $db->table('permisos_circulacion')->where('id', $idParam)->countAllResults() > 0) {
                return $this->update($idParam);
            }

            // Validar número de autorización o generar correlativo único
            $numeroAutorizacion = !empty($payload['numeroAutorizacion']) ? trim($payload['numeroAutorizacion']) : '';
            if (!empty($numeroAutorizacion)) {
                $existeColision = $db->table('permisos_circulacion')
                    ->where('numero_autorizacion', $numeroAutorizacion)
                    ->get()
                    ->getRowArray();
                if ($existeColision) {
                    if ($idParam && (int)$existeColision['id'] === $idParam) {
                        return $this->update($idParam);
                    }
                    return $this->failValidationErrors(['numeroAutorizacion' => 'Número de autorización duplicado.']);
                }
            }

            if (empty($numeroAutorizacion)) {
                $prefix = match($tipoPermiso) {
                    'CARGA_DESCARGA'                        => "AUT. CARGA N° ",
                    'USO_VIAS'                              => "AUT. VIAS N° ",
                    'ZONAS_RESERVADAS', 'ZONA_RESERVADA'    => "AUT. ZONA RES N° ",
                    'CONTROL_VEHICULAR', 'OPERACION'        => "AUT. CTRL N° ",
                    default                                 => "AUT. MUN N° "
                };
                $count = $db->table('permisos_circulacion')->where('tipo_permiso', $tipoPermiso)->countAllResults() + 1;
                do {
                    $numeroAutorizacion = $prefix . str_pad((string)$count, 3, '0', STR_PAD_LEFT) . "-{$year}-SGTTV";
                    $yaExiste = $db->table('permisos_circulacion')->where('numero_autorizacion', $numeroAutorizacion)->countAllResults() > 0;
                    if ($yaExiste) {
                        $count++;
                    }
                } while ($yaExiste);
            }

            $idTramite = !empty($payload['tramiteId']) ? (int)$payload['tramiteId'] : (!empty($payload['id_tramite']) ? (int)$payload['id_tramite'] : null);

            $data = array_merge([
                'id_tramite'             => $idTramite,
                'numero_autorizacion'    => $numeroAutorizacion,
                'tipo_permiso'           => $tipoPermiso,
                'asunto'                 => !empty($payload['asunto']) ? trim($payload['asunto']) : match($tipoPermiso) {
                    'CARGA_DESCARGA'                     => 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA',
                    'USO_VIAS'                           => 'AUTORIZACION PROVISIONAL DE USO DE VIAS',
                    'ZONAS_RESERVADAS', 'ZONA_RESERVADA' => 'AUTORIZACIÓN DE ZONA RESERVADA DE ESTACIONAMIENTO EN VÍA PÚBLICA',
                    'CONTROL_VEHICULAR', 'OPERACION'     => 'AUTORIZACIÓN MUNICIPAL DE CONTROL VEHICULAR Y CIRCULACIÓN',
                    default                              => 'AUTORIZACIÓN MUNICIPAL OFICIAL'
                },
                'registro_numero'        => !empty($payload['registroNumero']) ? trim($payload['registroNumero']) : null,
                'contenido'              => !empty($payload['contenido']) ? trim($payload['contenido']) : 'Autorización oficial emitida por la Subgerencia de Tránsito y Transporte.',
                'zona_circulacion'       => !empty($payload['zonaCirculacion']) ? trim($payload['zonaCirculacion']) : 'Anillo Vial - Distrito de José Leonardo Ortiz',
                'ubicacion'              => !empty($payload['ubicacion']) ? trim($payload['ubicacion']) : null,
                'recorrido_ingreso'      => !empty($payload['recorridoIngreso']) ? trim($payload['recorridoIngreso']) : null,
                'flota_placas'           => !empty($payload['flotaPlacas']) ? trim($payload['flotaPlacas']) : null,
                'tonelaje'               => !empty($payload['tonelaje']) ? trim($payload['tonelaje']) : null,
                'numero_seguridad'       => !empty($payload['numeroSeguridad']) ? trim($payload['numeroSeguridad']) : str_pad((string)mt_rand(10000, 99999), 5, '0', STR_PAD_LEFT),
                'observaciones'          => !empty($payload['observaciones']) ? trim($payload['observaciones']) : null,
                'horario_inicio'         => !empty($payload['horarioInicio']) ? trim($payload['horarioInicio']) : '16:00:00',
                'horario_fin'            => !empty($payload['horarioFin']) ? trim($payload['horarioFin']) : '05:00:00',
                'fecha_emision'          => !empty($payload['fechaEmision']) ? trim($payload['fechaEmision']) : date('Y-m-d'),
                'fecha_inicio_vigencia'  => !empty($payload['fechaInicioVigencia']) ? trim($payload['fechaInicioVigencia']) : date('Y-m-d'),
                'fecha_fin_vigencia'     => !empty($payload['fechaFinVigencia']) ? trim($payload['fechaFinVigencia']) : date('Y-m-d', strtotime('+1 year')),
                'estado'                 => !empty($payload['estado']) ? strtoupper(trim($payload['estado'])) : 'VIGENTE',
            ], $this->resolverRelaciones($db, $payload, true));

            $errores = \App\Services\ValidacionRegistro::permiso($data);
            if ($errores) return $this->failValidationErrors($errores);
            $data['uuid'] = \App\Libraries\Identificador::nuevo();
            $db->table('permisos_circulacion')->insert($data);
            $newId = (int)$db->insertID();

            $creado = $this->getBaseQuery()->where('pc.id', $newId)->get()->getRowArray();

            return $this->respondCreated([
                'status'  => 201,
                'message' => 'Autorización municipal registrada exitosamente.',
                'id'      => $newId,
                'data'    => $creado ? $this->normalizarFila($creado) : ['id' => $newId]
            ]);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            if (stripos($msg, 'Duplicate entry') !== false) {
                return $this->failValidationErrors('El número de autorización ya se encuentra registrado. Se generó un nuevo registro o verifique el correlativo.');
            }
            log_message('error', 'Error registrando permiso: ' . $msg);
            return $this->failServerError('Error registrando permiso. Intente nuevamente.');
        }
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $payload = $this->request->getJSON(true) ?? $this->request->getRawInput();

        try {
            $exists = $db->table('permisos_circulacion')->where('id', $id)->countAllResults();
            if (!$exists) {
                return $this->failNotFound('Permiso no encontrado.');
            }

            $allowedFields = [
                'id_tramite'            => 'tramiteId',
                'numero_autorizacion'   => 'numeroAutorizacion',
                'tipo_permiso'          => 'tipoPermiso',
                'asunto'                => 'asunto',
                'registro_numero'       => 'registroNumero',
                'contenido'             => 'contenido',
                'zona_circulacion'      => 'zonaCirculacion',
                'ubicacion'             => 'ubicacion',
                'recorrido_ingreso'     => 'recorridoIngreso',
                'flota_placas'          => 'flotaPlacas',
                'tonelaje'              => 'tonelaje',
                'numero_seguridad'      => 'numeroSeguridad',
                'observaciones'         => 'observaciones',
                'horario_inicio'        => 'horarioInicio',
                'horario_fin'           => 'horarioFin',
                'fecha_emision'         => 'fechaEmision',
                'fecha_inicio_vigencia' => 'fechaInicioVigencia',
                'fecha_fin_vigencia'    => 'fechaFinVigencia',
                'estado'                => 'estado',
            ];

            $data = [];
            foreach ($allowedFields as $col => $jsonKey) {
                if (array_key_exists($jsonKey, $payload)) {
                    $val = $payload[$jsonKey];
                    if ($col === 'estado') {
                        $val = !empty($val) ? strtoupper(trim((string)$val)) : null;
                    } elseif ($col === 'id_tramite') {
                        $val = !empty($val) ? (int)$val : null;
                    } else {
                        $val = !empty($val) ? trim((string)$val) : null;
                    }
                    $data[$col] = $val;
                }
            }

            $data = array_merge($data, $this->resolverRelaciones($db, $payload, false));

            $actual = $db->table('permisos_circulacion')->where('id', $id)->get()->getRowArray();
            $errores = \App\Services\ValidacionRegistro::permiso(array_merge($actual, $data));
            foreach (['numero_autorizacion', 'fecha_emision', 'fecha_inicio_vigencia', 'contenido'] as $campo) {
                if (array_key_exists($campo, $data) && ($data[$campo] === null || $data[$campo] === '')) $errores[$campo] = 'Campo obligatorio.';
            }
            if ($errores) return $this->failValidationErrors($errores);

            if (!empty($data['numero_autorizacion'])) {
                $existeOtro = $db->table('permisos_circulacion')
                    ->where('numero_autorizacion', $data['numero_autorizacion'])
                    ->where('id !=', $id)
                    ->countAllResults();
                if ($existeOtro > 0) {
                    return $this->failValidationErrors("El número de autorización '{$data['numero_autorizacion']}' ya pertenece a otro registro.");
                }
            }

            if (!empty($data)) {
                $db->table('permisos_circulacion')->where('id', $id)->update($data);
            }

            return $this->respond([
                'status'  => 200,
                'message' => 'Autorización actualizada correctamente.'
            ]);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            if (stripos($msg, 'Duplicate entry') !== false) {
                return $this->failValidationErrors('El número de autorización ya está registrado en otro permiso.');
            }
            log_message('error', 'Error actualizando permiso: ' . $msg);
            return $this->failServerError('Error actualizando permiso. Intente nuevamente.');
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $exists = $db->table('permisos_circulacion')->where('id', $id)->countAllResults();
            if (!$exists) {
                return $this->failNotFound('Permiso no encontrado.');
            }

            $db->table('permisos_circulacion')->where('id', $id)->delete();
            \App\Services\AuditoriaService::registrar('PERMISOS', 'ELIMINAR', 'Permiso eliminado (id ' . (int)$id . ')', ['id' => (int)$id]);
            return $this->respondDeleted([
                'status'  => 200,
                'message' => 'Autorización eliminada correctamente.'
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'Error eliminando permiso: ' . $e->getMessage());
            return $this->failServerError('Error eliminando permiso. Intente nuevamente.');
        }
    }

    public function tramitesDisponibles()
    {
        $db = \Config\Database::connect();
        try {
            $rows = $db->table('tramites_documentarios td')
                ->select("
                    td.id,
                    td.numero_expediente as numeroExpediente,
                    td.fecha_solicitud as fechaSolicitud,
                    td.detalle_solicitud as detalleSolicitud,
                    td.estado,
                    td.id_persona as personaId,
                    td.id_asociacion as asociacionId,
                    td.id_vehiculo as vehiculoId,
                    td.id_procedimiento_admin as procedimientoAdminId,
                    pa.codigo as procedimientoCodigo,
                    pa.nombre as procedimientoNombre,
                    pa.costo as procedimientoCosto,
                    COALESCE(o.razon_social, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))), '') as solicitanteNombre,
                    COALESCE(o.ruc, p.numero, '') as solicitanteDocumento,
                    o.razon_social as asociacionNombre,
                    o.ruc as asociacionRuc,
                    TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))) as personaNombre,
                    p.numero as personaDocumento,
                    COALESCE(TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))), '') as representanteLegalNombre,
                    COALESCE(v.placa, '') as vehiculoPlaca,
                    COALESCE(pt.numero_recibo, '') as reciboIngresoNumero,
                    pt.total as reciboIngresoMonto,
                    pt.fecha_pago as reciboIngresoFecha
                ", false)
                ->join('procedimientos_administrativos pa', 'pa.id = td.id_procedimiento_admin', 'left')
                ->join('asociaciones o', 'o.id = td.id_asociacion', 'left')
                ->join('personas p', 'p.id = td.id_persona', 'left')
                ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                ->join('vehiculos v', 'v.id = td.id_vehiculo', 'left')
                ->join('pagos_transito pt', 'pt.id_tramite = td.id', 'left')
                ->orderBy('td.id', 'DESC')
                ->get()
                ->getResultArray();

            return $this->respond(['data' => $rows]);
        } catch (\Throwable $e) {
            log_message('error', 'Error consultando trámites: ' . $e->getMessage());
            return $this->failServerError('Error consultando trámites. Intente nuevamente.');
        }
    }

    public function buscarAdministrados()
    {
        $db = \Config\Database::connect();
        $q = trim((string)($this->request->getGet('q') ?? ''));

        try {
            $results = [];

            // 1. Buscar en Asociaciones / Empresas
            $builderAsoc = $db->table('asociaciones o')
                ->select("
                    o.id as asociacionId,
                    'EMPRESA' as origenTipo,
                    o.razon_social as nombre,
                    COALESCE(o.ruc, '') as documento,
                    'RUC' as tipoDocumento,
                    COALESCE(o.direccion, '') as direccion,
                    COALESCE(o.telefono_contacto, '') as telefono
                ");

            if ($q !== '') {
                $builderAsoc->groupStart()
                    ->like('o.razon_social', $q)
                    ->orLike('o.ruc', $q)
                    ->groupEnd();
            }
            $asocs = $builderAsoc->limit(10)->get()->getResultArray();
            foreach ($asocs as $a) {
                $results[] = $this->formatearResultadoAdministrado('EMPRESA', [
                    'nombre'        => $a['nombre'],
                    'documento'     => $a['documento'],
                    'tipoDocumento' => 'RUC',
                    'direccion'     => $a['direccion'],
                    'telefono'      => $a['telefono'],
                ]);
            }

            // 2. Buscar en Personas / Ciudadanos
            $builderPers = $db->table('personas p')
                ->select("
                    p.id as personaId,
                    'PERSONA' as origenTipo,
                    TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))) as nombre,
                    COALESCE(p.numero, '') as documento,
                    COALESCE(td.codigo, 'DNI') as tipoDocumento,
                    COALESCE(p.direccion, '') as direccion,
                    COALESCE(p.telefono, p.celular, '') as telefono
                ")
                ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                ->join('tipo_documentos_identidad td', 'td.id = p.id_tipo_documento', 'left');

            if ($q !== '') {
                $builderPers->groupStart()
                    ->like('p.numero', $q)
                    ->orLike('c.nombres', $q)
                    ->orLike('c.apellido_paterno', $q)
                    ->orLike('c.apellido_materno', $q)
                    ->groupEnd();
            }
            $pers = $builderPers->limit(10)->get()->getResultArray();
            foreach ($pers as $p) {
                if (empty($p['nombre']) && empty($p['documento'])) continue;
                $results[] = $this->formatearResultadoAdministrado('PERSONA', [
                    'nombre'        => $p['nombre'],
                    'documento'     => $p['documento'],
                    'tipoDocumento' => $p['tipoDocumento'],
                    'direccion'     => $p['direccion'],
                    'telefono'      => $p['telefono'],
                ]);
            }

            // 3. Buscar en Trámites Documentarios (para auto-rellenar expediente, placa, recibo y solicitante)
            $builderTram = $db->table('tramites_documentarios td')
                ->select("
                    td.id as tramiteId,
                    td.numero_expediente as expediente,
                    COALESCE(v.placa, '') as placa,
                    COALESCE(o.razon_social, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))), '') as nombre,
                    COALESCE(o.ruc, p.numero, '') as documento,
                    CASE WHEN o.id IS NOT NULL THEN 'RUC' ELSE 'DNI' END as tipoDocumento,
                    CASE WHEN o.id IS NOT NULL AND td.id_persona IS NOT NULL THEN TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))) ELSE '' END as representanteLegal,
                    COALESCE(pt.numero_recibo, '') as reciboNumero,
                    pt.total as reciboMonto,
                    pt.fecha_pago as reciboFecha
                ")
                ->join('asociaciones o', 'o.id = td.id_asociacion', 'left')
                ->join('personas p', 'p.id = td.id_persona', 'left')
                ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                ->join('vehiculos v', 'v.id = td.id_vehiculo', 'left')
                ->join('pagos_transito pt', 'pt.id_tramite = td.id', 'left');

            if ($q !== '') {
                $builderTram->groupStart()
                    ->like('td.numero_expediente', $q)
                    ->orLike('v.placa', \App\Libraries\Placa::paraBusqueda($q))
                    ->orLike('o.razon_social', $q)
                    ->orLike('o.ruc', $q)
                    ->orLike('p.numero', $q)
                    ->orLike('c.nombres', $q)
                    ->orLike('c.apellido_paterno', $q)
                    ->orLike('pt.numero_recibo', $q)
                    ->groupEnd();
            }
            $trams = $builderTram->limit(10)->get()->getResultArray();
            foreach ($trams as $t) {
                if (empty($t['nombre']) && empty($t['documento']) && empty($t['expediente'])) continue;
                $results[] = $this->formatearResultadoAdministrado('TRAMITE', [
                    'nombre'             => $t['nombre'],
                    'documento'          => $t['documento'],
                    'tipoDocumento'      => $t['tipoDocumento'],
                    'representanteLegal' => $t['representanteLegal'] ?? '',
                    'placa'              => $t['placa'],
                    'expediente'         => $t['expediente'],
                    'reciboNumero'       => $t['reciboNumero'],
                    'reciboMonto'        => $t['reciboMonto'] ? (float)$t['reciboMonto'] : null,
                    'reciboFecha'        => $t['reciboFecha'],
                    'tramiteId'          => (int)$t['tramiteId'],
                ]);
            }

            // Deduplicar resultados por documento + nombre + expediente
            $unique = [];
            $seen = [];
            foreach ($results as $item) {
                $key = ($item['documento'] ?: '') . '|' . ($item['nombre'] ?: '') . '|' . ($item['expediente'] ?: '');
                if (!isset($seen[$key])) {
                    $seen[$key] = true;
                    $unique[] = $item;
                }
            }

            return $this->respond(['data' => array_slice($unique, 0, 15)]);
        } catch (\Throwable $e) {
            log_message('error', 'Error buscando administrados: ' . $e->getMessage());
            return $this->failServerError('Error buscando administrados. Intente nuevamente.');
        }
    }

    /**
     * Completa un resultado de búsqueda de administrados con los campos por
     * defecto que no aplican a cada origen (empresa, persona o trámite).
     */
    private function formatearResultadoAdministrado(string $tipo, array $item): array
    {
        return array_merge([
            'tipo'               => $tipo,
            'nombre'             => '',
            'documento'          => '',
            'tipoDocumento'      => '',
            'representanteLegal' => '',
            'direccion'          => '',
            'telefono'           => '',
            'placa'              => '',
            'expediente'         => '',
            'reciboNumero'       => '',
            'reciboMonto'        => null,
            'reciboFecha'        => '',
            'tramiteId'          => null,
        ], $item);
    }

    private function normalizarFila(array $r): array
    {
        $r['id'] = (int)$r['id'];
        foreach (['tramiteId', 'personaId', 'asociacionId', 'vehiculoId'] as $k) {
            $r[$k] = $r[$k] ? (int)$r[$k] : null;
        }
        $r['reciboIngresoMonto'] = $r['reciboIngresoMonto'] !== null ? (float)$r['reciboIngresoMonto'] : null;
        return $r;
    }

    public function procedimientos()
    {
        $db = \Config\Database::connect();
        try {
            $rows = $db->table('procedimientos_administrativos')
                ->select('id, codigo, nombre, descripcion, costo, estado')
                ->where('estado', 'ACTIVO')
                ->orderBy('id', 'ASC')
                ->get()
                ->getResultArray();
            return $this->respond(['data' => $rows]);
        } catch (\Throwable $e) {
            log_message('error', 'Error consultando procedimientos: ' . $e->getMessage());
            return $this->failServerError('Error consultando procedimientos. Intente nuevamente.');
        }
    }
}
