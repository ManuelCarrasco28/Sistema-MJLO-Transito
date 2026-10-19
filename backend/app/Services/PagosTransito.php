<?php

namespace App\Services;

use CodeIgniter\Database\BaseConnection;
use DomainException;
use Throwable;

class PagosTransito
{
    public function __construct(private BaseConnection $db) {}

    private function atomic(callable $operation): mixed
    {
        $this->db->transException(true)->transBegin();
        try {
            $result = $operation();
            if (!$this->db->transStatus()) throw new \RuntimeException('No se pudo completar la operación.');
            $this->db->transCommit();
            return $result;
        } catch (Throwable $e) {
            $this->db->transRollback();
            throw $e;
        }
    }

    private function origin(string $tipo, int $id): array
    {
        $map = ['PAPELETA' => ['papeletas', 'id_papeleta'], 'TRAMITE' => ['tramites_documentarios', 'id_tramite'], 'CURSO' => ['inscripciones_curso', 'id_inscripcion']];
        if (!isset($map[$tipo]) || $id <= 0) throw new DomainException('Seleccione la papeleta, trámite o inscripción correspondiente.');
        [$table, $fk] = $map[$tipo];
        $row = $this->db->query("SELECT * FROM $table WHERE id = ? FOR UPDATE", [$id])->getRowArray();
        if (!$row) throw new DomainException('No se encontró el registro asociado al pago.');
        return [$row, $fk, $table];
    }

    private function originId(array $pago): int
    {
        return (int)($pago['id_papeleta'] ?? $pago['id_tramite'] ?? $pago['id_inscripcion']);
    }

    public function generar(string $tipo, int $id): array
    {
        return $this->atomic(function () use ($tipo, $id) {
            [$origin, $fk] = $this->origin($tipo, $id);
            if (in_array($origin['estado'], ['ANULADA', 'ANULADO', 'CANCELADO'], true)) throw new DomainException('El registro está anulado.');
            $existing = $this->db->table('pagos_transito')->where($fk, $id)->where('estado !=', 'ANULADO')->get()->getRowArray();
            if ($existing) return $existing;
            if ($tipo === 'PAPELETA') {
                if ($origin['estado'] === 'PAGADA') throw new DomainException('La papeleta ya está pagada.');
                $total = $origin['monto_total'];
            } elseif ($tipo === 'TRAMITE') {
                $procedure = $this->db->table('procedimientos_administrativos')->where('id', $origin['id_procedimiento_admin'])->get()->getRowArray();
                if (!$procedure) throw new DomainException('El trámite necesita un procedimiento administrativo con costo definido.');
                $total = \App\Libraries\TupaCosto::vigente($this->db, (int) $procedure['id']);
                if ($total === null) throw new DomainException('El procedimiento no tiene un costo vigente definido.');
            } else {
                $course = $this->db->table('cursos_seguridad_vial')->where('id', $origin['id_curso'])->get()->getRowArray();
                if (!$course || $course['costo_inscripcion'] === null) throw new DomainException('El curso no tiene costo definido.');
                $total = $course['costo_inscripcion'];
            }
            if (!is_numeric($total) || (float)$total < 0) throw new DomainException('El monto de origen no es válido.');
            $this->db->table('pagos_transito')->insert([
                'uuid' => \App\Libraries\Identificador::nuevo(), 'tipo_pago' => $tipo, $fk => $id, 'total' => $total, 'estado' => 'PENDIENTE']);
            return $this->db->table('pagos_transito')->where('id', $this->db->insertID())->get()->getRowArray();
        });
    }

/**
     * Genera un número de recibo correlativo del sistema (REC-NNNNNNN), una sola serie cronológica para todos los
     * cobros, para cuando el cajero no tiene un talonario físico propio y quiere que el sistema lo registre.
     */
    private function generarNumeroRecibo(): string
    {

        $fila = $this->db->query(
            "SELECT GREATEST(
                COALESCE((SELECT MAX(CAST(SUBSTRING(numero_recibo, 5) AS UNSIGNED)) FROM pagos_transito WHERE numero_recibo REGEXP '^REC-[0-9]+$'), 0),
                COALESCE((SELECT MAX(CAST(SUBSTRING(numero_recibo_guardiania, 5) AS UNSIGNED)) FROM ordenes_libertad WHERE numero_recibo_guardiania REGEXP '^REC-[0-9]+$'), 0),
                COALESCE((SELECT MAX(CAST(SUBSTRING(numero_recibo_remolque, 5) AS UNSIGNED)) FROM ordenes_libertad WHERE numero_recibo_remolque REGEXP '^REC-[0-9]+$'), 0)
            ) AS ultimo"
        )->getRowArray();

