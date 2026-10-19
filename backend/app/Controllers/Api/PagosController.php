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
                SUM(monto_guardiania + monto_remolque) as monto,
                SUM(CASE WHEN DATE(fecha_emision) = CURDATE() THEN 1 ELSE 0 END) as hoy
            ", false)
            ->where('(monto_guardiania + monto_remolque) >', 0, false)
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
        $metodoFiltro = strtoupper(trim((string)$this->request->getGet('metodo')));

// Todos los orígenes se filtran y paginan en SQL, sin cargar el listado completo.
        if ($page > 0) {
            return $this->listarPagina($db, $page, $porPagina, $buscar, $tipoFiltro, $estadoFiltro, $metodoFiltro);
        }

        $rows = $db->table('pagos_transito')->where(\App\Libraries\PagosListado::condicionReciboVisible('pagos_transito'), null, false)->orderBy('id', 'DESC')->get()->getResultArray();

        $pendientes = $db->table('ordenes_internamiento oi')
            ->select("oi.id, 'INTERNAMIENTO' as tipo_pago, NULL as numero_recibo, NULL as numero_voucher, 'SIN CONFIRMAR' as medio_pago, CONCAT('Boleta #', oi.numero_boleta) as referencia_pago, 0 as total, NULL as fecha_pago, 'PENDIENTE' as estado")
            ->where('oi.estado', 'RETENIDO')
            ->get()->getResultArray();

