<?php

namespace App\Services;

use CodeIgniter\Database\BaseConnection;

class InternamientoAutomatico
{
    public const DEPOSITO_OFICIAL = 'Depósito Oficial José L. Ortiz';

    private bool $candado = false;

    public function __construct(private BaseConnection $db)
    {
    }

    public function __destruct()
    {
        if ($this->candado) {
            $this->db->query("SELECT RELEASE_LOCK('mjlo_numero_internamiento')");
            $this->candado = false;
        }
    }

    /**
     * @return array{id?: int, numeroBoleta?: string, omitido?: string, vinculado?: bool}
     */
    public function generar(int $idPapeleta): array
    {
        $papeleta = $this->db->table('papeletas')->where('id', $idPapeleta)->get()->getRowArray();
        if (!$papeleta) {
            return ['omitido' => 'No se encontró la papeleta.'];
        }
        if (empty($papeleta['id_vehiculo'])) {
            return ['omitido' => 'La papeleta no tiene un vehículo identificado.'];
        }
        $idVehiculo = (int) $papeleta['id_vehiculo'];

        $existentePapeleta = $this->db->table('ordenes_internamiento')
            ->select('id, numero_boleta')
            ->where('id_papeleta', $idPapeleta)
            ->get()->getRowArray();
        if ($existentePapeleta) {
            return [
                'id' => (int) $existentePapeleta['id'],
                'numeroBoleta' => $existentePapeleta['numero_boleta'],
                'omitido' => 'La papeleta ya tiene un internamiento registrado.',
            ];
        }

        // Si la papeleta proviene de un reporte de intervención que ya tiene internamiento
        $reporteOrigen = $this->db->table('reportes_intervencion')
            ->select('id')
            ->where('id_papeleta', $idPapeleta)
            ->get()->getRowArray();
        if ($reporteOrigen) {
            $ordenReporte = $this->db->table('ordenes_internamiento')
                ->select('id, numero_boleta')
                ->where('id_reporte', (int)$reporteOrigen['id'])
                ->get()->getRowArray();
            if ($ordenReporte) {
                $this->db->table('ordenes_internamiento')
                    ->where('id', (int) $ordenReporte['id'])
                    ->update([
                        'id_papeleta' => $idPapeleta,
                        'motivo' => 'Generado con la papeleta N° ' . ($papeleta['numero_papeleta'] ?? $idPapeleta),
                    ]);

                return [
                    'id' => (int) $ordenReporte['id'],
                    'numeroBoleta' => $ordenReporte['numero_boleta'],
                    'vinculado' => true,
                ];
            }
        }

        $activo = $this->db->table('ordenes_internamiento')
            ->select('id, id_papeleta, id_reporte, numero_boleta, estado')
            ->where('id_vehiculo', $idVehiculo)
            ->whereIn('estado', ['RETENIDO', 'EN_PROCESO'])
            ->get()->getRowArray();
        if ($activo) {
            if (empty($activo['id_papeleta'])) {
                $this->db->table('ordenes_internamiento')
                    ->where('id', (int) $activo['id'])
                    ->update([
                        'id_papeleta' => $idPapeleta,
                        'motivo' => 'Generado con la papeleta N° ' . ($papeleta['numero_papeleta'] ?? $idPapeleta),
                    ]);

                return [
                    'id' => (int) $activo['id'],
                    'numeroBoleta' => $activo['numero_boleta'],
                    'vinculado' => true,
                ];
            }

            $mensajeEstado = $activo['estado'] === 'EN_PROCESO'
                ? 'en proceso de traslado al depósito'
                : 'retenido en el depósito';

            return [
                'id' => (int) $activo['id'],
                'numeroBoleta' => $activo['numero_boleta'],
                'omitido' => 'El vehículo ya está ' . $mensajeEstado . ' (boleta ' . ($activo['numero_boleta'] ?? 's/n') . ').',
            ];
        }

        if (!$this->candado) {
            $this->candado = (int) ($this->db->query("SELECT GET_LOCK('mjlo_numero_internamiento', 10) AS ok")->getRowArray()['ok'] ?? 0) === 1;
            if (!$this->candado) {
                throw new \RuntimeException('El sistema está generando otro internamiento. Intente nuevamente.');
            }
        }
        $ultima = (int) ($this->db->query("SELECT COALESCE(MAX(CAST(SUBSTRING(numero_boleta, 5) AS UNSIGNED)), 0) AS m FROM ordenes_internamiento WHERE numero_boleta REGEXP '^BOL-[0-9]+$'")->getRowArray()['m'] ?? 0);
        $numeroBoleta = 'BOL-' . str_pad((string) ($ultima + 1), 6, '0', STR_PAD_LEFT);

        $idRemisor = null;
        if (!empty($papeleta['id_inspector'])) {
            $remisor = $this->db->table('trabajadores')->where('id_persona', (int) $papeleta['id_inspector'])->where('estado', 'ACTIVO')->get()->getRowArray();
            $idRemisor = $remisor ? (int) $papeleta['id_inspector'] : null;
        }

        $this->db->table('ordenes_internamiento')->insert([
            'uuid' => \App\Libraries\Identificador::nuevo(),
            'id_papeleta' => $idPapeleta,
            'id_reporte' => $reporteOrigen ? (int)$reporteOrigen['id'] : null,
            'id_vehiculo' => $idVehiculo,
            'numero_boleta' => $numeroBoleta,
            'id_remisor' => $idRemisor,
            'id_interesado' => !empty($papeleta['id_persona_infractor']) ? (int) $papeleta['id_persona_infractor'] : null,
            'fecha_ingreso' => self::fechaDeIngreso($papeleta),
            'deposito' => self::DEPOSITO_OFICIAL,
            'motivo' => 'Generado con la papeleta N° ' . ($papeleta['numero_papeleta'] ?? $idPapeleta),
            'lugar_intervencion' => trim((string) ($papeleta['lugar'] ?? '')),
            'grado_remisor' => self::cargoDelInspector($this->db, $papeleta),
            'carnet_remisor' => self::carneDelInspector($this->db, $papeleta),
            'autoridad_que_dispone' => self::cargoDelInspector($this->db, $papeleta),
            'estado_carroceria' => self::carroceriaDelVehiculo($this->db, $idVehiculo),
            'observaciones' => '',
            'estado' => 'EN_PROCESO',
        ]);

        return ['id' => (int) $this->db->insertID(), 'numeroBoleta' => $numeroBoleta];
    }

