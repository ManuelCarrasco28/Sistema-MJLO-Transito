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

        $rows = $db->table('reportes_intervencion r')
            ->select("
                r.*,
                COALESCE(v.placa, r.placa, 'SIN PLACA') AS placa_visual,
                COALESCE(v.marca, '') AS vehiculo_marca,
                COALESCE(v.modelo, '') AS vehiculo_modelo,
                COALESCE(v.color, '') AS vehiculo_color,
                COALESCE(CONCAT(ci.nombres, ' ', ci.apellido_paterno, ' ', COALESCE(ci.apellido_materno, '')), 'Inspector Municipal') AS inspector_nombre,
                p.numero_papeleta
            ", false)
            ->join('vehiculos v', 'v.id = r.id_vehiculo', 'left')
            ->join('trabajadores t', 't.id_persona = r.id_inspector', 'left')
            ->join('ciudadanos ci', 'ci.id_persona = t.id_persona', 'left')
            ->join('papeletas p', 'p.id = r.id_papeleta', 'left')
            ->orderBy('r.id', 'DESC')
            ->get()
            ->getResultArray();

        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['id_inspector'] = (int)$row['id_inspector'];
            $row['id_vehiculo'] = $row['id_vehiculo'] !== null ? (int)$row['id_vehiculo'] : null;
            $row['id_papeleta'] = $row['id_papeleta'] !== null ? (int)$row['id_papeleta'] : null;
            $row['fotos'] = $db->table('reporte_intervencion_fotos')
                ->select('id, foto, fecha_created')
                ->where('id_reporte', $row['id'])
                ->orderBy('id', 'ASC')
                ->get()
                ->getResultArray();
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

        $db->transException(true)->transBegin();
        try {
            $db->table('reportes_intervencion')->insert([
                'id_inspector' => $inspectorId,
                'id_vehiculo' => $vehiculoId,
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
                    $foto = trim((string)$foto);
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
}
