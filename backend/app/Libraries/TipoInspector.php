<?php

namespace App\Libraries;

/**
 * El tipo de inspector sale del rol del usuario: Inspector de Tránsito o Inspector Técnico.
 */
final class TipoInspector
{
    public const ROL_TRANSITO = 'Inspector de Tránsito';
    public const ROL_TECNICO = 'Inspector Técnico';

    public static function rolDe(string $tipo): ?string
    {
        return match (strtoupper($tipo)) {
            'TRANSITO' => self::ROL_TRANSITO,
            'TECNICO' => self::ROL_TECNICO,
            default => null,
        };
    }

    /** Expresión SQL (TRANSITO, TECNICO o NULL) según el rol del usuario activo del trabajador de la tabla $alias. */
    public static function sqlTipo(string $alias): string
    {
        return "(SELECT CASE WHEN r_ti.nombre = '" . self::ROL_TRANSITO . "' THEN 'TRANSITO' WHEN r_ti.nombre = '" . self::ROL_TECNICO . "' THEN 'TECNICO' ELSE NULL END
                FROM usuarios u_ti JOIN roles r_ti ON r_ti.id = u_ti.id_rol
                WHERE u_ti.id_persona = {$alias}.id_persona AND u_ti.estado = 'ACTIVO' ORDER BY u_ti.id DESC LIMIT 1)";
    }

    /** Condición SQL: el trabajador de la tabla $alias tiene un usuario activo con ese rol de inspector. */
    public static function sqlTieneRol(string $alias, string $tipo): string
    {
        $rol = self::rolDe($tipo) ?? '';

        return "EXISTS (SELECT 1 FROM usuarios u_ti JOIN roles r_ti ON r_ti.id = u_ti.id_rol
                WHERE u_ti.id_persona = {$alias}.id_persona AND u_ti.estado = 'ACTIVO' AND r_ti.nombre = '" . $rol . "')";
    }
}
