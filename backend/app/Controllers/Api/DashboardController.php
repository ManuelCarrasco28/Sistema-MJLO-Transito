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

        $count = fn (string $table, ?callable $where = null): int => $this->countRows($db, $table, $where);
        $sum = fn (string $table, string $field, ?callable $where = null): float => $this->sumField($db, $table, $field, $where);

        $vehiculos = $count('vehiculos');
        $vehiculosMes = $count('vehiculos', static fn ($builder) => $builder->where('MONTH(CURDATE()) = MONTH(CURDATE())', null, false));
        $documentosTotal = $count('documentos_vehiculo');
        $documentosVigentes = $count('documentos_vehiculo', static fn ($builder) => $builder
            ->groupStart()
                ->where('estado', 'VIGENTE')
                ->orWhere('fecha_expiracion >=', date('Y-m-d'))
            ->groupEnd());
        $inspeccionesPendientes = $count('inspecciones_tecnicas', static fn ($builder) => $builder->whereIn('estado', ['PENDIENTE', 'EN_TRAMITE', 'EN TRÁMITE', 'EN TRAMITE']));
        $papeletasPendientes = $count('papeletas', static fn ($builder) => $builder->whereIn('estado', ['PENDIENTE', 'POR_PAGAR', 'POR PAGAR']));
        $montoPendiente = $sum('papeletas', 'monto_total', static fn ($builder) => $builder->whereIn('estado', ['PENDIENTE', 'POR_PAGAR', 'POR PAGAR']));

        $expedientes = [
            ['label' => 'Vigentes', 'value' => $documentosVigentes, 'color' => 'bg-blue-600'],
            ['label' => 'Observados', 'value' => $count('documentos_vehiculo', static fn ($builder) => $builder->where('estado', 'OBSERVADO')), 'color' => 'bg-cyan-400'],
            ['label' => 'Por vencer', 'value' => $count('documentos_vehiculo', static fn ($builder) => $builder->where('fecha_expiracion >=', date('Y-m-d'))->where('fecha_expiracion <=', date('Y-m-d', strtotime('+30 days')))), 'color' => 'bg-amber-500'],
        ];

        $retenidos = $count('retenciones_vehiculo', static fn ($builder) => $builder->whereIn('estado', ['EN_DEPOSITO', 'EN DEPÓSITO', 'EN DEPOSITO', 'ACTIVO']));
        $liberados = $count('retenciones_vehiculo', static fn ($builder) => $builder->whereIn('estado', ['LIBERADO', 'LIBERADA'])->orWhere('fecha_salida IS NOT NULL', null, false));

        return $this->respond([
            'summaryCards' => [
                ['label' => 'Vehículos registrados', 'value' => $vehiculos, 'detail' => '+' . $vehiculosMes . ' este mes', 'change' => '', 'positive' => null, 'icon' => 'vehicle', 'tone' => 'blue'],
                ['label' => 'Documentos vigentes', 'value' => $documentosVigentes, 'detail' => $documentosTotal > 0 ? round(($documentosVigentes / $documentosTotal) * 100, 1) . '% del total' : '0% del total', 'change' => '', 'positive' => null, 'icon' => 'document', 'tone' => 'cyan'],
                ['label' => 'Inspecciones pendientes', 'value' => $inspeccionesPendientes, 'detail' => 'pendientes', 'change' => '', 'positive' => null, 'icon' => 'inspection', 'tone' => 'amber'],
                ['label' => 'Papeletas pendientes', 'value' => $papeletasPendientes, 'detail' => 'S/ ' . number_format($montoPendiente, 2) . ' por cobrar', 'change' => '', 'positive' => null, 'icon' => 'ticket', 'tone' => 'slate'],
            ],
            'expedientes' => $this->withPercents($expedientes),
            'vehiculosDeposito' => $this->withPercents([
                ['label' => 'En depósito', 'value' => $retenidos, 'color' => 'bg-orange-500'],
                ['label' => 'Liberados', 'value' => $liberados, 'color' => 'bg-emerald-500'],
            ]),
            'organizaciones' => $this->organizaciones($db),
            'operatividad' => $this->operatividad($db),
            'operacionesMensuales' => $this->operacionesMensuales($db, $currentYear),
            'multasPagosPorAnio' => $this->multasPagosPorAnio($db),
        ]);
    }

    private function countRows($db, string $table, ?callable $where = null): int
    {
        $builder = $db->table($table);
        if ($where !== null) {
            $where($builder);
        }
        return (int) $builder->countAllResults();
    }

    private function sumField($db, string $table, string $field, ?callable $where = null): float
    {
        $builder = $db->table($table)->selectSum($field, 'total');
        if ($where !== null) {
            $where($builder);
        }
        $row = $builder->get()->getRowArray();
        return (float) ($row['total'] ?? 0);
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
        $data = [];
        for ($month = 1; $month <= $limit; $month++) {
            $data[] = [
                'month' => $months[$month - 1],
                'registros' => $this->countRows($db, 'tramites_documentarios', static fn ($builder) => $builder->where('YEAR(fecha_solicitud)', $year)->where('MONTH(fecha_solicitud)', $month)),
                'inspecciones' => $this->countRows($db, 'inspecciones_tecnicas', static fn ($builder) => $builder->where('YEAR(fecha_inspeccion)', $year)->where('MONTH(fecha_inspeccion)', $month)),
            ];
        }
        return $data;
    }

    private function multasPagosPorAnio($db): array
    {
        $years = [];
        foreach (['papeletas' => 'fecha_hora', 'pagos' => 'fecha_pago'] as $table => $field) {
            $rows = $db->table($table)->select("YEAR($field) anio", false)->where("$field IS NOT NULL", null, false)->groupBy("YEAR($field)")->get()->getResultArray();
            foreach ($rows as $row) {
                if (!empty($row['anio'])) $years[(int) $row['anio']] = true;
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
                $multas = $this->countRows($db, 'papeletas', static fn ($builder) => $builder->where('YEAR(fecha_hora)', $year)->where('MONTH(fecha_hora)', $month));
                $pagos = $this->countRows($db, 'pagos', static fn ($builder) => $builder->where('YEAR(fecha_pago)', $year)->where('MONTH(fecha_pago)', $month));
                $months[] = ['month' => $monthsNames[$month - 1], 'multas' => $multas, 'pagos' => $pagos];
            }
            $result[$year] = [
                'totals' => [
                    'multas' => array_sum(array_column($months, 'multas')),
                    'pagos' => array_sum(array_column($months, 'pagos')),
                    'pendiente' => $this->sumField($db, 'papeletas', 'monto_total', static fn ($builder) => $builder->where('YEAR(fecha_hora)', $year)->whereIn('estado', ['PENDIENTE', 'POR_PAGAR', 'POR PAGAR'])),
                ],
                'months' => $months,
            ];
        }
        return $result;
    }

    private function organizaciones($db): array
    {
        return $this->withPercents([
            ['label' => 'Empresas transporte', 'value' => $this->countRows($db, 'organizaciones', static fn ($builder) => $builder->where('tipo', 'EMPRESA')), 'color' => 'from-blue-600 to-cyan-400'],
            ['label' => 'Asociaciones', 'value' => $this->countRows($db, 'organizaciones', static fn ($builder) => $builder->where('tipo', 'ASOCIACION')), 'color' => 'from-indigo-600 to-blue-400'],
            ['label' => 'Comités urbanos', 'value' => $this->countRows($db, 'organizaciones', static fn ($builder) => $builder->where('tipo', 'COMITE')), 'color' => 'from-amber-500 to-orange-400'],
            ['label' => 'Observadas', 'value' => $this->countRows($db, 'organizaciones', static fn ($builder) => $builder->where('estado', 'OBSERVADO')), 'color' => 'from-rose-600 to-orange-400'],
        ]);
    }

    private function operatividad($db): array
    {
        return $this->withPercents([
            ['label' => 'Activas', 'value' => $this->countRows($db, 'permisos_circulacion', static fn ($builder) => $builder->where('estado', 'ACTIVO')), 'detail' => 'Habilitadas para operar', 'color' => 'from-emerald-600 to-cyan-400', 'chip' => 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'],
            ['label' => 'En trámite', 'value' => $this->countRows($db, 'permisos_circulacion', static fn ($builder) => $builder->whereIn('estado', ['EN_TRAMITE', 'EN TRÁMITE', 'EN TRAMITE'])), 'detail' => 'Pendientes de evaluación', 'color' => 'from-blue-600 to-indigo-400', 'chip' => 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'],
            ['label' => 'Vencidas', 'value' => $this->countRows($db, 'permisos_circulacion', static fn ($builder) => $builder->where('fecha_fin_vigencia <', date('Y-m-d'))), 'detail' => 'Requieren regularización', 'color' => 'from-rose-600 to-orange-400', 'chip' => 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'],
        ]);
    }
}
