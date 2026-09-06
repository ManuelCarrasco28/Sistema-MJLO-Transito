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
                COALESCE(p.nombres, '') AS propietarioNombres,
                COALESCE(p.apellido_paterno, '') AS propietarioPaterno,
                COALESCE(p.apellido_materno, '') AS propietarioMaterno,
                COALESCE(p.numero_documento, '') AS propietarioDni,
                v.estado_formalizacion AS estado
            ", false)
            ->join('tipos_vehiculo tv', 'tv.id = v.tipo_vehiculo_id', 'left')
            ->join('organizaciones o', 'o.id = v.asociacion_id', 'left')
            ->join('vehiculo_propietarios vp', 'vp.vehiculo_id = v.id AND vp.fecha_fin IS NULL', 'left')
            ->join('personas p', 'p.id = vp.persona_id', 'left')
            ->orderBy('v.id', 'DESC')
            ->get()
            ->getResultArray();

        $data = array_map(static function (array $row): array {
            $propietario = trim(($row['propietarioNombres'] ?? '') . ' ' . ($row['propietarioPaterno'] ?? '') . ' ' . ($row['propietarioMaterno'] ?? ''));
            unset($row['propietarioNombres'], $row['propietarioPaterno'], $row['propietarioMaterno']);

            return $row + [
                'propietario' => $propietario ?: 'Sin Propietario Asignado',
                'soatEstado' => 'VIGENTE',
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
            'tipo_vehiculo_id'     => $tipoVehiculoId,
            'marca'                => trim($input['marca'] ?? ''),
            'modelo'               => trim($input['modelo'] ?? ''),
            'color'                => trim($input['color'] ?? ''),
            'anio_fabricacion'     => !empty($input['anio']) ? (int)$input['anio'] : date('Y'),
            'numero_serie'         => trim($input['numeroSerie'] ?? ''),
            'serie_motor'          => trim($input['serieMotor'] ?? ''),
            'partida_registral'    => trim($input['partidaRegistral'] ?? ''),
            'codigo_qr'            => $qrCode,
            'asociacion_id'        => $asociacionId,
            'estado_formalizacion' => strtoupper($input['estado'] ?? 'FORMALIZADO'),
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
