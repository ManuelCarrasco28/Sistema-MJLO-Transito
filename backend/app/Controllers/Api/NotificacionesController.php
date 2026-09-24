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
            $dias = (new \DateTime())->diff(new \DateTime($p->fecha_fin_vigencia))->days;
            $notificaciones[] = [
                'id' => 'permiso_' . $p->id,
                'title' => 'Permiso por vencer',
                'description' => "La autorización {$p->numero_autorizacion} ({$p->tipo_permiso}) vence en {$dias} días.",
                'time' => 'Sistema',
                'icon' => 'document',
                'tone' => $dias <= 7 ? 'rose' : 'amber',
                'unread' => true,
                'link' => '/permisos'
            ];
        }

        // 2. Vehículos internados recientemente (últimos 3 días sin orden de libertad)
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
                'title' => 'Nuevo Vehículo Internado',
                'description' => "El vehículo de placa {$i->placa} fue ingresado al depósito.",
                'time' => date('d/m/Y H:i', strtotime($i->fecha_ingreso)),
                'icon' => 'vehicle',
                'tone' => 'blue',
                'unread' => true,
                'link' => '/internamientos'
            ];
        }

        // 3. Papeletas recientes pendientes de pago (últimas 24 horas)
        $papeletas = $db->table('papeletas')
            ->select('id, numero_papeleta, fecha_hora')
            ->where('estado', 'PENDIENTE_PAGO')
            ->where('fecha_hora >=', date('Y-m-d H:i:s', strtotime('-1 days')))
            ->orderBy('fecha_hora', 'DESC')
            ->get()->getResult();

        foreach ($papeletas as $p) {
            $notificaciones[] = [
                'id' => 'papeleta_' . $p->id,
                'title' => 'Nueva Papeleta Registrada',
                'description' => "Se ha registrado la papeleta N° {$p->numero_papeleta}.",
                'time' => date('d/m/Y H:i', strtotime($p->fecha_hora)),
                'icon' => 'ticket',
                'tone' => 'emerald',
                'unread' => true,
                'link' => '/papeletas'
            ];
        }

        return $this->respond([
            'status' => 200,
            'message' => 'Notificaciones operativas',
            'data' => $notificaciones
        ]);
    }
}
