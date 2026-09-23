<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PermisosController extends ResourceController
{
    protected $format = 'json';

    private function getBaseQuery()
    {
        $db = \Config\Database::connect();
        return $db->table('permisos_circulacion pc')
            ->select("
                pc.id,
                pc.id_tramite as tramiteId,
                pc.numero_autorizacion as numeroAutorizacion,
                pc.vehiculo_placa as vehiculoPlaca,
                pc.solicitante_nombre as solicitanteNombre,
                pc.solicitante_documento as solicitanteDocumento,
                pc.representante_legal as representanteLegal,
                pc.tipo_permiso as tipoPermiso,
                pc.asunto,
                pc.referencia_sisgedo as referenciaSisgedo,
                pc.expediente,
                pc.registro_numero as registroNumero,
                pc.contenido,
                pc.zona_circulacion as zonaCirculacion,
                pc.ubicacion,
                pc.recorrido_ingreso as recorridoIngreso,
                pc.recorrido_salida as recorridoSalida,
                pc.flota_placas as flotaPlacas,
                pc.recibo_ingreso_numero as reciboIngresoNumero,
                pc.recibo_ingreso_monto as reciboIngresoMonto,
                pc.recibo_ingreso_fecha as reciboIngresoFecha,
                pc.tonelaje,
                pc.numero_seguridad as numeroSeguridad,
                pc.observaciones,
                pc.horario_inicio as horarioInicio,
                pc.horario_fin as horarioFin,
                pc.fecha_emision as fechaEmision,
                pc.fecha_inicio_vigencia as fechaInicioVigencia,
                pc.fecha_fin_vigencia as fechaFinVigencia,
                pc.estado,
                
                -- Datos relacionados derivados de tramites, vehiculos, personas, asociaciones y pagos
                COALESCE(NULLIF(pc.expediente, ''), td.numero_expediente, '') as expedienteNumero,
                td.fecha_solicitud as fechaSolicitud,
                pa.nombre as procedimientoNombre,
                pa.codigo as procedimientoCodigo,
                COALESCE(NULLIF(pc.solicitante_nombre, ''), o.razon_social, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))), '') as solicitante,
                COALESCE(NULLIF(pc.solicitante_documento, ''), o.ruc, p.numero, '') as solicitanteDoc,
                o.ruc as solicitanteRuc,
                p.numero as solicitanteDni
            ", false)
            ->join('tramites_documentarios td', 'td.id = pc.id_tramite', 'left')
            ->join('procedimientos_administrativos pa', 'pa.id = td.id_procedimiento_admin', 'left')
            ->join('asociaciones o', 'o.id = td.id_asociacion', 'left')
            ->join('personas p', 'p.id = td.id_persona', 'left')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left');
    }

    public function index()
    {
        try {
            $rows = $this->getBaseQuery()
                ->orderBy('pc.id', 'DESC')
                ->get()
                ->getResultArray();

            $data = array_map(static function (array $r): array {
                $r['id'] = (int)$r['id'];
                $r['tramiteId'] = $r['tramiteId'] ? (int)$r['tramiteId'] : null;
                $r['reciboIngresoMonto'] = $r['reciboIngresoMonto'] ? (float)$r['reciboIngresoMonto'] : null;
                return $r;
            }, $rows);

            return $this->respond(['data' => $data]);
        } catch (\Throwable $e) {
            return $this->failServerError('Error consultando permisos: ' . $e->getMessage());
        }
    }

    public function show($id = null)
    {
        try {
            $row = $this->getBaseQuery()
                ->where('pc.id', $id)
                ->get()
                ->getRowArray();

            if (!$row) {
                return $this->failNotFound('Permiso no encontrado.');
            }

            $row['id'] = (int)$row['id'];
            $row['tramiteId'] = $row['tramiteId'] ? (int)$row['tramiteId'] : null;
            $row['reciboIngresoMonto'] = $row['reciboIngresoMonto'] ? (float)$row['reciboIngresoMonto'] : null;

            return $this->respond(['data' => $row]);
        } catch (\Throwable $e) {
            return $this->failServerError('Error consultando detalle del permiso: ' . $e->getMessage());
        }
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $payload = $this->request->getJSON(true) ?? $this->request->getRawInput();

        $rules = [
            'tipoPermiso' => [
                'rules' => 'permit_empty|in_list[CARGA_DESCARGA,USO_VIAS]',
                'errors' => ['in_list' => 'Tipo de permiso no válido.']
            ]
        ];

        if (!$this->validateData($payload, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $tipoPermiso = !empty($payload['tipoPermiso']) ? trim($payload['tipoPermiso']) : 'CARGA_DESCARGA';
            $year = date('Y');

            // Generar correlativo si no viene especificado
            $numeroAutorizacion = !empty($payload['numeroAutorizacion']) ? trim($payload['numeroAutorizacion']) : '';
            if (empty($numeroAutorizacion)) {
                $count = $db->table('permisos_circulacion')->where('tipo_permiso', $tipoPermiso)->countAllResults() + 1;
                $prefix = $tipoPermiso === 'CARGA_DESCARGA' ? "AUT. CARGA N° " : ($tipoPermiso === 'USO_VIAS' ? "AUT. VIAS N° " : "RES-SUBTRANS-{$year}-");
                $numeroAutorizacion = $prefix . str_pad((string)$count, 3, '0', STR_PAD_LEFT) . "-{$year}-SGTTV";
            }

            $idTramite = !empty($payload['tramiteId']) ? (int)$payload['tramiteId'] : (!empty($payload['id_tramite']) ? (int)$payload['id_tramite'] : null);
            $refSisgedo = !empty($payload['referenciaSisgedo']) ? trim($payload['referenciaSisgedo']) : (!empty($payload['expediente']) ? trim($payload['expediente']) : null);
            $expediente = !empty($payload['expediente']) ? trim($payload['expediente']) : (!empty($payload['expedienteNumero']) ? trim($payload['expedienteNumero']) : null);
            $vehiculoPlaca = !empty($payload['vehiculoPlaca']) ? strtoupper(trim($payload['vehiculoPlaca'])) : null;
            $solicitanteNombre = !empty($payload['solicitanteNombre']) ? strtoupper(trim($payload['solicitanteNombre'])) : (!empty($payload['solicitante']) ? strtoupper(trim($payload['solicitante'])) : null);
            $solicitanteDocumento = !empty($payload['solicitanteDocumento']) ? trim($payload['solicitanteDocumento']) : (!empty($payload['solicitanteDoc']) ? trim($payload['solicitanteDoc']) : null);
            $reciboIngresoNumero = !empty($payload['reciboIngresoNumero']) ? trim($payload['reciboIngresoNumero']) : null;
            $reciboIngresoMonto = isset($payload['reciboIngresoMonto']) && $payload['reciboIngresoMonto'] !== '' ? (float)$payload['reciboIngresoMonto'] : null;
            $reciboIngresoFecha = !empty($payload['reciboIngresoFecha']) ? trim($payload['reciboIngresoFecha']) : date('Y-m-d');

            // Auto-heredar datos del trámite si se vinculó un trámite documentario y faltaban datos
            if ($idTramite) {
                $tramite = $db->table('tramites_documentarios td')
                    ->select("
                        td.numero_expediente,
                        v.placa as vehiculo_placa,
                        COALESCE(o.razon_social, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, '')))) as solicitante_nombre,
                        COALESCE(o.ruc, p.numero) as solicitante_documento,
                        pt.numero_recibo,
                        pt.total as recibo_total,
                        pt.fecha_pago
                    ")
                    ->join('asociaciones o', 'o.id = td.id_asociacion', 'left')
                    ->join('personas p', 'p.id = td.id_persona', 'left')
                    ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                    ->join('vehiculos v', 'v.id = td.id_vehiculo', 'left')
                    ->join('pagos_transito pt', 'pt.id_tramite = td.id', 'left')
                    ->where('td.id', $idTramite)
                    ->get()
                    ->getRowArray();

                if ($tramite) {
                    if (!$expediente && !empty($tramite['numero_expediente'])) {
                        $expediente = $tramite['numero_expediente'];
                    }
                    if (!$refSisgedo && !empty($tramite['numero_expediente'])) {
                        $refSisgedo = $tramite['numero_expediente'];
                    }
                    if (!$vehiculoPlaca && !empty($tramite['vehiculo_placa'])) {
                        $vehiculoPlaca = strtoupper($tramite['vehiculo_placa']);
                    }
                    if (!$solicitanteNombre && !empty($tramite['solicitante_nombre'])) {
                        $solicitanteNombre = strtoupper($tramite['solicitante_nombre']);
                    }
                    if (!$solicitanteDocumento && !empty($tramite['solicitante_documento'])) {
                        $solicitanteDocumento = $tramite['solicitante_documento'];
                    }
                    if (!$reciboIngresoNumero && !empty($tramite['numero_recibo'])) {
                        $reciboIngresoNumero = $tramite['numero_recibo'];
                    }
                    if ($reciboIngresoMonto === null && !empty($tramite['recibo_total'])) {
                        $reciboIngresoMonto = (float)$tramite['recibo_total'];
                    }
                    if (!empty($tramite['fecha_pago'])) {
                        $reciboIngresoFecha = $tramite['fecha_pago'];
                    }
                }
            }

            $data = [
                'id_tramite'             => $idTramite,
                'numero_autorizacion'    => $numeroAutorizacion,
                'vehiculo_placa'         => $vehiculoPlaca,
                'solicitante_nombre'     => $solicitanteNombre,
                'solicitante_documento'  => $solicitanteDocumento,
                'representante_legal'    => !empty($payload['representanteLegal']) ? strtoupper(trim($payload['representanteLegal'])) : null,
                'tipo_permiso'           => $tipoPermiso,
                'asunto'                 => !empty($payload['asunto']) ? trim($payload['asunto']) : ($tipoPermiso === 'CARGA_DESCARGA' ? 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA' : 'AUTORIZACION PROVISIONAL DE USO DE VIAS'),
                'referencia_sisgedo'     => $refSisgedo,
                'expediente'             => $expediente,
                'registro_numero'        => !empty($payload['registroNumero']) ? trim($payload['registroNumero']) : null,
                'contenido'              => !empty($payload['contenido']) ? trim($payload['contenido']) : 'Autorización oficial emitida por la Subgerencia de Tránsito y Transporte.',
                'zona_circulacion'       => !empty($payload['zonaCirculacion']) ? trim($payload['zonaCirculacion']) : 'Anillo Vial - Distrito de José Leonardo Ortiz',
                'recibo_ingreso_numero'  => $reciboIngresoNumero,
                'recibo_ingreso_monto'   => $reciboIngresoMonto,
                'recibo_ingreso_fecha'   => $reciboIngresoFecha,
                'ubicacion'              => !empty($payload['ubicacion']) ? trim($payload['ubicacion']) : null,
                'recorrido_ingreso'      => !empty($payload['recorridoIngreso']) ? trim($payload['recorridoIngreso']) : null,
                'recorrido_salida'       => !empty($payload['recorridoSalida']) ? trim($payload['recorridoSalida']) : null,
                'flota_placas'           => !empty($payload['flotaPlacas']) ? trim($payload['flotaPlacas']) : null,
                'tonelaje'               => !empty($payload['tonelaje']) ? trim($payload['tonelaje']) : null,
                'numero_seguridad'       => !empty($payload['numeroSeguridad']) ? trim($payload['numeroSeguridad']) : str_pad((string)mt_rand(10000, 99999), 5, '0', STR_PAD_LEFT),
                'observaciones'          => !empty($payload['observaciones']) ? trim($payload['observaciones']) : null,
                'horario_inicio'         => !empty($payload['horarioInicio']) ? trim($payload['horarioInicio']) : '16:00:00',
                'horario_fin'            => !empty($payload['horarioFin']) ? trim($payload['horarioFin']) : '05:00:00',
                'fecha_emision'          => !empty($payload['fechaEmision']) ? trim($payload['fechaEmision']) : date('Y-m-d'),
                'fecha_inicio_vigencia'  => !empty($payload['fechaInicioVigencia']) ? trim($payload['fechaInicioVigencia']) : date('Y-m-d'),
                'fecha_fin_vigencia'     => !empty($payload['fechaFinVigencia']) ? trim($payload['fechaFinVigencia']) : date('Y-m-d', strtotime('+1 year')),
                'estado'                 => !empty($payload['estado']) ? strtoupper(trim($payload['estado'])) : 'VIGENTE',
            ];

            $db->table('permisos_circulacion')->insert($data);
            $newId = (int)$db->insertID();

            return $this->respondCreated([
                'status'  => 201,
                'message' => 'Autorización municipal registrada exitosamente.',
                'id'      => $newId,
                'data'    => array_merge(['id' => $newId], $data)
            ]);
        } catch (\Throwable $e) {
            return $this->failServerError('Error registrando permiso: ' . $e->getMessage());
        }
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $payload = $this->request->getJSON(true) ?? $this->request->getRawInput();

        try {
            $exists = $db->table('permisos_circulacion')->where('id', $id)->countAllResults();
            if (!$exists) {
                return $this->failNotFound('Permiso no encontrado.');
            }

            $allowedFields = [
                'id_tramite'            => 'tramiteId',
                'numero_autorizacion'   => 'numeroAutorizacion',
                'vehiculo_placa'        => 'vehiculoPlaca',
                'solicitante_nombre'    => 'solicitanteNombre',
                'solicitante_documento' => 'solicitanteDocumento',
                'representante_legal'   => 'representanteLegal',
                'tipo_permiso'          => 'tipoPermiso',
                'asunto'                => 'asunto',
                'referencia_sisgedo'    => 'referenciaSisgedo',
                'expediente'            => 'expediente',
                'registro_numero'       => 'registroNumero',
                'contenido'             => 'contenido',
                'zona_circulacion'      => 'zonaCirculacion',
                'recibo_ingreso_numero' => 'reciboIngresoNumero',
                'recibo_ingreso_monto'  => 'reciboIngresoMonto',
                'recibo_ingreso_fecha'  => 'reciboIngresoFecha',
                'ubicacion'             => 'ubicacion',
                'recorrido_ingreso'     => 'recorridoIngreso',
                'recorrido_salida'      => 'recorridoSalida',
                'flota_placas'          => 'flotaPlacas',
                'tonelaje'              => 'tonelaje',
                'numero_seguridad'      => 'numeroSeguridad',
                'observaciones'         => 'observaciones',
                'horario_inicio'        => 'horarioInicio',
                'horario_fin'           => 'horarioFin',
                'fecha_emision'         => 'fechaEmision',
                'fecha_inicio_vigencia' => 'fechaInicioVigencia',
                'fecha_fin_vigencia'    => 'fechaFinVigencia',
                'estado'                => 'estado',
            ];

            $data = [];
            foreach ($allowedFields as $col => $jsonKey) {
                if (array_key_exists($jsonKey, $payload)) {
                    $val = $payload[$jsonKey];
                    if ($col === 'representante_legal' || $col === 'solicitante_nombre' || $col === 'vehiculo_placa' || $col === 'estado') {
                        $val = !empty($val) ? strtoupper(trim((string)$val)) : null;
                    } elseif ($col === 'id_tramite') {
                        $val = !empty($val) ? (int)$val : null;
                    } elseif ($col === 'recibo_ingreso_monto') {
                        $val = (isset($val) && $val !== '') ? (float)$val : null;
                    } else {
                        $val = !empty($val) ? trim((string)$val) : null;
                    }
                    $data[$col] = $val;
                }
            }

            if (!empty($data)) {
                $db->table('permisos_circulacion')->where('id', $id)->update($data);
            }

            return $this->respond([
                'status'  => 200,
                'message' => 'Autorización actualizada correctamente.'
            ]);
        } catch (\Throwable $e) {
            return $this->failServerError('Error actualizando permiso: ' . $e->getMessage());
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $exists = $db->table('permisos_circulacion')->where('id', $id)->countAllResults();
            if (!$exists) {
                return $this->failNotFound('Permiso no encontrado.');
            }

            $db->table('permisos_circulacion')->where('id', $id)->delete();
            return $this->respondDeleted([
                'status'  => 200,
                'message' => 'Autorización eliminada correctamente.'
            ]);
        } catch (\Throwable $e) {
            return $this->failServerError('Error eliminando permiso: ' . $e->getMessage());
        }
    }

    public function tramitesDisponibles()
    {
        $db = \Config\Database::connect();
        try {
            $rows = $db->table('tramites_documentarios td')
                ->select("
                    td.id,
                    td.numero_expediente as numeroExpediente,
                    td.fecha_solicitud as fechaSolicitud,
                    td.detalle_solicitud as detalleSolicitud,
                    td.estado,
                    td.id_persona as personaId,
                    td.id_asociacion as asociacionId,
                    td.id_vehiculo as vehiculoId,
                    td.id_procedimiento_admin as procedimientoAdminId,
                    pa.codigo as procedimientoCodigo,
                    pa.nombre as procedimientoNombre,
                    pa.costo as procedimientoCosto,
                    COALESCE(o.razon_social, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))), '') as solicitanteNombre,
                    COALESCE(o.ruc, p.numero, '') as solicitanteDocumento,
                    o.razon_social as asociacionNombre,
                    o.ruc as asociacionRuc,
                    TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))) as personaNombre,
                    p.numero as personaDocumento,
                    COALESCE(TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))), '') as representanteLegalNombre,
                    COALESCE(v.placa, '') as vehiculoPlaca,
                    COALESCE(pt.numero_recibo, '') as reciboIngresoNumero,
                    pt.total as reciboIngresoMonto,
                    pt.fecha_pago as reciboIngresoFecha
                ", false)
                ->join('procedimientos_administrativos pa', 'pa.id = td.id_procedimiento_admin', 'left')
                ->join('asociaciones o', 'o.id = td.id_asociacion', 'left')
                ->join('personas p', 'p.id = td.id_persona', 'left')
                ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                ->join('vehiculos v', 'v.id = td.id_vehiculo', 'left')
                ->join('pagos_transito pt', 'pt.id_tramite = td.id', 'left')
                ->orderBy('td.id', 'DESC')
                ->get()
                ->getResultArray();

            return $this->respond(['data' => $rows]);
        } catch (\Throwable $e) {
            return $this->failServerError('Error consultando trámites: ' . $e->getMessage());
        }
    }

    public function buscarAdministrados()
    {
        $db = \Config\Database::connect();
        $q = trim((string)($this->request->getGet('q') ?? ''));

        try {
            $results = [];

            // 1. Buscar en Asociaciones / Empresas
            $builderAsoc = $db->table('asociaciones o')
                ->select("
                    o.id as asociacionId,
                    'EMPRESA' as origenTipo,
                    o.razon_social as nombre,
                    COALESCE(o.ruc, '') as documento,
                    'RUC' as tipoDocumento,
                    COALESCE(o.direccion, '') as direccion,
                    COALESCE(o.telefono_contacto, '') as telefono
                ");

            if ($q !== '') {
                $builderAsoc->groupStart()
                    ->like('o.razon_social', $q)
                    ->orLike('o.ruc', $q)
                    ->groupEnd();
            }
            $asocs = $builderAsoc->limit(10)->get()->getResultArray();
            foreach ($asocs as $a) {
                $results[] = [
                    'tipo'               => 'EMPRESA',
                    'nombre'             => $a['nombre'],
                    'documento'          => $a['documento'],
                    'tipoDocumento'      => 'RUC',
                    'representanteLegal' => '',
                    'direccion'          => $a['direccion'],
                    'telefono'           => $a['telefono'],
                    'placa'              => '',
                    'expediente'         => '',
                    'reciboNumero'       => '',
                    'reciboMonto'        => null,
                    'reciboFecha'        => '',
                    'tramiteId'          => null,
                ];
            }

            // 2. Buscar en Personas / Ciudadanos
            $builderPers = $db->table('personas p')
                ->select("
                    p.id as personaId,
                    'PERSONA' as origenTipo,
                    TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))) as nombre,
                    COALESCE(p.numero, '') as documento,
                    COALESCE(td.codigo, 'DNI') as tipoDocumento,
                    COALESCE(p.direccion, '') as direccion,
                    COALESCE(p.telefono, p.celular, '') as telefono
                ")
                ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                ->join('tipo_documentos_identidad td', 'td.id = p.id_tipo_documento', 'left');

            if ($q !== '') {
                $builderPers->groupStart()
                    ->like('p.numero', $q)
                    ->orLike('c.nombres', $q)
                    ->orLike('c.apellido_paterno', $q)
                    ->orLike('c.apellido_materno', $q)
                    ->groupEnd();
            }
            $pers = $builderPers->limit(10)->get()->getResultArray();
            foreach ($pers as $p) {
                if (empty($p['nombre']) && empty($p['documento'])) continue;
                $results[] = [
                    'tipo'               => 'PERSONA',
                    'nombre'             => $p['nombre'],
                    'documento'          => $p['documento'],
                    'tipoDocumento'      => $p['tipoDocumento'],
                    'representanteLegal' => '',
                    'direccion'          => $p['direccion'],
                    'telefono'           => $p['telefono'],
                    'placa'              => '',
                    'expediente'         => '',
                    'reciboNumero'       => '',
                    'reciboMonto'        => null,
                    'reciboFecha'        => '',
                    'tramiteId'          => null,
                ];
            }

            // 3. Buscar en Trámites Documentarios (para auto-rellenar expediente, placa, recibo y solicitante)
            $builderTram = $db->table('tramites_documentarios td')
                ->select("
                    td.id as tramiteId,
                    td.numero_expediente as expediente,
                    COALESCE(v.placa, '') as placa,
                    COALESCE(o.razon_social, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))), '') as nombre,
                    COALESCE(o.ruc, p.numero, '') as documento,
                    CASE WHEN o.id IS NOT NULL THEN 'RUC' ELSE 'DNI' END as tipoDocumento,
                    CASE WHEN o.id IS NOT NULL AND td.id_persona IS NOT NULL THEN TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))) ELSE '' END as representanteLegal,
                    COALESCE(pt.numero_recibo, '') as reciboNumero,
                    pt.total as reciboMonto,
                    pt.fecha_pago as reciboFecha
                ")
                ->join('asociaciones o', 'o.id = td.id_asociacion', 'left')
                ->join('personas p', 'p.id = td.id_persona', 'left')
                ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                ->join('vehiculos v', 'v.id = td.id_vehiculo', 'left')
                ->join('pagos_transito pt', 'pt.id_tramite = td.id', 'left');

            if ($q !== '') {
                $builderTram->groupStart()
                    ->like('td.numero_expediente', $q)
                    ->orLike('v.placa', $q)
                    ->orLike('o.razon_social', $q)
                    ->orLike('o.ruc', $q)
                    ->orLike('p.numero', $q)
                    ->orLike('c.nombres', $q)
                    ->orLike('c.apellido_paterno', $q)
                    ->orLike('pt.numero_recibo', $q)
                    ->groupEnd();
            }
            $trams = $builderTram->limit(10)->get()->getResultArray();
            foreach ($trams as $t) {
                if (empty($t['nombre']) && empty($t['documento']) && empty($t['expediente'])) continue;
                $results[] = [
                    'tipo'               => 'TRAMITE',
                    'nombre'             => $t['nombre'],
                    'documento'          => $t['documento'],
                    'tipoDocumento'      => $t['tipoDocumento'],
                    'representanteLegal' => $t['representanteLegal'] ?? '',
                    'direccion'          => '',
                    'telefono'           => '',
                    'placa'              => $t['placa'],
                    'expediente'         => $t['expediente'],
                    'reciboNumero'       => $t['reciboNumero'],
                    'reciboMonto'        => $t['reciboMonto'] ? (float)$t['reciboMonto'] : null,
                    'reciboFecha'        => $t['reciboFecha'],
                    'tramiteId'          => (int)$t['tramiteId'],
                ];
            }

            // Deduplicar resultados por documento + nombre + expediente
            $unique = [];
            $seen = [];
            foreach ($results as $item) {
                $key = ($item['documento'] ?: '') . '|' . ($item['nombre'] ?: '') . '|' . ($item['expediente'] ?: '');
                if (!isset($seen[$key])) {
                    $seen[$key] = true;
                    $unique[] = $item;
                }
            }

            return $this->respond(['data' => array_slice($unique, 0, 15)]);
        } catch (\Throwable $e) {
            return $this->failServerError('Error buscando administrados: ' . $e->getMessage());
        }
    }

    public function procedimientos()
    {
        $db = \Config\Database::connect();
        try {
            $rows = $db->table('procedimientos_administrativos')
                ->select('id, codigo, nombre, descripcion, costo, estado')
                ->where('estado', 'ACTIVO')
                ->orderBy('id', 'ASC')
                ->get()
                ->getResultArray();
            return $this->respond(['data' => $rows]);
        } catch (\Throwable $e) {
            return $this->failServerError('Error consultando procedimientos: ' . $e->getMessage());
        }
    }
}
