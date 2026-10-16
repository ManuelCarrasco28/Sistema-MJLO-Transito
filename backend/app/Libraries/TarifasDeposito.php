<?php

namespace App\Libraries;

final class TarifasDeposito
{
    public const CLAVES = [
        'tarifa_guardiania_dia' => 'Tarifa de guardianía por día de custodia (S/).',
        'tarifa_remolque' => 'Tarifa fija del remolque (S/).',
    ];

    public const ROLES_JEFATURA = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE'];

    public static function obtener($db): array
    {
        $filas = $db->table('configuracion_sistema')->select('clave, valor')->whereIn('clave', array_keys(self::CLAVES))->get()->getResultArray();
        $v = array_column($filas, 'valor', 'clave');

        return [
            'guardianiaDia' => round(max(0.0, (float) ($v['tarifa_guardiania_dia'] ?? 0)), 2),
            'remolque' => round(max(0.0, (float) ($v['tarifa_remolque'] ?? 0)), 2),
        ];
    }

    public static function guardar($db, float $guardianiaDia, float $remolque): void
    {
        foreach (['tarifa_guardiania_dia' => $guardianiaDia, 'tarifa_remolque' => $remolque] as $clave => $valor) {
            $existe = $db->table('configuracion_sistema')->where('clave', $clave)->countAllResults();
            $datos = ['valor' => number_format($valor, 2, '.', ''), 'descripcion' => self::CLAVES[$clave]];
            if ($existe) {
                $db->table('configuracion_sistema')->where('clave', $clave)->update($datos);
            } else {
                $db->table('configuracion_sistema')->insert($datos + ['clave' => $clave]);
            }
        }
    }

    public static function esJefatura(?array $usuario = null): bool
    {
        return in_array(Acceso::rol($usuario), self::ROLES_JEFATURA, true);
    }

    public static function validar(array $tarifas, int $dias, float $montoGuardiania, float $montoRemolque, bool $jefatura): bool
    {
        $rebaja = false;
        $esperadoGuardiania = round($tarifas['guardianiaDia'] * $dias, 2);
        if ($tarifas['guardianiaDia'] > 0) {
            if ($montoGuardiania > $esperadoGuardiania + 0.001) {
                throw new \DomainException('La guardianía no puede superar la tarifa (S/ ' . number_format($esperadoGuardiania, 2) . ' por ' . $dias . ' día(s)).');
            }
            if (abs($montoGuardiania - $esperadoGuardiania) > 0.001) {
                if (!$jefatura) {
                    throw new \DomainException('La guardianía debe ser S/ ' . number_format($esperadoGuardiania, 2) . ' (' . $dias . ' día(s) × S/ ' . number_format($tarifas['guardianiaDia'], 2) . '). Solo la jefatura puede rebajarla.');
                }
                $rebaja = true;
            }
        }
        if ($tarifas['remolque'] > 0 && $montoRemolque > 0) {
            if ($montoRemolque > $tarifas['remolque'] + 0.001) {
                throw new \DomainException('El remolque no puede superar la tarifa (S/ ' . number_format($tarifas['remolque'], 2) . ').');
            }
            if (abs($montoRemolque - $tarifas['remolque']) > 0.001) {
                if (!$jefatura) {
                    throw new \DomainException('El remolque debe ser S/ ' . number_format($tarifas['remolque'], 2) . ' o 0 si no hubo remolque. Solo la jefatura puede rebajarlo.');
                }
                $rebaja = true;
            }
        }

        return $rebaja;
    }
}
