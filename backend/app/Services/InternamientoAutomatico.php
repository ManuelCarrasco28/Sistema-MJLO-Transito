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
     * @return array{id?: int, numeroBoleta?: string, omitido?: string}
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

        if ($this->db->table('ordenes_internamiento')->where('id_papeleta', $idPapeleta)->countAllResults() > 0) {
            return ['omitido' => 'La papeleta ya tiene un internamiento registrado.'];
        }
        $retenido = $this->db->table('ordenes_internamiento')->select('numero_boleta')
            ->where('id_vehiculo', $idVehiculo)->where('estado', 'RETENIDO')->get()->getRowArray();
        if ($retenido) {
            return ['omitido' => 'El vehículo ya está retenido en el depósito (boleta ' . ($retenido['numero_boleta'] ?? 's/n') . ').'];
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
            'estado' => 'RETENIDO',
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
