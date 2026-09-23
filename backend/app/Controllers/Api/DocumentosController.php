<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class DocumentosController extends ResourceController
{
    protected $format = 'json';

    private function documentColumn(string $column, string $alias): string
    {
        $db = \Config\Database::connect();

        if ($db->fieldExists($column, 'documentos_vehiculo')) {
            return "d.$column AS $alias";
        }

        return "NULL AS $alias";
    }

    private function filterExistingDocumentColumns(array $record): array
    {
        $db = \Config\Database::connect();

        return array_filter(
            $record,
            static fn ($value, string $column): bool => $db->fieldExists($column, 'documentos_vehiculo'),
            ARRAY_FILTER_USE_BOTH
        );
    }

    public function index()
    {
        $db = \Config\Database::connect();

        $optionalColumns = [
            $this->documentColumn('aseguradora', 'aseguradora'),
            $this->documentColumn('numero_licencia', 'numeroLicencia'),
            $this->documentColumn('id_inspeccion', 'idInspeccion'),
            $this->documentColumn('numero_inspeccion', 'numeroInspeccion'),
        ];

        $resMunicipalCol = $db->fieldExists('resolucion_alcaldia', 'asociaciones')
            ? "COALESCE(o.resolucion_alcaldia, '')"
            : ($db->fieldExists('numero_licencia', 'asociaciones') ? "COALESCE(o.numero_licencia, '')" : "''");

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
                COALESCE(v.codigo_qr, '') AS codigoQr,
                d.tipo_documento AS tipoDocumento,
                d.codigo,
                " . implode(",\n                ", $optionalColumns) . ",
                d.fecha_expedicion AS fechaExpedicion,
                d.fecha_expiracion AS fechaExpiracion,
                d.estado,
                COALESCE(o.razon_social, 'Independiente') AS asociacion,
                $resMunicipalCol AS resMunicipal,
                COALESCE(c.nombres, '') AS propietarioNombres,
                COALESCE(c.apellido_paterno, '') AS propietarioPaterno,
                COALESCE(c.apellido_materno, '') AS propietarioMaterno,
                COALESCE(c.foto, '') AS fotoConductor,
                COALESCE(c.numero_licencia, '') AS conductorLicencia,
                COALESCE(p.numero, '') AS propietarioDni,
                COALESCE(p.celular, '') AS propietarioCelular,
                COALESCE(p.email, '') AS propietarioEmail,
                COALESCE(p.direccion, '') AS direccion
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
            $apellidos = trim(($row['propietarioPaterno'] ?? '') . ' ' . ($row['propietarioMaterno'] ?? ''));
            $row['propietario'] = $propietario ?: 'Sin Propietario Asignado';
            $row['conductorNombres'] = trim($row['propietarioNombres'] ?? '');
            $row['conductorApellidos'] = $apellidos;
            $row['conductorDni'] = $row['propietarioDni'] ?? '';
            if (empty($row['numeroLicencia']) && !empty($row['conductorLicencia'])) {
                $row['numeroLicencia'] = $row['conductorLicencia'];
            }
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
                'rules' => 'required|in_list[TARJETA_OPERATIVIDAD,SOAT,CERTICAV]',
                'errors' => [
                    'required' => 'El tipo de documento es obligatorio.',
                    'in_list' => 'Tipo de documento vehicular no válido. Solo se permite Tarjeta de Operatividad, CertiCAV, y SOAT.'
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

        if ($rawTipo === 'TARJETA_PROPIEDAD') {
            return $this->failValidationErrors('La Tarjeta de Propiedad es expedida exclusivamente por la SUNARP (Partida Registral) y no constituye un documento emitible por la Municipalidad.');
        }

        if ($rawTipo === 'CITV' || $rawTipo === 'INSPECCION_TECNICA') {
            return $this->failValidationErrors('Las inspecciones técnicas (CITV) no son gestionadas en este módulo de emisión de documentos.');
        }

        if (!in_array($rawTipo, ['TARJETA_OPERATIVIDAD', 'SOAT', 'CERTICAV'], true)) {
            return $this->failValidationErrors('Tipo de documento vehicular no válido. Solo se permite Tarjeta de Operatividad, CertiCAV, y SOAT.');
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
            ->select("COALESCE(c.nombres, '') AS nombres, COALESCE(c.apellido_paterno, '') AS apePaterno, COALESCE(c.apellido_materno, '') AS apeMaterno, COALESCE(c.foto, '') AS foto, COALESCE(p.numero, '') AS dni, COALESCE(p.direccion, '') AS direccion")
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
            'id_inspeccion'      => !empty($input['idInspeccion']) ? (int)$input['idInspeccion'] : null,
            'numero_inspeccion'  => !empty($input['numeroInspeccion']) ? trim($input['numeroInspeccion']) : null,
        ];
        $record = $this->filterExistingDocumentColumns($record);

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
            'codigoQr'                 => $vehiculoRow['codigo_qr'] ?? '',
            'tipoDocumento'            => $record['tipo_documento'],
            'codigo'                   => $record['codigo'],
            'fechaExpedicion'          => $record['fecha_expedicion'],
            'fechaExpiracion'          => $record['fecha_expiracion'],
            'estado'                   => $record['estado'],
            'aseguradora'              => $record['aseguradora'] ?? null,
            'numeroLicencia'           => $record['numero_licencia'] ?? null,
            'fotoConductor'            => $propietarioRow['foto'] ?? '',
            'conductorNombres'         => $propietarioRow['nombres'] ?? '',
            'conductorApellidos'       => trim(($propietarioRow['apePaterno'] ?? '') . ' ' . ($propietarioRow['apeMaterno'] ?? '')),
            'conductorDni'             => $propietarioRow['dni'] ?? '',
            'resMunicipal'             => $asocRow['resolucion_alcaldia'] ?? '',
            'direccion'                => $propietarioRow['direccion'] ?? '',
            'idInspeccion'             => $record['id_inspeccion'] ?? null,
            'numeroInspeccion'         => $record['numero_inspeccion'] ?? null,
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

        $rules = [
            'tipoDocumento' => [
                'rules' => 'permit_empty|in_list[TARJETA_OPERATIVIDAD,SOAT,CERTICAV]',
                'errors' => [
                    'in_list' => 'Tipo de documento vehicular no válido.'
                ]
            ],
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $record = [];
        if (isset($input['tipoDocumento'])) {
            $tipoDocumento = strtoupper(trim($input['tipoDocumento']));
            if ($tipoDocumento === 'TARJETA_PROPIEDAD') {
                return $this->failValidationErrors('La Tarjeta de Propiedad es de SUNARP y no es un documento emitible por la Municipalidad.');
            }
            if ($tipoDocumento === 'CITV' || $tipoDocumento === 'INSPECCION_TECNICA') {
                return $this->failValidationErrors('Las inspecciones técnicas (CITV) no son gestionadas en este módulo de emisión de documentos.');
            }
            if (!in_array($tipoDocumento, ['TARJETA_OPERATIVIDAD', 'SOAT', 'CERTICAV'], true)) {
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
        if (array_key_exists('idInspeccion', $input)) $record['id_inspeccion'] = $input['idInspeccion'] ? (int)$input['idInspeccion'] : null;
        if (array_key_exists('numeroInspeccion', $input)) $record['numero_inspeccion'] = trim($input['numeroInspeccion'] ?? '') ?: null;
        $record = $this->filterExistingDocumentColumns($record);

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





