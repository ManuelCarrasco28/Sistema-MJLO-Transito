<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class DocumentosController extends ResourceController
{
    use \App\Libraries\ResuelveUuid;

    protected string $tablaUuid = 'documentos_vehiculo';
    protected array $tablasUuidPorMetodo = ['resumenVehiculo' => 'vehiculos'];
    protected array $soloUuidEnEstricto = [];

    protected $format = 'json';

    // Columnas reales de documentos_vehiculo: cualquier otro dato del formulario se descarta.
    private const COLUMNAS = ['id_vehiculo', 'fecha_expedicion', 'fecha_expiracion', 'tipo_documento', 'codigo', 'estado'];

    private const ETIQUETAS_TIPO = [
        'TARJETA_OPERATIVIDAD' => 'Tarjeta de Operatividad',
        'SOAT' => 'SOAT',
        'TARJETA_PROPIEDAD' => 'Tarjeta de Propiedad',
    ];

    private function soloColumnasReales(array $record): array
    {
        return array_intersect_key($record, array_flip(self::COLUMNAS));
    }

    /**
     * Estado real de un documento hoy: el campo estado puede quedar desfasado
     * (VIGENTE con fecha ya vencida), así que se contrasta con la fecha.
     * La Tarjeta de Propiedad no vence: solo puede estar vigente o anulada.
     */
    private function estadoEfectivo(array $doc): string
    {
        $estado = strtoupper((string) ($doc['estado'] ?? ''));
        if ($estado === 'ANULADO') {
            return 'ANULADO';
        }
        if (($doc['tipo_documento'] ?? '') === 'TARJETA_PROPIEDAD') {
            return 'VIGENTE';
        }
        if ($estado === 'VENCIDO') {
            return 'VENCIDO';
        }
        $vence = $doc['fecha_expiracion'] ?? null;

        return ($vence && $vence < date('Y-m-d')) ? 'VENCIDO' : 'VIGENTE';
    }

    /** Un documento marcado VIGENTE no puede traer una fecha de vencimiento que ya pasó. */
    private function vigenteConFechaPasada(array $doc): bool
    {
        if (($doc['tipo_documento'] ?? '') === 'TARJETA_PROPIEDAD') {
            return false;
        }
        $vence = $doc['fecha_expiracion'] ?? null;

        return strtoupper((string) ($doc['estado'] ?? '')) === 'VIGENTE' && $vence && $vence < date('Y-m-d');
    }

    /**
     * Devuelve el motivo por el que el documento sería un duplicado, o null si
     * se puede guardar: (1) el mismo número ya existe para ese tipo; (2) el
     * vehículo ya tiene un documento vigente del mismo tipo.
     */
    private function mensajeDuplicado($db, int $vehiculoId, string $placa, array $doc, ?int $excluirId, bool $validarVigencia = true): ?string
    {
        $tipo = $doc['tipo_documento'];
        $etiqueta = self::ETIQUETAS_TIPO[$tipo] ?? $tipo;
        $codigo = trim((string) $doc['codigo']);

        $repetido = $db->table('documentos_vehiculo d')
            ->select('v.placa')
            ->join('vehiculos v', 'v.id = d.id_vehiculo', 'left')
            ->where('d.tipo_documento', $tipo)
            ->where('d.codigo', $codigo);
        if ($excluirId) {
            $repetido->where('d.id !=', $excluirId);
        }
        $fila = $repetido->get()->getRowArray();
        if ($fila) {
            $donde = !empty($fila['placa']) ? " (vehículo {$fila['placa']})" : '';

            return "Ya existe un {$etiqueta} con el número {$codigo}{$donde}. El número del documento no se puede repetir.";
        }

        if (!$validarVigencia || $this->estadoEfectivo($doc) !== 'VIGENTE') {
            return null;
        }

        $vigentes = $db->table('documentos_vehiculo')
            ->where('id_vehiculo', $vehiculoId)
            ->where('tipo_documento', $tipo)
            ->where('estado !=', 'ANULADO');
        if ($excluirId) {
            $vigentes->where('id !=', $excluirId);
        }
        foreach ($vigentes->get()->getResultArray() as $otro) {
            if ($this->estadoEfectivo($otro) === 'VIGENTE') {
                $vence = !empty($otro['fecha_expiracion']) ? ', vence el ' . date('d/m/Y', strtotime($otro['fecha_expiracion'])) : '';

                return "El vehículo {$placa} ya tiene {$etiqueta} vigente (N° {$otro['codigo']}{$vence}). Anúlelo o espere a que venza antes de emitir otro.";
            }
        }

        return null;
    }

    /** Estado de los tres documentos de un vehículo, para el cuadro del formulario. */
    public function resumenVehiculo($vehiculoId = null)
    {
        $db = \Config\Database::connect();
        $vehiculoId = (int) $vehiculoId;
        if ($vehiculoId <= 0 || !$db->table('vehiculos')->where('id', $vehiculoId)->countAllResults()) {
            return $this->failNotFound('Vehículo no encontrado.');
        }

        $docs = $db->table('documentos_vehiculo')
            ->select('id, tipo_documento, codigo, fecha_expedicion, fecha_expiracion, estado')
            ->where('id_vehiculo', $vehiculoId)
            ->whereIn('tipo_documento', array_keys(self::ETIQUETAS_TIPO))
            ->orderBy('fecha_expedicion', 'DESC')
            ->orderBy('id', 'DESC')
            ->get()
            ->getResultArray();

        $resumen = [];
        foreach (self::ETIQUETAS_TIPO as $tipo => $etiqueta) {
            $delTipo = array_values(array_filter($docs, static fn ($d) => $d['tipo_documento'] === $tipo));
            $elegido = null;
            // Se muestra el vigente si lo hay; si no, el más reciente que no esté anulado; si no, el más reciente.
            foreach ([['VIGENTE'], ['VENCIDO'], ['ANULADO']] as $prioridad) {
                foreach ($delTipo as $d) {
                    if (in_array($this->estadoEfectivo($d), $prioridad, true)) {
                        $elegido = $d;
                        break 2;
                    }
                }
            }

            $resumen[] = [
                'tipoDocumento' => $tipo,
                'etiqueta' => $etiqueta,
                'estado' => $elegido ? $this->estadoEfectivo($elegido) : 'NO_REGISTRADO',
                'id' => $elegido ? (int) $elegido['id'] : null,
                'codigo' => $elegido['codigo'] ?? null,
                'fechaExpedicion' => $elegido['fecha_expedicion'] ?? null,
                'fechaExpiracion' => $elegido['fecha_expiracion'] ?? null,
            ];
        }

        return $this->respond(['data' => $resumen]);
    }

    public function estadisticas()
    {
        $db = \Config\Database::connect();
        \App\Libraries\EstadosPorFecha::alDia($db);
        $row = $db->table('documentos_vehiculo')
            ->select("
                COUNT(*) as total,
                SUM(CASE WHEN tipo_documento = 'TARJETA_OPERATIVIDAD' THEN 1 ELSE 0 END) as tuc,
                SUM(CASE WHEN tipo_documento = 'SOAT' THEN 1 ELSE 0 END) as soat,
                SUM(CASE WHEN tipo_documento = 'TARJETA_PROPIEDAD' THEN 1 ELSE 0 END) as propiedad,
                SUM(CASE WHEN estado = 'VIGENTE' THEN 1 ELSE 0 END) as vigentes,
                SUM(CASE WHEN estado != 'VIGENTE' THEN 1 ELSE 0 END) as vencidos
            ", false)
            ->get()->getRowArray();

        return $this->respond(['data' => [
            'total' => (int) ($row['total'] ?? 0),
            'tucDocs' => (int) ($row['tuc'] ?? 0),
            'soatDocs' => (int) ($row['soat'] ?? 0),
            'propiedadDocs' => (int) ($row['propiedad'] ?? 0),
            'vigentes' => (int) ($row['vigentes'] ?? 0),
            'inactivosOVencidos' => (int) ($row['vencidos'] ?? 0),
        ]]);
    }

    public function index()
    {
        $db = \Config\Database::connect();
        \App\Libraries\EstadosPorFecha::alDia($db);
        $resMunicipalCol = "COALESCE(o.resolucion_alcaldia, '')";

        $builder = $db->table('documentos_vehiculo d')
            ->select("
                d.id,
                d.id_vehiculo AS vehiculoId,
                COALESCE(v.placa, '') AS vehiculoPlaca,
                COALESCE(v.marca, '') AS vehiculoMarca,
                COALESCE(v.modelo, '') AS vehiculoModelo,
                COALESCE(v.color, '') AS vehiculoColor,
                COALESCE(v.anio_fabricacion, '') AS vehiculoAnio,
                COALESCE(v.serie_motor, '') AS vehiculoMotor,
                COALESCE(v.numero_serie, '') AS vehiculoSerie,
                COALESCE(v.carroceria, '') AS vehiculoCarroceria,
                COALESCE(v.partida_registral, '') AS vehiculoPartidaRegistral,
                COALESCE(v.codigo_qr, '') AS codigoQr,
                d.tipo_documento AS tipoDocumento,
                d.codigo,
                d.fecha_expedicion AS fechaExpedicion,
                d.fecha_expiracion AS fechaExpiracion,
                d.estado,
                COALESCE(o.razon_social, 'Independiente') AS asociacion,
                $resMunicipalCol AS resMunicipal,
                COALESCE(c.nombres, '') AS propietarioNombres,
                COALESCE(c.apellido_paterno, '') AS propietarioPaterno,
                COALESCE(c.apellido_materno, '') AS propietarioMaterno,
                d.uuid AS uuid,
                COALESCE(c.foto, '') AS fotoConductor,
                COALESCE(c.numero_licencia, '') AS conductorLicencia,
                COALESCE(p.numero, '') AS propietarioDni,
                p.uuid AS propietarioPersonaId,
                COALESCE(p.celular, '') AS propietarioCelular,
                COALESCE(p.email, '') AS propietarioEmail,
                COALESCE(p.direccion, '') AS direccion
            ", false)
            ->join('vehiculos v', 'v.id = d.id_vehiculo', 'left')
            ->join('asociaciones o', 'o.id = v.id_asociacion', 'left')
            ->join('vehiculo_propietarios vp', 'vp.id_vehiculo = v.id AND vp.fecha_fin IS NULL', 'left')
            ->join('personas p', 'p.id = vp.id_persona', 'left')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left');

        $buscar = trim((string)$this->request->getGet('buscar'));
        if ($buscar !== '') {
            $builder->groupStart()
                ->like('d.codigo', $buscar)
                ->orLike('v.placa', \App\Libraries\Placa::paraBusqueda($buscar))
                ->orLike('p.numero', $buscar)
                ->orLike('c.nombres', $buscar)
                ->orLike('c.apellido_paterno', $buscar)
                ->orLike('c.apellido_materno', $buscar)
                ->orWhere(\App\Libraries\Busqueda::nombreCompleto($buscar, 'c.nombres', 'c.apellido_paterno', 'c.apellido_materno'), null, false)
                ->orLike('o.razon_social', $buscar)
                ->groupEnd();
        }

        $tipoDoc = strtoupper(trim((string)$this->request->getGet('tipoDocumento')));
        if ($tipoDoc !== '' && $tipoDoc !== 'TODOS') {
            $builder->where('d.tipo_documento', $tipoDoc);
        }

        $estado = strtoupper(trim((string)$this->request->getGet('estado')));
        if ($estado !== '' && $estado !== 'TODOS') {
            $builder->where('d.estado', $estado);
        }

        $page = (int)$this->request->getGet('page');
        $porPagina = max(1, min(200, (int)($this->request->getGet('porPagina') ?: 20)));

        $columnasOrdenables = [
            'vehiculoPlaca' => 'v.placa',
            'tipoDocumento' => 'd.tipo_documento',
            'codigo' => 'd.codigo',
            'fechaExpiracion' => 'd.fecha_expiracion',
            'estado' => 'd.estado',
        ];

        if ($page > 0) {
            $total = (clone $builder)->countAllResults(false);
            $rows = \App\Libraries\QuerySort::aplicar($builder, $this->request, $columnasOrdenables, 'd.id')
                ->limit($porPagina, ($page - 1) * $porPagina)
                ->get()
                ->getResultArray();

            $data = array_map(static function (array $row): array {
                $propietario = trim(($row['propietarioNombres'] ?? '') . ' ' . ($row['propietarioPaterno'] ?? '') . ' ' . ($row['propietarioMaterno'] ?? ''));
                $apellidos = trim(($row['propietarioPaterno'] ?? '') . ' ' . ($row['propietarioMaterno'] ?? ''));
                $row['propietario'] = $propietario ?: 'Sin Propietario Asignado';
                $row['conductorNombres'] = trim($row['propietarioNombres'] ?? '');
                $row['conductorApellidos'] = $apellidos;
                $row['conductorDni'] = $row['propietarioDni'] ?? '';
                $row['numeroLicencia'] = $row['conductorLicencia'] ?? '';
                $row['hasPropietario'] = !empty($propietario);
                unset($row['propietarioNombres'], $row['propietarioPaterno'], $row['propietarioMaterno']);
                return $row;
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

        $rows = $builder->orderBy('d.id', 'DESC')
            ->get()
            ->getResultArray();

        $data = array_map(static function (array $row): array {
            $propietario = trim(($row['propietarioNombres'] ?? '') . ' ' . ($row['propietarioPaterno'] ?? '') . ' ' . ($row['propietarioMaterno'] ?? ''));
            $apellidos = trim(($row['propietarioPaterno'] ?? '') . ' ' . ($row['propietarioMaterno'] ?? ''));
            $row['propietario'] = $propietario ?: 'Sin Propietario Asignado';
            $row['conductorNombres'] = trim($row['propietarioNombres'] ?? '');
            $row['conductorApellidos'] = $apellidos;
            $row['conductorDni'] = $row['propietarioDni'] ?? '';
            $row['numeroLicencia'] = $row['conductorLicencia'] ?? '';
            $row['hasPropietario'] = !empty($propietario);
            unset($row['propietarioNombres'], $row['propietarioPaterno'], $row['propietarioMaterno']);
            return $row;
        }, $rows);

        return $this->respond(['data' => $data]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getPost();

        $rules = [
            'codigo' => [
                'rules' => 'required',
                'errors' => ['required' => 'El número o código del documento es obligatorio.']
            ],
            'tipoDocumento' => [
                'rules' => 'required|in_list[TARJETA_OPERATIVIDAD,SOAT,TARJETA_PROPIEDAD]',
                'errors' => [
                    'required' => 'El tipo de documento es obligatorio.',
                    'in_list' => 'Tipo de documento vehicular no válido. Solo se permite Tarjeta de Operatividad, SOAT y Tarjeta de Propiedad.'
                ]
            ],
            'vehiculoPlaca' => [
                'rules' => 'required',
                'errors' => ['required' => 'Debe seleccionar un vehículo registrado en el sistema.']
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $rawTipo = strtoupper(trim($input['tipoDocumento'] ?? 'TARJETA_OPERATIVIDAD'));

        if ($rawTipo === 'CITV' || $rawTipo === 'INSPECCION_TECNICA' || $rawTipo === 'CERTICAV' || $rawTipo === 'REVISION_TECNICA') {
            return $this->failValidationErrors('Las inspecciones técnicas (CertiCAV/CITV) se registran en el módulo de Inspecciones Técnicas, no aquí.');
        }

        if (!in_array($rawTipo, ['TARJETA_OPERATIVIDAD', 'SOAT', 'TARJETA_PROPIEDAD'], true)) {
            return $this->failValidationErrors('Tipo de documento vehicular no válido. Solo se permite Tarjeta de Operatividad, SOAT y Tarjeta de Propiedad.');
        }

        $placa = \App\Libraries\Placa::normalizar($input['vehiculoPlaca'] ?? '');
        $vehiculoRow = null;

        if ($placa !== '') {
            $vehiculoRow = $db->table('vehiculos')->where('placa', $placa)->get()->getRowArray();
        }

        if (!$vehiculoRow) {
            return $this->failValidationErrors('Debe seleccionar un vehículo registrado en el sistema.');
        }

        $vehiculoId = (int)$vehiculoRow['id'];

        // Check owner if issuing TUC
        $propietarioRow = $db->table('vehiculo_propietarios vp')
            ->select("COALESCE(c.nombres, '') AS nombres, COALESCE(c.apellido_paterno, '') AS apePaterno, COALESCE(c.apellido_materno, '') AS apeMaterno, COALESCE(c.foto, '') AS foto, COALESCE(p.numero, '') AS dni, COALESCE(p.direccion, '') AS direccion, COALESCE(c.numero_licencia, '') AS licencia")
            ->join('personas p', 'p.id = vp.id_persona', 'inner')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'inner')
            ->where('vp.id_vehiculo', $vehiculoId)
            ->where('vp.fecha_fin IS NULL')
            ->get()
            ->getRowArray();

        $propietarioNombre = $propietarioRow
            ? trim($propietarioRow['nombres'] . ' ' . $propietarioRow['apePaterno'] . ' ' . $propietarioRow['apeMaterno'])
            : '';

        if ($rawTipo === 'TARJETA_OPERATIVIDAD') {
            if (empty($propietarioNombre)) {
                return $this->failValidationErrors('No se puede emitir la Tarjeta Única de Circulación (TUC): El vehículo con placa ' . $placa . ' figura como "Sin Propietario Asignado". Es requisito legal vincular previamente al propietario en el Padrón Vehicular.');
            }

            // Requisito: CERTICAV aprobado, no anulado y dentro de sus 6 meses de vigencia
            $inspRow = $db->table('certicav')
                ->where('id_vehiculo', $vehiculoId)
                ->where('resultado', 'APROBADO')
                ->where('estado <>', 'ANULADA')
                ->where('DATE_ADD(fecha, INTERVAL 6 MONTH) >= CURDATE()', null, false)
                ->orderBy('fecha', 'DESC')
                ->orderBy('id', 'DESC')
                ->limit(1)
                ->get()
                ->getRowArray();
            if (!$inspRow) {
                return $this->failValidationErrors('No se puede emitir la Tarjeta de Operatividad: el vehículo con placa ' . $placa . ' no tiene un CERTICAV aprobado y vigente. Registre primero su inspección técnica.');
            }

            // Look for approved municipal inspection if not supplied
            if (empty($input['numeroInspeccion']) && empty($input['idInspeccion'])) {

                if ($inspRow) {
                    $input['idInspeccion'] = (int)$inspRow['id'];
                    $input['numeroInspeccion'] = $inspRow['numero_registro'];
                }
            }
        }

        $record = [
            'id_vehiculo'        => $vehiculoId,
            'tipo_documento'     => $rawTipo,
            'codigo'             => trim($input['codigo']),
            'fecha_expedicion'   => !empty($input['fechaExpedicion']) ? $input['fechaExpedicion'] : date('Y-m-d'),
            // La Tarjeta de Propiedad no tiene fecha de vencimiento (no vence).
            'fecha_expiracion'   => $rawTipo === 'TARJETA_PROPIEDAD'
                ? null
                : (!empty($input['fechaExpiracion']) ? $input['fechaExpiracion'] : date('Y-m-d', strtotime('+1 year'))),
            'estado'             => strtoupper($input['estado'] ?? 'VIGENTE'),
        ];

        $errores = \App\Services\ValidacionRegistro::documento($record);
        if ($errores) return $this->failValidationErrors($errores);
        if ($this->vigenteConFechaPasada($record)) {
            return $this->failValidationErrors('La fecha de vencimiento ya pasó. Un documento vigente necesita una fecha de vencimiento futura.');
        }

        $duplicado = $this->mensajeDuplicado($db, $vehiculoId, $placa, $record, null);
        if ($duplicado) {
            return $this->failValidationErrors($duplicado);
        }

        try {
            $record['uuid'] = \App\Libraries\Identificador::nuevo();
            $db->table('documentos_vehiculo')->insert($record);
        } catch (Throwable $e) {
            if (stripos($e->getMessage(), 'Duplicate entry') !== false) {
                return $this->failValidationErrors('Ya existe un documento de ese tipo con ese número. El número del documento no se puede repetir.');
            }
            throw $e;
        }
        $insertId = (int)$db->insertID();

        // Fetch asociación
        $asocName = 'Independiente';
        if (!empty($vehiculoRow['id_asociacion'])) {
            $asocRow = $db->table('asociaciones')->where('id', $vehiculoRow['id_asociacion'])->get()->getRowArray();
            if ($asocRow && !empty($asocRow['razon_social'])) {
                $asocName = $asocRow['razon_social'];
            }
        }

        $newDoc = [
            'id'                       => $insertId,
            'uuid'                     => $record['uuid'],
            'vehiculoId'               => $vehiculoId,
            'vehiculoPlaca'            => $placa,
            'vehiculoMarca'            => $vehiculoRow['marca'] ?? '',
            'vehiculoModelo'           => $vehiculoRow['modelo'] ?? '',
            'vehiculoColor'            => $vehiculoRow['color'] ?? '',
            'vehiculoAnio'             => $vehiculoRow['anio_fabricacion'] ?? '',
            'vehiculoMotor'            => $vehiculoRow['serie_motor'] ?? '',
            'vehiculoSerie'            => $vehiculoRow['numero_serie'] ?? '',
            'vehiculoCarroceria'       => $vehiculoRow['carroceria'] ?? '',
            'vehiculoPartidaRegistral' => $vehiculoRow['partida_registral'] ?? '',
            'codigoQr'                 => $vehiculoRow['codigo_qr'] ?? '',
            'tipoDocumento'            => $record['tipo_documento'],
            'codigo'                   => $record['codigo'],
            'fechaExpedicion'          => $record['fecha_expedicion'],
            'fechaExpiracion'          => $record['fecha_expiracion'],
            'estado'                   => $record['estado'],
            'numeroLicencia'           => $propietarioRow['licencia'] ?? '',
            'fotoConductor'            => $propietarioRow['foto'] ?? '',
            'conductorNombres'         => $propietarioRow['nombres'] ?? '',
            'conductorApellidos'       => trim(($propietarioRow['apePaterno'] ?? '') . ' ' . ($propietarioRow['apeMaterno'] ?? '')),
            'conductorDni'             => $propietarioRow['dni'] ?? '',
            'resMunicipal'             => $asocRow['resolucion_alcaldia'] ?? '',
            'direccion'                => $propietarioRow['direccion'] ?? '',
            'idInspeccion'             => $input['idInspeccion'] ?? null,
            'numeroInspeccion'         => $input['numeroInspeccion'] ?? null,
            'propietario'              => $propietarioNombre ?: 'Sin Propietario Asignado',
            'propietarioDni'           => $propietarioRow['dni'] ?? '',
            'hasPropietario'           => !empty($propietarioNombre),
            'asociacion'               => $asocName,
        ];

        return $this->respondCreated(['status' => true, 'message' => 'Documento emitido con éxito', 'data' => $newDoc]);
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getRawInput();

        if (!$id) {
            return $this->failNotFound('ID de documento no especificado.');
        }

        $actual = $db->table('documentos_vehiculo')->select('id_vehiculo, tipo_documento, codigo, estado, fecha_expedicion, fecha_expiracion')->where('id', $id)->get()->getRowArray();
        if (!$actual) {
            return $this->failNotFound('Documento no encontrado.');
        }

        $record = [];
        $tipoDocumento = isset($input['tipoDocumento']) ? strtoupper(trim($input['tipoDocumento'])) : null;
        // Solo se valida si cambia el tipo: un CITV/CertiCAV ya registrado
        // (legado) debe poder seguir editándose (p. ej. marcarlo VENCIDO).
        if ($tipoDocumento !== null && $tipoDocumento !== $actual['tipo_documento']) {
            if ($tipoDocumento === 'CITV' || $tipoDocumento === 'INSPECCION_TECNICA' || $tipoDocumento === 'CERTICAV' || $tipoDocumento === 'REVISION_TECNICA') {
                return $this->failValidationErrors('Las inspecciones técnicas (CertiCAV/CITV) se registran en el módulo de Inspecciones Técnicas, no aquí.');
            }
            if (!in_array($tipoDocumento, ['TARJETA_OPERATIVIDAD', 'SOAT', 'TARJETA_PROPIEDAD'], true)) {
                return $this->failValidationErrors('Tipo de documento vehicular no válido.');
            }
            $record['tipo_documento'] = $tipoDocumento;
        }

        $tipoEfectivo = $record['tipo_documento'] ?? $actual['tipo_documento'];

        if (array_key_exists('codigo', $input)) $record['codigo'] = trim((string)$input['codigo']);
        if (array_key_exists('fechaExpedicion', $input)) $record['fecha_expedicion'] = $input['fechaExpedicion'] ?: null;
        if (array_key_exists('fechaExpiracion', $input)) {
            // La Tarjeta de Propiedad no tiene fecha de vencimiento.
            $record['fecha_expiracion'] = $tipoEfectivo === 'TARJETA_PROPIEDAD'
                ? null
                : ($input['fechaExpiracion'] ?: null);
        }
        if (array_key_exists('estado', $input)) $record['estado'] = strtoupper(trim((string)$input['estado']));
        $record = $this->soloColumnasReales($record);

        if (!empty($record)) {
            $despues = array_merge($actual, $record);
            $errores = \App\Services\ValidacionRegistro::documento($despues);
            if ($errores) return $this->failValidationErrors($errores);
            if ((array_key_exists('fecha_expiracion', $record) || isset($record['estado'])) && $this->vigenteConFechaPasada($despues)) {
                return $this->failValidationErrors('La fecha de vencimiento ya pasó. Un documento vigente necesita una fecha de vencimiento futura.');
            }
            $cambiaIdentidad = isset($record['codigo']) || isset($record['tipo_documento']);
            $pasaAVigente = $this->estadoEfectivo($despues) === 'VIGENTE'
                && ($this->estadoEfectivo($actual) !== 'VIGENTE' || isset($record['tipo_documento']));
            if ($cambiaIdentidad || $pasaAVigente) {
                $placaActual = (string) ($db->table('vehiculos')->select('placa')->where('id', $actual['id_vehiculo'])->get()->getRowArray()['placa'] ?? '');
                $duplicado = $this->mensajeDuplicado($db, (int) $actual['id_vehiculo'], $placaActual, $despues, (int) $id, $pasaAVigente || isset($record['tipo_documento']));
                if ($duplicado) {
                    return $this->failValidationErrors($duplicado);
                }
            }

            try {
                $db->table('documentos_vehiculo')->where('id', $id)->update($record);
            } catch (\Throwable $e) {
                if (stripos($e->getMessage(), 'Duplicate entry') !== false) {
                    return $this->failValidationErrors('Ya existe un documento de ese tipo con ese número. El número del documento no se puede repetir.');
                }
                throw $e;
            }
        }

        return $this->respond(['status' => true, 'message' => 'Documento actualizado con éxito']);
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();

        if (!$id) {
            return $this->failNotFound('ID de documento no especificado.');
        }

        if (!$db->table('documentos_vehiculo')->where('id', $id)->countAllResults()) {
            return $this->failNotFound('Documento no encontrado.');
        }

        $db->table('documentos_vehiculo')->where('id', $id)->delete();
        \App\Services\AuditoriaService::registrar('DOCUMENTOS', 'ELIMINAR', 'Documento del vehículo eliminado (id ' . (int)$id . ')', ['id' => (int)$id]);

        return $this->respondDeleted(['status' => true, 'message' => 'Documento eliminado con éxito']);
    }
}





