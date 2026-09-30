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

        // Cálculo de alertas de vencimiento (TUC, SOAT, CERTICAV)
        $alertas = [];
        
        // 1. Alertas de Documentos (SOAT, TUC)
        $docsAlertas = $db->table('documentos_vehiculo d')
            ->select("
                d.tipo_documento,
                d.codigo,
                d.fecha_expiracion,
                v.placa,
                DATEDIFF(d.fecha_expiracion, CURDATE()) as dias_restantes
            ", false)
            ->join('vehiculos v', 'v.id = d.id_vehiculo', 'left')
            ->where('d.estado', 'VIGENTE')
            ->where('d.fecha_expiracion >=', 'CURDATE()', false)
            ->where('d.fecha_expiracion <=', 'DATE_ADD(CURDATE(), INTERVAL 30 DAY)', false)
            ->get()->getResultArray();

        foreach ($docsAlertas as $doc) {
            $dias = (int)$doc['dias_restantes'];
            $nivel = $dias <= 7 ? 'rojo' : ($dias <= 15 ? 'naranja' : 'amarillo');
            $alertas[] = [
                'tipo' => $doc['tipo_documento'],
                'identificador' => 'Placa: ' . $doc['placa'],
                'detalle' => 'Vence el ' . date('d/m/Y', strtotime($doc['fecha_expiracion'])),
                'dias' => $dias,
                'nivel' => $nivel
            ];
        }

        // 2. Alertas de Inspecciones (CERTICAV) - asumiendo validez de 6 meses desde fecha
        $certAlertas = $db->table('certicav c')
            ->select("
                c.numero_registro,
                v.placa,
                DATE_ADD(c.fecha, INTERVAL 6 MONTH) as fecha_expiracion,
                DATEDIFF(DATE_ADD(c.fecha, INTERVAL 6 MONTH), CURDATE()) as dias_restantes
            ", false)
            ->join('vehiculos v', 'v.id = c.id_vehiculo', 'left')
            ->where('c.estado', 'APROBADO')
            ->where('DATE_ADD(c.fecha, INTERVAL 6 MONTH) >=', 'CURDATE()', false)
            ->where('DATE_ADD(c.fecha, INTERVAL 6 MONTH) <=', 'DATE_ADD(CURDATE(), INTERVAL 30 DAY)', false)
            ->get()->getResultArray();

        foreach ($certAlertas as $cert) {
            $dias = (int)$cert['dias_restantes'];
            $nivel = $dias <= 7 ? 'rojo' : ($dias <= 15 ? 'naranja' : 'amarillo');
            $alertas[] = [
                'tipo' => 'CERTICAV',
                'identificador' => 'Placa: ' . $cert['placa'],
                'detalle' => 'Vence el ' . date('d/m/Y', strtotime($cert['fecha_expiracion'])),
                'dias' => $dias,
                'nivel' => $nivel
            ];
        }

        // Ordenar alertas por días restantes (ascendente)
        usort($alertas, function($a, $b) {
            return $a['dias'] <=> $b['dias'];
        });

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
            'alertasVencimiento' => $alertas,
            'movimientosRecientes' => $this->movimientosRecientes($db),
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
                SUM(CASE WHEN tipo = 'PARTICULAR' THEN 1 ELSE 0 END) as empresas,
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

    private function movimientosRecientes($db): array
    {
        $papeletas = $db->table('papeletas p')
            ->select("
                'PAPELETA' as origen,
                p.id,
                p.numero_papeleta as codigo,
                p.fecha_hora as fecha,
                p.estado,
                p.monto_total as monto,
                v.placa,
                c.nombres,
                c.apellido_paterno,
                c.apellido_materno,
                pe.numero as documento,
                ti.descripcion as detalle
            ", false)
            ->join('vehiculos v', 'v.id = p.id_vehiculo', 'left')
            ->join('personas pe', 'pe.id = p.id_persona_infractor', 'left')
            ->join('ciudadanos c', 'c.id_persona = pe.id', 'left')
            ->join('papeleta_detalles pd', 'pd.id_papeleta = p.id', 'left')
            ->join('tipos_infraccion ti', 'ti.id = pd.id_tipo_infraccion', 'left')
            ->groupBy('p.id')
            ->orderBy('p.fecha_hora', 'DESC')
            ->limit(5)
            ->get()->getResultArray();

        $tramites = $db->table('tramites_documentarios t')
            ->select("
                'TRAMITE' as origen,
                t.id,
                t.numero_expediente as codigo,
                t.fecha_solicitud as fecha,
                t.estado,
                pa.costo as monto,
                v.placa,
                c.nombres,
                c.apellido_paterno,
                c.apellido_materno,
                pe.numero as documento,
                pa.nombre as detalle
            ", false)
            ->join('procedimientos_administrativos pa', 'pa.id = t.id_procedimiento_admin', 'left')
            ->join('personas pe', 'pe.id = t.id_persona', 'left')
            ->join('ciudadanos c', 'c.id_persona = pe.id', 'left')
            ->join('vehiculos v', 'v.id = t.id_vehiculo', 'left')
            ->orderBy('t.fecha_solicitud', 'DESC')
            ->limit(5)
            ->get()->getResultArray();

        $movimientos = array_merge($papeletas, $tramites);
        usort($movimientos, static fn ($a, $b) => strtotime($b['fecha']) <=> strtotime($a['fecha']));
        $movimientos = array_slice($movimientos, 0, 8);

        return array_map(static function ($m) {
            $nombre = trim(($m['nombres'] ?? '') . ' ' . ($m['apellido_paterno'] ?? '') . ' ' . ($m['apellido_materno'] ?? ''));
            return [
                'origen' => $m['origen'],
                'administrado' => $nombre !== '' ? $nombre : '—',
                'documento' => $m['documento'] ?? '—',
                'placa' => $m['placa'] ?? '—',
                'detalle' => $m['detalle'] ?? ($m['origen'] === 'PAPELETA' ? 'Papeleta de infracción' : 'Trámite documentario'),
                'codigo' => $m['codigo'] ?? '',
                'fecha' => $m['fecha'],
                'estado' => $m['estado'],
                'monto' => (float) ($m['monto'] ?? 0),
            ];
        }, $movimientos);
    }

    private function operatividad($db): array
    {
        $permRow = $db->table('documentos_vehiculo')
            ->select("
                SUM(CASE WHEN estado = 'VIGENTE' AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURDATE()) THEN 1 ELSE 0 END) as activas,
                SUM(CASE WHEN estado IN ('EN_TRAMITE', 'EN TRÁMITE', 'EN TRAMITE') THEN 1 ELSE 0 END) as tramite,
                SUM(CASE WHEN estado = 'VENCIDO' OR (estado = 'VIGENTE' AND fecha_expiracion < CURDATE()) THEN 1 ELSE 0 END) as vencidas
            ", false)
            ->whereIn('tipo_documento', ['TARJETA_OPERATIVIDAD', 'PERMISO_OPERACION'])
            ->get()->getRowArray() ?? [];

        return $this->withPercents([
            ['label' => 'Activas', 'value' => (int) ($permRow['activas'] ?? 0), 'detail' => 'Habilitadas para operar', 'color' => 'from-emerald-600 to-cyan-400', 'chip' => 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'],
            ['label' => 'En trámite', 'value' => (int) ($permRow['tramite'] ?? 0), 'detail' => 'Pendientes de evaluación', 'color' => 'from-blue-600 to-indigo-400', 'chip' => 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'],
            ['label' => 'Vencidas', 'value' => (int) ($permRow['vencidas'] ?? 0), 'detail' => 'Requieren regularización', 'color' => 'from-rose-600 to-orange-400', 'chip' => 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'],
        ]);
    }
}
