<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class DocumentosController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();

        $rows = $db->table('documentos_vehiculo d')
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
                d.tipo_documento AS tipoDocumento,
                d.codigo,
                d.aseguradora,
                d.numero_licencia AS numeroLicencia,
                d.foto_conductor AS fotoConductor,
                d.conductor_nombres AS conductorNombres,
                d.id_inspeccion AS idInspeccion,
                d.numero_inspeccion AS numeroInspeccion,
                d.fecha_expedicion AS fechaExpedicion,
                d.fecha_expiracion AS fechaExpiracion,
                d.estado,
                COALESCE(o.razon_social, 'Independiente') AS asociacion,
                COALESCE(c.nombres, '') AS propietarioNombres,
                COALESCE(c.apellido_paterno, '') AS propietarioPaterno,
                COALESCE(c.apellido_materno, '') AS propietarioMaterno,
                COALESCE(p.numero, '') AS propietarioDni
            ", false)
            ->join('vehiculos v', 'v.id = d.id_vehiculo', 'left')
            ->join('asociaciones o', 'o.id = v.id_asociacion', 'left')
            ->join('vehiculo_propietarios vp', 'vp.id_vehiculo = v.id AND vp.fecha_fin IS NULL', 'left')
            ->join('personas p', 'p.id = vp.id_persona', 'left')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->orderBy('d.id', 'DESC')
            ->get()
            ->getResultArray();

        $data = array_map(static function (array $row): array {
            $propietario = trim(($row['propietarioNombres'] ?? '') . ' ' . ($row['propietarioPaterno'] ?? '') . ' ' . ($row['propietarioMaterno'] ?? ''));
            $row['propietario'] = $propietario ?: 'Sin Propietario Asignado';
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

        if (empty($input['codigo'])) {
            return $this->failValidationErrors('El número o código del documento es obligatorio.');
        }

        $rawTipo = strtoupper(trim($input['tipoDocumento'] ?? 'TARJETA_OPERATIVIDAD'));

        if ($rawTipo === 'TARJETA_PROPIEDAD') {
            return $this->failValidationErrors('La Tarjeta de Propiedad es expedida exclusivamente por la SUNARP (Partida Registral) y no constituye un documento emitible por la Municipalidad.');
        }

        // Map legacy CITV to municipal technical inspection
        if ($rawTipo === 'CITV') {
            $rawTipo = 'INSPECCION_TECNICA';
        }

        if (!in_array($rawTipo, ['TARJETA_OPERATIVIDAD', 'SOAT', 'CERTICAV', 'INSPECCION_TECNICA', 'CURSO_VIAL'], true)) {
            return $this->failValidationErrors('Tipo de documento vehicular no válido. Solo se permite Tarjeta de Operatividad, Carnet de Seguridad Vial (Curso Vial), CertiCAV, SOAT e Inspección Técnica Municipal.');
        }

        $placa = strtoupper(trim($input['vehiculoPlaca'] ?? ''));
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
            ->select("COALESCE(c.nombres, '') AS nombres, COALESCE(c.apellido_paterno, '') AS apePaterno, COALESCE(c.apellido_materno, '') AS apeMaterno, COALESCE(p.numero, '') AS dni")
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

            // Look for approved municipal inspection if not supplied
            if (empty($input['numeroInspeccion']) && empty($input['idInspeccion'])) {
                $inspRow = $db->table('certicav')
                    ->where('id_vehiculo', $vehiculoId)
                    ->where('resultado', 'APROBADO')
                    ->orderBy('id', 'DESC')
                    ->limit(1)
                    ->get()
                    ->getRowArray();

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
            'fecha_expiracion'   => !empty($input['fechaExpiracion']) ? $input['fechaExpiracion'] : date('Y-m-d', strtotime('+1 year')),
            'estado'             => strtoupper($input['estado'] ?? 'VIGENTE'),
            'aseguradora'        => !empty($input['aseguradora']) ? trim($input['aseguradora']) : null,
            'numero_licencia'    => !empty($input['numeroLicencia']) ? trim($input['numeroLicencia']) : null,
            'foto_conductor'     => !empty($input['fotoConductor']) ? $input['fotoConductor'] : null,
            'conductor_nombres'  => !empty($input['conductorNombres']) ? trim($input['conductorNombres']) : null,
            'id_inspeccion'      => !empty($input['idInspeccion']) ? (int)$input['idInspeccion'] : null,
            'numero_inspeccion'  => !empty($input['numeroInspeccion']) ? trim($input['numeroInspeccion']) : null,
        ];

        $db->table('documentos_vehiculo')->insert($record);
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
            'tipoDocumento'            => $record['tipo_documento'],
            'codigo'                   => $record['codigo'],
            'fechaExpedicion'          => $record['fecha_expedicion'],
            'fechaExpiracion'          => $record['fecha_expiracion'],
            'estado'                   => $record['estado'],
            'aseguradora'              => $record['aseguradora'],
            'numeroLicencia'           => $record['numero_licencia'],
            'fotoConductor'            => $record['foto_conductor'],
            'conductorNombres'         => $record['conductor_nombres'],
            'idInspeccion'             => $record['id_inspeccion'],
            'numeroInspeccion'         => $record['numero_inspeccion'],
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

        $record = [];
        if (isset($input['tipoDocumento'])) {
            $tipoDocumento = strtoupper(trim($input['tipoDocumento']));
            if ($tipoDocumento === 'TARJETA_PROPIEDAD') {
                return $this->failValidationErrors('La Tarjeta de Propiedad es de SUNARP y no es un documento emitible por la Municipalidad.');
            }
            if ($tipoDocumento === 'CITV') {
                $tipoDocumento = 'INSPECCION_TECNICA';
            }
            if (!in_array($tipoDocumento, ['TARJETA_OPERATIVIDAD', 'SOAT', 'CERTICAV', 'INSPECCION_TECNICA', 'CURSO_VIAL'], true)) {
                return $this->failValidationErrors('Tipo de documento vehicular no válido.');
            }
            $record['tipo_documento'] = $tipoDocumento;
        }

        if (isset($input['codigo'])) $record['codigo'] = trim($input['codigo']);
        if (isset($input['fechaExpedicion'])) $record['fecha_expedicion'] = $input['fechaExpedicion'];
        if (isset($input['fechaExpiracion'])) $record['fecha_expiracion'] = $input['fechaExpiracion'];
        if (isset($input['estado'])) $record['estado'] = strtoupper($input['estado']);
        if (array_key_exists('aseguradora', $input)) $record['aseguradora'] = trim($input['aseguradora'] ?? '') ?: null;
        if (array_key_exists('numeroLicencia', $input)) $record['numero_licencia'] = trim($input['numeroLicencia'] ?? '') ?: null;
        if (array_key_exists('fotoConductor', $input)) $record['foto_conductor'] = $input['fotoConductor'] ?: null;
        if (array_key_exists('conductorNombres', $input)) $record['conductor_nombres'] = trim($input['conductorNombres'] ?? '') ?: null;
        if (array_key_exists('idInspeccion', $input)) $record['id_inspeccion'] = $input['idInspeccion'] ? (int)$input['idInspeccion'] : null;
        if (array_key_exists('numeroInspeccion', $input)) $record['numero_inspeccion'] = trim($input['numeroInspeccion'] ?? '') ?: null;

        if (!empty($record)) {
            $db->table('documentos_vehiculo')->where('id', $id)->update($record);
        }

        return $this->respond(['status' => true, 'message' => 'Documento actualizado con éxito']);
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();

        if (!$id) {
            return $this->failNotFound('ID de documento no especificado.');
        }

        $db->table('documentos_vehiculo')->where('id', $id)->delete();

        return $this->respondDeleted(['status' => true, 'message' => 'Documento anulado con éxito']);
    }
}
