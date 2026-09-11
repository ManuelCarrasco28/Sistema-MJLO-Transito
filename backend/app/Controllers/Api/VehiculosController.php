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
                COALESCE(v.numero_serie, '') AS numeroSerie,
                COALESCE(v.serie_motor, '') AS serieMotor,
                COALESCE(v.partida_registral, '') AS partidaRegistral,
                COALESCE(v.codigo_qr, '') AS codigoQr,
                COALESCE(o.razon_social, 'Independiente') AS organizacion,
                COALESCE(o.ruc, '') AS organizacionRuc,
                COALESCE(td.nombre, 'DNI') AS propietarioTipoDocumento,
                COALESCE(c.nombres, '') AS propietarioNombres,
                COALESCE(c.apellido_paterno, '') AS propietarioPaterno,
                COALESCE(c.apellido_materno, '') AS propietarioMaterno,
                COALESCE(p.numero, '') AS propietarioDni,
                v.estado_formalizacion AS estado
            ", false)
            ->join('tipos_vehiculo tv', 'tv.id = v.id_tipo_vehiculo', 'left')
            ->join('organizaciones o', 'o.id = v.id_asociacion', 'left')
            ->join('vehiculo_propietarios vp', 'vp.id_vehiculo = v.id AND vp.fecha_fin IS NULL', 'left')
            ->join('personas p', 'p.id = vp.id_persona', 'left')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->join('tipo_documentos_identidad td', 'td.id = p.id_tipo_documento', 'left')
            ->orderBy('v.id', 'DESC')
            ->get()
            ->getResultArray();

        $vehiculoIds = array_map(static fn (array $row): int => (int)$row['id'], $rows);
        $documentosPorVehiculo = [];
        $papeletasPorVehiculo = [];

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

            $papeletas = $db->table('papeletas')
                ->select('id_vehiculo, numero_papeleta as numeroPapeleta, fecha_hora as fechaHora, lugar, monto_total as montoTotal, estado')
                ->whereIn('id_vehiculo', $vehiculoIds)
                ->orderBy('fecha_hora', 'DESC')
                ->get()
                ->getResultArray();

            foreach ($papeletas as $papeleta) {
                $vehiculoId = (int)$papeleta['id_vehiculo'];
                unset($papeleta['id_vehiculo']);
                $papeleta['montoTotal'] = (float)$papeleta['montoTotal'];
                $papeletasPorVehiculo[$vehiculoId][] = $papeleta;
            }
        }

        $data = array_map(static function (array $row) use ($documentosPorVehiculo, $papeletasPorVehiculo): array {
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
        if (!empty($input['organizacion'])) {
            $orgRow = $db->table('organizaciones')
                ->like('razon_social', trim($input['organizacion']))
                ->get()
                ->getRowArray();
            if ($orgRow) {
                $asociacionId = $orgRow['id'];
            }
        }

        $qrCode = $input['codigoQr'] ?? ('QR-VEH-' . date('Y') . '-' . str_pad(random_int(100, 999), 3, '0', STR_PAD_LEFT));

        $record = [
            'placa'                => $placa,
            'id_tipo_vehiculo'     => $tipoVehiculoId,
            'marca'                => trim($input['marca'] ?? ''),
            'modelo'               => trim($input['modelo'] ?? ''),
            'color'                => trim($input['color'] ?? ''),
            'anio_fabricacion'     => !empty($input['anio']) ? (int)$input['anio'] : date('Y'),
            'numero_serie'         => trim($input['numeroSerie'] ?? ''),
            'serie_motor'          => trim($input['serieMotor'] ?? ''),
            'partida_registral'    => trim($input['partidaRegistral'] ?? ''),
            'codigo_qr'            => $qrCode,
            'id_asociacion'        => $asociacionId,
            'estado_formalizacion' => strtoupper($input['estado'] ?? 'FORMALIZADO'),
        ];

        $db->table('vehiculos')->insert($record);
        $vehiculoId = (int)$db->insertID();

               // Propietario
        $propietarioNombre = trim($input['propietario'] ?? '');
        $propietarioDni = trim($input['propietarioDni'] ?? '');

        if ($propietarioDni !== '' || $propietarioNombre !== '') {
            $personaId = null;
            if ($propietarioDni !== '') {
                $personaRow = $db->table('personas')->where('numero', $propietarioDni)->get()->getRowArray();
                if ($personaRow) {
                    $personaId = (int)$personaRow['id'];
                }
            }

            if (!$personaId && ($propietarioNombre !== '' || $propietarioDni !== '')) {
                $tipoDocRow = $db->table('tipo_documentos_identidad')->where('nombre', 'DNI')->get()->getRowArray();
                $tipoDocId = $tipoDocRow ? (int)$tipoDocRow['id'] : 1;

                $numDoc = $propietarioDni ?: (string)random_int(10000000, 99999999);
                $db->table('personas')->insert([
                    'id_tipo_documento' => $tipoDocId,
                    'numero'            => $numDoc,
                    'estado'            => 'ACTIVO',
                ]);
                $personaId = (int)$db->insertID();

                $names = preg_split('/\s+/', $propietarioNombre ?: 'Ciudadano Titular');
                $paterno = count($names) > 1 ? array_pop($names) : 'Titular';
                $nombres = implode(' ', $names) ?: ($propietarioNombre ?: 'Ciudadano');

                $db->table('ciudadanos')->insert([
                    'id_persona'       => $personaId,
                    'nombres'          => $nombres,
                    'apellido_paterno' => $paterno,
                    'apellido_materno' => '',
                ]);
            }

            if ($personaId) {
                $db->table('vehiculo_propietarios')->insert([
                    'id_vehiculo'  => $vehiculoId,
                    'id_persona'   => $personaId,
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
            'numeroSerie'      => $record['numero_serie'],
            'serieMotor'       => $record['serie_motor'],
            'partidaRegistral' => $record['partida_registral'],
            'codigoQr'         => $record['codigo_qr'],
            'organizacion'     => $input['organizacion'] ?? 'Independiente',
            'propietario'      => $propietarioNombre ?: 'Sin Propietario',
            'propietarioDni'   => $propietarioDni,
            'estado'           => $record['estado_formalizacion'],
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
        if (isset($input['numeroSerie'])) $record['numero_serie'] = trim($input['numeroSerie']);
        if (isset($input['serieMotor'])) $record['serie_motor'] = trim($input['serieMotor']);
        if (isset($input['partidaRegistral'])) $record['partida_registral'] = trim($input['partidaRegistral']);
        if (isset($input['estado'])) $record['estado_formalizacion'] = strtoupper($input['estado']);

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
        if (isset($input['organizacion'])) {
            $orgNombre = trim($input['organizacion']);
            if ($orgNombre !== '') {
                $orgRow = $db->table('organizaciones')->like('razon_social', $orgNombre)->get()->getRowArray();
                $record['id_asociacion'] = $orgRow ? $orgRow['id'] : null;
            } else {
                $record['id_asociacion'] = null;
            }
        }

        if (!empty($record)) {
            $db->table('vehiculos')->where('id', $id)->update($record);
        }

        $propietarioNombre = trim($input['propietario'] ?? '');
        $propietarioDni = trim($input['propietarioDni'] ?? '');
        if ($propietarioDni !== '' || $propietarioNombre !== '') {
            $personaId = null;
            if ($propietarioDni !== '') {
                $personaRow = $db->table('personas')->where('numero', $propietarioDni)->get()->getRowArray();
                if ($personaRow) $personaId = (int)$personaRow['id'];
            }
            if (!$personaId && ($propietarioNombre !== '' || $propietarioDni !== '')) {
                $tipoDocRow = $db->table('tipo_documentos_identidad')->where('nombre', 'DNI')->get()->getRowArray();
                $tipoDocId = $tipoDocRow ? (int)$tipoDocRow['id'] : 1;
                $numDoc = $propietarioDni ?: (string)random_int(10000000, 99999999);
                $db->table('personas')->insert([
                    'id_tipo_documento' => $tipoDocId,
                    'numero'            => $numDoc,
                    'estado'            => 'ACTIVO',
                ]);
                $personaId = (int)$db->insertID();

                $names = preg_split('/\s+/', $propietarioNombre ?: 'Ciudadano Titular');
                $paterno = count($names) > 1 ? array_pop($names) : 'Titular';
                $nombres = implode(' ', $names) ?: ($propietarioNombre ?: 'Ciudadano');
                $db->table('ciudadanos')->insert([
                    'id_persona'       => $personaId,
                    'nombres'          => $nombres,
                    'apellido_paterno' => $paterno,
                    'apellido_materno' => '',
                ]);
            }
            if ($personaId) {
                $db->table('vehiculo_propietarios')->where('id_vehiculo', $id)->delete();
                $db->table('vehiculo_propietarios')->insert([
                    'id_vehiculo'  => $id,
                    'id_persona'   => $personaId,
                    'fecha_inicio' => date('Y-m-d'),
                    'estado'       => 'ACTIVO',
                ]);
            }
        }

        return $this->respond(['status' => true, 'message' => 'Vehículo actualizado con éxito']);
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();

        if (!$id) {
            return $this->failNotFound('ID de vehículo no especificado.');
        }

        $db->table('vehiculo_propietarios')->where('id_vehiculo', $id)->delete();
        $db->table('documentos_vehiculo')->where('id_vehiculo', $id)->delete();
        $db->table('vehiculos')->where('id', $id)->delete();

        return $this->respondDeleted(['status' => true, 'message' => 'Vehículo eliminado con éxito']);
    }
}
