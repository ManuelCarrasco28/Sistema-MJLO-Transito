<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class ReportesIntervencionController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();

        // Campos confirmados en la BD – evitamos llamar fieldExists()/tableExists() en cada request
        $tieneOperativo = true;
        $tieneConductor = true;

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
                COALESCE(prop_per.numero, 'S/D') as propietarioDni,
                COALESCE(NULLIF(TRIM(CONCAT(c_prop.nombres, ' ', c_prop.apellido_paterno, ' ', COALESCE(c_prop.apellido_materno, ''))), ''), 'No Registrado') as propietarioNombre,
                COALESCE(cond_per.numero, 'S/D') as conductorDni,
                COALESCE(NULLIF(TRIM(CONCAT(c_cond.nombres, ' ', c_cond.apellido_paterno, ' ', COALESCE(c_cond.apellido_materno, ''))), ''), 'No identificado') as conductorNombre,
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

        // Filtrar por inspector si se pasa el parámetro (optimización de rendimiento móvil)
        $inspectorId = (int)($this->request->getGet('inspector_id') ?? 0);
        if ($inspectorId > 0) {
            $query->where('r.id_inspector', $inspectorId);
        }

        $rows = $query->orderBy('r.id', 'DESC')->limit(50)->get()->getResultArray();

        $reporteIds = array_column($rows, 'id');

        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['id_inspector'] = (int)$row['id_inspector'];
            $row['id_vehiculo'] = $row['id_vehiculo'] !== null ? (int)$row['id_vehiculo'] : null;
            $row['id_papeleta'] = $row['id_papeleta'] !== null ? (int)$row['id_papeleta'] : null;
            $row['fotos'] = []; // No cargamos fotos en el historial para evitar colapsar la memoria RAM del servidor
        }

        return $this->respond(['data' => $rows]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        if (!$db->tableExists('reportes_intervencion')) {
            return $this->failServerError('Falta crear la tabla reportes_intervencion.');
        }

        $input = $this->request->getJSON(true) ?: $this->request->getPost() ?: [];
        $inspectorId = (int)($input['inspectorId'] ?? $input['id_inspector'] ?? 0);
        $placa = strtoupper(trim((string)($input['placa'] ?? $input['vehiculoPlaca'] ?? '')));
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
        if ($placa === '' && empty($fotos)) {
            return $this->failValidationErrors('Si no hay placa, registre al menos una foto como evidencia.');
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

        $fechaHora = trim((string)($input['fechaHora'] ?? $input['fecha_hora'] ?? ''));
        if ($fechaHora === '') {
            $fechaHora = (new \DateTime('now', new \DateTimeZone('America/Lima')))->format('Y-m-d H:i:s');
        }

        if (!$db->fieldExists('id_operativo', 'reportes_intervencion')) {
            $db->query('ALTER TABLE reportes_intervencion ADD COLUMN id_operativo INT NULL AFTER id_papeleta');
        }
        if (!$db->fieldExists('id_conductor', 'reportes_intervencion')) {
            $db->query('ALTER TABLE reportes_intervencion ADD COLUMN id_conductor INT NULL AFTER id_vehiculo');
        }

        $db->transException(true)->transBegin();
        try {
            if (!$vehiculoId) {
                // No registramos el vehículo en la base de datos de vehículos formales
                // Solo guardamos la placa en el texto del reporte.
                $placa = ($placa && $placa !== 'SIN_PLACA') ? $placa : 'SIN-PLACA-' . random_int(1000, 9999);
                
                $obs_extra = "\n[DATOS REPORTADOS]";
                $marca = trim((string)($input['marcaVehiculo'] ?? ''));
                $color = trim((string)($input['colorVehiculo'] ?? ''));
                if ($marca) $obs_extra .= " Marca: $marca.";
                if ($color) $obs_extra .= " Color: $color.";
                
                $duenoDni = trim((string)($input['dni_dueño'] ?? ''));
                $duenoNombres = trim((string)($input['nombres_dueño'] ?? ''));
                $duenoApellidos = trim((string)($input['apellidos_dueño'] ?? ''));
                if ($duenoDni !== '') {
                    $obs_extra .= " Supuesto Dueño: $duenoNombres $duenoApellidos (DNI: $duenoDni).";
                }
                
                if ($obs_extra !== "\n[DATOS REPORTADOS]") {
                    $observaciones .= $obs_extra;
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
                    $conductorApellidosStr = trim((string)($input['apellidos_conductor'] ?? 'NO REGISTRADO'));
                    $conductorApellidos = preg_split('/\s+/', $conductorApellidosStr) ?: [];
                    $db->table('personas')->insert([
                        'id_tipo_documento' => 1,
                        'numero' => $conductorDni,
                        'estado' => 'ACTIVO',
                    ]);
                    $conductorId = (int)$db->insertID();
                    $db->table('ciudadanos')->insert([
                        'id_persona' => $conductorId,
                        'nombres' => $conductorNombres,
                        'apellido_paterno' => $conductorApellidos[0] ?? 'NO REGISTRADO',
                        'apellido_materno' => isset($conductorApellidos[1]) ? implode(' ', array_slice($conductorApellidos, 1)) : null,
                    ]);
                }
            }

            $db->table('reportes_intervencion')->insert([
                'id_inspector' => $inspectorId,
                'id_operativo' => $idOperativo,
                'id_vehiculo' => $vehiculoId,
                'id_conductor' => $conductorId,
                'placa' => $placa !== '' ? $placa : null,
                'fecha_hora' => $fechaHora,
                'lugar' => $lugar,
                'coordenadas' => $coordenadas !== '' ? $coordenadas : null,
                'observaciones' => $observaciones,
                'estado' => 'PENDIENTE',
            ]);
            $id = (int)$db->insertID();

            if (is_array($fotos)) {
                foreach ($fotos as $foto) {
                    $foto = $this->normalizarFoto(trim((string)$foto));
                    if ($foto !== '') {
                        $db->table('reporte_intervencion_fotos')->insert([
                            'id_reporte' => $id,
                            'foto' => $foto,
                        ]);
                    }
                }
            }

            $db->transCommit();
            return $this->respondCreated(['message' => 'Reporte registrado para revisión administrativa.', 'data' => ['id' => $id]]);
        } catch (\Throwable $e) {
            $db->transRollback();
            return $this->failServerError('No se pudo registrar el reporte: ' . $e->getMessage());
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
            $conductorDni = trim((string)($input['conductorDni'] ?? ''));
            if ($conductorDni !== '') {
                $persona = $db->table('personas')->where('numero', $conductorDni)->get()->getRowArray();
                if (!$persona) {
                    throw new \DomainException('El infractor/intervenido no existe en Personas. Regístrelo primero o deje el campo vacío si el conductor no estuvo presente.');
                }
                $personaId = (int)$persona['id'];
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

            $numeroPapeleta = 'PAP-' . date('Y') . '-' . str_pad((string)random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            while ($db->table('papeletas')->where('numero_papeleta', $numeroPapeleta)->countAllResults() > 0) {
                $numeroPapeleta = 'PAP-' . date('Y') . '-' . str_pad((string)random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            }

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
                'numero_papeleta' => $numeroPapeleta,
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
            ]);
            $papeletaId = (int)$db->insertID();

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
            return $this->failServerError('No se pudo convertir el reporte: ' . $e->getMessage());
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

    private function normalizarFoto(string $foto): string
    {
        if ($foto === '') {
            return '';
        }

        if (str_starts_with($foto, 'data:image/')) {
            return $foto;
        }

        return 'data:image/jpeg;base64,' . $foto;
    }
}
