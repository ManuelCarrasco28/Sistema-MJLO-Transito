<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PermisosController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();

        try {
            $rows = $db->table('permisos_circulacion pc')
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
                    td.numero_expediente as expedienteNumero,
                    td.fecha_solicitud as fechaSolicitud,
                    pa.nombre as procedimientoNombre,
                    pa.codigo as procedimientoCodigo,
                    COALESCE(NULLIF(pc.solicitante_nombre, ''), o.razon_social, CONCAT(c.nombres, ' ', c.apellido_paterno)) as solicitante,
                    COALESCE(NULLIF(pc.solicitante_documento, ''), o.ruc, p.numero) as solicitanteDoc,
                    o.ruc as solicitanteRuc,
                    p.numero as solicitanteDni
                ", false)
                ->join('tramites_documentarios td', 'td.id = pc.id_tramite', 'left')
                ->join('procedimientos_administrativos pa', 'pa.id = td.id_procedimiento_admin', 'left')
                ->join('asociaciones o', 'o.id = td.id_asociacion', 'left')
                ->join('personas p', 'p.id = td.id_persona', 'left')
                ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
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
        $db = \Config\Database::connect();
        try {
            $row = $db->table('permisos_circulacion pc')
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
                    COALESCE(NULLIF(pc.solicitante_nombre, ''), '—') as solicitante
                ", false)
                ->where('pc.id', $id)
                ->get()
                ->getRowArray();

            if (!$row) {
                return $this->failNotFound('Permiso no encontrado.');
            }

            $row['id'] = (int)$row['id'];
            $row['reciboIngresoMonto'] = $row['reciboIngresoMonto'] ? (float)$row['reciboIngresoMonto'] : null;

            return $this->respond(['data' => $row]);
        } catch (\Throwable $e) {
            return $this->failServerError('Error al obtener permiso: ' . $e->getMessage());
        }
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $payload = $this->request->getJSON(true) ?? $this->request->getPost();

        try {
            $tipoPermiso = trim($payload['tipoPermiso'] ?? 'CARGA_DESCARGA');
            $year = date('Y');

            // Generar correlativo si no viene especificado
            $numeroAutorizacion = trim($payload['numeroAutorizacion'] ?? '');
            if (empty($numeroAutorizacion)) {
                $count = $db->table('permisos_circulacion')->where('tipo_permiso', $tipoPermiso)->countAllResults() + 1;
                $prefix = $tipoPermiso === 'CARGA_DESCARGA' ? "AUT. CARGA N° " : ($tipoPermiso === 'USO_VIAS' ? "AUT. VIAS N° " : "RES-SUBTRANS-{$year}-");
                $numeroAutorizacion = $prefix . str_pad((string)$count, 3, '0', STR_PAD_LEFT) . "-{$year}-SGTTV";
            }

            $data = [
                'id_tramite'             => !empty($payload['tramiteId']) ? (int)$payload['tramiteId'] : null,
                'numero_autorizacion'    => $numeroAutorizacion,
                'vehiculo_placa'         => !empty($payload['vehiculoPlaca']) ? strtoupper(trim($payload['vehiculoPlaca'])) : null,
                'solicitante_nombre'     => !empty($payload['solicitanteNombre']) ? strtoupper(trim($payload['solicitanteNombre'])) : null,
                'solicitante_documento'  => !empty($payload['solicitanteDocumento']) ? trim($payload['solicitanteDocumento']) : null,
                'representante_legal'    => !empty($payload['representanteLegal']) ? strtoupper(trim($payload['representanteLegal'])) : null,
                'tipo_permiso'           => $tipoPermiso,
                'asunto'                 => !empty($payload['asunto']) ? trim($payload['asunto']) : ($tipoPermiso === 'CARGA_DESCARGA' ? 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA' : 'AUTORIZACION PROVISIONAL DE USO DE VIAS'),
                'referencia_sisgedo'     => !empty($payload['referenciaSisgedo']) ? trim($payload['referenciaSisgedo']) : null,
                'expediente'             => !empty($payload['expediente']) ? trim($payload['expediente']) : null,
                'registro_numero'        => !empty($payload['registroNumero']) ? trim($payload['registroNumero']) : null,
                'contenido'              => !empty($payload['contenido']) ? trim($payload['contenido']) : 'Autorización oficial emitida por la Subgerencia de Tránsito y Transporte.',
                'zona_circulacion'       => !empty($payload['zonaCirculacion']) ? trim($payload['zonaCirculacion']) : 'Anillo Vial - Distrito de José Leonardo Ortiz',
                'ubicacion'              => !empty($payload['ubicacion']) ? trim($payload['ubicacion']) : null,
                'recorrido_ingreso'      => !empty($payload['recorridoIngreso']) ? trim($payload['recorridoIngreso']) : null,
                'recorrido_salida'       => !empty($payload['recorridoSalida']) ? trim($payload['recorridoSalida']) : null,
                'flota_placas'           => !empty($payload['flotaPlacas']) ? trim($payload['flotaPlacas']) : null,
                'recibo_ingreso_numero'  => !empty($payload['reciboIngresoNumero']) ? trim($payload['reciboIngresoNumero']) : null,
                'recibo_ingreso_monto'   => isset($payload['reciboIngresoMonto']) && $payload['reciboIngresoMonto'] !== '' ? (float)$payload['reciboIngresoMonto'] : null,
                'recibo_ingreso_fecha'   => !empty($payload['reciboIngresoFecha']) ? trim($payload['reciboIngresoFecha']) : date('Y-m-d'),
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
                'ubicacion'             => 'ubicacion',
                'recorrido_ingreso'     => 'recorridoIngreso',
                'recorrido_salida'      => 'recorridoSalida',
                'flota_placas'          => 'flotaPlacas',
                'recibo_ingreso_numero' => 'reciboIngresoNumero',
                'recibo_ingreso_monto'  => 'reciboIngresoMonto',
                'recibo_ingreso_fecha'  => 'reciboIngresoFecha',
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
                    if ($col === 'vehiculo_placa' || $col === 'solicitante_nombre' || $col === 'representante_legal') {
                        $val = !empty($val) ? strtoupper(trim((string)$val)) : null;
                    } elseif ($col === 'recibo_ingreso_monto') {
                        $val = $val !== '' && $val !== null ? (float)$val : null;
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