        return 'REC-' . str_pad((string) (((int) ($fila['ultimo'] ?? 0)) + 1), 7, '0', STR_PAD_LEFT);
    }

    public function confirmar(int $id, array $input): array
    {
        $recibo = trim($input['numeroRecibo'] ?? '');
        $fecha = trim($input['fechaPago'] ?? '');
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $fecha);
        if ($recibo !== '' && strlen($recibo) > 50) throw new DomainException('El número de recibo no puede exceder los 50 caracteres.');
        if (!$date || $date->format('Y-m-d') !== $fecha || $fecha > date('Y-m-d')) throw new DomainException('Ingrese una fecha de pago válida, no futura.');
        if ($fecha < date('Y-m-d', strtotime('-90 days'))) throw new DomainException('La fecha de pago no puede tener más de 90 días de antigüedad.');
        $automatico = $recibo === '';
// Serializar los correlativos de cobro hasta el commit.
        if ($automatico) {
            $candado = (int) ($this->db->query("SELECT GET_LOCK('mjlo_numero_recibo', 10) AS ok")->getRowArray()['ok'] ?? 0);
            if ($candado !== 1) throw new DomainException('El sistema está generando otro recibo. Intente nuevamente.');
        }
        try {
            return $this->confirmarEnTransaccion($id, $input, $recibo, $fecha, $automatico);
        } finally {
            if ($automatico) $this->db->query("SELECT RELEASE_LOCK('mjlo_numero_recibo')");
        }
    }

    private function confirmarEnTransaccion(int $id, array $input, string $recibo, string $fecha, bool $automatico): array
    {
        return $this->atomic(function () use ($id, $input, $recibo, $fecha, $automatico) {
            if ($automatico) $recibo = $this->generarNumeroRecibo();
            $pago = $this->db->table('pagos_transito')->where('id', $id)->get()->getRowArray();
            if (!$pago) throw new DomainException('Pago no encontrado.');
            [$origin] = $this->origin($pago['tipo_pago'], $this->originId($pago));
            $pago = $this->db->query('SELECT * FROM pagos_transito WHERE id = ? FOR UPDATE', [$id])->getRowArray();
            if ($pago['estado'] !== 'PENDIENTE') throw new DomainException('Solo se puede confirmar un pago pendiente.');
            if (in_array($origin['estado'], ['ANULADA', 'ANULADO', 'CANCELADO'], true)) throw new DomainException('No se puede confirmar el pago de un registro anulado.');
            if ($this->db->table('pagos_transito')->where('numero_recibo', $recibo)->countAllResults()) throw new DomainException('Ese recibo ya está registrado.');

            $medio = strtoupper(trim($input['metodoPago'] ?? ''));
            $operacion = trim($input['numeroVoucher'] ?? '');
            if ($medio !== '' && !in_array($medio, ['EFECTIVO', 'TARJETA'], true)) {
                throw new DomainException('El método de pago debe ser EFECTIVO o TARJETA.');
            }
            if ($medio !== '' && $medio !== 'EFECTIVO' && $operacion === '') {
                throw new DomainException('Ingrese el N° de operación del pago (' . $medio . ').');
            }
            if (strlen($operacion) > 50) throw new DomainException('El N° de operación no puede exceder los 50 caracteres.');
            if ($medio === '' || $medio === 'EFECTIVO') $operacion = '';
            $pagador = preg_replace('/\s+/u', ' ', trim((string) ($input['pagadoPorNombre'] ?? '')));
            $documentoPagador = strtoupper(trim((string) ($input['pagadoPorDocumento'] ?? '')));
            $observaciones = trim((string) ($input['observaciones'] ?? ''));
            if (mb_strlen($pagador) > 160) throw new DomainException('El nombre de quien paga no puede exceder los 160 caracteres.');
            if ($documentoPagador !== '' && !preg_match('/^[A-Z0-9-]{6,20}$/', $documentoPagador)) throw new DomainException('El documento de quien paga debe tener entre 6 y 20 letras o números.');
            if (mb_strlen($observaciones) > 300) throw new DomainException('Las observaciones no pueden exceder los 300 caracteres.');
            $this->db->table('pagos_transito')->where('id', $id)->update([
                'numero_recibo' => $recibo, 'fecha_pago' => $fecha,

                'hora_pago' => date('H:i:s'),
                'id_usuario_cobra' => ((int) (\App\Libraries\Acceso::usuario()['id'] ?? 0)) ?: null,
                'numero_voucher' => $operacion ?: null,
                'medio_pago' => $medio ?: null,

                'referencia_pago' => trim($input['referenciaPago'] ?? '') ?: ($pago['referencia_pago'] ?? null),
                'pagado_por_nombre' => $pagador !== '' ? $pagador : null,
                'pagado_por_documento' => $documentoPagador !== '' ? $documentoPagador : null,
                'observaciones' => $observaciones !== '' ? $observaciones : null,
                'estado' => 'PAGADO',
            ]);
            if ($pago['tipo_pago'] === 'PAPELETA') $this->db->table('papeletas')->where('id', $pago['id_papeleta'])->update(['estado' => 'PAGADA']);
            if ($pago['tipo_pago'] === 'CURSO') $this->db->table('inscripciones_curso')->where('id', $pago['id_inscripcion'])->update(['estado_pago' => 'PAGADO']);
            $confirmado = $this->db->table('pagos_transito')->where('id', $id)->get()->getRowArray();
            if (!empty($confirmado['numero_voucher'])) {
// Aviso (no bloqueo): una misma operación puede pagar varias cosas a la vez
                $confirmado['operacion_repetida'] = $this->db->table('pagos_transito')
                    ->where('numero_voucher', $confirmado['numero_voucher'])->where('medio_pago', $confirmado['medio_pago'])
                    ->where('estado', 'PAGADO')->where('id !=', $id)->countAllResults();
            }
            return $confirmado;
        });
    }

    public function anular(int $id): void
    {
        $this->atomic(function () use ($id) {
            $pago = $this->db->table('pagos_transito')->where('id', $id)->get()->getRowArray();
            if (!$pago) throw new DomainException('Pago no encontrado.');
            [$origin] = $this->origin($pago['tipo_pago'], $this->originId($pago));
            $pago = $this->db->query('SELECT * FROM pagos_transito WHERE id = ? FOR UPDATE', [$id])->getRowArray();
            if ($pago['estado'] === 'ANULADO') throw new DomainException('Este pago ya está anulado.');

            if ($pago['tipo_pago'] === 'PAPELETA' && $pago['estado'] === 'PAGADO') {
                $liberado = $this->db->query(
                    "SELECT oi.id FROM ordenes_internamiento oi WHERE oi.id_papeleta = ? AND oi.estado = 'LIBERADO' LIMIT 1",
                    [(int) $pago['id_papeleta']]
                )->getRowArray();
                if ($liberado) throw new DomainException('Esta papeleta se cobró al liberar un vehículo del depósito. Regularice primero la orden de libertad antes de anular el pago.');
            }
            if ($this->db->table('certicav')->where('id_pago', $id)->countAllResults() > 0) {
                throw new DomainException('Este pago de CERTICAV ya se usó en una inspección técnica: no se puede anular.');
            }
            $this->db->table('pagos_transito')->where('id', $id)->update(['estado' => 'ANULADO']);
            $otherPaid = $this->db->table('pagos_transito')->where('estado', 'PAGADO')->where($pago['tipo_pago'] === 'PAPELETA' ? 'id_papeleta' : ($pago['tipo_pago'] === 'CURSO' ? 'id_inscripcion' : 'id_tramite'), $origin['id'])->countAllResults();
            if (!$otherPaid && $pago['tipo_pago'] === 'PAPELETA' && $origin['estado'] !== 'ANULADA') $this->db->table('papeletas')->where('id', $origin['id'])->update(['estado' => 'PENDIENTE_PAGO']);
            if (!$otherPaid && $pago['tipo_pago'] === 'CURSO') $this->db->table('inscripciones_curso')->where('id', $origin['id'])->update(['estado_pago' => 'PENDIENTE']);
        });
    }

    public function anularPapeleta(int $id): void
    {
        $this->atomic(function () use ($id) {
            $this->origin('PAPELETA', $id);
            $this->db->query('SELECT id FROM papeletas WHERE id = ? FOR UPDATE', [$id]);
            if ($this->db->table('pagos_transito')->where('id_papeleta', $id)->where('estado', 'PAGADO')->countAllResults() > 0) {
                throw new DomainException('Regularice los pagos realizados antes de anular la papeleta.');
            }
            if ($this->db->table('ordenes_internamiento')->where('id_papeleta', $id)->countAllResults() > 0) {
                throw new DomainException('La papeleta tiene un internamiento vinculado. Regularícelo antes de anular.');
            }
            $this->db->table('papeletas')->where('id', $id)->update(['estado' => 'ANULADA']);
            $this->db->table('pagos_transito')->where('id_papeleta', $id)->update(['estado' => 'ANULADO']);
        });
    }
}