    /**
     * Genera una orden de internamiento en estado EN_PROCESO directamente desde un reporte de intervención.
     * Al registrarse el inventario físico en el depósito pasará a RETENIDO.
     * @return array{id?: int, numeroBoleta?: string, omitido?: string, vinculado?: bool}
     */
    public function generarDesdeReporte(int $idReporte): array
    {
        $reporte = $this->db->table('reportes_intervencion')->where('id', $idReporte)->get()->getRowArray();
        if (!$reporte) {
            return ['omitido' => 'No se encontró el reporte de intervención.'];
        }

        $idVehiculo = !empty($reporte['id_vehiculo']) ? (int) $reporte['id_vehiculo'] : null;
        if (!$idVehiculo && !empty($reporte['placa'])) {
            $idVehiculo = \App\Services\VehiculoPorPlaca::resolverOCrear($this->db, (string) $reporte['placa']);
            if ($idVehiculo) {
                $this->db->table('reportes_intervencion')->where('id', $idReporte)->update(['id_vehiculo' => $idVehiculo]);
            }
        }

        if (!$idVehiculo) {
            return ['omitido' => 'El reporte no tiene un vehículo identificado para internamiento.'];
        }

        $existenteReporte = $this->db->table('ordenes_internamiento')
            ->select('id, numero_boleta')
            ->where('id_reporte', $idReporte)
            ->get()->getRowArray();
        if ($existenteReporte) {
            return [
                'id' => (int) $existenteReporte['id'],
                'numeroBoleta' => $existenteReporte['numero_boleta'],
                'omitido' => 'El reporte ya tiene un internamiento registrado.',
            ];
        }

        $activo = $this->db->table('ordenes_internamiento')
            ->select('id, id_papeleta, id_reporte, numero_boleta, estado')
            ->where('id_vehiculo', $idVehiculo)
            ->whereIn('estado', ['RETENIDO', 'EN_PROCESO'])
            ->get()->getRowArray();
        if ($activo) {
            if (empty($activo['id_reporte'])) {
                $this->db->table('ordenes_internamiento')
                    ->where('id', (int) $activo['id'])
                    ->update(['id_reporte' => $idReporte]);

                return [
                    'id' => (int) $activo['id'],
                    'numeroBoleta' => $activo['numero_boleta'],
                    'vinculado' => true,
                ];
            }

            $mensajeEstado = $activo['estado'] === 'EN_PROCESO'
                ? 'en proceso de traslado al depósito'
                : 'retenido en el depósito';

            return [
                'id' => (int) $activo['id'],
                'numeroBoleta' => $activo['numero_boleta'],
                'omitido' => 'El vehículo ya está ' . $mensajeEstado . ' (boleta ' . ($activo['numero_boleta'] ?? 's/n') . ').',
            ];
        }

        if (!$this->candado) {
            $this->candado = (int) ($this->db->query("SELECT GET_LOCK('mjlo_numero_internamiento', 10) AS ok")->getRowArray()['ok'] ?? 0) === 1;
            if (!$this->candado) {
                throw new \RuntimeException('El sistema está generando otro internamiento. Intente nuevamente.');
            }
        }
        $ultima = (int) ($this->db->query("SELECT COALESCE(MAX(CAST(SUBSTRING(numero_boleta, 5) AS UNSIGNED)), 0) AS m FROM ordenes_internamiento WHERE numero_boleta REGEXP '^BOL-[0-9]+$'")->getRowArray()['m'] ?? 0);
        $numeroBoleta = 'BOL-' . str_pad((string) ($ultima + 1), 6, '0', STR_PAD_LEFT);

        $idRemisor = null;
        if (!empty($reporte['id_inspector'])) {
            $remisor = $this->db->table('trabajadores')->where('id_persona', (int) $reporte['id_inspector'])->where('estado', 'ACTIVO')->get()->getRowArray();
            $idRemisor = $remisor ? (int) $reporte['id_inspector'] : null;
        }

        $this->db->table('ordenes_internamiento')->insert([
            'uuid' => \App\Libraries\Identificador::nuevo(),
            'id_papeleta' => null,
            'id_reporte' => $idReporte,
            'id_vehiculo' => $idVehiculo,
            'numero_boleta' => $numeroBoleta,
            'id_remisor' => $idRemisor,
            'id_interesado' => !empty($reporte['id_conductor']) ? (int) $reporte['id_conductor'] : null,
            'fecha_ingreso' => self::fechaDeIngreso($reporte),
            'deposito' => self::DEPOSITO_OFICIAL,
            'motivo' => 'Generado con el reporte REP N° ' . $idReporte,
            'lugar_intervencion' => trim((string) ($reporte['lugar'] ?? '')),
            'grado_remisor' => self::cargoDelInspector($this->db, ['id_inspector' => $reporte['id_inspector']]),
            'carnet_remisor' => self::carneDelInspector($this->db, ['id_inspector' => $reporte['id_inspector']]),
            'autoridad_que_dispone' => self::cargoDelInspector($this->db, ['id_inspector' => $reporte['id_inspector']]),
            'estado_carroceria' => self::carroceriaDelVehiculo($this->db, $idVehiculo),
            'observaciones' => trim((string) ($reporte['observaciones'] ?? '')),
            'estado' => 'EN_PROCESO',
        ]);

        return ['id' => (int) $this->db->insertID(), 'numeroBoleta' => $numeroBoleta];
    }

