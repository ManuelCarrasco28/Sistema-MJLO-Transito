<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class VehiculosController extends ResourceController
{
    protected $format = 'json';

    private function normalizeSearchValue(string $value): string
    {
        return strtoupper(preg_replace('/[^A-Z0-9]/', '', trim($value)) ?? '');
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
        }

        $data = array_map(static function (array $row) use ($documentosPorVehiculo, $papeletasPorVehiculo, $certicavPorVehiculo, $internamientosPorVehiculo): array {
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
                'soatEstado' => $soat['estado'] ?? 'SIN_REGISTRO',
                'tucNumero' => 'TUC-2026-' . str_pad($row['id'], 3, '0', STR_PAD_LEFT),
            ];
        }, $rows);

        return $data;
    }

    public function index()
    {
        $db = \Config\Database::connect();

        $rows = $this->vehiculosBaseQuery($db)
            ->orderBy('v.id', 'DESC')
            ->get()
            ->getResultArray();

        return $this->respond(['data' => $this->appendVehiculoRelations($rows)]);
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
            $builder->where("REPLACE(REPLACE(UPPER(v.codigo_qr), '-', ''), ' ', '') =", $normalizado);
        }

        $rows = $builder
            ->orderBy('v.id', 'DESC')
            ->limit(1)
            ->get()
            ->getResultArray();

        if (empty($rows)) {
            if ($tipo === 'PLACA') {
                $sunarpData = \App\Services\PideService::sunarp($normalizado);
                if ($sunarpData && !isset($sunarpData['error'])) {
                    $rawProps = $sunarpData['propietarios'] ?? [];
                    $propNames = array_filter(array_map(function($p) {
                        return is_string($p) ? trim($p) : trim($p['nombre'] ?? $p['razon_social'] ?? $p['apellidos_nombres'] ?? '');
                    }, is_array($rawProps) ? $rawProps : []));
                    
                    $propietario = empty($propNames) ? 'Sin Propietario Asignado' : implode(', ', $propNames);

                    return $this->respond(['data' => [
                        'id' => 0,
                        'placa' => $sunarpData['placa'] ?? $normalizado,
                        'tipo' => 'Vehículo',
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
                        'soatEstado' => 'SIN_REGISTRO',
                        'tucNumero' => 'TUC-2026-000',
                    ]]);
                }
            }

            return $this->failNotFound('No se encontró vehículo con el dato ingresado.');
        }

        return $this->respond(['data' => $this->appendVehiculoRelations($rows)[0]]);
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

        $rules = [
            'placa' => [
                'rules' => 'required',
                'errors' => ['required' => 'La placa del vehículo es requerida.']
            ],
            'propietarioDni' => [
                'rules' => 'required',
                'errors' => ['required' => 'Debe seleccionar un propietario registrado en Personas.']
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $placa = strtoupper(trim($input['placa']));
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

        $qrCode = $input['codigoQr'] ?? ('QR-VEH-' . date('Y') . '-' . str_pad(random_int(100, 999), 3, '0', STR_PAD_LEFT));

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
            $placa = strtoupper(trim($input['placa']));
            if ($placa !== '') {
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
            $db->table('vehiculo_propietarios')->where('id_vehiculo', $id)->delete();
            $db->table('vehiculo_propietarios')->insert([
                'id_vehiculo'  => $id,
                'id_persona'   => $personaId,
                'fecha_inicio' => date('Y-m-d'),
                'estado'       => 'ACTIVO',
            ]);
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
