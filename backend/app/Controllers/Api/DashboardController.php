<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class DashboardController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        $currentYear = (int) date('Y');

        
        $vehTotal = (int) $db->table('vehiculos')->countAllResults();
        $vehMes = (int) $db->table('vehiculos')
            ->where('anio_fabricacion', (int) date('Y'))
            ->countAllResults();

        
        $docRow = $db->table('documentos_vehiculo')
            ->select("
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'VIGENTE' OR fecha_expiracion >= CURDATE() THEN 1 ELSE 0 END) as vigentes,
                SUM(CASE WHEN estado = 'OBSERVADO' THEN 1 ELSE 0 END) as observados,
                SUM(CASE WHEN fecha_expiracion >= CURDATE() AND fecha_expiracion <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as por_vencer
            ", false)
            ->get()->getRowArray() ?? [];

        $documentosTotal = (int) ($docRow['total'] ?? 0);
        $documentosVigentes = (int) ($docRow['vigentes'] ?? 0);
        $documentosObservados = (int) ($docRow['observados'] ?? 0);
        $documentosPorVencer = (int) ($docRow['por_vencer'] ?? 0);

        
        $inspeccionesPendientes = (int) $db->table('certicav')
            ->whereIn('estado', ['PENDIENTE', 'EN_TRAMITE', 'EN TRÁMITE', 'EN TRAMITE'])
            ->countAllResults();

        
        $papRow = $db->table('papeletas')
            ->select("
                SUM(CASE WHEN estado IN ('PENDIENTE', 'POR_PAGAR', 'PENDIENTE_PAGO') THEN 1 ELSE 0 END) as pendientes,
                SUM(CASE WHEN estado IN ('PENDIENTE', 'POR_PAGAR', 'PENDIENTE_PAGO') THEN monto_total ELSE 0 END) as monto_pendiente
            ", false)
            ->get()->getRowArray() ?? [];

        $papeletasPendientes = (int) ($papRow['pendientes'] ?? 0);
        $montoPendiente = (float) ($papRow['monto_pendiente'] ?? 0);

        $tramitesTotal = (int) $db->table('tramites_documentarios')->countAllResults();
        $tramitesActivos = (int) $db->table('tramites_documentarios')
            ->whereNotIn('estado', ['ANULADO', 'ANULADA', 'CANCELADO', 'CANCELADA'])
            ->countAllResults();

        
        $retRow = $db->table('ordenes_internamiento')
            ->select("
                SUM(CASE WHEN estado IN ('RETENIDO', 'EN_DEPOSITO', 'EN DEPÓSITO', 'EN DEPOSITO', 'ACTIVO') THEN 1 ELSE 0 END) as retenidos,
                SUM(CASE WHEN estado IN ('LIBERADO', 'LIBERADA') OR fecha_salida IS NOT NULL THEN 1 ELSE 0 END) as liberados
            ", false)
            ->get()->getRowArray() ?? [];

        $retenidos = (int) ($retRow['retenidos'] ?? 0);
        $liberados = (int) ($retRow['liberados'] ?? 0);

        $expedientes = [
            ['label' => 'Vigentes', 'value' => $documentosVigentes, 'color' => 'bg-blue-600'],
            ['label' => 'Observados', 'value' => $documentosObservados, 'color' => 'bg-cyan-400'],
            ['label' => 'Por vencer', 'value' => $documentosPorVencer, 'color' => 'bg-amber-500'],
        ];

        return $this->respond([
            'summaryCards' => [
                ['label' => 'Vehículos registrados', 'value' => $vehTotal, 'detail' => '+' . $vehMes . ' este mes', 'change' => '', 'positive' => null, 'icon' => 'vehicle', 'tone' => 'blue'],
                ['label' => 'Documentos vigentes', 'value' => $documentosVigentes, 'detail' => $documentosTotal > 0 ? round(($documentosVigentes / $documentosTotal) * 100, 1) . '% del total' : '0% del total', 'change' => '', 'positive' => null, 'icon' => 'document', 'tone' => 'cyan'],
                ['label' => 'Inspecciones pendientes', 'value' => $inspeccionesPendientes, 'detail' => 'pendientes', 'change' => '', 'positive' => null, 'icon' => 'inspection', 'tone' => 'amber'],
                ['label' => 'Papeletas pendientes', 'value' => $papeletasPendientes, 'detail' => 'S/ ' . number_format($montoPendiente, 2) . ' por cobrar', 'change' => '', 'positive' => null, 'icon' => 'ticket', 'tone' => 'slate'],
                ['label' => 'Trámites documentarios', 'value' => $tramitesTotal, 'detail' => $tramitesActivos . ' activos', 'change' => '', 'positive' => null, 'icon' => 'document', 'tone' => 'purple'],
            ],
            'expedientes' => $this->withPercents($expedientes),
            'vehiculosDeposito' => $this->withPercents([
                ['label' => 'En depósito', 'value' => $retenidos, 'color' => 'bg-orange-500'],
                ['label' => 'Liberados', 'value' => $liberados, 'color' => 'bg-emerald-500'],
            ]),
            'asociaciones' => $this->asociaciones($db),
            'operatividad' => $this->operatividad($db),
            'operacionesMensuales' => $this->operacionesMensuales($db, $currentYear),
            'multasPagosPorAnio' => $this->multasPagosPorAnio($db),
        ]);
    }

    private function withPercents(array $items): array
    {
        $total = array_sum(array_column($items, 'value'));
        return array_map(static function ($item) use ($total) {
            $percent = $total > 0 ? round(($item['value'] / $total) * 100) : 0;
            return $item + ['percent' => $percent . '%', 'progress' => $percent . '%'];
        }, $items);
    }

    private function operacionesMensuales($db, int $year): array
    {
        $months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        $limit = $year === (int) date('Y') ? (int) date('n') : 12;

        
        $tramitesRows = $db->table('tramites_documentarios')
            ->select('MONTH(fecha_solicitud) as mes, COUNT(*) as total', false)
            ->where('YEAR(fecha_solicitud)', $year)
            ->groupBy('MONTH(fecha_solicitud)')
            ->get()->getResultArray();
        $tramitesPorMes = [];
        foreach ($tramitesRows as $r) {
            $tramitesPorMes[(int) $r['mes']] = (int) $r['total'];
        }

        
        $inspRows = $db->table('certicav')
            ->select('MONTH(fecha) as mes, COUNT(*) as total', false)
            ->where('YEAR(fecha)', $year)
            ->groupBy('MONTH(fecha)')
            ->get()->getResultArray();
        $inspPorMes = [];
        foreach ($inspRows as $r) {
            $inspPorMes[(int) $r['mes']] = (int) $r['total'];
        }

        $data = [];
        for ($month = 1; $month <= $limit; $month++) {
            $data[] = [
                'month' => $months[$month - 1],
                'registros' => $tramitesPorMes[$month] ?? 0,
                'inspecciones' => $inspPorMes[$month] ?? 0,
            ];
        }
        return $data;
    }

    private function multasPagosPorAnio($db): array
    {
        
        $papeletasRows = $db->table('papeletas')
            ->select("
                YEAR(fecha_hora) as anio,
                MONTH(fecha_hora) as mes,
                COUNT(*) as total,
                SUM(CASE WHEN estado IN ('PENDIENTE', 'POR_PAGAR', 'PENDIENTE_PAGO') THEN monto_total ELSE 0 END) as pendiente
            ", false)
            ->where('fecha_hora IS NOT NULL', null, false)
            ->groupBy('YEAR(fecha_hora), MONTH(fecha_hora)')
            ->get()->getResultArray();

        
        $pagosRows = $db->table('pagos_transito')
            ->select('YEAR(fecha_pago) as anio, MONTH(fecha_pago) as mes, COUNT(*) as total', false)
            ->where('fecha_pago IS NOT NULL', null, false)
            ->where('estado', 'PAGADO')
            ->groupBy('YEAR(fecha_pago), MONTH(fecha_pago)')
            ->get()->getResultArray();

        $years = [];
        $multasMap = [];
        $pendientesMap = [];
        foreach ($papeletasRows as $r) {
            $y = (int) $r['anio'];
            $m = (int) $r['mes'];
            if ($y > 0) {
                $years[$y] = true;
                $multasMap[$y][$m] = (int) $r['total'];
                $pendientesMap[$y] = ($pendientesMap[$y] ?? 0) + (float) $r['pendiente'];
            }
        }

        $pagosMap = [];
        foreach ($pagosRows as $r) {
            $y = (int) $r['anio'];
            $m = (int) $r['mes'];
            if ($y > 0) {
                $years[$y] = true;
                $pagosMap[$y][$m] = (int) $r['total'];
            }
        }

        if ($years === []) {
            $years[(int) date('Y')] = true;
        }
        ksort($years);

        $monthsNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        $result = [];
        foreach (array_keys($years) as $year) {
            $limit = $year === (int) date('Y') ? (int) date('n') : 12;
            $months = [];
            for ($month = 1; $month <= $limit; $month++) {
                $multas = $multasMap[$year][$month] ?? 0;
                $pagos = $pagosMap[$year][$month] ?? 0;
                $months[] = ['month' => $monthsNames[$month - 1], 'multas' => $multas, 'pagos' => $pagos];
            }
            $result[$year] = [
                'totals' => [
                    'multas' => array_sum(array_column($months, 'multas')),
                    'pagos' => array_sum(array_column($months, 'pagos')),
                    'pendiente' => (float) ($pendientesMap[$year] ?? 0),
                ],
                'months' => $months,
            ];
        }
        return $result;
    }

    private function asociaciones($db): array
    {
        $orgRow = $db->table('asociaciones')
            ->select("
                SUM(CASE WHEN tipo = 'EMPRESA' THEN 1 ELSE 0 END) as empresas,
                SUM(CASE WHEN tipo = 'ASOCIACION' THEN 1 ELSE 0 END) as asociaciones,
                SUM(CASE WHEN tipo = 'COMITE' THEN 1 ELSE 0 END) as comites,
                SUM(CASE WHEN estado = 'OBSERVADO' THEN 1 ELSE 0 END) as observadas
            ", false)
            ->get()->getRowArray() ?? [];

        return $this->withPercents([
            ['label' => 'Empresas transporte', 'value' => (int) ($orgRow['empresas'] ?? 0), 'color' => 'from-blue-600 to-cyan-400'],
            ['label' => 'Asociaciones', 'value' => (int) ($orgRow['asociaciones'] ?? 0), 'color' => 'from-indigo-600 to-blue-400'],
            ['label' => 'Comités urbanos', 'value' => (int) ($orgRow['comites'] ?? 0), 'color' => 'from-amber-500 to-orange-400'],
            ['label' => 'Observadas', 'value' => (int) ($orgRow['observadas'] ?? 0), 'color' => 'from-rose-600 to-orange-400'],
        ]);
    }

    private function operatividad($db): array
    {
        $permRow = $db->table('documentos_vehiculo')
            ->select("
                SUM(CASE WHEN estado = 'VIGENTE' AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURDATE()) THEN 1 ELSE 0 END) as activas,
                SUM(CASE WHEN estado IN ('EN_TRAMITE', 'EN TRÁMITE', 'EN TRAMITE') THEN 1 ELSE 0 END) as tramite,
                SUM(CASE WHEN estado = 'VENCIDO' OR (estado = 'VIGENTE' AND fecha_expiracion < CURDATE()) THEN 1 ELSE 0 END) as vencidas
            ", false)
            ->where('tipo_documento', 'TARJETA_OPERATIVIDAD')
            ->get()->getRowArray() ?? [];

        return $this->withPercents([
            ['label' => 'Activas', 'value' => (int) ($permRow['activas'] ?? 0), 'detail' => 'Habilitadas para operar', 'color' => 'from-emerald-600 to-cyan-400', 'chip' => 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'],
            ['label' => 'En trámite', 'value' => (int) ($permRow['tramite'] ?? 0), 'detail' => 'Pendientes de evaluación', 'color' => 'from-blue-600 to-indigo-400', 'chip' => 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'],
            ['label' => 'Vencidas', 'value' => (int) ($permRow['vencidas'] ?? 0), 'detail' => 'Requieren regularización', 'color' => 'from-rose-600 to-orange-400', 'chip' => 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'],
        ]);
    }
}
