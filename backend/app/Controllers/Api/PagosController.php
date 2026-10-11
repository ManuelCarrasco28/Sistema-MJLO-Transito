<?php

namespace App\Controllers\Api;

use App\Services\PagosTransito;
use App\Services\AuditoriaService;
use CodeIgniter\RESTful\ResourceController;

class PagosController extends ResourceController
{
    use \App\Libraries\ResuelveUuid;

    protected string $tablaUuid = 'pagos_transito';
    protected array $tablasUuidPorMetodo = [];
    protected array $soloUuidEnEstricto = [];

    protected $format = 'json';

    public function estadisticas()
    {
        $db = \Config\Database::connect();

        $recibos = $db->table('pagos_transito')
            ->where(\App\Libraries\PagosListado::condicionReciboVisible('pagos_transito'), null, false)
            ->select("
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'PAGADO' THEN total ELSE 0 END) as monto_pagado,
                SUM(CASE WHEN estado = 'PAGADO' AND DATE(fecha_pago) = CURDATE() THEN 1 ELSE 0 END) as pagados_hoy
            ", false)
            ->get()->getRowArray();

        $liberados = $db->table('ordenes_libertad')
            ->select("
                COUNT(*) as total,
                SUM(monto_total) as monto,
                SUM(CASE WHEN DATE(fecha_emision) = CURDATE() THEN 1 ELSE 0 END) as hoy
            ", false)
            ->get()->getRowArray();

        $pendientesInternamiento = (int) $db->table('ordenes_internamiento')->where('estado', 'RETENIDO')->countAllResults();

        $idsPapeletasConRecibo = $this->idsConRecibo($db, 'id_papeleta');
        $papeletasPendientesTotal = $db->table('papeletas')->where('estado', 'PENDIENTE_PAGO')->countAllResults();
        $papeletasPendientes = empty($idsPapeletasConRecibo)
            ? $papeletasPendientesTotal
            : $db->table('papeletas')->where('estado', 'PENDIENTE_PAGO')->whereNotIn('id', $idsPapeletasConRecibo)->countAllResults();

        $idsInscripcionesConRecibo = $this->idsConRecibo($db, 'id_inscripcion');
        $cursosPendientesBuilder = $db->table('inscripciones_curso i')
            ->join('cursos_seguridad_vial c', 'c.id = i.id_curso')
            ->where('i.estado_pago', 'PENDIENTE')
            ->where('c.costo_inscripcion >', 0)
            ->whereNotIn('i.estado', ['ANULADO', 'CANCELADO']);
        if (!empty($idsInscripcionesConRecibo)) {
            $cursosPendientesBuilder->whereNotIn('i.id', $idsInscripcionesConRecibo);
        }
        $cursosPendientes = $cursosPendientesBuilder->countAllResults();

        $totalPagos = (int) ($recibos['total'] ?? 0) + (int) ($liberados['total'] ?? 0)
            + $pendientesInternamiento + $papeletasPendientes + $cursosPendientes;
        $totalMonto = (float) ($recibos['monto_pagado'] ?? 0) + (float) ($liberados['monto'] ?? 0);
        $pagosHoy = (int) ($recibos['pagados_hoy'] ?? 0) + (int) ($liberados['hoy'] ?? 0);

        return $this->respond(['data' => [
            'totalPagos' => $totalPagos,
            'totalMonto' => $totalMonto,
            'pagosHoy' => $pagosHoy,
        ]]);
    }

    public function index()
    {
        $db = \Config\Database::connect();

        $page = (int)$this->request->getGet('page');
        $porPagina = max(1, min(200, (int)($this->request->getGet('porPagina') ?: 20)));
        $buscar = trim((string)$this->request->getGet('buscar'));
        $tipoFiltro = strtoupper(trim((string)$this->request->getGet('tipoPago')));
        $estadoFiltro = strtoupper(trim((string)$this->request->getGet('estado')));
        $metodoFiltro = strtoupper(trim((string)$this->request->getGet('metodo'))); // EFECTIVO | TARJETA | SIN_CONFIRMAR

        // Todos los orígenes se filtran y paginan en SQL, sin cargar el listado completo.
        if ($page > 0) {
            return $this->listarPagina($db, $page, $porPagina, $buscar, $tipoFiltro, $estadoFiltro, $metodoFiltro);
        }

        $rows = $db->table('pagos_transito')->where(\App\Libraries\PagosListado::condicionReciboVisible('pagos_transito'), null, false)->orderBy('id', 'DESC')->get()->getResultArray();

        $pendientes = $db->table('ordenes_internamiento oi')
            ->select("oi.id, 'INTERNAMIENTO' as tipo_pago, NULL as numero_recibo, NULL as numero_voucher, 'SIN CONFIRMAR' as medio_pago, CONCAT('Boleta #', oi.numero_boleta) as referencia_pago, 0 as total, NULL as fecha_pago, 'PENDIENTE' as estado")
            ->where('oi.estado', 'RETENIDO')
            ->get()->getResultArray();

        // El medio de pago se arma listando qué conceptos incluye la orden
        // (guardianía, papeleta y/o remolque), ya que el sistema no registra
        // un único método por cada recibo combinado.
        $pagados = $db->table('ordenes_libertad ol')
            ->select("ol.id, ol.id_internamiento, 'INTERNAMIENTO' as tipo_pago, COALESCE(ol.numero_recibo_guardiania, ol.numero_recibo_papeleta, ol.numero_recibo_remolque, 'VARIOS') as numero_recibo, NULL as numero_voucher,
                COALESCE(NULLIF(CONCAT_WS(' + ',
                    IF(ol.numero_recibo_guardiania IS NOT NULL, 'GUARDIANÍA', NULL),
                    IF(ol.numero_recibo_papeleta IS NOT NULL, 'PAPELETA', NULL),
                    IF(ol.numero_recibo_remolque IS NOT NULL, 'REMOLQUE', NULL)
                ), ''), 'VARIOS CONCEPTOS') as medio_pago,
                CONCAT('Orden #', ol.numero_orden) as referencia_pago, ol.monto_total as total, ol.fecha_emision as fecha_pago, 'PAGADO' as estado", false)
            ->get()->getResultArray();

        // Papeletas pendientes de pago que aún no tienen un recibo generado
        // en pagos_transito, para que se vean en Pagos sin esperar a que
        // alguien las seleccione manualmente en "Registrar Pago".
        $idsPapeletasConRecibo = $this->idsConRecibo($db, 'id_papeleta');

        $papeletasPendientes = $db->table('papeletas p')
            ->select("p.id, p.numero_papeleta, p.monto_total, p.fecha_hora, v.placa", false)
            ->join('vehiculos v', 'v.id = p.id_vehiculo', 'left')
            ->where('p.estado', 'PENDIENTE_PAGO')
            ->get()->getResultArray();
        $papeletasPendientes = array_values(array_filter(
            $papeletasPendientes,
            static fn ($p) => !in_array((int) $p['id'], $idsPapeletasConRecibo, true)
        ));

        // Inscripciones a cursos con costo, pendientes de pago, que aún no
        // tienen un recibo generado.
        $idsInscripcionesConRecibo = $this->idsConRecibo($db, 'id_inscripcion');

        $cursosPendientes = $db->table('inscripciones_curso i')
            ->select("i.id, i.fecha_inscripcion, c.nombre as curso_nombre, c.costo_inscripcion, CONCAT(ci.nombres, ' ', ci.apellido_paterno) as persona_nombre", false)
            ->join('cursos_seguridad_vial c', 'c.id = i.id_curso')
            ->join('personas per', 'per.id = i.id_persona', 'left')
            ->join('ciudadanos ci', 'ci.id_persona = per.id', 'left')
            ->where('i.estado_pago', 'PENDIENTE')
            ->where('c.costo_inscripcion >', 0)
            ->whereNotIn('i.estado', ['ANULADO', 'CANCELADO'])
            ->get()->getResultArray();
        $cursosPendientes = array_values(array_filter(
            $cursosPendientes,
            static fn ($c) => !in_array((int) $c['id'], $idsInscripcionesConRecibo, true)
        ));

        // Resolución de "pagado por" en bloque (una consulta por tipo de
        // origen, no una por fila) para evitar N+1 al construir el listado.
        $idsPapeletaPagador = array_values(array_unique(array_filter(array_merge(
            array_map(static fn ($r) => (int) ($r['id_papeleta'] ?? 0), $rows),
            array_map(static fn ($p) => (int) $p['id'], $papeletasPendientes)
        ))));
        $idsTramitePagador = array_values(array_unique(array_filter(
            array_map(static fn ($r) => (int) ($r['id_tramite'] ?? 0), $rows)
        )));
        $idsCursoPagador = array_values(array_unique(array_filter(array_merge(
            array_map(static fn ($r) => (int) ($r['id_inscripcion'] ?? 0), $rows),
            array_map(static fn ($c) => (int) $c['id'], $cursosPendientes)
        ))));
        $idsInternamientoPagador = array_values(array_unique(array_merge(
            array_map(static fn ($p) => (int) $p['id'], $pendientes),
            array_map(static fn ($p) => (int) $p['id_internamiento'], $pagados)
        )));

        $mapasPagador = $this->resolverPagadoresEnBloque(
            $db,
            $idsPapeletaPagador,
            $idsTramitePagador,
            $idsCursoPagador,
            $idsInternamientoPagador
        );

        $pagos = array_map(fn ($row) => $this->present($row, $mapasPagador), $rows);

        foreach ($pendientes as $p) {
            $pagos[] = $this->formatearPagoInternamiento($p, 'int_p_', $mapasPagador);
        }

        foreach ($pagados as $p) {
            $pagos[] = $this->formatearPagoInternamiento($p, 'int_l_', $mapasPagador);
        }

        foreach ($papeletasPendientes as $p) {
            $pagos[] = [
                'id' => 'pap_pend_' . $p['id'],
                'tipoPago' => 'PAPELETA',
                'papeletaId' => (int)$p['id'], 'tramiteId' => null, 'inscripcionId' => null,
                'origenId' => (int)$p['id'],
                'numeroRecibo' => null,
                'numeroVoucher' => null,
                'metodo' => 'SIN CONFIRMAR',
                'metodoPago' => 'SIN CONFIRMAR',
                'referenciaPago' => 'Papeleta ' . $p['numero_papeleta'] . ($p['placa'] ? ' — ' . $p['placa'] : ''),
                'montoTotal' => (float)$p['monto_total'],
                'fecha' => $p['fecha_hora'],
                'fechaHora' => $p['fecha_hora'],
                'estado' => 'PENDIENTE',
                'pagadoPor' => $mapasPagador['papeleta'][(int) $p['id']] ?? null,
            ];
        }

        foreach ($cursosPendientes as $c) {
            $pagos[] = [
                'id' => 'cur_pend_' . $c['id'],
                'tipoPago' => 'CURSO',
                'papeletaId' => null, 'tramiteId' => null, 'inscripcionId' => (int)$c['id'],
                'origenId' => (int)$c['id'],
                'numeroRecibo' => null,
                'numeroVoucher' => null,
                'metodo' => 'SIN CONFIRMAR',
                'metodoPago' => 'SIN CONFIRMAR',
                'referenciaPago' => 'Curso ' . $c['curso_nombre'] . ' — ' . trim($c['persona_nombre'] ?? ''),
                'montoTotal' => (float)$c['costo_inscripcion'],
                'fecha' => $c['fecha_inscripcion'],
                'fechaHora' => $c['fecha_inscripcion'],
                'estado' => 'PENDIENTE',
                'pagadoPor' => $mapasPagador['curso'][(int) $c['id']] ?? null,
            ];
        }

        // Filtrado en memoria unificado si se solicita búsqueda o filtros
        if ($buscar !== '' || $metodoFiltro !== '' || ($tipoFiltro !== '' && $tipoFiltro !== 'TODOS') || ($estadoFiltro !== '' && $estadoFiltro !== 'TODOS')) {
            $pagos = array_values(array_filter($pagos, function ($p) use ($buscar, $tipoFiltro, $estadoFiltro, $metodoFiltro) {
                $medio = strtoupper((string)($p['metodo'] ?? ''));
                if ($metodoFiltro === 'SIN_CONFIRMAR' && !in_array($medio, ['', 'SIN CONFIRMAR'], true)) return false;
                if (in_array($metodoFiltro, ['EFECTIVO', 'TARJETA'], true) && $medio !== $metodoFiltro) return false;
                if ($tipoFiltro !== '' && $tipoFiltro !== 'TODOS' && strtoupper((string)$p['tipoPago']) !== $tipoFiltro) {
                    return false;
                }
                if ($estadoFiltro !== '' && $estadoFiltro !== 'TODOS' && strtoupper((string)$p['estado']) !== $estadoFiltro) {
                    return false;
                }
                if ($buscar !== '') {
                    $haystack = strtolower(implode(' ', [
                        $p['numeroRecibo'] ?? '',
                        $p['numeroVoucher'] ?? '',
                        $p['referenciaPago'] ?? '',
                        $p['pagadoPor'] ?? '',
                        $p['metodo'] ?? '',
                    ]));
                    if (!str_contains($haystack, strtolower($buscar))) {
                        return false;
                    }
                }
                return true;
            }));
        }

        // Ordenamiento: el listado de pagos es un array PHP en memoria (mezcla
        // pagos_transito + pendientes sin recibo de 3 orígenes distintos), no
        // una sola consulta SQL, así que el orden pedido por el cliente se
        // aplica aquí con usort en vez de con QuerySort (que necesita un query builder).
        $columnasOrdenablesPago = ['numeroRecibo', 'referenciaPago', 'metodoPago', 'montoTotal', 'estado', 'fecha'];
        // Admite varias columnas ("a,b" con "ASC,DESC"); solo cuentan las de la lista blanca.
        $claves = array_values(array_filter(
            array_map('trim', explode(',', (string) $this->request->getGet('sortBy'))),
            static fn($c) => in_array($c, $columnasOrdenablesPago, true)
        ));
        $direcciones = array_map('strtoupper', array_map('trim', explode(',', (string) $this->request->getGet('sortDir'))));

        if ($claves !== []) {
            usort($pagos, function ($a, $b) use ($claves, $direcciones) {
                foreach ($claves as $i => $sortBy) {
                    $valA = $a[$sortBy] ?? '';
                    $valB = $b[$sortBy] ?? '';
                    if ($sortBy === 'fecha') {
                        $valA = $valA ? strtotime($valA) : 0;
                        $valB = $valB ? strtotime($valB) : 0;
                    } elseif ($sortBy === 'montoTotal') {
                        $valA = (float) $valA;
                        $valB = (float) $valB;
                    } else {
                        $valA = strtolower((string) $valA);
                        $valB = strtolower((string) $valB);
                    }
                    $cmp = $valA <=> $valB;
                    if ($cmp !== 0) {
                        return ($direcciones[$i] ?? 'DESC') === 'ASC' ? $cmp : -$cmp;
                    }
                }
                return 0;
            });
        } else {
            usort($pagos, function($a, $b) {
                $dateA = $a['fecha'] ? strtotime($a['fecha']) : 0;
                $dateB = $b['fecha'] ? strtotime($b['fecha']) : 0;
                if ($dateA === $dateB) return 0;
                return $dateB <=> $dateA;
            });
        }

        if ($page > 0) {
            $total = count($pagos);
            $slice = array_slice($pagos, ($page - 1) * $porPagina, $porPagina);
            return $this->respond([
                'data' => $slice,
                'meta' => [
                    'total' => $total,
                    'page' => $page,
                    'porPagina' => $porPagina,
                    'totalPaginas' => (int) ceil($total / $porPagina),
                ],
            ]);
        }

        return $this->respond(['data' => $pagos]);
    }

    /**
     * IDs de una columna de referencia (papeleta/trámite/inscripción) que ya
     * tienen un recibo generado en pagos_transito, para excluirlos de las
     * listas de "pendientes sin recibo".
     */
    private function listarPagina($db, int $page, int $porPagina, string $buscar, string $tipo, string $estado, string $metodo = '')
    {
        $builder = \App\Libraries\PagosListado::builder($db);
        if ($tipo !== '' && $tipo !== 'TODOS') $builder->where('listado.tipo_pago', $tipo);
        if ($estado !== '' && $estado !== 'TODOS') $builder->where('listado.estado', $estado);
        if ($metodo === 'SIN_CONFIRMAR') {
            $builder->groupStart()->where("COALESCE(listado.medio_pago, '') IN ('', 'SIN CONFIRMAR')", null, false)->groupEnd();
        } elseif (in_array($metodo, ['EFECTIVO', 'TARJETA'], true)) {
            $builder->where('listado.medio_pago', $metodo);
        }
        if ($buscar !== '') {
            // La búsqueda usa los mismos pagadores que se muestran en la tabla.
            $nombre = "TRIM(CONCAT(COALESCE(c.nombres,''), ' ', COALESCE(c.apellido_paterno,''), ' ', COALESCE(c.apellido_materno,'')))";
            $patron = $db->escape('%' . $db->escapeLikeString($buscar) . '%');
            $coincide = "($nombre LIKE $patron ESCAPE '!' OR per.numero LIKE $patron ESCAPE '!')";
            $builder->groupStart()->like('listado.numero_recibo', $buscar)
                ->orLike('listado.numero_voucher', $buscar)->orLike('listado.referencia_pago', $buscar)
                ->orLike('listado.medio_pago', $buscar)
                ->orWhere("EXISTS (SELECT 1 FROM papeletas p LEFT JOIN personas per ON per.id=p.id_persona_infractor LEFT JOIN ciudadanos c ON c.id_persona=per.id WHERE p.id=listado.id_papeleta AND $coincide)", null, false)
                ->orWhere("EXISTS (SELECT 1 FROM inscripciones_curso i LEFT JOIN personas per ON per.id=i.id_persona LEFT JOIN ciudadanos c ON c.id_persona=per.id WHERE i.id=listado.id_inscripcion AND $coincide)", null, false)
                ->orWhere("EXISTS (SELECT 1 FROM tramites_documentarios t LEFT JOIN personas per ON per.id=t.id_persona LEFT JOIN ciudadanos c ON c.id_persona=per.id LEFT JOIN asociaciones a ON a.id=t.id_asociacion WHERE t.id=listado.id_tramite AND ($coincide OR a.razon_social LIKE $patron ESCAPE '!'))", null, false)
                ->orWhere("EXISTS (SELECT 1 FROM ordenes_internamiento oi JOIN vehiculo_propietarios vp ON vp.id_vehiculo=oi.id_vehiculo AND vp.estado='ACTIVO' LEFT JOIN personas per ON per.id=vp.id_persona LEFT JOIN ciudadanos c ON c.id_persona=per.id WHERE oi.id=listado.id_internamiento AND $coincide)", null, false)
                ->groupEnd();
        }
        $total = (clone $builder)->countAllResults();
        \App\Libraries\QuerySort::aplicar($builder, $this->request, [
            'numeroRecibo'=>'listado.numero_recibo', 'referenciaPago'=>'listado.referencia_pago',
            'metodoPago'=>'listado.medio_pago', 'montoTotal'=>'listado.total',
            'estado'=>'listado.estado', 'fecha'=>'listado.fecha_pago',
        ], 'listado.fecha_pago');
        $rows = $builder->orderBy('listado.prefijo', 'ASC')->orderBy('listado.id', 'DESC')
            ->limit($porPagina, ($page - 1) * $porPagina)->get()->getResultArray();
        $mapas = $this->resolverPagadoresEnBloque($db,
            array_filter(array_column($rows, 'id_papeleta')), array_filter(array_column($rows, 'id_tramite')),
            array_filter(array_column($rows, 'id_inscripcion')), array_filter(array_column($rows, 'id_internamiento')));
        $data = array_map(function ($row) use ($mapas) {
            if ($row['tipo_pago'] === 'INTERNAMIENTO') return $this->formatearPagoInternamiento($row, $row['prefijo'], $mapas);
            $pago = $this->present($row, $mapas);
            if ($row['prefijo'] !== '') {
                $pago['id'] = $row['prefijo'] . $row['id'];
                $pago['origenId'] = (int)$row['id'];
            }
            return $pago;
        }, $rows);
        return $this->respond(['data'=>$data, 'meta'=>[
            'total'=>$total, 'page'=>$page, 'porPagina'=>$porPagina, 'totalPaginas'=>(int)ceil($total/$porPagina),
        ]]);
    }

    private const COLUMNAS_REFERENCIA_PAGO = ['id_papeleta', 'id_tramite', 'id_inscripcion'];

    private function idsConRecibo($db, string $columna): array
    {
        if (!in_array($columna, self::COLUMNAS_REFERENCIA_PAGO, true)) {
            throw new \InvalidArgumentException('Columna de referencia de pago no permitida.');
        }
        $rows = $db->table('pagos_transito')->select($columna)->where($columna . ' IS NOT NULL')->where('estado !=', 'ANULADO')->get()->getResultArray();
        return array_map(static fn($r) => (int)$r[$columna], $rows);
    }

    /**
     * Da forma de fila de pago a una orden de internamiento (retenida o
     * liberada), que no vive en pagos_transito pero debe listarse junto a los
     * demás comprobantes.
     */
    private function formatearPagoInternamiento(array $row, string $idPrefix, ?array $mapasPagador): array
    {
        return [
            'id' => $idPrefix . $row['id'],
            'tipoPago' => $row['tipo_pago'],
            'papeletaId' => null, 'tramiteId' => null, 'inscripcionId' => null,
            'numeroRecibo' => $row['numero_recibo'],
            'numeroVoucher' => $row['numero_voucher'],
            'metodo' => $row['medio_pago'],
            'metodoPago' => $row['medio_pago'],
            'referenciaPago' => $row['referencia_pago'],
            'montoTotal' => (float)$row['total'],
            'fecha' => $row['fecha_pago'],
            'fechaHora' => $row['fecha_pago'],
            'estado' => $row['estado'],
            'pagadoPor' => $mapasPagador['internamiento'][(int) ($row['id_internamiento'] ?? $row['id'])] ?? null,
        ];
    }

    public function present(array $row, ?array $mapasPagador = null): array
    {
        $mapasPagador ??= $this->resolverPagadoresEnBloque(
            \Config\Database::connect(),
            !empty($row['id_papeleta']) ? [(int) $row['id_papeleta']] : [],
            !empty($row['id_tramite']) ? [(int) $row['id_tramite']] : [],
            !empty($row['id_inscripcion']) ? [(int) $row['id_inscripcion']] : [],
            []
        );

        $tipo = strtolower($row['tipo_pago'] ?? '');
        $pagadoPor = match ($tipo) {
            'papeleta' => $mapasPagador['papeleta'][(int) ($row['id_papeleta'] ?? 0)] ?? null,
            'tramite' => $mapasPagador['tramite'][(int) ($row['id_tramite'] ?? 0)] ?? null,
            'curso' => $mapasPagador['curso'][(int) ($row['id_inscripcion'] ?? 0)] ?? null,
            default => null,
        };

        return [
            'id' => (int)$row['id'], 'uuid' => $row['uuid'] ?? null, 'tipoPago' => $row['tipo_pago'],
            'papeletaId' => $row['id_papeleta'], 'tramiteId' => $row['id_tramite'], 'inscripcionId' => $row['id_inscripcion'],
            'numeroRecibo' => $row['numero_recibo'], 'numeroVoucher' => $row['numero_voucher'],
            'metodo' => $row['medio_pago'], 'metodoPago' => $row['medio_pago'],
            'referenciaPago' => $row['referencia_pago'], 'montoTotal' => (float)$row['total'],
            'fecha' => $row['fecha_pago'], 'fechaHora' => $row['fecha_pago'], 'estado' => $row['estado'],
            'pagadoPor' => $pagadoPor,
            'operacionRepetida' => (int)($row['operacion_repetida'] ?? 0),
        ];
    }

    /**
     * Resuelve el nombre de quien realizó cada pago con una sola consulta por
     * tipo de origen (papeleta/trámite/curso/internamiento) en vez de una
     * consulta por fila, evitando el patrón N+1 al construir el listado.
     */
    private function resolverPagadoresEnBloque($db, array $idsPapeleta, array $idsTramite, array $idsCurso, array $idsInternamiento): array
    {
        $mapas = ['papeleta' => [], 'tramite' => [], 'curso' => [], 'internamiento' => []];

        if (!empty($idsPapeleta)) {
            $rows = $db->table('papeletas p')
                ->select("p.id, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))) as nombre", false)
                ->join('personas per', 'per.id = p.id_persona_infractor', 'left')
                ->join('ciudadanos c', 'c.id_persona = per.id', 'left')
                ->whereIn('p.id', $idsPapeleta)
                ->get()->getResultArray();
            foreach ($rows as $r) {
                $mapas['papeleta'][(int) $r['id']] = $r['nombre'] ?: null;
            }
        }

        if (!empty($idsTramite)) {
            $tramites = $db->table('tramites_documentarios')
                ->select('id, id_persona, id_asociacion')
                ->whereIn('id', $idsTramite)
                ->get()->getResultArray();

            $idsPersonaTramite = array_values(array_unique(array_filter(array_map(static fn ($t) => (int) ($t['id_persona'] ?? 0), $tramites))));
            $idsAsociacionTramite = array_values(array_unique(array_filter(array_map(static fn ($t) => (int) ($t['id_asociacion'] ?? 0), $tramites))));

            $nombresPersona = [];
            if (!empty($idsPersonaTramite)) {
                $rows = $db->table('personas p')
                    ->select("p.id, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))) as nombre", false)
                    ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                    ->whereIn('p.id', $idsPersonaTramite)
                    ->get()->getResultArray();
                foreach ($rows as $r) {
                    $nombresPersona[(int) $r['id']] = $r['nombre'] ?: null;
                }
            }

            $nombresAsociacion = [];
            if (!empty($idsAsociacionTramite)) {
                $rows = $db->table('asociaciones')->select('id, razon_social')->whereIn('id', $idsAsociacionTramite)->get()->getResultArray();
                foreach ($rows as $r) {
                    $nombresAsociacion[(int) $r['id']] = $r['razon_social'] ?? null;
                }
            }

            foreach ($tramites as $t) {
                $nombre = null;
                if (!empty($t['id_persona']) && !empty($nombresPersona[(int) $t['id_persona']])) {
                    $nombre = $nombresPersona[(int) $t['id_persona']];
                } elseif (!empty($t['id_asociacion'])) {
                    $nombre = $nombresAsociacion[(int) $t['id_asociacion']] ?? null;
                }
                $mapas['tramite'][(int) $t['id']] = $nombre;
            }
        }

        if (!empty($idsCurso)) {
            $rows = $db->table('inscripciones_curso i')
                ->select("i.id, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))) as nombre", false)
                ->join('personas p', 'p.id = i.id_persona', 'left')
                ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                ->whereIn('i.id', $idsCurso)
                ->get()->getResultArray();
            foreach ($rows as $r) {
                $mapas['curso'][(int) $r['id']] = $r['nombre'] ?: null;
            }
        }

        if (!empty($idsInternamiento)) {
            $rows = $db->table('ordenes_internamiento oi')
                ->select("oi.id, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))) as nombre", false)
                ->join('vehiculos v', 'v.id = oi.id_vehiculo', 'left')
                ->join('vehiculo_propietarios vp', "vp.id_vehiculo = v.id AND vp.estado = 'ACTIVO'", 'left')
                ->join('personas p', 'p.id = vp.id_persona', 'left')
                ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                ->whereIn('oi.id', $idsInternamiento)
                ->get()->getResultArray();
            foreach ($rows as $r) {
                $mapas['internamiento'][(int) $r['id']] = $r['nombre'] ?: null;
            }
        }

        return $mapas;
    }

    public function create()
    {
        try {
            $input = $this->request->getJSON(true) ?? [];

            $rules = [
                'tipoPago' => [
                    'rules' => 'required|in_list[PAPELETA,TRAMITE,CURSO]',
                    'errors' => [
                        'required' => 'El tipo de pago es obligatorio.',
                        'in_list' => 'El tipo de pago no es válido.'
                    ]
                ]
            ];

            if (!$this->validateData($input, $rules)) {
                return $this->failValidationErrors($this->validator->getErrors());
            }

            $tipo = strtoupper(trim($input['tipoPago'] ?? ''));
            $key = ['PAPELETA' => 'papeletaId', 'TRAMITE' => 'tramiteId', 'CURSO' => 'inscripcionId'][$tipo] ?? '';
            
            $rulesId = [
                $key => [
                    'rules' => 'required|is_natural_no_zero',
                    'errors' => [
                        'required' => "El ID de $tipo es obligatorio.",
                        'is_natural_no_zero' => "El ID de $tipo debe ser un número válido."
                    ]
                ]
            ];

            if (!$this->validateData($input, $rulesId)) {
                return $this->failValidationErrors($this->validator->getErrors());
            }

            $service = new PagosTransito(\Config\Database::connect());
            $pago = $service->generar($tipo, (int)($input[$key] ?? 0));

            // Si ya vienen los datos del recibo (flujo en un solo paso desde
            // "Registrar Pago"), se confirma de inmediato como PAGADO.
            if (trim($input['fechaPago'] ?? '') !== '') {
                $pago = $service->confirmar((int)$pago['id'], $input);
            }

            return $this->respondCreated(['data' => $this->present($pago)]);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('No se pudo generar el pago.');
        }
    }

    public function confirmar($id = null)
    {
        try {
            $input = $this->request->getJSON(true) ?? [];
            $pago = (new PagosTransito(\Config\Database::connect()))->confirmar((int)$id, $input);
            
            AuditoriaService::registrar(
                'PAGOS',
                'CONFIRMAR',
                "Se confirmó el pago N° {$pago['numero_recibo']} ({$pago['tipo_pago']}) por S/ {$pago['total']}",
                ['id' => $id, 'numeroRecibo' => $pago['numero_recibo'], 'monto' => $pago['total'], 'metodo' => $pago['medio_pago']]
            );

            return $this->respond(['data' => $this->present($pago)]);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('No se pudo confirmar el pago. Compruebe que el recibo no esté duplicado.');
        }
    }

    public function delete($id = null)
    {
        try {
            (new PagosTransito(\Config\Database::connect()))->anular((int)$id);

            AuditoriaService::registrar(
                'PAGOS',
                'ANULAR',
                "Se anuló el recibo de pago ID: $id",
                ['id' => $id]
            );

            return $this->respond(['message' => 'Pago anulado.']);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('No se pudo anular el pago.');
        }
    }

    public function origenes()
    {
        $db = \Config\Database::connect();
        return $this->respond(['data' => [
            'PAPELETA' => $db->table('papeletas')->select('id, numero_papeleta AS nombre, monto_total AS monto')->where('estado', 'PENDIENTE_PAGO')->get()->getResultArray(),
            'TRAMITE' => $db->table('tramites_documentarios')->select('id, numero_expediente AS nombre, NULL AS monto', false)->where('id_procedimiento_admin IS NOT NULL', null, false)->whereNotIn('estado', ['ANULADO','ANULADA'])->get()->getResultArray(),
            'CURSO' => $db->table('inscripciones_curso i')->select("i.id, CONCAT(c.nombre, ' — ', ci.nombres, ' ', ci.apellido_paterno) AS nombre, c.costo_inscripcion AS monto", false)->join('cursos_seguridad_vial c', 'c.id=i.id_curso')->join('ciudadanos ci', 'ci.id_persona=i.id_persona')->where('i.estado_pago !=', 'PAGADO')->whereNotIn('i.estado', ['ANULADO','CANCELADO'])->get()->getResultArray(),
        ]]);
    }

    /**
     * Busca a una persona por DNI y devuelve todas sus deudas pendientes
     * (papeletas como infractor, trámites y cursos), para poder cobrarlas
     * todas desde un mismo lugar en vez de buscar registro por registro.
     */
    public function deudasPorPersona()
    {
        $db = \Config\Database::connect();
        $dni = trim($this->request->getGet('dni') ?? '');

        if ($dni === '') {
            return $this->failValidationErrors('Ingresa el DNI de la persona a buscar.');
        }

        $persona = $db->table('personas p')
            ->select("p.id, p.numero, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))) as nombre", false)
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->where('p.numero', $dni)
            ->get()->getRowArray();

        if (!$persona) {
            return $this->failNotFound('No se encontró una persona con ese DNI en el sistema.');
        }

        $idPersona = (int)$persona['id'];

        $papeletas = $db->table('papeletas p')
            ->select("p.id, p.numero_papeleta as nombre, p.monto_total as monto", false)
            ->where('p.id_persona_infractor', $idPersona)
            ->where('p.estado', 'PENDIENTE_PAGO')
            ->get()->getResultArray();

        $tramites = $db->table('tramites_documentarios t')
            ->select("t.id, t.numero_expediente as nombre, NULL as monto", false)
            ->where('t.id_persona', $idPersona)
            ->whereNotIn('t.estado', ['ANULADO', 'ANULADA'])
            ->get()->getResultArray();

        $cursos = $db->table('inscripciones_curso i')
            ->select("i.id, c.nombre as nombre, c.costo_inscripcion as monto", false)
            ->join('cursos_seguridad_vial c', 'c.id = i.id_curso')
            ->where('i.id_persona', $idPersona)
            ->where('i.estado_pago', 'PENDIENTE')
            ->where('c.costo_inscripcion >', 0)
            ->whereNotIn('i.estado', ['ANULADO', 'CANCELADO'])
            ->get()->getResultArray();

        $idsPapeletasConRecibo = $this->idsConRecibo($db, 'id_papeleta');
        $idsTramitesConRecibo = $this->idsConRecibo($db, 'id_tramite');
        $idsInscripcionesConRecibo = $this->idsConRecibo($db, 'id_inscripcion');

        $deudas = [];
        foreach ($papeletas as $p) {
            if (in_array((int)$p['id'], $idsPapeletasConRecibo, true)) continue;
            $deudas[] = ['tipoPago' => 'PAPELETA', 'id' => (int)$p['id'], 'nombre' => $p['nombre'], 'monto' => (float)$p['monto']];
        }
        foreach ($tramites as $t) {
            if (in_array((int)$t['id'], $idsTramitesConRecibo, true)) continue;
            $deudas[] = ['tipoPago' => 'TRAMITE', 'id' => (int)$t['id'], 'nombre' => $t['nombre'], 'monto' => null];
        }
        foreach ($cursos as $c) {
            if (in_array((int)$c['id'], $idsInscripcionesConRecibo, true)) continue;
            $deudas[] = ['tipoPago' => 'CURSO', 'id' => (int)$c['id'], 'nombre' => $c['nombre'], 'monto' => (float)$c['monto']];
        }

        return $this->respond(['data' => [
            'persona' => ['id' => $idPersona, 'dni' => $persona['numero'], 'nombre' => $persona['nombre']],
            'deudas' => $deudas,
        ]]);
    }

    public function arqueoDiario()
    {
        $db = \Config\Database::connect();
        $fecha = trim($this->request->getGet('fecha') ?? date('Y-m-d'));
        $fechaValida = false;
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $fecha, $m)) {
            $fechaValida = checkdate((int)$m[2], (int)$m[3], (int)$m[1]);
        }
        if (!$fechaValida) {
            $fecha = date('Y-m-d');
        }

        $pagosTransito = $db->table('pagos_transito')
            ->where('DATE(fecha_pago)', $fecha)
            ->where('estado', 'PAGADO')
            ->orderBy('hora_pago', 'ASC')
            ->get()
            ->getResultArray();

        $pagosInternamiento = $db->table('ordenes_libertad ol')
            ->select("ol.id, 'INTERNAMIENTO' as tipo_pago, COALESCE(ol.numero_recibo_guardiania, ol.numero_recibo_papeleta, ol.numero_recibo_remolque, CONCAT('ORD-', ol.numero_orden)) as numero_recibo, 'EFECTIVO' as medio_pago, CONCAT('Liberación Vehículo - Orden #', ol.numero_orden) as referencia_pago, ol.monto_total as total, ol.fecha_emision as fecha_pago, 'PAGADO' as estado", false)
            ->where('DATE(ol.fecha_emision)', $fecha)
            ->get()
            ->getResultArray();

        $todosPagos = [];
        foreach ($pagosTransito as $p) {
            $todosPagos[] = [
                'id' => (int)$p['id'],
                'numeroRecibo' => $p['numero_recibo'] ?: 'REC-' . $p['id'],
                'tipoPago' => $p['tipo_pago'],
                'metodoPago' => strtoupper($p['medio_pago'] ?: 'EFECTIVO'),
                'monto' => (float)$p['total'],
                'referencia' => $p['referencia_pago'] ?: '',
                'hora' => $p['hora_pago'] ?: '00:00:00',
                'cajero' => ($p['cajero'] ?? '') ?: 'Cajero Principal',
            ];
        }
        foreach ($pagosInternamiento as $p) {
            $todosPagos[] = [
                'id' => 'int_' . $p['id'],
                'numeroRecibo' => $p['numero_recibo'],
                'tipoPago' => 'INTERNAMIENTO',
                'metodoPago' => 'EFECTIVO',
                'monto' => (float)$p['total'],
                'referencia' => $p['referencia_pago'],
                'hora' => '12:00:00',
                'cajero' => 'Cajero Depósito',
            ];
        }

        $totalRecaudado = 0;
        $totalEfectivo = 0;
        $totalTarjeta = 0;
        $totalTransferencia = 0;
        $porConcepto = [
            'PAPELETA' => ['tipoPago' => 'PAPELETA', 'cantidad' => 0, 'total' => 0],
            'TRAMITE' => ['tipoPago' => 'TRAMITE', 'cantidad' => 0, 'total' => 0],
            'CURSO' => ['tipoPago' => 'CURSO', 'cantidad' => 0, 'total' => 0],
            'INTERNAMIENTO' => ['tipoPago' => 'INTERNAMIENTO', 'cantidad' => 0, 'total' => 0],
        ];
        $porCajero = [];

        foreach ($todosPagos as $item) {
            $m = $item['monto'];
            $totalRecaudado += $m;
            
            $metodo = $item['metodoPago'];
            if (str_contains($metodo, 'TARJETA') || str_contains($metodo, 'POS') || str_contains($metodo, 'DEBITO') || str_contains($metodo, 'CREDITO')) {
                $totalTarjeta += $m;
            } elseif (str_contains($metodo, 'TRANS') || str_contains($metodo, 'DEPOSITO') || str_contains($metodo, 'BBVA') || str_contains($metodo, 'BN')) {
                $totalTransferencia += $m;
            } else {
                $totalEfectivo += $m;
            }

            $c = $item['tipoPago'];
            if (!isset($porConcepto[$c])) {
                $porConcepto[$c] = ['tipoPago' => $c, 'cantidad' => 0, 'total' => 0];
            }
            $porConcepto[$c]['cantidad']++;
            $porConcepto[$c]['total'] += $m;

            $caj = $item['cajero'];
            if (!isset($porCajero[$caj])) {
                $porCajero[$caj] = ['cajero' => $caj, 'operaciones' => 0, 'monto' => 0];
            }
            $porCajero[$caj]['operaciones']++;
            $porCajero[$caj]['monto'] += $m;
        }

        return $this->respond([
            'data' => [
                'fecha' => $fecha,
                'totalOperaciones' => count($todosPagos),
                'totalRecaudado' => round($totalRecaudado, 2),
                'totalEfectivo' => round($totalEfectivo, 2),
                'totalTarjeta' => round($totalTarjeta, 2),
                'totalTransferencia' => round($totalTransferencia, 2),
                'porConcepto' => array_values($porConcepto),
                'porCajero' => array_values($porCajero),
                'detalles' => $todosPagos,
            ]
        ]);
    }
}
