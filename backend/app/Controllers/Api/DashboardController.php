<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class DashboardController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        // Todo el dashboard (mes, año y dias) sigue la hora de Peru, no la del servidor (UTC)
        date_default_timezone_set('America/Lima');
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

        // Expedientes = Tarjeta de Operatividad + SOAT + Tarjeta de Propiedad + CERTICAV + Cursos de Seguridad Vial.
        // Documentos: por su fecha de expiracion. CERTICAV: ultima inspeccion APROBADA de cada vehiculo (valida 6 meses).
        // Cursos: vigente mientras no haya llegado su fecha de fin.
        $exp = ['vigentes' => 0, 'por_vencer' => 0, 'vencidos' => 0];
        $detalleExp = [];
        $clasificar = static function (string $nombre, ?array $r) use (&$exp, &$detalleExp) {
            $fila = [
                'label' => $nombre,
                'vigentes' => (int) ($r['vigentes'] ?? 0),
                'por_vencer' => (int) ($r['por_vencer'] ?? 0),
                'vencidos' => (int) ($r['vencidos'] ?? 0),
            ];
            $fila['total'] = $fila['vigentes'] + $fila['por_vencer'] + $fila['vencidos'];
            $exp['vigentes'] += $fila['vigentes'];
            $exp['por_vencer'] += $fila['por_vencer'];
            $exp['vencidos'] += $fila['vencidos'];
            $detalleExp[] = $fila;
        };
        $caso = static fn(string $campo) => "
            SUM(CASE WHEN $campo >= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as vigentes,
            SUM(CASE WHEN $campo >= CURDATE() AND $campo < DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as por_vencer,
            SUM(CASE WHEN $campo < CURDATE() THEN 1 ELSE 0 END) as vencidos";

        $docsPorTipo = [];
        foreach ($db->table('documentos_vehiculo')
            ->select('tipo_documento, ' . $caso('fecha_expiracion'), false)
            ->whereIn('tipo_documento', ['TARJETA_OPERATIVIDAD', 'SOAT', 'TARJETA_PROPIEDAD'])
            ->where('fecha_expiracion IS NOT NULL', null, false)
            ->groupBy('tipo_documento')
            ->get()->getResultArray() as $r) {
            $docsPorTipo[$r['tipo_documento']] = $r;
        }
        $clasificar('Tarjeta de Operatividad', $docsPorTipo['TARJETA_OPERATIVIDAD'] ?? null);
        $clasificar('SOAT', $docsPorTipo['SOAT'] ?? null);
        $clasificar('Tarjeta de Propiedad', $docsPorTipo['TARJETA_PROPIEDAD'] ?? null);

        $clasificar('CERTICAV', $db->query("
            SELECT " . $caso('vence') . "
            FROM (
                SELECT DATE_ADD(MAX(fecha), INTERVAL 6 MONTH) AS vence
                FROM certicav
                WHERE resultado = 'APROBADO' AND estado <> 'ANULADA'
                GROUP BY id_vehiculo
            ) t
        ")->getRowArray());

        $clasificar('Cursos de Seguridad Vial', $db->table('cursos_seguridad_vial')
            ->select($caso('fecha_fin'), false)
            ->where('fecha_fin IS NOT NULL', null, false)
            ->get()->getRowArray());

        $expedientes = [
            ['label' => 'Vigentes', 'value' => $exp['vigentes'], 'color' => 'bg-blue-600'],
            ['label' => 'Por vencer', 'value' => $exp['por_vencer'], 'color' => 'bg-amber-500'],
            ['label' => 'Vencidos', 'value' => $exp['vencidos'], 'color' => 'bg-rose-500'],
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
            ->where('c.resultado', 'APROBADO')
            ->where('c.estado <>', 'ANULADA')
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

        // Graficos de las tarjetas: acumulado del anio en curso, mes a mes (enero hasta el mes actual).
        // Al cambiar de anio se reinicia solo. El mes y el anio siguen la hora de Peru.
        date_default_timezone_set('America/Lima');
        $anio = (int) date('Y');
        $mesActual = (int) date('n');
        $mesesCorto = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        $serieAnio = function (string $tabla, string $campoFecha, string $agregado, array $where) use ($db, $mesesCorto, $anio, $mesActual) {
            $q = $db->table($tabla)->select("MONTH($campoFecha) as mes, $agregado as c", false)->where("YEAR($campoFecha)", $anio);
            foreach ($where as $k => $v) $q->where($k, $v);
            $rows = $q->groupBy('mes')->get()->getResultArray();
            $porMes = [];
            foreach ($rows as $r) $porMes[(int) $r['mes']] = (float) $r['c'];
            $serie = [];
            for ($m = 1; $m <= $mesActual; $m++) {
                $serie[] = ['label' => $mesesCorto[$m] . ' ' . $anio, 'value' => $porMes[$m] ?? 0];
            }
            return $serie;
        };

        $recSerie = $serieAnio('pagos_transito', 'fecha_pago', 'SUM(total)', ['estado' => 'PAGADO']);
        $recaudacionAnio = array_sum(array_column($recSerie, 'value'));
        $recChart = ['type' => 'bars', 'style' => 'ancho', 'money' => true, 'unit' => 'Recaudado', 'data' => $recSerie];
        $papChart = ['type' => 'bars', 'style' => 'fino', 'money' => false, 'unit' => 'Pendientes', 'data' => $serieAnio('papeletas', 'fecha_hora', 'COUNT(*)', ['estado' => 'PENDIENTE_PAGO'])];
        $vehChart = ['type' => 'wave', 'unit' => 'Inspecciones', 'data' => $serieAnio('certicav', 'fecha', 'COUNT(*)', [])];
        $docPct = $documentosTotal > 0 ? round(($documentosVigentes / $documentosTotal) * 100, 1) : 0;
        $docChart = ['type' => 'ring', 'percent' => $docPct, 'data' => [['label' => 'Vigentes', 'value' => $docPct]]];

        return $this->respond([
            'summaryCards' => [
                ['label' => 'Recaudación Anual', 'value' => round($recaudacionAnio, 2), 'prefix' => 'S/', 'detail' => 'Año ' . $anio, 'change' => '', 'positive' => true, 'icon' => 'payment', 'tone' => 'emerald', 'chart' => $recChart],
                ['label' => 'Vehículos registrados', 'value' => $vehTotal, 'detail' => $vehMes > 0 ? '+' . $vehMes . ' modelo ' . date('Y') : 'Flota vehicular', 'change' => '', 'positive' => null, 'icon' => 'vehicle', 'tone' => 'blue', 'chart' => $vehChart],
                ['label' => 'Documentos vigentes', 'value' => $documentosVigentes, 'detail' => $documentosTotal > 0 ? round(($documentosVigentes / $documentosTotal) * 100, 1) . '% del total' : '0% del total', 'change' => '', 'positive' => null, 'icon' => 'document', 'tone' => 'cyan', 'chart' => $docChart],
                ['label' => 'Papeletas pendientes', 'value' => $papeletasPendientes, 'detail' => $montoPendiente > 0 ? 'S/ ' . number_format($montoPendiente, 0) . ' por cobrar' : 'Pendientes de pago', 'change' => '', 'positive' => null, 'icon' => 'ticket', 'tone' => 'slate', 'chart' => $papChart],
            ],
            'inspeccionesResultado' => $this->inspeccionesResultado($db),
            'papeletasEstado' => $this->papeletasEstado($db),
            'expedientes' => $this->withPercents($expedientes),
            'expedientesDetalle' => $detalleExp,
            'vehiculosDeposito' => $this->withPercents([
                ['label' => 'En depósito', 'value' => $retenidos, 'color' => 'bg-orange-500'],
                ['label' => 'Liberados', 'value' => $liberados, 'color' => 'bg-emerald-500'],
            ]),
            'asociaciones' => $this->asociaciones($db),
            'operatividad' => $this->operatividad($db),
            'recaudacionConcepto' => $this->recaudacionConcepto($db, $currentYear),
            'operacionesMensuales' => $this->operacionesMensuales($db, $currentYear),
            'vehiculosMensuales' => $this->vehiculosMensuales($db, $currentYear),
            'multasPagosPorAnio' => $this->multasPagosPorAnio($db),
            'alertasVencimiento' => $alertas,
            'movimientosRecientes' => $this->movimientosRecientes($db),
        ]);
    }

    private function vehiculosMensuales($db, int $year): array
    {
        $months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        // Simular o extraer los datos de registros vehiculares por mes según su formalidad
        // Usamos documentos_vehiculo como un proxy histórico, cruzando con la formalidad del vehículo
        $rows = $db->table('documentos_vehiculo d')
            ->select("
                MONTH(d.fecha_expedicion) as mes,
                SUM(CASE WHEN v.id_asociacion IS NOT NULL THEN 1 ELSE 0 END) as formal,
                SUM(CASE WHEN v.id_asociacion IS NULL THEN 1 ELSE 0 END) as informal
            ", false)
            ->join('vehiculos v', 'v.id = d.id_vehiculo')
            ->where('YEAR(d.fecha_expedicion)', $year)
            ->groupBy('MONTH(d.fecha_expedicion)')
            ->get()->getResultArray();
            
        $formalMes = [];
        $informalMes = [];
        foreach ($rows as $r) {
            $formalMes[(int) $r['mes']] = (int) $r['formal'];
            $informalMes[(int) $r['mes']] = (int) $r['informal'];
        }

        $data = [];
        // Solo hasta el mes actual (hora de Peru) y sin datos inventados
        $limite = $year === (int) date('Y') ? (int) date('n') : 12;
        for ($month = 1; $month <= $limite; $month++) {
            $data[] = [
                'name' => $months[$month - 1],
                'formal' => $formalMes[$month] ?? 0,
                'informal' => $informalMes[$month] ?? 0
            ];
        }
        return $data;
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

        
        // Papeletas registradas por mes: de operativo (con id_operativo) y de rutina (sin operativo)
        $rows = $db->table('papeletas')
            ->select('MONTH(fecha_hora) as mes, SUM(CASE WHEN id_operativo IS NOT NULL THEN 1 ELSE 0 END) as operativos, SUM(CASE WHEN id_operativo IS NULL THEN 1 ELSE 0 END) as rutina', false)
            ->where('YEAR(fecha_hora)', $year)
            ->groupBy('MONTH(fecha_hora)')
            ->get()->getResultArray();
        $opPorMes = [];
        $rutPorMes = [];
        foreach ($rows as $r) {
            $opPorMes[(int) $r['mes']] = (int) $r['operativos'];
            $rutPorMes[(int) $r['mes']] = (int) $r['rutina'];
        }

        $data = [];
        for ($month = 1; $month <= $limit; $month++) {
            $data[] = [
                'month' => $months[$month - 1],
                'operativos' => $opPorMes[$month] ?? 0,
                'rutina' => $rutPorMes[$month] ?? 0,
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
                SUM(CASE WHEN estado IN ('PENDIENTE', 'POR_PAGAR', 'PENDIENTE_PAGO') THEN 1 ELSE 0 END) as pendiente
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
        $pendMesMap = [];
        foreach ($papeletasRows as $r) {
            $y = (int) $r['anio'];
            $m = (int) $r['mes'];
            if ($y > 0) {
                $years[$y] = true;
                $multasMap[$y][$m] = (int) $r['total'];
                $pendMesMap[$y][$m] = (int) $r['pendiente'];
                $pendientesMap[$y] = ($pendientesMap[$y] ?? 0) + (int) $r['pendiente'];
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
                $months[] = ['month' => $monthsNames[$month - 1], 'multas' => $multas, 'pagos' => $pagos, 'pendiente' => $pendMesMap[$year][$month] ?? 0];
            }
            $result[$year] = [
                'totals' => [
                    'multas' => array_sum(array_column($months, 'multas')),
                    'pagos' => array_sum(array_column($months, 'pagos')),
                    'pendiente' => (int) ($pendientesMap[$year] ?? 0),
                ],
                'months' => $months,
            ];
        }
        return $result;
    }

    // Dinero cobrado por concepto (papeletas, cursos, tramites), mes a mes y para todos los anios con pagos
    private function recaudacionConcepto($db, int $currentYear): array
    {
        $rows = $db->table('pagos_transito')
            ->select('YEAR(fecha_pago) as anio, MONTH(fecha_pago) as mes, tipo_pago, SUM(total) as monto', false)
            ->where('estado', 'PAGADO')
            ->where('fecha_pago IS NOT NULL', null, false)
            ->groupBy('YEAR(fecha_pago), MONTH(fecha_pago), tipo_pago')
            ->get()->getResultArray();
        $porAnio = [];
        foreach ($rows as $r) {
            $porAnio[(int) $r['anio']][(int) $r['mes']][$r['tipo_pago']] = (float) $r['monto'];
        }
        $porAnio[$currentYear] = $porAnio[$currentYear] ?? [];
        ksort($porAnio);
        $names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        $anios = [];
        foreach ($porAnio as $year => $porMes) {
            $limite = $year === $currentYear ? (int) date('n') : 12;
            $totales = ['papeletas' => 0.0, 'cursos' => 0.0, 'tramites' => 0.0];
            $meses = [];
            for ($m = 1; $m <= $limite; $m++) {
                $p = $porMes[$m]['PAPELETA'] ?? 0.0;
                $c = $porMes[$m]['CURSO'] ?? 0.0;
                $t = $porMes[$m]['TRAMITE'] ?? 0.0;
                $totales['papeletas'] += $p;
                $totales['cursos'] += $c;
                $totales['tramites'] += $t;
                $meses[] = ['month' => $names[$m - 1], 'papeletas' => $p, 'cursos' => $c, 'tramites' => $t];
            }
            $anios[(string) $year] = ['totales' => $totales, 'meses' => $meses];
        }
        return ['actual' => $currentYear, 'anios' => $anios];
    }

    private function conteoPorCampo($db, string $tabla, string $campo, array $orden, array $where = []): array
    {
        $q = $db->table($tabla)->select("$campo as clave, COUNT(*) as c", false);
        foreach ($where as $k => $v) $q->where($k, $v);
        $porClave = [];
        foreach ($q->groupBy($campo)->get()->getResultArray() as $r) {
            $porClave[$r['clave']] = (int) $r['c'];
        }
        $items = [];
        foreach ($orden as $clave => [$label, $color]) {
            $items[] = ['label' => $label, 'value' => $porClave[$clave] ?? 0, 'color' => $color];
        }
        return $this->withPercents($items);
    }

    // Resultado de las inspecciones CERTICAV (sin las anuladas)
    private function inspeccionesResultado($db): array
    {
        return $this->conteoPorCampo($db, 'certicav', 'resultado', [
            'APROBADO' => ['Aprobadas', 'bg-emerald-500'],
            'OBSERVADO' => ['Observadas', 'bg-amber-500'],
            'DESAPROBADO' => ['Desaprobadas', 'bg-rose-500'],
        ], ['estado <>' => 'ANULADO']);
    }

    // Papeletas según su estado de pago
    private function papeletasEstado($db): array
    {
        return $this->conteoPorCampo($db, 'papeletas', 'estado', [
            'PAGADA' => ['Pagadas', 'bg-emerald-500'],
            'PENDIENTE_PAGO' => ['Pendientes de pago', 'bg-amber-500'],
            'ANULADA' => ['Anuladas', 'bg-slate-400'],
        ]);
    }

    private function asociaciones($db): array
    {
        $orgRow = $db->table('asociaciones')
            ->select("
                SUM(CASE WHEN tipo = 'PARTICULAR' THEN 1 ELSE 0 END) as particulares,
                SUM(CASE WHEN tipo = 'ASOCIACION' THEN 1 ELSE 0 END) as asociaciones
            ", false)
            ->get()->getRowArray() ?? [];

        return $this->withPercents([
            ['label' => 'Empresas particulares', 'value' => (int) ($orgRow['particulares'] ?? 0), 'color' => 'bg-[#5B6EE1]'],
            ['label' => 'Asociaciones', 'value' => (int) ($orgRow['asociaciones'] ?? 0), 'color' => 'bg-[#6CB8E8]'],
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
            ->where('tipo_documento', 'TARJETA_OPERATIVIDAD')
            ->get()->getRowArray() ?? [];

        return $this->withPercents([
            ['label' => 'Activas', 'value' => (int) ($permRow['activas'] ?? 0), 'detail' => 'Habilitadas para operar', 'color' => 'from-emerald-600 to-cyan-400', 'chip' => 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'],
            ['label' => 'En trámite', 'value' => (int) ($permRow['tramite'] ?? 0), 'detail' => 'Pendientes de evaluación', 'color' => 'from-blue-600 to-indigo-400', 'chip' => 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'],
            ['label' => 'Vencidas', 'value' => (int) ($permRow['vencidas'] ?? 0), 'detail' => 'Requieren regularización', 'color' => 'from-rose-600 to-orange-400', 'chip' => 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'],
        ]);
    }
}
