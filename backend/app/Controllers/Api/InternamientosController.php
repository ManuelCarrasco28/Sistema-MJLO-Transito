<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class InternamientosController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();

        try {
            $rows = $db->table('ordenes_internamiento oi')
                ->select("
                    oi.id,
                    oi.id_papeleta as papeletaId,
                    oi.id_vehiculo as vehiculoId,
                    v.placa as vehiculoPlaca,
                    COALESCE(v.marca, '') as vehiculoMarca,
                    COALESCE(v.modelo, '') as vehiculoModelo,
                    COALESCE(v.color, '') as vehiculoColor,
                    CASE WHEN v.id_asociacion IS NOT NULL THEN 'FORMAL' ELSE 'INFORMAL' END as vehiculoFormalidad,
                    COALESCE(aso.razon_social, 'Sin Asociación (Informal)') as vehiculoAsociacion,
                    p.numero_papeleta as numeroPapeleta,
                    p.monto_total as montoPapeleta,
                    oi.fecha_ingreso as fechaIngreso,
                    oi.fecha_salida as fechaSalida,
                    oi.deposito,
                    oi.motivo,
                    oi.numero_boleta as numeroBoleta,
                    oi.total_dias as totalDias,
                    oi.estado,
                    oi.observaciones,
                    oi.grado_remisor as gradoRemisor,
                    oi.carnet_remisor as carnetRemisor,
                    oi.autoridad_que_dispone as autoridadQueDispone,
                    oi.documento_referencia as documentoReferencia,
                    oi.estado_carroceria as estadoCarroceria,
                    COALESCE(CONCAT(rem_c.nombres, ' ', rem_c.apellido_paterno, ' ', COALESCE(rem_c.apellido_materno, '')), 'Inspector Remisor') as remisorNombre,
                    COALESCE(CONCAT(inte_c.nombres, ' ', inte_c.apellido_paterno, ' ', COALESCE(inte_c.apellido_materno, '')), 'Conductor / Interesado') as interesadoNombre,
                    COALESCE(inte.numero, 'S/D') as interesadoDni,
                    ol.id as ordenLibertadId,
                    ol.numero_orden as numeroOrdenLibertad,
                    ol.fecha_emision as fechaLiberacion,
                    ol.monto_total as montoTotalLiberacion
                ", false)
                ->join('vehiculos v', 'v.id = oi.id_vehiculo', 'left')
                ->join('asociaciones aso', 'aso.id = v.id_asociacion', 'left')
                ->join('papeletas p', 'p.id = oi.id_papeleta', 'left')
                ->join('personas rem', 'rem.id = oi.id_remisor', 'left')
                ->join('ciudadanos rem_c', 'rem_c.id_persona = rem.id', 'left')
                ->join('personas inte', 'inte.id = oi.id_interesado', 'left')
                ->join('ciudadanos inte_c', 'inte_c.id_persona = inte.id', 'left')
                ->join('ordenes_libertad ol', 'ol.id_internamiento = oi.id', 'left')
                ->orderBy('oi.id', 'DESC')
                ->get()
                ->getResultArray();

            $internamientoIds = array_map(static fn (array $r): int => (int)$r['id'], $rows);
            $inventariosPorOrden = [];

            if (!empty($internamientoIds)) {
                $invRows = $db->table('orden_internamiento_inventario oii')
                    ->select("
                        oii.id_orden_internamiento as ordenId,
                        oii.id_criterio as criterioId,
                        ic.codigo,
                        ic.nombre,
                        ic.seccion,
                        oii.cantidad,
                        oii.estado,
                        oii.observacion
                    ", false)
                    ->join('inventario_criterios ic', 'ic.id = oii.id_criterio', 'inner')
                    ->whereIn('oii.id_orden_internamiento', $internamientoIds)
                    ->orderBy('ic.orden', 'ASC')
                    ->get()
                    ->getResultArray();

                foreach ($invRows as $inv) {
                    $ordenId = (int)$inv['ordenId'];
                    unset($inv['ordenId']);
                    $inventariosPorOrden[$ordenId][] = $inv;
                }
            }

            $data = array_map(static function (array $r) use ($inventariosPorOrden): array {
                $r['id'] = (int)$r['id'];
                $r['papeletaId'] = $r['papeletaId'] ? (int)$r['papeletaId'] : null;
                $r['vehiculoId'] = (int)$r['vehiculoId'];
                $r['montoPapeleta'] = (float)($r['montoPapeleta'] ?? 0);
                $r['totalDias'] = (int)($r['totalDias'] ?? 0);
                $r['montoTotalLiberacion'] = $r['montoTotalLiberacion'] ? (float)$r['montoTotalLiberacion'] : null;
                $r['inventario'] = $inventariosPorOrden[$r['id']] ?? [];
                return $r;
            }, $rows);

            return $this->respond(['data' => $data]);
        } catch (\Throwable $e) {
            return $this->failServerError('Error consultando internamientos: ' . $e->getMessage());
        }
    }

    public function criterios()
    {
        $db = \Config\Database::connect();
        try {
            $rows = $db->table('inventario_criterios')
                ->select('id, codigo, nombre, seccion, orden')
                ->orderBy('orden', 'ASC')
                ->get()
                ->getResultArray();
            return $this->respond(['data' => $rows]);
        } catch (\Throwable $e) {
            return $this->failServerError('Error consultando criterios: ' . $e->getMessage());
        }
    }
}
