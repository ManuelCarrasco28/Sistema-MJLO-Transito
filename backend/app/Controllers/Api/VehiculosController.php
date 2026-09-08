<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class VehiculosController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();

        $rows = $db->table('vehiculos v')
            ->select("
                v.id,
                v.placa,
                COALESCE(tv.nombre, 'Mototaxi (Trimovil)') AS tipo,
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
                v.asociacion_id AS asociacionId,
                o.razon_social AS organizacion,
                COALESCE(o.ruc, '') AS organizacionRuc,
                COALESCE(p.tipo_documento, 'DNI') AS propietarioTipoDocumento,
                COALESCE(p.nombres, '') AS propietarioNombres,
                COALESCE(p.apellido_paterno, '') AS propietarioPaterno,
                COALESCE(p.apellido_materno, '') AS propietarioMaterno,
                COALESCE(p.numero_documento, '') AS propietarioDni,
                v.estado_formalizacion AS estado,
                CASE WHEN v.asociacion_id IS NOT NULL THEN 'FORMAL' ELSE 'INFORMAL' END AS formalidad
            ", false)
            ->join('tipos_vehiculo tv', 'tv.id = v.tipo_vehiculo_id', 'left')
            ->join('organizaciones o', 'o.id = v.asociacion_id', 'left')
            ->join('vehiculo_propietarios vp', 'vp.vehiculo_id = v.id AND vp.fecha_fin IS NULL', 'left')
            ->join('personas p', 'p.id = vp.persona_id', 'left')
            ->orderBy('v.id', 'DESC')
            ->get()
            ->getResultArray();

        $vehiculoIds = array_map(static fn (array $row): int => (int)$row['id'], $rows);
        $documentosPorVehiculo = [];
        $papeletasPorVehiculo = [];
        $certicavPorVehiculo = [];

        if (!empty($vehiculoIds)) {
            $documentos = $db->table('documentos_vehiculo')
                ->select('vehiculo_id, tipo_documento as tipoDocumento, codigo, fecha_expedicion as fechaExpedicion, fecha_expiracion as fechaExpiracion, estado')
                ->whereIn('vehiculo_id', $vehiculoIds)
                ->orderBy('fecha_expiracion', 'DESC')
                ->get()
                ->getResultArray();

            foreach ($documentos as $doc) {
                $vehiculoId = (int)$doc['vehiculo_id'];
                unset($doc['vehiculo_id']);
                $documentosPorVehiculo[$vehiculoId][] = $doc;
            }

            $papeletas = $db->table('papeletas p')
                ->select("
                    p.vehiculo_id,
                    p.numero_papeleta as numeroPapeleta,
                    p.fecha_hora as fechaHora,
                    p.lugar,
                    p.monto_total as montoTotal,
                    p.estado,
                    COALESCE(ti.codigo, 'SIN CODIGO') as codigoInfraccion,
                    COALESCE(ti.descripcion, 'Infraccion no especificada') as tipoInfraccion,
                    COALESCE(ti.gravedad, 'SIN GRAVEDAD') as gravedad
                ", false)
                ->join('papeleta_detalles pd', 'pd.papeleta_id = p.id', 'left')
                ->join('tipos_infraccion ti', 'ti.id = pd.tipo_infraccion_id', 'left')
                ->whereIn('vehiculo_id', $vehiculoIds)
                ->groupBy('p.id')
                ->orderBy('p.fecha_hora', 'DESC')
                ->get()
                ->getResultArray();

            foreach ($papeletas as $papeleta) {
                $vehiculoId = (int)$papeleta['vehiculo_id'];
                unset($papeleta['vehiculo_id']);
                $papeleta['montoTotal'] = (float)$papeleta['montoTotal'];
                $papeletasPorVehiculo[$vehiculoId][] = $papeleta;
            }

            $certicavs = $db->table('certicav')
                ->select('vehiculo_id, numero_registro as numeroRegistro, numero_serie_certicav as numeroSerieCerticav, fecha, primera_evaluacion as primeraEvaluacion, segunda_evaluacion as segundaEvaluacion, resultado, estado')
                ->whereIn('vehiculo_id', $vehiculoIds)
                ->orderBy('fecha', 'DESC')
                ->orderBy('id', 'DESC')
                ->get()
                ->getResultArray();

            foreach ($certicavs as $certicav) {
                $vehiculoId = (int)$certicav['vehiculo_id'];
                if (!isset($certicavPorVehiculo[$vehiculoId])) {
                    unset($certicav['vehiculo_id']);
                    $certicavPorVehiculo[$vehiculoId] = $certicav;
                }
            }
        }

        $data = array_map(static function (array $row) use ($documentosPorVehiculo, $papeletasPorVehiculo, $certicavPorVehiculo): array {
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
                'soatEstado' => $soat['estado'] ?? 'SIN_REGISTRO',
                'tucNumero' => 'TUC-2026-' . str_pad($row['id'], 3, '0', STR_PAD_LEFT),
            ];
        }, $rows);

        return $this->respond(['data' => $data]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getPost();

        if (empty($input['placa'])) {
            return $this->failValidationErrors('La placa del vehículo es requerida.');
        }

        $placa = strtoupper(trim($input['placa']));

        
        $tipoNombre = !empty($input['tipo']) ? trim($input['tipo']) : 'Mototaxi (Trimovil)';
        $tipoRow = $db->table('tipos_vehiculo')->where('nombre', $tipoNombre)->get()->getRowArray();
        if (!$tipoRow) {
            $db->table('tipos_vehiculo')->insert(['nombre' => $tipoNombre]);
            $tipoVehiculoId = $db->insertID();
        } else {
            $tipoVehiculoId = $tipoRow['id'];
        }

        
        $asociacionId = null;
        $orgName = trim($input['organizacion'] ?? '');
        if (!empty($orgName) && !in_array($orgName, ['Sin Organización (Informal)', 'Sin Organización', 'Independiente', 'Independiente / Particular'])) {
            $orgRow = $db->table('organizaciones')
                ->like('razon_social', $orgName)
                ->get()
                ->getRowArray();
            if ($orgRow) {
                $asociacionId = $orgRow['id'];
            }
        }

        $estadoFormalizacion = !empty($input['estado']) && in_array(strtoupper($input['estado']), ['SUSPENDIDO', 'BAJA'])
            ? strtoupper($input['estado'])
            : ($asociacionId ? 'FORMAL' : 'INFORMAL');

        $qrCode = $input['codigoQr'] ?? ('QR-VEH-' . date('Y') . '-' . str_pad(random_int(100, 999), 3, '0', STR_PAD_LEFT));

        $record = [
            'placa'                => $placa,
            'tipo_vehiculo_id'     => $tipoVehiculoId,
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
            'asociacion_id'        => $asociacionId,
            'estado_formalizacion' => $estadoFormalizacion,
        ];

        $db->table('vehiculos')->insert($record);
        $vehiculoId = (int)$db->insertID();

        $propietarioNombre = trim($input['propietario'] ?? '');
        $propietarioDni = trim($input['propietarioDni'] ?? '');

        if ($propietarioDni !== '' || $propietarioNombre !== '') {
            $personaId = null;
            if ($propietarioDni !== '') {
                $personaRow = $db->table('personas')->where('numero_documento', $propietarioDni)->get()->getRowArray();
                if ($personaRow) {
                    $personaId = $personaRow['id'];
                }
            }

            if (!$personaId && $propietarioNombre !== '') {
                $names = explode(' ', $propietarioNombre);
                $paterno = count($names) > 1 ? array_pop($names) : '';
                $nombres = implode(' ', $names) ?: $propietarioNombre;
                $db->table('personas')->insert([
                    'tipo_documento'   => 'DNI',
                    'numero_documento' => $propietarioDni ?: str_pad(random_int(10000000, 99999999), 8, '0', STR_PAD_LEFT),
                    'nombres'          => $nombres,
                    'apellido_paterno' => $paterno ?: 'Titular',
                    'estado'           => 'ACTIVO',
                ]);
                $personaId = $db->insertID();
            }

            if ($personaId) {
                $db->table('vehiculo_propietarios')->insert([
                    'vehiculo_id'  => $vehiculoId,
                    'persona_id'   => $personaId,
                    'fecha_inicio' => date('Y-m-d'),
                    'estado'       => 'ACTIVO',
                ]);
            }
        }

        $newVehiculo = [
            'id'               => $vehiculoId,
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
            'organizacion'     => $asociacionId ? $orgName : null,
            'propietario'      => $propietarioNombre ?: 'Sin Propietario',
            'propietarioDni'   => $propietarioDni,
            'estado'           => $record['estado_formalizacion'],
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
        if (isset($input['placa'])) $record['placa'] = strtoupper(trim($input['placa']));
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

        if (array_key_exists('organizacion', $input)) {
            $asociacionId = null;
            $orgName = trim((string)$input['organizacion']);
            if (!empty($orgName) && !in_array($orgName, ['Sin Organización (Informal)', 'Sin Organización', 'Independiente', 'Independiente / Particular'])) {
                $orgRow = $db->table('organizaciones')
                    ->like('razon_social', $orgName)
                    ->get()
                    ->getRowArray();
                if ($orgRow) {
                    $asociacionId = $orgRow['id'];
                }
            }
            $record['asociacion_id'] = $asociacionId;
            if (!isset($input['estado']) || !in_array(strtoupper($input['estado']), ['SUSPENDIDO', 'BAJA'])) {
                $record['estado_formalizacion'] = $asociacionId ? 'FORMAL' : 'INFORMAL';
            }
        }

        if (isset($input['estado'])) {
            $record['estado_formalizacion'] = strtoupper($input['estado']);
        }

        if (!empty($record)) {
            $db->table('vehiculos')->where('id', $id)->update($record);
        }

        return $this->respond(['status' => true, 'message' => 'Vehículo actualizado con éxito']);
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();

        if (!$id) {
            return $this->failNotFound('ID de vehículo no especificado.');
        }

        $db->table('vehiculo_propietarios')->where('vehiculo_id', $id)->delete();
        $db->table('documentos_vehiculo')->where('vehiculo_id', $id)->delete();
        $db->table('vehiculos')->where('id', $id)->delete();

        return $this->respondDeleted(['status' => true, 'message' => 'Vehículo eliminado con éxito']);
    }
}
