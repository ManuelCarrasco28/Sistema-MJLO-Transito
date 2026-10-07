<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class ReportesIntervencionController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();

        if (!$db->tableExists('reportes_intervencion')) {
            return $this->respond(['data' => []]);
        }

        $this->ensureColumnasExtra($db);

        $query = $db->table('reportes_intervencion r')
            ->select("
                r.*,
                COALESCE(v.placa, r.placa, 'SIN PLACA') AS placa_visual,
                COALESCE(v.marca, '') AS vehiculo_marca,
                COALESCE(v.modelo, '') AS vehiculo_modelo,
                COALESCE(v.color, '') AS vehiculo_color,
                COALESCE(CONCAT(ci.nombres, ' ', ci.apellido_paterno, ' ', COALESCE(ci.apellido_materno, '')), 'Inspector Municipal') AS inspector_nombre,
                p.numero_papeleta,
                CASE WHEN v.id_asociacion IS NOT NULL THEN 'FORMAL' ELSE 'INFORMAL' END as tipoInfractor,
                COALESCE(prop_per.numero, r.dueno_informal_dni, 'S/D') as propietarioDni,
                COALESCE(NULLIF(TRIM(CONCAT(c_prop.nombres, ' ', c_prop.apellido_paterno, ' ', COALESCE(c_prop.apellido_materno, ''))), ''), r.dueno_informal_nombres, 'No Registrado') as propietarioNombre,
                COALESCE(cond_per.numero, r.conductor_informal_dni, 'S/D') as conductorDni,
                COALESCE(NULLIF(TRIM(CONCAT(c_cond.nombres, ' ', c_cond.apellido_paterno, ' ', COALESCE(c_cond.apellido_materno, ''))), ''), r.conductor_informal_nombres, 'No identificado') as conductorNombre,
                r.id_operativo as operativoId, COALESCE(op.nombre, '') as operativoNombre
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

        if (empty($dni) && empty($placa)) {
            $query->limit(100);
        }

        $query->groupBy('r.id');
        $rows = $query->orderBy('r.id', 'DESC')->get()->getResultArray();

        $reporteIds = array_column($rows, 'id');

        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['id_inspector'] = (int)$row['id_inspector'];
            $row['id_vehiculo'] = $row['id_vehiculo'] !== null ? (int)$row['id_vehiculo'] : null;
            $row['id_papeleta'] = $row['id_papeleta'] !== null ? (int)$row['id_papeleta'] : null;
            $row['fotos'] = []; // No cargamos fotos en el historial para evitar colapsar la memoria RAM del servidor
            
            $infrs = $db->table('reporte_intervencion_infracciones ri')
                ->select('ti.id, ti.codigo, ti.descripcion')
                ->join('tipos_infraccion ti', 'ti.id = ri.id_tipo_infraccion', 'left')
                ->where('ri.id_reporte', $row['id'])
                ->get()
                ->getResultArray();
            $row['infracciones'] = $infrs;
            $row['infraccion_visual'] = !empty($infrs) ? implode(', ', array_column($infrs, 'codigo')) : 'Sin Infracción';
            $row['infraccionesIds'] = array_map('intval', array_column($infrs, 'id'));
        }

        return $this->respond(['data' => $rows]);
    }

    public function fotos($id)
    {
        $db = \Config\Database::connect();
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
        // if ($placa === '' && empty($fotos)) {
        //     return $this->failValidationErrors('Si no hay placa, registre al menos una foto como evidencia.');
        // }

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

        $fechaHora = trim((string)($input['fechaHora'] ?? $input['fecha_hora'] ?? ''));
        if ($fechaHora === '') {
            $fechaHora = (new \DateTime('now', new \DateTimeZone('America/Lima')))->format('Y-m-d H:i:s');
        }

        $this->ensureColumnasExtra($db);

        $db->transException(true)->transBegin();
        try {
            // No registrar el vehículo ni los dueños en las tablas maestras desde la app móvil
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

            // Conductor
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
                // Máximo 5 fotos por reporte y límite de tamaño (~7MB base64 ~= 5MB binario)
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
            if ($reporte['estado'] !== 'PENDIENTE') {
                throw new \DomainException('Solo se pueden convertir reportes pendientes.');
            }

            $vehiculoId = (int)($input['vehiculoId'] ?? $reporte['id_vehiculo'] ?? 0);
            if ($vehiculoId <= 0 && !empty($reporte['placa'])) {
                $vehiculo = $db->table('vehiculos')->where('placa', $reporte['placa'])->get()->getRowArray();
                $vehiculoId = $vehiculo ? (int)$vehiculo['id'] : 0;
            }
            if ($vehiculoId <= 0) {
                throw new \DomainException('Antes de generar papeleta debe identificar o registrar el vehículo.');
            }

            $vehiculo = $db->table('vehiculos')->where('id', $vehiculoId)->get()->getRowArray();
            if (!$vehiculo) {
                throw new \DomainException('El vehículo seleccionado no existe.');
            }

            $personaId = null;
            $conductorInformalDni = null;
            $conductorInformalNombres = null;
            
            $conductorDni = trim((string)($input['conductorDni'] ?? ''));
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
                'numero_papeleta' => $tempNumero,
                'id_vehiculo' => $vehiculoId,
                'id_persona_infractor' => $personaId,
                'id_inspector' => (int)$reporte['id_inspector'],
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

            $numeroPapeletaDefinitivo = 'PAP-' . date('Y') . '-' . str_pad((string)$papeletaId, 6, '0', STR_PAD_LEFT);
            $db->table('papeletas')->where('id', $papeletaId)->update(['numero_papeleta' => $numeroPapeletaDefinitivo]);

            foreach ($detalles as $detalle) {
                $detalle['id_papeleta'] = $papeletaId;
                $db->table('papeleta_detalles')->insert($detalle);
            }

            (new \App\Services\PagosTransito($db))->generar('PAPELETA', $papeletaId);

            $db->table('reportes_intervencion')->where('id', $id)->update([
                'id_vehiculo' => $vehiculoId,
                'id_papeleta' => $papeletaId,
                'estado' => 'CONVERTIDO_PAPELETA',
            ]);

            $db->transCommit();
            return $this->respond(['message' => 'Reporte convertido a papeleta.', 'data' => ['id' => $papeletaId, 'numeroPapeleta' => $numeroPapeleta]]);
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

        $db->table('reportes_intervencion')->where('id', (int)$id)->update([
            'estado' => 'RECHAZADO',
            'motivo_rechazo' => $motivo,
        ]);

        return $this->respond(['message' => 'Reporte rechazado correctamente.']);
    }

    /**
     * Migración perezosa: agrega id_operativo/id_conductor si la tabla aún
     * no las tiene (instalaciones creadas antes de que existieran).
     */
    private function ensureColumnasExtra($db): void
    {
        if (!$db->fieldExists('id_operativo', 'reportes_intervencion')) {
            $db->query('ALTER TABLE reportes_intervencion ADD COLUMN id_operativo INT NULL AFTER id_papeleta');
        }
        if (!$db->fieldExists('id_conductor', 'reportes_intervencion')) {
            $db->query('ALTER TABLE reportes_intervencion ADD COLUMN id_conductor INT NULL AFTER id_vehiculo');
        }
        if (!$db->fieldExists('dueno_informal_nombres', 'reportes_intervencion')) {
            $db->query('ALTER TABLE reportes_intervencion ADD COLUMN dueno_informal_nombres VARCHAR(255) NULL AFTER placa');
        }
        if (!$db->fieldExists('dueno_informal_dni', 'reportes_intervencion')) {
            $db->query('ALTER TABLE reportes_intervencion ADD COLUMN dueno_informal_dni VARCHAR(20) NULL AFTER dueno_informal_nombres');
        }
        if (!$db->fieldExists('conductor_informal_nombres', 'reportes_intervencion')) {
            $db->query('ALTER TABLE reportes_intervencion ADD COLUMN conductor_informal_nombres VARCHAR(255) NULL AFTER dueno_informal_dni');
        }
        if (!$db->fieldExists('conductor_informal_dni', 'reportes_intervencion')) {
            $db->query('ALTER TABLE reportes_intervencion ADD COLUMN conductor_informal_dni VARCHAR(20) NULL AFTER conductor_informal_nombres');
        }
    }
}
