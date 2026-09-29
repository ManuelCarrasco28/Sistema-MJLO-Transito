<?php

namespace App\Controllers\Api;

use App\Services\PagosTransito;
use App\Services\AuditoriaService;
use CodeIgniter\RESTful\ResourceController;

class PagosController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        
        $rows = $db->table('pagos_transito')->orderBy('id', 'DESC')->get()->getResultArray();
        $pagos = array_map([$this, 'present'], $rows);

        $pendientes = $db->table('ordenes_internamiento oi')
            ->select("oi.id, 'INTERNAMIENTO' as tipo_pago, NULL as numero_recibo, NULL as numero_voucher, 'SIN CONFIRMAR' as medio_pago, CONCAT('Boleta #', oi.numero_boleta) as referencia_pago, 0 as total, NULL as fecha_pago, 'PENDIENTE' as estado")
            ->where('oi.estado', 'RETENIDO')
            ->get()->getResultArray();

        foreach ($pendientes as $p) {
            $pagos[] = $this->formatearPagoInternamiento($p, 'int_p_');
        }

        // El medio de pago se arma listando qué conceptos incluye la orden
        // (guardianía, papeleta y/o remolque), ya que el sistema no registra
        // un único método por cada recibo combinado.
        $pagados = $db->table('ordenes_libertad ol')
            ->select("ol.id, 'INTERNAMIENTO' as tipo_pago, COALESCE(ol.numero_recibo_guardiania, ol.numero_recibo_papeleta, ol.numero_recibo_remolque, 'VARIOS') as numero_recibo, NULL as numero_voucher,
                COALESCE(NULLIF(CONCAT_WS(' + ',
                    IF(ol.numero_recibo_guardiania IS NOT NULL, 'GUARDIANÍA', NULL),
                    IF(ol.numero_recibo_papeleta IS NOT NULL, 'PAPELETA', NULL),
                    IF(ol.numero_recibo_remolque IS NOT NULL, 'REMOLQUE', NULL)
                ), ''), 'VARIOS CONCEPTOS') as medio_pago,
                CONCAT('Orden #', ol.numero_orden) as referencia_pago, ol.monto_total as total, ol.fecha_emision as fecha_pago, 'PAGADO' as estado", false)
            ->get()->getResultArray();

        foreach ($pagados as $p) {
            $pagos[] = $this->formatearPagoInternamiento($p, 'int_l_');
        }

        // Papeletas pendientes de pago que aún no tienen un recibo generado
        // en pagos_transito, para que se vean en Pagos sin esperar a que
        // alguien las seleccione manualmente en "Registrar Pago".
        $idsPapeletasConRecibo = $this->idsConRecibo($db, 'id_papeleta');

        $papeletasPendientes = $db->table('papeletas p')
            ->select("p.id, p.numero_papeleta, p.monto_total, p.fecha_hora, v.placa", false)
            ->join('vehiculos v', 'v.id = p.id_vehiculo', 'left')
            ->where('p.estado', 'PENDIENTE_PAGO')
            ->get()->getResultArray();

        foreach ($papeletasPendientes as $p) {
            if (in_array((int)$p['id'], $idsPapeletasConRecibo, true)) continue;
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
                'pagadoPor' => $this->resolverPagador(['tipo_pago' => 'PAPELETA', 'id_papeleta' => (int)$p['id']]),
            ];
        }

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

        foreach ($cursosPendientes as $c) {
            if (in_array((int)$c['id'], $idsInscripcionesConRecibo, true)) continue;
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
                'pagadoPor' => $this->resolverPagador(['tipo_pago' => 'CURSO', 'id_inscripcion' => (int)$c['id']]),
            ];
        }

        usort($pagos, function($a, $b) {
            $dateA = $a['fecha'] ? strtotime($a['fecha']) : 0;
            $dateB = $b['fecha'] ? strtotime($b['fecha']) : 0;
            if ($dateA === $dateB) return 0;
            return $dateB <=> $dateA;
        });

        return $this->respond(['data' => $pagos]);
    }

    /**
     * IDs de una columna de referencia (papeleta/trámite/inscripción) que ya
     * tienen un recibo generado en pagos_transito, para excluirlos de las
     * listas de "pendientes sin recibo".
     */
    private const COLUMNAS_REFERENCIA_PAGO = ['id_papeleta', 'id_tramite', 'id_inscripcion'];

    private function idsConRecibo($db, string $columna): array
    {
        if (!in_array($columna, self::COLUMNAS_REFERENCIA_PAGO, true)) {
            throw new \InvalidArgumentException('Columna de referencia de pago no permitida.');
        }
        $rows = $db->table('pagos_transito')->select($columna)->where($columna . ' IS NOT NULL')->get()->getResultArray();
        return array_map(static fn($r) => (int)$r[$columna], $rows);
    }

    /**
     * Da forma de fila de pago a una orden de internamiento (retenida o
     * liberada), que no vive en pagos_transito pero debe listarse junto a los
     * demás comprobantes.
     */
    private function formatearPagoInternamiento(array $row, string $idPrefix): array
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
        ];
    }

    public function present(array $row): array
    {
        return [
            'id' => (int)$row['id'], 'tipoPago' => $row['tipo_pago'],
            'papeletaId' => $row['id_papeleta'], 'tramiteId' => $row['id_tramite'], 'inscripcionId' => $row['id_inscripcion'],
            'numeroRecibo' => $row['numero_recibo'], 'numeroVoucher' => $row['numero_voucher'],
            'metodo' => $row['medio_pago'], 'metodoPago' => $row['medio_pago'],
            'referenciaPago' => $row['referencia_pago'], 'montoTotal' => (float)$row['total'],
            'fecha' => $row['fecha_pago'], 'fechaHora' => $row['fecha_pago'], 'estado' => $row['estado'],
            'pagadoPor' => $this->resolverPagador($row),
        ];
    }

    /**
     * Resuelve el nombre de quien realizó el pago según el origen del
     * comprobante: el infractor de la papeleta, el solicitante del trámite
     * (persona o asociación), o el inscrito al curso.
     */
    private function resolverPagador(array $row): ?string
    {
        $db = \Config\Database::connect();
        $tipo = $row['tipo_pago'] ?? '';

        try {
            if ($tipo === 'PAPELETA' && !empty($row['id_papeleta'])) {
                $r = $db->table('papeletas p')
                    ->select("TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', c.apellido_materno)) as nombre", false)
                    ->join('personas per', 'per.id = p.id_persona_infractor', 'left')
                    ->join('ciudadanos c', 'c.id_persona = per.id', 'left')
                    ->where('p.id', $row['id_papeleta'])
                    ->get()->getRowArray();
                return $r['nombre'] ?: null;
            }

            if ($tipo === 'TRAMITE' && !empty($row['id_tramite'])) {
                $t = $db->table('tramites_documentarios')->select('id_persona, id_asociacion')->where('id', $row['id_tramite'])->get()->getRowArray();
                if ($t) {
                    if (!empty($t['id_persona'])) {
                        $r = $db->table('personas p')
                            ->select("TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', c.apellido_materno)) as nombre", false)
                            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                            ->where('p.id', $t['id_persona'])
                            ->get()->getRowArray();
                        if (!empty($r['nombre'])) return $r['nombre'];
                    }
                    if (!empty($t['id_asociacion'])) {
                        $r = $db->table('asociaciones')->select('razon_social')->where('id', $t['id_asociacion'])->get()->getRowArray();
                        return $r['razon_social'] ?? null;
                    }
                }
                return null;
            }

            if ($tipo === 'CURSO' && !empty($row['id_inscripcion'])) {
                $r = $db->table('inscripciones_curso i')
                    ->select("TRIM(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', c.apellido_materno)) as nombre", false)
                    ->join('personas p', 'p.id = i.id_persona', 'left')
                    ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                    ->where('i.id', $row['id_inscripcion'])
                    ->get()->getRowArray();
                return $r['nombre'] ?: null;
            }
        } catch (\Throwable $e) {
            return null;
        }

        return null;
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
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
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
                'cajero' => $p['cajero'] ?: 'Cajero Principal',
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
