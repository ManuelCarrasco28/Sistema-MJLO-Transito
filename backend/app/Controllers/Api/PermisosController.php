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
                pc.id_persona as personaId,
                pc.id_asociacion as asociacionId,
                pc.id_vehiculo as vehiculoId,
                pc.numero_autorizacion as numeroAutorizacion,
                pc.tipo_permiso as tipoPermiso,
                pc.asunto,
                pc.referencia_sisgedo as referenciaSisgedo,
                pc.registro_numero as registroNumero,
                pc.contenido,
                pc.zona_circulacion as zonaCirculacion,
                pc.ubicacion,
                pc.recorrido_ingreso as recorridoIngreso,
                pc.recorrido_salida as recorridoSalida,
                pc.flota_placas as flotaPlacas,
                pc.tonelaje,
                pc.numero_seguridad as numeroSeguridad,
                pc.observaciones,
                pc.horario_inicio as horarioInicio,
                pc.horario_fin as horarioFin,
                pc.fecha_emision as fechaEmision,
                pc.fecha_inicio_vigencia as fechaInicioVigencia,
                pc.fecha_fin_vigencia as fechaFinVigencia,
                pc.representante_legal as representanteLegal,
                pc.estado,
                
                -- Datos relacionados derivados de tramites, vehiculos, personas, asociaciones y pagos
                COALESCE(td.numero_expediente, '') as expediente,
                COALESCE(td.numero_expediente, '') as expedienteNumero,
                td.fecha_solicitud as fechaSolicitud,
                pa.nombre as procedimientoNombre,
                pa.codigo as procedimientoCodigo,
                COALESCE(v.placa, '') as vehiculoPlaca,
                COALESCE(o.razon_social, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))), '') as solicitanteNombre,
                COALESCE(o.razon_social, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))), '') as solicitante,
                COALESCE(o.ruc, p.numero, '') as solicitanteDocumento,
                COALESCE(o.ruc, p.numero, '') as solicitanteDoc,
                o.ruc as solicitanteRuc,
                p.numero as solicitanteDni,
                COALESCE(pt.numero_recibo, '') as reciboIngresoNumero,
                pt.total as reciboIngresoMonto,
                pt.fecha_pago as reciboIngresoFecha
            ", false)
            ->join('tramites_documentarios td', 'td.id = pc.id_tramite', 'left')
            ->join('procedimientos_administrativos pa', 'pa.id = td.id_procedimiento_admin', 'left')
            ->join('asociaciones o', 'o.id = COALESCE(pc.id_asociacion, td.id_asociacion)', 'left')
            ->join('personas p', 'p.id = COALESCE(pc.id_persona, td.id_persona)', 'left')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->join('vehiculos v', 'v.id = COALESCE(pc.id_vehiculo, td.id_vehiculo)', 'left')
            ->join('pagos_transito pt', 'pt.id_tramite = td.id', 'left');
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
                $r['personaId'] = $r['personaId'] ? (int)$r['personaId'] : null;
                $r['asociacionId'] = $r['asociacionId'] ? (int)$r['asociacionId'] : null;
                $r['vehiculoId'] = $r['vehiculoId'] ? (int)$r['vehiculoId'] : null;
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
            $row['personaId'] = $row['personaId'] ? (int)$row['personaId'] : null;
            $row['asociacionId'] = $row['asociacionId'] ? (int)$row['asociacionId'] : null;
            $row['vehiculoId'] = $row['vehiculoId'] ? (int)$row['vehiculoId'] : null;
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

        try {
            $tipoPermiso = !empty($payload['tipoPermiso']) ? trim($payload['tipoPermiso']) : 'CARGA_DESCARGA';
            $numeroAutorizacion = !empty($payload['numeroAutorizacion'])
                ? trim($payload['numeroAutorizacion'])
                : 'AUT-' . date('Y') . '-' . str_pad((string)mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);

            $idTramite = !empty($payload['tramiteId']) ? (int)$payload['tramiteId'] : (!empty($payload['id_tramite']) ? (int)$payload['id_tramite'] : null);
            $idPersona = !empty($payload['personaId']) ? (int)$payload['personaId'] : (!empty($payload['id_persona']) ? (int)$payload['id_persona'] : null);
            $idAsoc    = !empty($payload['asociacionId']) ? (int)$payload['asociacionId'] : (!empty($payload['id_asociacion']) ? (int)$payload['id_asociacion'] : null);
            $idVehiculo = !empty($payload['vehiculoId']) ? (int)$payload['vehiculoId'] : (!empty($payload['id_vehiculo']) ? (int)$payload['id_vehiculo'] : null);
            $refSisgedo = !empty($payload['referenciaSisgedo']) ? trim($payload['referenciaSisgedo']) : (!empty($payload['expediente']) ? trim($payload['expediente']) : null);

            // Auto-heredar claves foráneas del trámite si se vinculó un expediente
            if ($idTramite) {
                $tramite = $db->table('tramites_documentarios')->where('id', $idTramite)->get()->getRowArray();
                if ($tramite) {
                    if (!$idPersona && !empty($tramite['id_persona'])) {
                        $idPersona = (int)$tramite['id_persona'];
                    }
                    if (!$idAsoc && !empty($tramite['id_asociacion'])) {
                        $idAsoc = (int)$tramite['id_asociacion'];
                    }
                    if (!$idVehiculo && !empty($tramite['id_vehiculo'])) {
                        $idVehiculo = (int)$tramite['id_vehiculo'];
                    }
                    if (!$refSisgedo && !empty($tramite['numero_expediente'])) {
                        $refSisgedo = $tramite['numero_expediente'];
                    }
                }
            }

            // Auto-detectar vehículo por placa si no se especificó idVehiculo
            if (!$idVehiculo && !empty($payload['vehiculoPlaca'])) {
                $veh = $db->table('vehiculos')->where('placa', strtoupper(trim((string)$payload['vehiculoPlaca'])))->get()->getRowArray();
                if ($veh) {
                    $idVehiculo = (int)$veh['id'];
                }
            }

            // Auto-detectar persona o asociación por documento si faltan
            if (!$idPersona && !$idAsoc && !empty($payload['solicitanteDocumento'])) {
                $doc = trim((string)$payload['solicitanteDocumento']);
                $persona = $db->table('personas')->where('numero', $doc)->get()->getRowArray();
                if ($persona) {
                    $idPersona = (int)$persona['id'];
                } else {
                    $asoc = $db->table('asociaciones')->where('ruc', $doc)->get()->getRowArray();
                    if ($asoc) {
                        $idAsoc = (int)$asoc['id'];
                    }
                }
            }

            $data = [
                'id_tramite'             => $idTramite,
                'id_persona'             => $idPersona,
                'id_asociacion'          => $idAsoc,
                'id_vehiculo'            => $idVehiculo,
                'numero_autorizacion'    => $numeroAutorizacion,
                'representante_legal'    => !empty($payload['representanteLegal']) ? strtoupper(trim($payload['representanteLegal'])) : null,
                'tipo_permiso'           => $tipoPermiso,
                'asunto'                 => !empty($payload['asunto']) ? trim($payload['asunto']) : ($tipoPermiso === 'CARGA_DESCARGA' ? 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA' : 'AUTORIZACION PROVISIONAL DE USO DE VIAS'),
                'referencia_sisgedo'     => $refSisgedo,
                'registro_numero'        => !empty($payload['registroNumero']) ? trim($payload['registroNumero']) : null,
                'contenido'              => !empty($payload['contenido']) ? trim($payload['contenido']) : 'Autorización oficial emitida por la Subgerencia de Tránsito y Transporte.',
                'zona_circulacion'       => !empty($payload['zonaCirculacion']) ? trim($payload['zonaCirculacion']) : 'Anillo Vial - Distrito de José Leonardo Ortiz',
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

            $data = [];
            $allowedFields = [
                'id_tramite'            => 'tramiteId',
                'id_persona'            => 'personaId',
                'id_asociacion'         => 'asociacionId',
                'id_vehiculo'           => 'vehiculoId',
                'numero_autorizacion'   => 'numeroAutorizacion',
                'representante_legal'   => 'representanteLegal',
                'tipo_permiso'          => 'tipoPermiso',
                'asunto'                => 'asunto',
                'referencia_sisgedo'    => 'referenciaSisgedo',
                'registro_numero'       => 'registroNumero',
                'contenido'             => 'contenido',
                'zona_circulacion'      => 'zonaCirculacion',
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

            foreach ($allowedFields as $col => $jsonKey) {
                if (array_key_exists($jsonKey, $payload)) {
                    $val = $payload[$jsonKey];
                    if ($col === 'representante_legal') {
                        $val = !empty($val) ? strtoupper(trim((string)$val)) : null;
                    } elseif (in_array($col, ['id_tramite', 'id_persona', 'id_asociacion', 'id_vehiculo'], true)) {
                        $val = !empty($val) ? (int)$val : null;
                    }
                    $data[$col] = $val;
                }
            }

            if (!empty($data['id_tramite'])) {
                $tramite = $db->table('tramites_documentarios')->where('id', $data['id_tramite'])->get()->getRowArray();
                if ($tramite) {
                    if (empty($data['id_persona']) && !empty($tramite['id_persona'])) {
                        $data['id_persona'] = (int)$tramite['id_persona'];
                    }
                    if (empty($data['id_asociacion']) && !empty($tramite['id_asociacion'])) {
                        $data['id_asociacion'] = (int)$tramite['id_asociacion'];
                    }
                    if (empty($data['id_vehiculo']) && !empty($tramite['id_vehiculo'])) {
                        $data['id_vehiculo'] = (int)$tramite['id_vehiculo'];
                    }
                }
            }

            if (empty($data['id_vehiculo']) && !empty($payload['vehiculoPlaca'])) {
                $veh = $db->table('vehiculos')->where('placa', strtoupper(trim((string)$payload['vehiculoPlaca'])))->get()->getRowArray();
                if ($veh) {
                    $data['id_vehiculo'] = (int)$veh['id'];
                }
            }

            if (empty($data['id_persona']) && empty($data['id_asociacion']) && !empty($payload['solicitanteDocumento'])) {
                $doc = trim((string)$payload['solicitanteDocumento']);
                $persona = $db->table('personas')->where('numero', $doc)->get()->getRowArray();
                if ($persona) {
                    $data['id_persona'] = (int)$persona['id'];
                } else {
                    $asoc = $db->table('asociaciones')->where('ruc', $doc)->get()->getRowArray();
                    if ($asoc) {
                        $data['id_asociacion'] = (int)$asoc['id'];
                    }
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
                    COALESCE(TRIM(CONCAT(c_rep.nombres, ' ', c_rep.apellido_paterno, ' ', COALESCE(c_rep.apellido_materno, ''))), '') as representanteLegalNombre,
                    COALESCE(v.placa, '') as vehiculoPlaca,
                    COALESCE(pt.numero_recibo, '') as reciboIngresoNumero,
                    pt.total as reciboIngresoMonto,
                    pt.fecha_pago as reciboIngresoFecha
                ", false)
                ->join('procedimientos_administrativos pa', 'pa.id = td.id_procedimiento_admin', 'left')
                ->join('asociaciones o', 'o.id = td.id_asociacion', 'left')
                ->join('personas p_rep', 'p_rep.id = o.id_representante_legal', 'left')
                ->join('ciudadanos c_rep', 'c_rep.id_persona = p_rep.id', 'left')
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
