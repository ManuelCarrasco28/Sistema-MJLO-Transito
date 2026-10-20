<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class ReportesIntervencionController extends ResourceController
{
    use \App\Libraries\ResuelveUuid;

    protected string $tablaUuid = 'reportes_intervencion';
    protected array $tablasUuidPorMetodo = [];
    protected array $soloUuidEnEstricto = ['fotos', 'convertir', 'rechazar'];

    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();

        if (!$db->tableExists('reportes_intervencion')) {
            return $this->respond(['data' => []]);
        }

        $query = $db->table('reportes_intervencion r')
            ->select("r.uuid AS uuid, 
                r.*,
                COALESCE(v.placa, r.placa, 'SIN PLACA') AS placa_visual,
                COALESCE(NULLIF(v.marca, ''), '') AS vehiculo_marca,
                COALESCE(v.modelo, '') AS vehiculo_modelo,
                COALESCE(NULLIF(v.color, ''), '') AS vehiculo_color,
                COALESCE(CONCAT(ci.nombres, ' ', ci.apellido_paterno, ' ', COALESCE(ci.apellido_materno, '')), 'Inspector Municipal') AS inspector_nombre,
                p.numero_papeleta,
                CASE WHEN v.id_asociacion IS NOT NULL THEN 'FORMAL' ELSE 'INFORMAL' END as tipoInfractor,
                COALESCE(prop_per.numero, r.dueno_informal_dni, 'S/D') as propietarioDni,
                COALESCE(NULLIF(TRIM(CONCAT(c_prop.nombres, ' ', c_prop.apellido_paterno, ' ', COALESCE(c_prop.apellido_materno, ''))), ''), r.dueno_informal_nombres, 'No Registrado') as propietarioNombre,
                COALESCE(cond_per.numero, r.conductor_informal_dni, 'S/D') as conductorDni,
                COALESCE(NULLIF(TRIM(CONCAT(c_cond.nombres, ' ', c_cond.apellido_paterno, ' ', COALESCE(c_cond.apellido_materno, ''))), ''), r.conductor_informal_nombres, 'No identificado') as conductorNombre,
                r.id_operativo as operativoId, COALESCE(op.nombre, '') as operativoNombre,
                CASE WHEN r.estado = 'PENDIENTE' AND TIMESTAMPDIFF(SECOND, r.fecha_updated, NOW()) <= 300 THEN 1 ELSE 0 END as puedeEditar,
                CASE WHEN r.estado = 'PENDIENTE' THEN GREATEST(0, 300 - TIMESTAMPDIFF(SECOND, r.fecha_updated, NOW())) ELSE 0 END as segundosRestantesTolerancia
            ", false)
            ->join('vehiculos v', 'v.id = r.id_vehiculo', 'left')
            ->join('trabajadores t', 't.id_persona = r.id_inspector', 'left')
            ->join('ciudadanos ci', 'ci.id_persona = t.id_persona', 'left')
            ->join('papeletas p', 'p.id = r.id_papeleta', 'left')
            ->join('vehiculo_propietarios vp', 'vp.id_vehiculo = v.id AND vp.estado = "ACTIVO"', 'left')
            ->join('personas prop_per', 'prop_per.id = vp.id_persona', 'left')
            ->join('ciudadanos c_prop', 'c_prop.id_persona = prop_per.id', 'left')
            ->join('personas cond_per', 'cond_per.id = r.id_conductor', 'left')
            ->join('ciudadanos c_cond', 'c_cond.id_persona = cond_per.id', 'left')
            ->join('operativos op', 'op.id = r.id_operativo', 'left');

        $inspectorId = (int)($this->request->getGet('inspector_id') ?? 0);
        $sesion = \App\Libraries\Acceso::usuario();
        if (!\App\Libraries\Acceso::esOficina($sesion)) {
            $inspectorId = (int) ($sesion['id_persona'] ?? -1);
        }
        $dni = $this->request->getGet('dni');
        $placa = \App\Libraries\Placa::normalizar($this->request->getGet('placa'));

        if ($inspectorId > 0) {
            $query->where('r.id_inspector', $inspectorId);
        }
        if (!empty($dni)) {
            $query->groupStart()
                  ->where('cond_per.numero', $dni)
                  ->orWhere('prop_per.numero', $dni)
                  ->groupEnd();
        }
        if (!empty($placa)) {
            $query->where('v.placa', $placa);
        }

// Modo paginado (pantalla de Papeletas): filtros y página en el servidor, para no traer todo el historial
        $pagina = (int) $this->request->getGet('page');
        $porPagina = max(1, min(100, (int) ($this->request->getGet('porPagina') ?: 8)));
        $total = null;
        if ($pagina > 0) {
            $estadoFiltro = strtoupper(trim((string) $this->request->getGet('estado')));
            if ($estadoFiltro === 'CONVERTIDO_PAPELETA') {
                $query->whereIn('r.estado', ['CONVERTIDO_PAPELETA', 'FINALIZADO']);
            } elseif (in_array($estadoFiltro, ['PENDIENTE', 'RECHAZADO'], true)) {
                $query->where('r.estado', $estadoFiltro);
            }
            // Reportes sin vehículo vinculado ni una placa que exista en el padrón: los que oficina debe identificar
            if (strtoupper(trim((string) $this->request->getGet('identificacion'))) === 'SIN_IDENTIFICAR') {
                $query->where("(r.id_vehiculo IS NULL AND (COALESCE(r.placa, '') = '' OR NOT EXISTS (SELECT 1 FROM vehiculos vsi WHERE vsi.placa = r.placa)))", null, false);
            }
            $buscar = trim((string) $this->request->getGet('buscar'));
            if ($buscar !== '') {
                $patron = $db->escape('%' . $db->escapeLikeString($buscar) . '%');
                $num = ltrim($buscar, '#');
                $sinPlaca = preg_match('/^sin[\s_-]*placa$/i', $buscar) === 1 ? " OR (v.placa IS NULL AND COALESCE(r.placa, '') = '')" : '';
                $query->groupStart()
                    ->where("(COALESCE(v.placa, r.placa) LIKE $patron ESCAPE '!' OR r.lugar LIKE $patron ESCAPE '!' OR r.observaciones LIKE $patron ESCAPE '!'" . $sinPlaca
                        . " OR p.numero_papeleta LIKE $patron ESCAPE '!' OR cond_per.numero LIKE $patron ESCAPE '!' OR r.conductor_informal_dni LIKE $patron ESCAPE '!'"
                        . " OR EXISTS (SELECT 1 FROM reporte_intervencion_infracciones rx JOIN tipos_infraccion tx ON tx.id = rx.id_tipo_infraccion WHERE rx.id_reporte = r.id AND tx.codigo LIKE $patron ESCAPE '!')"
                        . (ctype_digit($num) ? ' OR r.id = ' . (int) $num : '') . ')', null, false)
                    ->orWhere(\App\Libraries\Busqueda::nombreCompleto($buscar, 'ci.nombres', 'ci.apellido_paterno', 'ci.apellido_materno'), null, false)
                    ->orWhere(\App\Libraries\Busqueda::nombreCompleto($buscar, 'c_cond.nombres', 'c_cond.apellido_paterno', 'c_cond.apellido_materno'), null, false)
                    ->groupEnd();
            }
// Conteo: se reutiliza todo lo que sigue al SELECT (joins y filtros), contando reportes distintos
            $sqlCompleto = (clone $query)->getCompiledSelect();

            if (!preg_match('/\sFROM\s+`?reportes_intervencion`?/i', $sqlCompleto, $m, PREG_OFFSET_CAPTURE)) {
                throw new \RuntimeException('No se pudo armar el conteo de reportes.');
            }
            $sqlConteo = 'SELECT DISTINCT r.id ' . substr($sqlCompleto, $m[0][1]);
            $total = (int) ($db->query("SELECT COUNT(*) AS n FROM ($sqlConteo) t")->getRowArray()['n'] ?? 0);
            $query->limit($porPagina, ($pagina - 1) * $porPagina);
        } elseif (empty($dni) && empty($placa)) {
            $query->limit(100);
        }

        $query->groupBy('r.id');

        $rows = \App\Libraries\QuerySort::aplicar($query, $this->request, [
            'numero' => 'r.id',
            'placa' => 'placa_visual',
            'lugar' => 'r.lugar',
            'inspector' => 'inspector_nombre',
            'fecha' => 'r.fecha_hora',
            'estado' => 'r.estado',
        ], 'r.id')->get()->getResultArray();

// Infracciones de todos los reportes de la página en dos consultas (antes eran 1 o 2 por cada reporte)
        $porReporte = [];
        $porPapeleta = [];
        if ($rows) {
            $ids = array_map('intval', array_column($rows, 'id'));
            $filas = $db->table('reporte_intervencion_infracciones ri')
                ->select('ri.id_reporte, ti.id, ti.codigo, ti.descripcion')
                ->join('tipos_infraccion ti', 'ti.id = ri.id_tipo_infraccion', 'left')
                ->whereIn('ri.id_reporte', $ids)
                ->get()->getResultArray();
            foreach ($filas as $f) {
                $porReporte[(int)$f['id_reporte']][] = ['id' => $f['id'], 'codigo' => $f['codigo'], 'descripcion' => $f['descripcion']];
            }
            $idsPapeleta = array_values(array_unique(array_filter(array_map(
                static fn ($r) => $r['id_papeleta'] !== null ? (int)$r['id_papeleta'] : null,
                array_filter($rows, static fn ($r) => empty($porReporte[(int)$r['id']]))
            ))));
            if ($idsPapeleta) {
                $filas = $db->table('papeleta_detalles pd')
                    ->select('pd.id_papeleta, ti.id, ti.codigo, ti.descripcion')
                    ->join('tipos_infraccion ti', 'ti.id = pd.id_tipo_infraccion', 'inner')
                    ->whereIn('pd.id_papeleta', $idsPapeleta)
                    ->orderBy('pd.id', 'ASC')
                    ->get()->getResultArray();
                foreach ($filas as $f) {
                    $porPapeleta[(int)$f['id_papeleta']][] = ['id' => $f['id'], 'codigo' => $f['codigo'], 'descripcion' => $f['descripcion']];
                }
            }
        }

        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['id_inspector'] = (int)$row['id_inspector'];
            $row['id_vehiculo'] = $row['id_vehiculo'] !== null ? (int)$row['id_vehiculo'] : null;
            $row['id_papeleta'] = $row['id_papeleta'] !== null ? (int)$row['id_papeleta'] : null;
            $row['fotos'] = []; // No cargamos fotos en el historial para evitar colapsar la memoria RAM del servidor

            $infrs = $porReporte[$row['id']] ?? [];

            if (empty($infrs) && !empty($row['id_papeleta'])) {
                $infrs = $porPapeleta[$row['id_papeleta']] ?? [];
            }
            $row['infracciones'] = $infrs;
            $row['infraccion_visual'] = !empty($infrs) ? implode(', ', array_column($infrs, 'codigo')) : ($row['estado'] === 'PENDIENTE' ? 'Por definir' : 'Sin Infracción');
            $row['infraccionesIds'] = array_map('intval', array_column($infrs, 'id'));
        }

        $pendientes = (int) $db->table('reportes_intervencion')->where('estado', 'PENDIENTE')->countAllResults();

        $meta = ['pendientes' => $pendientes];
        if ($total !== null) {
            $meta += ['total' => $total, 'page' => $pagina, 'porPagina' => $porPagina];
        }

        return $this->respond(['data' => $rows, 'meta' => $meta]);
    }

    public function fotos($id)
    {
        $db = \Config\Database::connect();
        $sesion = \App\Libraries\Acceso::usuario();
        if (!\App\Libraries\Acceso::esOficina($sesion)) {
            $dueno = $db->table('reportes_intervencion')->select('id_inspector')->where('id', $id)->get()->getRowArray();
            if (!$dueno || (int) $dueno['id_inspector'] !== (int) ($sesion['id_persona'] ?? -1)) {
                return $this->failNotFound('Reporte no encontrado.');
            }
        }
        $fotos = $db->table('reporte_intervencion_fotos')
            ->where('id_reporte', $id)
            ->get()->getResultArray();
        $fileStorage = new \App\Services\FileStorageService();
        foreach ($fotos as &$foto) {
            $foto['foto'] = $fileStorage->urlPublica($foto['foto']);
        }
        unset($foto);
        return $this->respond(['data' => $fotos]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        if (!$db->tableExists('reportes_intervencion')) {
            return $this->failServerError('Falta crear la tabla reportes_intervencion.');
        }

        $input = $this->request->getJSON(true) ?: $this->request->getPost() ?: [];
        $inspectorId = (int)($input['inspectorId'] ?? $input['id_inspector'] ?? 0);
        $sesion = \App\Libraries\Acceso::usuario();
        if (!\App\Libraries\Acceso::esOficina($sesion)) {
            $inspectorId = (int) ($sesion['id_persona'] ?? 0);
        }
        $placa = \App\Libraries\Placa::normalizar((string)($input['placa'] ?? $input['vehiculoPlaca'] ?? ''));
        $lugar = trim((string)($input['lugar'] ?? ''));
        $observaciones = trim((string)($input['observaciones'] ?? $input['observacionesAutoridad'] ?? ''));
        $coordenadas = trim((string)($input['coordenadas'] ?? ''));
        $idOperativo = !empty($input['id_operativo']) ? (int)$input['id_operativo'] : null;
        $fotos = $input['fotos'] ?? [];

        if ($inspectorId <= 0) {
            return $this->failValidationErrors('Debe indicar el inspector que registra el reporte.');
        }
        if ($lugar === '') {
            return $this->failValidationErrors('Ingrese el lugar de la intervención.');
        }
        if ($observaciones === '') {
            return $this->failValidationErrors('Ingrese una observación del reporte.');
        }

        $inspector = $db->table('trabajadores')
            ->where('id_persona', $inspectorId)
            ->where('estado', 'ACTIVO')
            ->get()
            ->getRowArray();
        if (!$inspector) {
            return $this->failValidationErrors('El inspector no existe o está inactivo.');
        }

        $vehiculoId = null;
        if ($placa !== '' && $placa !== 'SIN_PLACA') {
            $vehiculo = $db->table('vehiculos')->where('placa', $placa)->get()->getRowArray();
            $vehiculoId = $vehiculo ? (int)$vehiculo['id'] : null;
        }

        $ahoraLima = new \DateTime('now', new \DateTimeZone('America/Lima'));
        $fechaHora = trim((string)($input['fechaHora'] ?? $input['fecha_hora'] ?? ''));
        if ($fechaHora === '') {
            $fechaHora = $ahoraLima->format('Y-m-d H:i:s');
        } else {

            try {
                $momento = new \DateTime($fechaHora, new \DateTimeZone('America/Lima'));
            } catch (\Throwable $e) {
                return $this->failValidationErrors('La fecha y hora del reporte no son válidas.');
            }
            if ($momento > (clone $ahoraLima)->modify('+10 minutes')) {
                return $this->failValidationErrors('La fecha y hora del reporte no pueden ser futuras.');
            }
            if ($momento < (clone $ahoraLima)->modify('-7 days')) {
                return $this->failValidationErrors('La fecha y hora del reporte son demasiado antiguas (máximo 7 días).');
            }
            $fechaHora = $momento->format('Y-m-d H:i:s');
        }
        if (mb_strlen($lugar) > 250) {
            return $this->failValidationErrors('El lugar de la intervención no puede superar los 250 caracteres.');
        }
        if (mb_strlen($observaciones) > 500) {
            return $this->failValidationErrors('La observación no puede superar los 500 caracteres.');
        }

        $db->transException(true)->transBegin();
        try {

            $duenoNombresInformal = null;
            $conductorNombresInformal = null;
            $duenoDniInformal = null;
            $conductorDniInformal = null;

            if (!$vehiculoId) {
                $placaRegistro = ($placa && $placa !== 'SIN_PLACA') ? $placa : 'SIN-PLACA-' . strtoupper(substr(uniqid(), -6)) . random_int(10, 99);
                $placa = $placaRegistro;
            }

            $duenoDni = trim((string)($input['dni_dueño'] ?? ''));
            $duenoNombres = trim((string)($input['nombres_dueño'] ?? ''));
            $duenoApellidos = trim((string)($input['apellidos_dueño'] ?? ''));
            if ($duenoDni !== '' || $duenoNombres !== '' || $duenoApellidos !== '') {
                $duenoNombresInformal = trim("$duenoNombres $duenoApellidos");
                if ($duenoDni !== '' && $duenoDni !== 'S/D' && !str_starts_with($duenoDni, 'S/D')) {
                    $duenoDniInformal = $duenoDni;
                }
            }

            $conductorDni = trim((string)($input['dni_conductor'] ?? ''));
            $conductorId = null;
            if ($conductorDni !== '') {
                $conductorPersona = $db->table('personas')->where('numero', $conductorDni)->limit(1)->get()->getRowArray();
                if ($conductorPersona) {
                    $conductorId = (int)$conductorPersona['id'];
                } else {
                    $conductorNombres = trim((string)($input['nombres_conductor'] ?? 'NO REGISTRADO'));
                    $conductorApellidos = trim((string)($input['apellidos_conductor'] ?? ''));
                    $conductorNombresInformal = trim("$conductorNombres $conductorApellidos");
                    $conductorDniInformal = $conductorDni;
                }
            }

            $db->table('reportes_intervencion')->insert([
                'uuid' => \App\Libraries\Identificador::nuevo(),
                'id_inspector' => $inspectorId,
                'id_operativo' => $idOperativo,
                'id_vehiculo' => $vehiculoId,
                'id_conductor' => $conductorId,
                'placa' => $placa !== '' ? $placa : null,
                'dueno_informal_nombres' => $duenoNombresInformal,
                'dueno_informal_dni' => $duenoDniInformal,
                'conductor_informal_nombres' => $conductorNombresInformal,
                'conductor_informal_dni' => $conductorDniInformal,
                'fecha_hora' => $fechaHora,
                'lugar' => $lugar,
                'coordenadas' => $coordenadas !== '' ? $coordenadas : null,
                'observaciones' => $observaciones,
                'estado' => 'PENDIENTE',
            ]);
            $id = (int)$db->insertID();

            if (is_array($fotos)) {

                $fotos = array_slice($fotos, 0, 5);
                $fileStorage = new \App\Services\FileStorageService();
                foreach ($fotos as $foto) {
                    $fotoStr = trim((string)$foto);
                    if ($fotoStr !== '' && strlen($fotoStr) <= 7 * 1024 * 1024) {
                        $ruta = $fileStorage->guardarImagenBase64($fotoStr, 'reportes');
                        if ($ruta !== null) {
                            $db->table('reporte_intervencion_fotos')->insert([
                                'id_reporte' => $id,
                                'foto' => $ruta,
                            ]);
                        }
                    }
                }
            }

            $infraccionesIds = $input['infraccionesIds'] ?? [];
            if (is_array($infraccionesIds)) {
                $infraccionesIds = array_values(array_unique(array_filter(array_map('intval', $infraccionesIds), static fn ($v) => $v > 0)));
                foreach ($infraccionesIds as $tipoId) {
                    $db->table('reporte_intervencion_infracciones')->insert([
                        'id_reporte' => $id,
                        'id_tipo_infraccion' => $tipoId,
                    ]);
                }
            }

            $db->transCommit();
            return $this->respondCreated(['message' => 'Reporte registrado para revisión administrativa.', 'data' => ['id' => $id]]);
        } catch (\Throwable $e) {
            $db->transRollback();
            \App\Services\FileStorageService::descartarEscritos();
            log_message('error', 'No se pudo registrar el reporte: ' . $e->getMessage());
            return $this->failServerError('No se pudo registrar el reporte. Intente nuevamente.');
        }
    }

    public function convertir($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: [];
        $id = (int)$id;

        $infraccionesIds = $input['infraccionesIds'] ?? [(int)($input['tipoInfraccionId'] ?? 0)];
        if (!is_array($infraccionesIds)) {
            $infraccionesIds = [$infraccionesIds];
        }
        $infraccionesIds = array_values(array_unique(array_filter(array_map('intval', $infraccionesIds), static fn ($value) => $value > 0)));
        if (empty($infraccionesIds)) {
            return $this->failValidationErrors('Seleccione al menos una infracción para generar la papeleta.');
        }

        $db->transException(true)->transBegin();
        try {
            $reporte = $db->query('SELECT * FROM reportes_intervencion WHERE id=? FOR UPDATE', [$id])->getRowArray();
            if (!$reporte) {
                throw new \DomainException('Reporte no encontrado.');
            }
            if ($reporte['estado'] === 'CONVERTIDO_PAPELETA') {
                $papeletaPrevia = !empty($reporte['id_papeleta'])
                    ? $db->table('papeletas')->select('numero_papeleta')->where('id', (int)$reporte['id_papeleta'])->get()->getRowArray()
                    : null;
                throw new \DomainException('Este reporte ya se convirtió en la papeleta ' . ($papeletaPrevia['numero_papeleta'] ?? 'registrada') . '.');
            }
            if ($reporte['estado'] !== 'PENDIENTE') {
                throw new \DomainException('Este reporte ya no está pendiente (estado: ' . strtolower((string)$reporte['estado']) . ').');
            }

            $vehiculoId = (int)($input['vehiculoId'] ?? $reporte['id_vehiculo'] ?? 0);
            if ($vehiculoId <= 0 && !empty($reporte['placa'])) {
                $vehiculo = $db->table('vehiculos')->where('placa', $reporte['placa'])->get()->getRowArray();
                $vehiculoId = $vehiculo ? (int)$vehiculo['id'] : 0;
            }
            if ($vehiculoId <= 0 && !empty($reporte['placa'])) {
                // La placa viene de SUNARP: no hace falta que el vehículo esté en Vehículos; se verifica y, si no está, se registra
                $datosVehiculo = is_array($input['vehiculoDatos'] ?? null) ? $input['vehiculoDatos'] : [];
                $vehiculoId = (int) (\App\Services\VehiculoPorPlaca::resolverOCrear($db, (string) $reporte['placa'], $datosVehiculo) ?? 0);
            }
            if ($vehiculoId <= 0) {
                throw new \DomainException('El reporte no tiene una placa válida: identifique el vehículo (por su motor o serie) en Vehículos antes de generar la papeleta.');
            }

            $vehiculo = $db->table('vehiculos')->where('id', $vehiculoId)->get()->getRowArray();
            if (!$vehiculo) {
                throw new \DomainException('El vehículo seleccionado no existe.');
            }

            $personaId = null;
            $conductorInformalDni = null;
            $conductorInformalNombres = null;

            $conductorDni = '';
            if (!empty($reporte['id_conductor'])) {
                $conductorReporte = $db->table('personas')->select('numero')->where('id', (int)$reporte['id_conductor'])->get()->getRowArray();
                $conductorDni = trim((string)($conductorReporte['numero'] ?? ''));
            }
            if ($conductorDni === '') {
                $conductorDni = trim((string)($reporte['conductor_informal_dni'] ?? ''));
            }
            if ($conductorDni !== '') {
                $persona = $db->table('personas')->where('numero', $conductorDni)->get()->getRowArray();
                if ($persona) {
                    $personaId = (int)$persona['id'];
                } else {
                    $conductorInformalDni = $conductorDni;
                    if ($conductorDni === $reporte['conductor_informal_dni']) {
                        $conductorInformalNombres = $reporte['conductor_informal_nombres'];
                    } else {
                        $conductorInformalNombres = 'INFRACTOR INFORMAL';
                    }
                }
            } elseif (!empty($reporte['conductor_informal_nombres'])) {
                $conductorInformalDni = $reporte['conductor_informal_dni'];
                $conductorInformalNombres = $reporte['conductor_informal_nombres'];
            }

            $multas = new \App\Services\Multas($db);
            $anio = (int)date('Y', strtotime($reporte['fecha_hora']));
            $montoTotal = 0.0;
            $detalles = [];
            foreach ($infraccionesIds as $tipoId) {
                $infraccion = $db->table('tipos_infraccion')->where('id', $tipoId)->where('estado', 'ACTIVO')->get()->getRowArray();
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

            $tempNumero = 'TEMP-' . uniqid('', true);

            $nombreAutoridad = $personaId
                ? trim((string)($input['infractor'] ?? ''))
                : 'CONDUCTOR NO PRESENTE';
            if ($personaId && $nombreAutoridad === '') {
                $ciudadano = $db->table('ciudadanos')->where('id_persona', $personaId)->get()->getRowArray();
                $nombreAutoridad = $ciudadano
                    ? trim($ciudadano['nombres'] . ' ' . $ciudadano['apellido_paterno'] . ' ' . ($ciudadano['apellido_materno'] ?? ''))
                    : 'INFRACTOR';
            }

            $observacion = trim((string)($input['observacionesAutoridad'] ?? $reporte['observaciones']));
            if (!$personaId) {
                $observacion = trim($observacion . ' Responsable administrativo: propietario del vehículo.');
            }

            $db->table('papeletas')->insert([
                'uuid' => \App\Libraries\Identificador::nuevo(),
                'numero_papeleta' => $tempNumero,
                'id_vehiculo' => $vehiculoId,
                'id_persona_infractor' => $personaId,
                'id_inspector' => (int)$reporte['id_inspector'],
                'id_operativo' => !empty($reporte['id_operativo']) ? (int)$reporte['id_operativo'] : null,
                'fecha_hora' => $reporte['fecha_hora'],
                'lugar' => $reporte['lugar'],
                'nombre_autoridad' => $nombreAutoridad,
                'observacion_autoridad' => $observacion,
                'observaciones_conductor' => $personaId ? trim((string)($input['observacionesConductor'] ?? '')) : 'Conductor no presente durante la intervención.',
                'firma_conductor_estado' => $personaId ? 'PENDIENTE' : 'NO_PRESENTE',
                'firma_conductor_observacion' => $personaId ? null : 'Papeleta generada desde reporte de evidencia.',
                'monto_total' => $montoTotal,
                'estado' => 'PENDIENTE_PAGO',
                'dueño_informal_nombres' => $reporte['dueno_informal_nombres'] ?? null,
                'dueño_informal_dni' => $reporte['dueno_informal_dni'] ?? null,
                'conductor_informal_nombres' => $conductorInformalNombres,
                'conductor_informal_dni' => $conductorInformalDni,
                'placa' => $reporte['placa'],
            ]);
            $papeletaId = (int)$db->insertID();

            $numeroPapeletaDefinitivo = str_pad((string)$papeletaId, 7, '0', STR_PAD_LEFT);
            $db->table('papeletas')->where('id', $papeletaId)->update(['numero_papeleta' => $numeroPapeletaDefinitivo]);

            foreach ($detalles as $detalle) {
                $detalle['id_papeleta'] = $papeletaId;
                $db->table('papeleta_detalles')->insert($detalle);
            }

            (new \App\Services\PagosTransito($db))->generar('PAPELETA', $papeletaId);

            $internamientoAuto = new \App\Services\InternamientoAutomatico($db);
            $internamiento = $internamientoAuto->generar($papeletaId);

            $db->table('reportes_intervencion')->where('id', $id)->update([
                'id_vehiculo' => $vehiculoId,
                'id_papeleta' => $papeletaId,
                'estado' => 'CONVERTIDO_PAPELETA',
            ]);

            $db->transCommit();
            return $this->respond(['message' => 'Reporte convertido a papeleta.', 'data' => ['id' => $papeletaId, 'numeroPapeleta' => $numeroPapeletaDefinitivo, 'internamiento' => $internamiento]]);
        } catch (\DomainException $e) {
            $db->transRollback();
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', 'No se pudo convertir el reporte: ' . $e->getMessage());
            return $this->failServerError('No se pudo convertir el reporte. Intente nuevamente.');
        }
    }

    public function rechazar($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: [];
        $motivo = trim((string)($input['motivo_rechazo'] ?? $input['motivo'] ?? ''));
        if ($motivo === '') {
            return $this->failValidationErrors('Ingrese el motivo de rechazo.');
        }

        $reporte = $db->table('reportes_intervencion')->where('id', (int)$id)->get()->getRowArray();
        if (!$reporte) {
            return $this->failNotFound('Reporte no encontrado.');
        }
        if ($reporte['estado'] !== 'PENDIENTE') {
            return $this->failValidationErrors('Solo se pueden rechazar reportes pendientes.');
        }

        $db->table('reportes_intervencion')->where('id', (int)$id)->where('estado', 'PENDIENTE')->update([
            'estado' => 'RECHAZADO',
            'motivo_rechazo' => $motivo,
        ]);
        if ($db->affectedRows() === 0) {
            return $this->failValidationErrors('El reporte ya fue atendido por otro usuario. Actualice la lista.');
        }

        return $this->respond(['message' => 'Reporte rechazado correctamente.']);
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $input = $this->request->getJSON(true) ?? [];
            if (empty($input)) {
                $input = json_decode($this->request->getBody() ?: '', true) ?? $this->request->getPost();
            }

            $db->transException(true)->transBegin();
            $reporte = $db->query('SELECT * FROM reportes_intervencion WHERE id=? FOR UPDATE', [$id])->getRowArray();
            if (!$reporte) {
                throw new \DomainException('Reporte de intervención no encontrado.');
            }
            if ($reporte['estado'] !== 'PENDIENTE') {
                throw new \DomainException('Solo se pueden modificar reportes en estado PENDIENTE.');
            }

            // Validar ventana de tolerancia de 5 minutos (300 segundos)
            $checkTime = $db->query('SELECT TIMESTAMPDIFF(SECOND, fecha_updated, NOW()) as diff FROM reportes_intervencion WHERE id=?', [$id])->getRowArray();
            $diff = (int)($checkTime['diff'] ?? 9999);
            if ($diff > 300) {
                throw new \DomainException('El período de tolerancia de 5 minutos ha expirado. Ya no es posible modificar este reporte.');
            }

            $data = [];
            if (!empty($input['lugar'])) {
                $data['lugar'] = mb_substr(trim($input['lugar']), 0, 250);
            }
            if (isset($input['observaciones'])) {
                $data['observaciones'] = trim($input['observaciones']);
            }
            if (isset($input['observacionesConductor'])) {
                $data['observaciones_conductor'] = trim($input['observacionesConductor']);
            }
            if (!empty($input['coordenadas'])) {
                $data['coordenadas'] = trim($input['coordenadas']);
            }
            if (!empty($input['placa'])) {
                $data['placa'] = \App\Libraries\Placa::normalizar($input['placa']);
            }
            if (isset($input['dni_conductor'])) {
                $data['conductor_informal_dni'] = trim($input['dni_conductor']);
            }
            if (isset($input['nombres_conductor']) || isset($input['apellidos_conductor'])) {
                $data['conductor_informal_nombres'] = trim(($input['nombres_conductor'] ?? '') . ' ' . ($input['apellidos_conductor'] ?? ''));
            }
            if (isset($input['dni_dueño']) || isset($input['dni_dueno'])) {
                $data['dueno_informal_dni'] = trim($input['dni_dueño'] ?? $input['dni_dueno'] ?? '');
            }
            if (isset($input['nombres_dueño']) || isset($input['nombres_dueno']) || isset($input['apellidos_dueño']) || isset($input['apellidos_dueno'])) {
                $data['dueno_informal_nombres'] = trim(($input['nombres_dueño'] ?? $input['nombres_dueno'] ?? '') . ' ' . ($input['apellidos_dueño'] ?? $input['apellidos_dueno'] ?? ''));
            }

            $infraccionesIds = $input['infraccionesIds'] ?? $input['tiposInfraccion'] ?? null;
            if (is_array($infraccionesIds)) {
                $db->table('reporte_intervencion_infracciones')->where('id_reporte', $id)->delete();
                $infraccionesIds = array_values(array_unique(array_filter(array_map('intval', $infraccionesIds), static fn ($v) => $v > 0)));
                foreach ($infraccionesIds as $tipoId) {
                    $db->table('reporte_intervencion_infracciones')->insert([
                        'id_reporte' => $id,
                        'id_tipo_infraccion' => $tipoId,
                    ]);
                }
            }

            $data['fecha_updated'] = date('Y-m-d H:i:s');
            $db->table('reportes_intervencion')->where('id', $id)->update($data);
            $db->transCommit();

            return $this->respond([
                'status' => 200,
                'message' => 'Reporte modificado exitosamente dentro del período de tolerancia.',
                'data' => $data
            ]);
        } catch (\DomainException $e) {
            $db->transRollback();
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            $db->transRollback();
            return $this->failServerError('No se pudo modificar el reporte.');
        }
    }
}
