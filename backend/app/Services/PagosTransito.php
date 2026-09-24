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
                $total = $procedure['costo'];
            } else {
                $course = $this->db->table('cursos_seguridad_vial')->where('id', $origin['id_curso'])->get()->getRowArray();
                if (!$course || $course['costo_inscripcion'] === null) throw new DomainException('El curso no tiene costo definido.');
                $total = $course['costo_inscripcion'];
            }
            if (!is_numeric($total) || (float)$total < 0) throw new DomainException('El monto de origen no es válido.');
            $this->db->table('pagos_transito')->insert(['tipo_pago' => $tipo, $fk => $id, 'total' => $total, 'estado' => 'PENDIENTE']);
            return $this->db->table('pagos_transito')->where('id', $this->db->insertID())->get()->getRowArray();
        });
    }

    /**
     * Genera un número de recibo correlativo del sistema (REC-AÑO-NNNNN),
     * para cuando el cajero no tiene un talonario físico propio y quiere
     * que el sistema lo registre automáticamente.
     */
    private function generarNumeroRecibo(): string
    {
        $anio = date('Y');
        do {
            $siguiente = $this->db->table('pagos_transito')->like('numero_recibo', "REC-{$anio}-", 'after')->countAllResults() + 1;
            $numero = 'REC-' . $anio . '-' . str_pad((string)$siguiente, 5, '0', STR_PAD_LEFT);
        } while ($this->db->table('pagos_transito')->where('numero_recibo', $numero)->countAllResults() > 0);
        return $numero;
    }

    public function confirmar(int $id, array $input): array
    {
        $recibo = trim($input['numeroRecibo'] ?? '');
        $fecha = trim($input['fechaPago'] ?? '');
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $fecha);
        if ($recibo !== '' && strlen($recibo) > 50) throw new DomainException('El número de recibo no puede exceder los 50 caracteres.');
        if (!$date || $date->format('Y-m-d') !== $fecha || $fecha > date('Y-m-d')) throw new DomainException('Ingrese una fecha de pago válida, no futura.');
        if ($recibo === '') $recibo = $this->generarNumeroRecibo();
        return $this->atomic(function () use ($id, $input, $recibo, $fecha) {
            $pago = $this->db->table('pagos_transito')->where('id', $id)->get()->getRowArray();
            if (!$pago) throw new DomainException('Pago no encontrado.');
            [$origin] = $this->origin($pago['tipo_pago'], $this->originId($pago));
            $pago = $this->db->query('SELECT * FROM pagos_transito WHERE id = ? FOR UPDATE', [$id])->getRowArray();
            if ($pago['estado'] !== 'PENDIENTE') throw new DomainException('Solo se puede confirmar un pago pendiente.');
            if (in_array($origin['estado'], ['ANULADA', 'ANULADO', 'CANCELADO'], true)) throw new DomainException('No se puede confirmar el pago de un registro anulado.');
            if ($this->db->table('pagos_transito')->where('numero_recibo', $recibo)->countAllResults()) throw new DomainException('Ese recibo ya está registrado.');
            $this->db->table('pagos_transito')->where('id', $id)->update([
                'numero_recibo' => $recibo, 'fecha_pago' => $fecha,
                'numero_voucher' => trim($input['numeroVoucher'] ?? '') ?: null,
                'medio_pago' => trim($input['metodoPago'] ?? '') ?: null,
                'referencia_pago' => trim($input['referenciaPago'] ?? '') ?: null,
                'estado' => 'PAGADO',
            ]);
            if ($pago['tipo_pago'] === 'PAPELETA') $this->db->table('papeletas')->where('id', $pago['id_papeleta'])->update(['estado' => 'PAGADA']);
            if ($pago['tipo_pago'] === 'CURSO') $this->db->table('inscripciones_curso')->where('id', $pago['id_inscripcion'])->update(['estado_pago' => 'PAGADO']);
            return $this->db->table('pagos_transito')->where('id', $id)->get()->getRowArray();
        });
    }

    public function anular(int $id): void
    {
        $this->atomic(function () use ($id) {
            $pago = $this->db->table('pagos_transito')->where('id', $id)->get()->getRowArray();
            if (!$pago) throw new DomainException('Pago no encontrado.');
            [$origin] = $this->origin($pago['tipo_pago'], $this->originId($pago));
            $this->db->query('SELECT id FROM pagos_transito WHERE id = ? FOR UPDATE', [$id]);
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
            $this->db->table('papeletas')->where('id', $id)->update(['estado' => 'ANULADA']);
            $this->db->table('pagos_transito')->where('id_papeleta', $id)->update(['estado' => 'ANULADO']);
        });
    }
}
