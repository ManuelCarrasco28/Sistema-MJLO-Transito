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
            $pagos[] = [
                'id' => 'int_p_' . $p['id'],
                'tipoPago' => $p['tipo_pago'],
                'papeletaId' => null, 'tramiteId' => null, 'inscripcionId' => null,
                'numeroRecibo' => $p['numero_recibo'],
                'numeroVoucher' => $p['numero_voucher'],
                'metodo' => $p['medio_pago'],
                'metodoPago' => $p['medio_pago'],
                'referenciaPago' => $p['referencia_pago'],
                'montoTotal' => (float)$p['total'],
                'fecha' => $p['fecha_pago'],
                'fechaHora' => $p['fecha_pago'],
                'estado' => $p['estado'],
            ];
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
            $pagos[] = [
                'id' => 'int_l_' . $p['id'],
                'tipoPago' => $p['tipo_pago'],
                'papeletaId' => null, 'tramiteId' => null, 'inscripcionId' => null,
                'numeroRecibo' => $p['numero_recibo'],
                'numeroVoucher' => $p['numero_voucher'],
                'metodo' => $p['medio_pago'],
                'metodoPago' => $p['medio_pago'],
                'referenciaPago' => $p['referencia_pago'],
                'montoTotal' => (float)$p['total'],
                'fecha' => $p['fecha_pago'],
                'fechaHora' => $p['fecha_pago'],
                'estado' => $p['estado'],
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

            $pago = (new PagosTransito(\Config\Database::connect()))->generar($tipo, (int)($input[$key] ?? 0));
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
            'PAPELETA' => $db->table('papeletas')->select('id, numero_papeleta AS nombre')->where('estado', 'PENDIENTE_PAGO')->get()->getResultArray(),
            'TRAMITE' => $db->table('tramites_documentarios')->select('id, numero_expediente AS nombre')->where('id_procedimiento_admin IS NOT NULL', null, false)->whereNotIn('estado', ['ANULADO','ANULADA'])->get()->getResultArray(),
            'CURSO' => $db->table('inscripciones_curso i')->select("i.id, CONCAT(c.nombre, ' — ', ci.nombres, ' ', ci.apellido_paterno) AS nombre", false)->join('cursos_seguridad_vial c', 'c.id=i.id_curso')->join('ciudadanos ci', 'ci.id_persona=i.id_persona')->where('i.estado_pago !=', 'PAGADO')->whereNotIn('i.estado', ['ANULADO','CANCELADO'])->get()->getResultArray(),
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
