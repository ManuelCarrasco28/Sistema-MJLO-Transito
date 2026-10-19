<?php

namespace App\Services;

use CodeIgniter\Database\BaseConnection;

/**
 * La placa de una papeleta o de un reporte viene de la consulta a SUNARP: no hace falta que el vehículo ya esté en
 * Vehículos. Primero se busca en el padrón por si existe; si no, se registra con lo que se sepa (la placa y, si llegan,
 * marca, modelo, color, motor…) como vehículo sin asociación, para que la papeleta y su internamiento tengan vehículo.
 */
class VehiculoPorPlaca
{
    /** Una placa real: de 5 a 7 letras o números. «SIN PLACA» y similares no lo son. */
    public static function esPlacaValida(string $placa): bool
    {
        return preg_match('/^[A-Z0-9]{5,7}$/', $placa) === 1;
    }

    /**
     * @param array{marca?:string,modelo?:string,color?:string,clase?:string,motor?:string,serie?:string,anio?:mixed,categoria?:string,carroceria?:string} $datos
     * @return int|null id del vehículo (existente o recién registrado); null si la placa no es válida
     */
    public static function resolverOCrear(BaseConnection $db, string $placa, array $datos = []): ?int
    {
        $placa = \App\Libraries\Placa::normalizar($placa);
        if (!self::esPlacaValida($placa)) {
            return null;
        }

        $existente = $db->table('vehiculos')->select('id')->where('placa', $placa)->limit(1)->get()->getRowArray();
        if ($existente) {
            return (int) $existente['id'];
        }

        $texto = static fn (string $clave): ?string => ($v = trim((string) ($datos[$clave] ?? ''))) !== '' ? mb_substr($v, 0, 80) : null;
        $tipoNombre = $texto('clase') ?? 'Mototaxi';
        $tipo = $db->table('tipos_vehiculo')->where('nombre', $tipoNombre)->get()->getRowArray()
            ?: $db->table('tipos_vehiculo')->where('nombre', 'Mototaxi')->get()->getRowArray();
        $anio = (int) ($datos['anio'] ?? 0);

        $db->table('vehiculos')->insert([
            'uuid' => \App\Libraries\Identificador::nuevo(),
            'id_tipo_vehiculo' => $tipo['id'] ?? null,
            'placa' => $placa,
            'marca' => $texto('marca'),
            'modelo' => $texto('modelo'),
            'color' => $texto('color'),
            'anio_fabricacion' => ($anio >= 1950 && $anio <= (int) date('Y') + 1) ? $anio : null,
            'categoria' => $texto('categoria'),
            'carroceria' => $texto('carroceria'),
            'numero_serie' => $texto('serie'),
            'serie_motor' => $texto('motor'),
            'estado' => 'ACTIVO',
        ]);

        return (int) $db->insertID();
    }
}