    /**
     * El vehículo entra al depósito en el momento de la intervención, no cuando oficina termina de identificarlo:
     * los días de depósito cuentan desde la fecha y hora de la papeleta (o del reporte del inspector del que nace).
     * Una fecha vacía, inválida o futura se reemplaza por el momento actual.
     */
    public static function fechaDeIngreso(array $papeleta): string
    {
        $ahora = time();
        $momento = strtotime((string) ($papeleta['fecha_hora'] ?? ''));

        return date('Y-m-d H:i:s', ($momento !== false && $momento > 0 && $momento <= $ahora) ? $momento : $ahora);
    }

    public static function cargoDelInspector($db, array $papeleta): string
    {
        if (empty($papeleta['id_inspector'])) {
            return 'Inspector de Tránsito Municipal';
        }
        $fila = $db->table('desplazamiento_oficina d')
            ->select('c.nombre')
            ->join('cargos c', 'c.id = d.id_cargo', 'inner')
            ->where('d.id_trabajador', (int) $papeleta['id_inspector'])
            ->where('d.fecha_termino IS NULL', null, false)
            ->orderBy('d.id', 'DESC')
            ->get()->getRowArray();

        return trim((string) ($fila['nombre'] ?? '')) ?: 'Inspector de Tránsito Municipal';
    }

    public static function carneDelInspector($db, array $papeleta): string
    {
        if (empty($papeleta['id_inspector'])) {
            return '';
        }
        $fila = $db->table('personas')->select('numero')->where('id', (int) $papeleta['id_inspector'])->get()->getRowArray();

        return trim((string) ($fila['numero'] ?? ''));
    }

    public static function carroceriaDelVehiculo($db, int $idVehiculo): string
    {
        $v = $db->table('vehiculos')->select('carroceria, tipo_carroceria')->where('id', $idVehiculo)->get()->getRowArray();
        $partes = array_filter([trim((string) ($v['carroceria'] ?? '')), trim((string) ($v['tipo_carroceria'] ?? ''))]);

        return implode(' - ', array_unique($partes));
    }
}