// un único método por cada recibo combinado.
        $pagados = $db->table('ordenes_libertad ol')
            ->select("ol.id, ol.id_internamiento, 'INTERNAMIENTO' as tipo_pago, COALESCE(ol.numero_recibo_guardiania, ol.numero_recibo_remolque, 'VARIOS') as numero_recibo, NULL as numero_voucher,
                COALESCE(NULLIF(CONCAT_WS(' + ',
                    IF(ol.monto_guardiania > 0, 'DEPÓSITO', NULL),
                    IF(ol.monto_remolque > 0, 'REMOLQUE', NULL)
                ), ''), 'VARIOS CONCEPTOS') as medio_pago,
                CONCAT('Orden #', ol.numero_orden) as referencia_pago, (ol.monto_guardiania + ol.monto_remolque) as total, ol.fecha_emision as fecha_pago, 'PAGADO' as estado", false)
            ->where('(ol.monto_guardiania + ol.monto_remolque) >', 0, false)
            ->get()->getResultArray();

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

        $columnasOrdenablesPago = ['numeroRecibo', 'referenciaPago', 'metodoPago', 'montoTotal', 'estado', 'fecha'];

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

    private function listarPagina($db, int $page, int $porPagina, string $buscar, string $tipo, string $estado, string $metodo = '')
    {
        $builder = \App\Libraries\PagosListado::builder($db);
        $papeletaId = trim((string) $this->request->getGet('papeletaId'));
        if ($papeletaId !== '') {
            if (!ctype_digit($papeletaId) || (int) $papeletaId <= 0) {
                return $this->failValidationErrors('La papeleta no es válida.');
            }
            $builder->where('listado.id_papeleta', (int) $papeletaId);
        }
        // CERTICAV es un trámite con su propio filtro: "Trámites" muestra el resto.
        $tramiteCerticav = "EXISTS (SELECT 1 FROM tramites_documentarios tc JOIN procedimientos_administrativos pc ON pc.id = tc.id_procedimiento_admin WHERE tc.id = listado.id_tramite AND pc.codigo = '" . \App\Services\CerticavPago::CODIGO . "')";
        if ($tipo === 'CERTICAV') {
            $builder->where('listado.tipo_pago', 'TRAMITE')->where($tramiteCerticav, null, false);
        } elseif ($tipo === 'TRAMITE') {
            $builder->where('listado.tipo_pago', 'TRAMITE')->where('NOT ' . $tramiteCerticav, null, false);
        } elseif ($tipo !== '' && $tipo !== 'TODOS') {
            $builder->where('listado.tipo_pago', $tipo);
        }
        if ($estado !== '' && $estado !== 'TODOS') $builder->where('listado.estado', $estado);
        if ($metodo === 'SIN_CONFIRMAR') {
            $builder->groupStart()->where("COALESCE(listado.medio_pago, '') IN ('', 'SIN CONFIRMAR')", null, false)->groupEnd();
        } elseif (in_array($metodo, ['EFECTIVO', 'TARJETA'], true)) {
            $builder->where('listado.medio_pago', $metodo);
        }
        if ($buscar !== '') {

            $nombre = "TRIM(CONCAT(COALESCE(c.nombres,''), ' ', COALESCE(c.apellido_paterno,''), ' ', COALESCE(c.apellido_materno,'')))";
            $patron = $db->escape('%' . $db->escapeLikeString($buscar) . '%');
            $coincide = "($nombre LIKE $patron ESCAPE '!' OR per.numero LIKE $patron ESCAPE '!')";
            $builder->groupStart()->like('listado.numero_recibo', $buscar)
                ->orLike('listado.numero_voucher', $buscar)->orLike('listado.referencia_pago', $buscar)
                ->orLike('listado.medio_pago', $buscar)
                ->orWhere("EXISTS (SELECT 1 FROM papeletas p LEFT JOIN personas per ON per.id=p.id_persona_infractor LEFT JOIN ciudadanos c ON c.id_persona=per.id WHERE p.id=listado.id_papeleta AND $coincide)", null, false)
                ->orWhere("EXISTS (SELECT 1 FROM inscripciones_curso i LEFT JOIN personas per ON per.id=i.id_persona LEFT JOIN ciudadanos c ON c.id_persona=per.id WHERE i.id=listado.id_inscripcion AND $coincide)", null, false)
                ->orWhere("EXISTS (SELECT 1 FROM tramites_documentarios t LEFT JOIN personas per ON per.id=t.id_persona LEFT JOIN ciudadanos c ON c.id_persona=per.id LEFT JOIN asociaciones a ON a.id=t.id_asociacion LEFT JOIN vehiculos ve ON ve.id=t.id_vehiculo WHERE t.id=listado.id_tramite AND ($coincide OR a.razon_social LIKE $patron ESCAPE '!' OR t.numero_expediente LIKE $patron ESCAPE '!' OR ve.placa LIKE $patron ESCAPE '!'))", null, false)
                ->orWhere("EXISTS (SELECT 1 FROM ordenes_internamiento oi JOIN vehiculo_propietarios vp ON vp.id_vehiculo=oi.id_vehiculo AND vp.estado='ACTIVO' LEFT JOIN personas per ON per.id=vp.id_persona LEFT JOIN ciudadanos c ON c.id_persona=per.id WHERE oi.id=listado.id_internamiento AND $coincide)", null, false)
                ->groupEnd();
        }
        $total = (clone $builder)->countAllResults();
        // Sin un orden elegido, lo más reciente arriba: un cobro recién pagado y una solicitud recién creada
        // aparecen juntos al inicio. Un cobro pendiente cuenta desde su fecha de registro y, dentro de su día, va primero
        // (no tiene hora de pago; así una solicitud de hoy no queda debajo de los cobros ya hechos hoy).
        if (trim((string) $this->request->getGet('sortBy')) === '') {
            $builder->orderBy('COALESCE(listado.fecha_pago, listado.fecha_registro)', 'DESC', false)
                ->orderBy("COALESCE(listado.hora_pago, '23:59:59')", 'DESC', false);
        }
        \App\Libraries\QuerySort::aplicar($builder, $this->request, [
            'numeroRecibo'=>'listado.numero_recibo', 'referenciaPago'=>'listado.referencia_pago',
            'metodoPago'=>'listado.medio_pago', 'montoTotal'=>'listado.total',
            'estado'=>'listado.estado', 'fecha'=>'listado.fecha_pago',
        ], 'listado.fecha_pago');
        $rows = $builder->orderBy('listado.prefijo', 'ASC')->orderBy('listado.id', 'DESC')
            ->limit($porPagina, ($page - 1) * $porPagina)->get()->getResultArray();
        $rows = $this->completarFilasDeListado($db, $rows);
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

    /**
     * Datos que el listado unificado no trae: quién pagó realmente y la observación (solo cobros ya registrados),
     * y el concepto, la placa y la asociación de los trámites.
     */
    private function completarFilasDeListado($db, array $rows): array
    {
        $ids = array_values(array_filter(array_map(static fn ($r) => ($r['prefijo'] ?? '') === '' ? (int) $r['id'] : 0, $rows)));
        if (!$ids) {
            return $rows;
        }
        $extras = [];
        foreach ($db->table('pagos_transito pt')->select('pt.id, pt.pagado_por_nombre, pt.pagado_por_documento, pt.observaciones, u.usuario AS cajero')->join('usuarios u', 'u.id = pt.id_usuario_cobra', 'left')->whereIn('pt.id', $ids)->get()->getResultArray() as $e) {
            $extras[(int) $e['id']] = $e;
        }
        $tramites = [];
        $marcas = implode(',', array_fill(0, count($ids), '?'));
        $filas = $db->query(
            "SELECT pt.id, pa.nombre AS concepto, pa.codigo AS codigo_procedimiento, v.placa, a.razon_social AS asociacion
             FROM pagos_transito pt
             JOIN tramites_documentarios t ON t.id = pt.id_tramite
             LEFT JOIN procedimientos_administrativos pa ON pa.id = t.id_procedimiento_admin
             LEFT JOIN vehiculos v ON v.id = t.id_vehiculo
             LEFT JOIN asociaciones a ON a.id = t.id_asociacion
             WHERE pt.id IN ($marcas)",
            $ids
        )->getResultArray();
        foreach ($filas as $f) {
            $tramites[(int) $f['id']] = $f;
        }
        $depositos = [];
        $libertades = $db->query(
            "SELECT pt.id AS pago_id, ol.id AS orden_id, ol.numero_orden, ol.fecha_emision,
                    ol.numero_recibo_guardiania, ol.monto_guardiania, ol.numero_recibo_remolque, ol.monto_remolque,
                    oi.numero_boleta, oi.fecha_ingreso, oi.fecha_salida, oi.total_dias
             FROM pagos_transito pt
             JOIN ordenes_internamiento oi ON oi.id_papeleta = pt.id_papeleta
             JOIN ordenes_libertad ol ON ol.id_internamiento = oi.id AND ol.estado = 'EMITIDA'
                 AND ol.numero_recibo_papeleta = pt.numero_recibo
             WHERE pt.id IN ($marcas) AND pt.estado = 'PAGADO'
             ORDER BY ol.id ASC",
            $ids
        )->getResultArray();
        foreach ($libertades as $libertad) {
            $depositos[(int) $libertad['pago_id']][] = [
                'ordenId' => (int) $libertad['orden_id'],
                'numeroOrden' => $libertad['numero_orden'],
                'numeroBoleta' => $libertad['numero_boleta'],
                'fechaIngreso' => $libertad['fecha_ingreso'],
                'fechaSalida' => $libertad['fecha_salida'],
                'fechaPago' => $libertad['fecha_emision'],
                'dias' => (int) $libertad['total_dias'],
                'numeroRecibo' => $libertad['numero_recibo_guardiania'],
                'montoDeposito' => (float) $libertad['monto_guardiania'],
                'numeroReciboRemolque' => $libertad['numero_recibo_remolque'],
                'montoRemolque' => (float) $libertad['monto_remolque'],
            ];
        }
        foreach ($rows as &$fila) {
            if (($fila['prefijo'] ?? '') !== '') {
                continue;
            }
            $id = (int) $fila['id'];
            $fila['depositos'] = $depositos[$id] ?? [];
            $fila = array_merge($fila, $extras[$id] ?? [], ['concepto' => $tramites[$id]['concepto'] ?? null, 'placa' => $tramites[$id]['placa'] ?? null, 'asociacion' => $tramites[$id]['asociacion'] ?? null, 'es_certicav' => ($tramites[$id]['codigo_procedimiento'] ?? null) === \App\Services\CerticavPago::CODIGO]);
        }
        unset($fila);

        return $rows;
    }

    public function origen()
    {
        $db = \Config\Database::connect();
        $tipo = strtoupper((string)$this->request->getGet('tipo'));
        $id = (int)$this->request->getGet('id');
        if ($id < 1) return $this->failValidationErrors('Referencia no válida.');
        if ($tipo === 'CURSO') {
            $row = $db->table('inscripciones_curso i')->select('c.uuid AS uuid')->join('cursos_seguridad_vial c', 'c.id=i.id_curso')->where('i.id', $id)->get()->getRowArray();
            if ($row) return $this->respond(['data' => ['endpoint' => '/cursos/' . $row['uuid']]]);
        } elseif ($tipo === 'TRAMITE') {
            $row = $db->table('permisos_circulacion')->select('uuid')->where('id_tramite', $id)->orderBy('id', 'DESC')->get()->getRowArray();
            if ($row) return $this->respond(['data' => ['endpoint' => '/permisos/' . $row['uuid']]]);
            $row = $db->table('tramites_documentarios t')->select('t.numero_expediente AS expediente, t.fecha_solicitud AS fechaSolicitud, t.estado, pa.nombre AS procedimientoNombre')->join('procedimientos_administrativos pa', 'pa.id=t.id_procedimiento_admin', 'left')->where('t.id', $id)->get()->getRowArray();
            if ($row) return $this->respond(['data' => ['registro' => $row]]);
        } elseif ($tipo === 'INTERNAMIENTO') {
            $row = $db->table('ordenes_internamiento')->select('id')->where('id', $id)->get()->getRowArray();
            if ($row) return $this->respond(['data' => ['endpoint' => '/internamientos?internamientoId=' . $id . '&page=1&porPagina=1', 'lista' => true]]);
        }
        return $this->failNotFound('No se encontró el registro relacionado.');
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

    private function formatearPagoInternamiento(array $row, string $idPrefix, ?array $mapasPagador): array
    {
        return [
            'id' => $idPrefix . $row['id'],
            'tipoPago' => $row['tipo_pago'],
            'papeletaId' => null, 'tramiteId' => null, 'inscripcionId' => null,
            'internamientoId' => (int)($row['id_internamiento'] ?? $row['id']),
            'numeroRecibo' => $row['numero_recibo'],
            'numeroVoucher' => $row['numero_voucher'],
            'metodo' => $row['medio_pago'],
            'metodoPago' => $row['medio_pago'],
            'referenciaPago' => $row['referencia_pago'],
            'montoTotal' => (float)$row['total'],
            'fecha' => $row['fecha_pago'],
            'fechaHora' => $row['fecha_pago'],
            'fechaRegistro' => $row['fecha_registro'] ?? null,
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
            'fecha' => $row['fecha_pago'], 'fechaHora' => $row['fecha_pago'], 'fechaRegistro' => $row['fecha_registro'] ?? null,
            'horaPago' => $row['hora_pago'] ?? null,
            'cajero' => $row['cajero'] ?? null,
            'estado' => $row['estado'],
            // Quien pagó realmente tiene prioridad sobre el titular del registro
            'pagadoPor' => (isset($row['pagado_por_nombre']) && $row['pagado_por_nombre'] !== '') ? $row['pagado_por_nombre'] : $pagadoPor,
            'pagadoPorDocumento' => $row['pagado_por_documento'] ?? null,
            'observaciones' => $row['observaciones'] ?? null,
            'depositos' => $row['depositos'] ?? [],
            'concepto' => $row['concepto'] ?? null, 'placa' => $row['placa'] ?? null, 'asociacion' => $row['asociacion'] ?? null,
            'esCerticav' => (bool) ($row['es_certicav'] ?? false),
            'titular' => $pagadoPor,
            'titularDocumento' => match ($tipo) {
                'papeleta' => $mapasPagador['doc']['papeleta'][(int) ($row['id_papeleta'] ?? 0)] ?? null,
                'tramite' => $mapasPagador['doc']['tramite'][(int) ($row['id_tramite'] ?? 0)] ?? null,
                'curso' => $mapasPagador['doc']['curso'][(int) ($row['id_inscripcion'] ?? 0)] ?? null,
                default => null,
            },
            'operacionRepetida' => (int)($row['operacion_repetida'] ?? 0),
        ];
    }

    private function resolverPagadoresEnBloque($db, array $idsPapeleta, array $idsTramite, array $idsCurso, array $idsInternamiento): array
    {
        $mapas = ['papeleta' => [], 'tramite' => [], 'curso' => [], 'internamiento' => []];
        // Documento (DNI o RUC) de cada titular, para precargarlo al cobrar.
        $mapas['doc'] = ['papeleta' => [], 'tramite' => [], 'curso' => [], 'internamiento' => []];

        if (!empty($idsPapeleta)) {
            // Sin infractor identificado, el cobro queda a nombre del propietario del vehículo.
            $rows = $db->table('papeletas p')
                ->select("p.id, COALESCE(NULLIF(TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))), ''), NULLIF(TRIM(CONCAT(co.nombres, ' ', co.apellido_paterno, ' ', COALESCE(co.apellido_materno, ''))), '')) as nombre,
                    CASE WHEN per.id IS NOT NULL THEN per.numero ELSE po.numero END as documento", false)
                ->join('personas per', 'per.id = p.id_persona_infractor', 'left')
                ->join('ciudadanos c', 'c.id_persona = per.id', 'left')
                ->join('vehiculo_propietarios vpo', "vpo.id_vehiculo = p.id_vehiculo AND vpo.estado = 'ACTIVO'", 'left')
                ->join('personas po', 'po.id = vpo.id_persona', 'left')
                ->join('ciudadanos co', 'co.id_persona = vpo.id_persona', 'left')
                ->whereIn('p.id', $idsPapeleta)
                ->get()->getResultArray();
            foreach ($rows as $r) {
                $mapas['papeleta'][(int) $r['id']] = $r['nombre'] ?: null;
                $mapas['doc']['papeleta'][(int) $r['id']] = $r['documento'] ?: null;
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
            $documentosPersona = [];
            $documentosAsociacion = [];
            if (!empty($idsPersonaTramite)) {
                $rows = $db->table('personas p')
                    ->select("p.id, p.numero as documento, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))) as nombre", false)
                    ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                    ->whereIn('p.id', $idsPersonaTramite)
                    ->get()->getResultArray();
                foreach ($rows as $r) {
                    $nombresPersona[(int) $r['id']] = $r['nombre'] ?: null;
                    $documentosPersona[(int) $r['id']] = $r['documento'] ?: null;
                }
            }

            $nombresAsociacion = [];
            if (!empty($idsAsociacionTramite)) {
                $rows = $db->table('asociaciones')->select('id, razon_social, ruc')->whereIn('id', $idsAsociacionTramite)->get()->getResultArray();
                foreach ($rows as $r) {
                    $nombresAsociacion[(int) $r['id']] = $r['razon_social'] ?? null;
                    $documentosAsociacion[(int) $r['id']] = $r['ruc'] ?? null;
                }
            }

            foreach ($tramites as $t) {
                $nombre = null;
                $documento = null;
                if (!empty($t['id_persona']) && !empty($nombresPersona[(int) $t['id_persona']])) {
                    $nombre = $nombresPersona[(int) $t['id_persona']];
                    $documento = $documentosPersona[(int) $t['id_persona']] ?? null;
                } elseif (!empty($t['id_asociacion'])) {
                    $nombre = $nombresAsociacion[(int) $t['id_asociacion']] ?? null;
                    $documento = $documentosAsociacion[(int) $t['id_asociacion']] ?? null;
                }
                $mapas['tramite'][(int) $t['id']] = $nombre;
                $mapas['doc']['tramite'][(int) $t['id']] = $documento;
            }
        }

        if (!empty($idsCurso)) {
            $rows = $db->table('inscripciones_curso i')
                ->select("i.id, p.numero as documento, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))) as nombre", false)
                ->join('personas p', 'p.id = i.id_persona', 'left')
                ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                ->whereIn('i.id', $idsCurso)
                ->get()->getResultArray();
            foreach ($rows as $r) {
                $mapas['curso'][(int) $r['id']] = $r['nombre'] ?: null;
                $mapas['doc']['curso'][(int) $r['id']] = $r['documento'] ?: null;
            }
        }

        if (!empty($idsInternamiento)) {
            $rows = $db->table('ordenes_internamiento oi')
                ->select("oi.id, p.numero as documento, TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, ''))) as nombre", false)
                ->join('vehiculos v', 'v.id = oi.id_vehiculo', 'left')
                ->join('vehiculo_propietarios vp', "vp.id_vehiculo = v.id AND vp.estado = 'ACTIVO'", 'left')
                ->join('personas p', 'p.id = vp.id_persona', 'left')
                ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                ->whereIn('oi.id', $idsInternamiento)
                ->get()->getResultArray();
            foreach ($rows as $r) {
                $mapas['internamiento'][(int) $r['id']] = $r['nombre'] ?: null;
                $mapas['doc']['internamiento'][(int) $r['id']] = $r['documento'] ?: null;
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
            ->select('pagos_transito.*, u.usuario AS cajero')
            ->join('usuarios u', 'u.id = pagos_transito.id_usuario_cobra', 'left')
            ->where('pagos_transito.fecha_pago', $fecha)
            ->where('pagos_transito.estado', 'PAGADO')
            ->orderBy('pagos_transito.hora_pago', 'ASC')
            ->get()
            ->getResultArray();

        $pagosInternamiento = $db->table('ordenes_libertad ol')
            ->select("ol.id, 'INTERNAMIENTO' as tipo_pago, COALESCE(ol.numero_recibo_guardiania, ol.numero_recibo_remolque, CONCAT('ORD-', ol.numero_orden)) as numero_recibo, 'EFECTIVO' as medio_pago, CONCAT('Liberación Vehículo - Orden #', ol.numero_orden) as referencia_pago, (ol.monto_guardiania + ol.monto_remolque) as total, ol.fecha_emision as fecha_pago, 'PAGADO' as estado", false)
            ->where('ol.fecha_emision', $fecha)
            ->where('(ol.monto_guardiania + ol.monto_remolque) >', 0, false)
            ->get()
            ->getResultArray();

        // Cada movimiento con el formato que consume el arqueo del frontend
        $todosPagos = [];
        foreach ($pagosTransito as $p) {
            $todosPagos[] = [
                'id' => (int)$p['id'],
                'numeroRecibo' => $p['numero_recibo'] ?: 'REC-' . $p['id'],
                'tipoPago' => $p['tipo_pago'],
                'metodo' => strtoupper($p['medio_pago'] ?: 'EFECTIVO'),
                'numeroVoucher' => $p['numero_voucher'] ?? '',
                'montoTotal' => (float)$p['total'],
                'fecha' => $fecha . ' ' . ($p['hora_pago'] ?: '00:00:00'),
                'cajero' => ($p['cajero'] ?? '') ?: 'No registrado',
            ];
        }
        foreach ($pagosInternamiento as $p) {
            // El cobro de depósito se recibe en efectivo en el depósito; la orden solo guarda la fecha, no la hora
            $todosPagos[] = [
                'id' => 'int_' . $p['id'],
                'numeroRecibo' => $p['numero_recibo'],
                'tipoPago' => 'INTERNAMIENTO',
                'metodo' => 'DEPÓSITO',
                'montoTotal' => (float)$p['total'],
                'fecha' => $fecha,
                'cajero' => 'Depósito',
            ];
        }

        $totalRecaudado = 0;
        $porMetodo = ['efectivo' => 0, 'tarjeta' => 0];
        $porConcepto = [
            'PAPELETA' => ['tipoPago' => 'PAPELETA', 'cantidad' => 0, 'total' => 0],
            'TRAMITE' => ['tipoPago' => 'TRAMITE', 'cantidad' => 0, 'total' => 0],
            'CURSO' => ['tipoPago' => 'CURSO', 'cantidad' => 0, 'total' => 0],
            'INTERNAMIENTO' => ['tipoPago' => 'INTERNAMIENTO', 'cantidad' => 0, 'total' => 0],
        ];
        $porCajero = [];

        foreach ($todosPagos as $item) {
            $m = $item['montoTotal'];
            $totalRecaudado += $m;

            // Solo se cobra en efectivo o con tarjeta; el depósito entra como efectivo en caja
            if (str_contains($item['metodo'], 'TARJETA')) {
                $porMetodo['tarjeta'] += $m;
            } else {
                $porMetodo['efectivo'] += $m;
            }

            $c = $item['tipoPago'];
            if (!isset($porConcepto[$c])) {
                $porConcepto[$c] = ['tipoPago' => $c, 'cantidad' => 0, 'total' => 0];
            }
            $porConcepto[$c]['cantidad']++;
            $porConcepto[$c]['total'] += $m;

            $caj = $item['cajero'];
            if (!isset($porCajero[$caj])) {
                $porCajero[$caj] = ['usuario' => $caj, 'cantidad' => 0, 'total' => 0];
            }
            $porCajero[$caj]['cantidad']++;
            $porCajero[$caj]['total'] += $m;
        }

        return $this->respond([
            'data' => [
                'fecha' => $fecha,
                'totalOperaciones' => count($todosPagos),
                'totalRecaudado' => round($totalRecaudado, 2),
                'porMetodo' => array_map(static fn ($v) => round($v, 2), $porMetodo),
                'porConcepto' => array_map(static fn ($c) => ['total' => round($c['total'], 2)] + $c, array_values($porConcepto)),
                'porCajero' => array_map(static fn ($c) => ['total' => round($c['total'], 2)] + $c, array_values($porCajero)),
                'pagos' => $todosPagos,
            ]
        ]);
    }
}
