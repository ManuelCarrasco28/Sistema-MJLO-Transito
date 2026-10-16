<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;

class NotificacionesController extends BaseController
{
    use ResponseTrait;

    public function resumen()
    {
        $db = \Config\Database::connect();
        $notificaciones = [];
        $movilAplicaPapeleta = \App\Libraries\Acceso::movilPuedeAplicarPapeletas();

// 1. Permisos próximos a vencer (en los próximos 30 días)
        $permisos = $db->table('permisos_circulacion')
            ->select('id, numero_autorizacion, fecha_fin_vigencia, tipo_permiso')
            ->where('estado', 'VIGENTE')
            ->where('fecha_fin_vigencia IS NOT NULL')
            ->where('fecha_fin_vigencia >=', date('Y-m-d'))
            ->where('fecha_fin_vigencia <=', date('Y-m-d', strtotime('+30 days')))
            ->orderBy('fecha_fin_vigencia', 'ASC')
            ->get()->getResult();

        foreach ($permisos as $p) {
            $dias = (new \DateTime('today'))->diff(new \DateTime($p->fecha_fin_vigencia))->days;
            $cuando = $dias === 0 ? 'vence hoy' : ($dias === 1 ? 'vence mañana' : "vence en {$dias} días");
            $tipo = [
                'CIRCULACION' => 'Circulación', 'CARGA_DESCARGA' => 'Carga y descarga', 'USO_VIAS' => 'Uso de vías',
                'ZONA_RESERVADA' => 'Zona reservada', 'ZONAS_RESERVADAS' => 'Zonas reservadas',
            ][strtoupper((string) $p->tipo_permiso)] ?? ucfirst(strtolower(str_replace('_', ' ', (string) $p->tipo_permiso)));
            $notificaciones[] = [
                'id' => 'permiso_' . $p->id,
                'categoria' => 'permisos',
                'title' => $p->numero_autorizacion,
                'description' => "{$tipo} · {$cuando}",
                'time' => date('d/m', strtotime($p->fecha_fin_vigencia)),
                'icon' => 'document',
                'tone' => $dias <= 7 ? 'rose' : 'amber',
                'unread' => true,
                'link' => '/permisos?search=' . urlencode($p->numero_autorizacion)
            ];
        }

        $internamientos = $db->table('ordenes_internamiento')
            ->select('ordenes_internamiento.id, ordenes_internamiento.fecha_ingreso, vehiculos.placa')
            ->join('vehiculos', 'vehiculos.id = ordenes_internamiento.id_vehiculo')
            ->where('ordenes_internamiento.estado', 'RETENIDO')
            ->where('ordenes_internamiento.fecha_ingreso >=', date('Y-m-d H:i:s', strtotime('-3 days')))
            ->orderBy('ordenes_internamiento.fecha_ingreso', 'DESC')
            ->get()->getResult();

        foreach ($internamientos as $i) {
            $notificaciones[] = [
                'id' => 'internamiento_' . $i->id,
                'categoria' => 'internamientos',
                'title' => $i->placa,
                'description' => 'Ingresó al depósito',
                'time' => date('d/m H:i', strtotime($i->fecha_ingreso)),
                'icon' => 'vehicle',
                'tone' => 'blue',
                'unread' => true,
                'link' => '/internamientos?search=' . urlencode($i->placa)
            ];
        }

        $papeletas = $db->table('papeletas p')
            ->select("p.id, p.numero_papeleta, p.fecha_hora, TRIM(CONCAT(COALESCE(ci.nombres, ''), ' ', COALESCE(ci.apellido_paterno, ''))) AS inspector", false)
            ->join('ciudadanos ci', 'ci.id_persona = p.id_inspector', 'left')
            ->where('p.estado', 'PENDIENTE_PAGO')
            ->where('p.fecha_hora >=', date('Y-m-d H:i:s', strtotime('-1 days')))
            ->orderBy('p.fecha_hora', 'DESC')
            ->get()->getResult();

        foreach ($papeletas as $p) {
            $notificaciones[] = [
                'id' => 'papeleta_' . $p->id,
                'categoria' => 'papeletas',
                'title' => $p->numero_papeleta,
                'description' => ($movilAplicaPapeleta && trim((string) $p->inspector) !== '')
                    ? 'Registrada por ' . trim($p->inspector)
                    : 'Papeleta pendiente de pago',
                'time' => date('d/m H:i', strtotime($p->fecha_hora)),
                'icon' => 'ticket',
                'tone' => 'emerald',
                'unread' => true,
                'link' => '/papeletas?search=' . urlencode($p->numero_papeleta)
            ];
        }

        if (!$movilAplicaPapeleta && $db->tableExists('reportes_intervencion')) {
            $pendientes = (int) $db->table('reportes_intervencion')->where('estado', 'PENDIENTE')->countAllResults();
            if ($pendientes > 0) {
                $notificaciones[] = [
                    'id' => 'reportes_resumen_' . $pendientes,
                    'categoria' => 'reportes',
                    'title' => 'Reportes de evidencia',
                    'description' => $pendientes === 1 ? '1 pendiente de revisar' : "{$pendientes} pendientes de revisar",
                    'time' => 'Hoy',
                    'icon' => 'document',
                    'tone' => 'amber',
                    'unread' => true,
                    'link' => '/papeletas?vista=reportes',
                ];
                $recientes = $db->table('reportes_intervencion r')
                    ->select("r.id, COALESCE(v.placa, r.placa, 'SIN PLACA') AS placa, r.fecha_hora, TRIM(CONCAT(COALESCE(ci.nombres, ''), ' ', COALESCE(ci.apellido_paterno, ''))) AS inspector", false)
                    ->join('vehiculos v', 'v.id = r.id_vehiculo', 'left')
                    ->join('ciudadanos ci', 'ci.id_persona = r.id_inspector', 'left')
                    ->where('r.estado', 'PENDIENTE')
                    ->orderBy('r.id', 'DESC')->limit(8)
                    ->get()->getResult();
                foreach ($recientes as $r) {
                    $notificaciones[] = [
                        'id' => 'reporte_' . $r->id,
                        'categoria' => 'reportes',
                        'title' => $r->placa,
                        'description' => trim((string) $r->inspector) !== '' ? 'Evidencia de ' . trim($r->inspector) : 'Evidencia pendiente',
                        'time' => date('d/m H:i', strtotime($r->fecha_hora)),
                        'icon' => 'camera',
                        'tone' => 'amber',
                        'unread' => true,
                        'link' => '/papeletas?vista=reportes&search=' . urlencode($r->placa),
                    ];
                }
            }
        }

        return $this->respond([
            'status' => 200,
            'message' => 'Notificaciones operativas',
            'movilAplicaPapeleta' => $movilAplicaPapeleta,
            'data' => $notificaciones
        ]);
    }
}
