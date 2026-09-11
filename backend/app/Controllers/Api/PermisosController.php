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
                    pc.tipo_permiso as tipoPermiso,
                    pc.asunto,
                    pc.referencia_sisgedo as referenciaSisgedo,
                    pc.expediente,
                    pc.registro_numero as registroNumero,
                    pc.contenido,
                    pc.zona_circulacion as zonaCirculacion,
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
                    COALESCE(o.razon_social, CONCAT(c.nombres, ' ', c.apellido_paterno)) as solicitante,
                    o.ruc as solicitanteRuc,
                    p.numero as solicitanteDni
                ", false)
                ->join('tramites_documentarios td', 'td.id = pc.id_tramite', 'left')
                ->join('procedimientos_administrativos pa', 'pa.id = td.id_procedimiento_admin', 'left')
                ->join('organizaciones o', 'o.id = td.id_organizacion', 'left')
                ->join('personas p', 'p.id = td.id_persona', 'left')
                ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                ->orderBy('pc.id', 'DESC')
                ->get()
                ->getResultArray();

            $data = array_map(static function (array $r): array {
                $r['id'] = (int)$r['id'];
                $r['tramiteId'] = (int)$r['tramiteId'];
                return $r;
            }, $rows);

            return $this->respond(['data' => $data]);
        } catch (\Throwable $e) {
            return $this->failServerError('Error consultando permisos: ' . $e->getMessage());
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
