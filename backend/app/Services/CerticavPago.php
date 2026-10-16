<?php

namespace App\Services;

use App\Libraries\TupaCosto;
use CodeIgniter\Database\BaseConnection;
use DomainException;

class CerticavPago
{
    public const CODIGO = 'SE142251D4';

    public const NO_FORMAL = 'NO_FORMAL';
    public const SIN_SOLICITUD = 'SIN_SOLICITUD';
    public const PENDIENTE_PAGO = 'PENDIENTE_PAGO';
    public const PAGADO = 'PAGADO';

    public function __construct(private BaseConnection $db)
    {
    }

    public function procedimiento(): array
    {
        $fila = $this->db->table('procedimientos_administrativos')->where('codigo', self::CODIGO)->where('estado', 'ACTIVO')->get()->getRowArray();
        if (!$fila) {
            throw new DomainException('El trámite CERTICAV no está registrado en el catálogo de procedimientos (TUPA).');
        }

        return $fila;
    }

    public function costo(): float
    {
        $costo = TupaCosto::vigente($this->db, (int) $this->procedimiento()['id']);
        if ($costo === null) {
            throw new DomainException('El CERTICAV no tiene un costo vigente definido en el TUPA.');
        }

        return $costo;
    }

    public function esFormal(array $vehiculo): bool
    {
        return !empty($vehiculo['id_asociacion']);
    }

    private function pagoLibre(int $idVehiculo, string $estado): ?array
    {
        $fila = $this->db->query(
            'SELECT p.*, t.numero_expediente FROM pagos_transito p
             JOIN tramites_documentarios t ON t.id = p.id_tramite
             WHERE t.id_vehiculo = ? AND t.id_procedimiento_admin = ? AND p.estado = ?
               AND NOT EXISTS (SELECT 1 FROM certicav c WHERE c.id_pago = p.id)
             ORDER BY p.id DESC LIMIT 1',
            [$idVehiculo, (int) $this->procedimiento()['id'], $estado]
        )->getRowArray();

        return $fila ?: null;
    }

    public function pagoDisponible(int $idVehiculo): ?array
    {
        return $this->pagoLibre($idVehiculo, 'PAGADO');
    }

/**
     * Situación del vehículo frente al CERTICAV.
     *
     * @return array{estado: string, formal: bool, costo: float, vigenciaMeses: int, pagoId?: int, numeroRecibo?: string, expediente?: string}
     */
    public function estado(array $vehiculo): array
    {
        $proc = $this->procedimiento();
        $base = [
            'estado' => self::NO_FORMAL,
            'formal' => $this->esFormal($vehiculo),
            'costo' => $this->costo(),
            'vigenciaMeses' => (int) $proc['vigencia'],
        ];
        if (!$base['formal']) {
            return $base;
        }
        $idVehiculo = (int) $vehiculo['id'];
        if ($pagado = $this->pagoDisponible($idVehiculo)) {
            return array_merge($base, ['estado' => self::PAGADO, 'pagoId' => (int) $pagado['id'], 'numeroRecibo' => (string) $pagado['numero_recibo'], 'expediente' => (string) $pagado['numero_expediente']]);
        }
        if ($pendiente = $this->pagoLibre($idVehiculo, 'PENDIENTE')) {
            return array_merge($base, ['estado' => self::PENDIENTE_PAGO, 'pagoId' => (int) $pendiente['id'], 'expediente' => (string) $pendiente['numero_expediente']]);
        }

        return array_merge($base, ['estado' => self::SIN_SOLICITUD]);
    }

    public function bloqueo(array $estado): ?string
    {
        return match ($estado['estado']) {
            self::NO_FORMAL => 'El CERTICAV es solo para vehículos formales. Vincule el vehículo a una asociación (Vehículos > Editar) para poder hacer su inspección técnica.',
            self::SIN_SOLICITUD => 'El vehículo no tiene un CERTICAV pagado. Solicítelo y cóbrelo en Pagos antes de registrar la revisión técnica.',
            self::PENDIENTE_PAGO => 'El CERTICAV de este vehículo está pendiente de pago (S/ ' . number_format($estado['costo'], 2) . '). Cóbrelo en Pagos para poder registrar la revisión técnica.',
            default => null,
        };
    }

    public function solicitar(array $vehiculo): array
    {
        if (!$this->esFormal($vehiculo)) {
            throw new DomainException($this->bloqueo(['estado' => self::NO_FORMAL, 'costo' => 0]));
        }
        $actual = $this->estado($vehiculo);
        if ($actual['estado'] !== self::SIN_SOLICITUD) {
            return $actual;
        }

        $proc = $this->procedimiento();
        $idVehiculo = (int) $vehiculo['id'];
        $dueno = $this->db->table('vehiculo_propietarios')->select('id_persona')->where('id_vehiculo', $idVehiculo)->where('estado', 'ACTIVO')->orderBy('id', 'DESC')->get()->getRowArray();

        $candado = (int) ($this->db->query("SELECT GET_LOCK('mjlo_expediente_tramite', 10) AS ok")->getRowArray()['ok'] ?? 0) === 1;
        if (!$candado) {
            throw new DomainException('El sistema está registrando otro trámite. Intente nuevamente.');
        }
        try {
            $this->db->transException(true)->transBegin();
            $ultimo = (int) ($this->db->query("SELECT COALESCE(MAX(CAST(SUBSTRING(numero_expediente, 5) AS UNSIGNED)), 0) AS m FROM tramites_documentarios WHERE numero_expediente REGEXP '^EXP-[0-9]+$'")->getRowArray()['m'] ?? 0);
            $this->db->table('tramites_documentarios')->insert([
                'uuid' => \App\Libraries\Identificador::nuevo(),
                'id_procedimiento_admin' => (int) $proc['id'],
                'id_persona' => $dueno['id_persona'] ?? null,
                'id_asociacion' => (int) $vehiculo['id_asociacion'],
                'id_vehiculo' => $idVehiculo,
                'fecha_solicitud' => date('Y-m-d'),
                'numero_expediente' => 'EXP-' . str_pad((string) ($ultimo + 1), 6, '0', STR_PAD_LEFT),
                'funcionario_dirigido' => 'Subgerente de Tránsito y Transporte',
                'cargo_funcionario' => 'Subgerente',
                'detalle_solicitud' => 'Solicitud de CERTICAV (constatación de características) del vehículo ' . ($vehiculo['placa'] ?? ''),
                'estado' => 'PENDIENTE',
            ]);
            $idTramite = (int) $this->db->insertID();
            (new PagosTransito($this->db))->generar('TRAMITE', $idTramite);
            $this->db->transCommit();
        } catch (\Throwable $e) {
            $this->db->transRollback();
            throw $e;
        } finally {
            $this->db->query("SELECT RELEASE_LOCK('mjlo_expediente_tramite')");
        }

        return $this->estado($vehiculo);
    }
}
