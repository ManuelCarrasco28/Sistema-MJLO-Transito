<?php

namespace App\Libraries;

/**
 * Control de ediciones simultáneas: cada registro editable tiene una "versión" (su fecha de última
 * modificación). Las lecturas la incluyen como versionRegistro y, al guardar, el navegador la devuelve;
 * si ya no coincide, otra persona modificó el registro y se rechaza el guardado.
 */
final class Concurrencia
{
    /** recurso de la API => [tabla, columna del id, columna de versión, tipo de la columna: ts = TIMESTAMP, dt = DATETIME] */
    public const RECURSOS = [
        'vehiculos' => ['vehiculos', 'id', 'fecha_modificacion', 'ts'],
        'personas' => ['personas', 'id', 'fecha_updated', 'ts'],
        'asociaciones' => ['asociaciones', 'id', 'fecha_modificacion', 'ts'],
        'documentos' => ['documentos_vehiculo', 'id', 'fecha_modificacion', 'ts'],
        'papeletas' => ['papeletas', 'id', 'fecha_modificacion', 'ts'],
        'cursos' => ['cursos_seguridad_vial', 'id', 'fecha_modificacion', 'ts'],
        'permisos' => ['permisos_circulacion', 'id', 'fecha_modificacion', 'ts'],
        'inspecciones' => ['certicav', 'id', 'fecha_modificacion', 'ts'],
        'operativos' => ['operativos', 'id', 'updated_at', 'dt'],
        'personal' => ['trabajadores', 'id_persona', 'fecha_updated', 'ts'],
    ];

    /**
     * Expresión SQL de la versión. Los TIMESTAMP se leen como época para que no dependa de la zona
     * horaria de la conexión (la API usa -05:00 y otras conexiones, UTC).
     */
    private static function expresion(string $columna, string $tipo): string
    {
        return $tipo === 'ts' ? "CAST(UNIX_TIMESTAMP({$columna}) AS CHAR)" : "CAST({$columna} AS CHAR)";
    }

    /** Versiones de varios registros: id => versión. */
    public static function versiones($db, string $recurso, array $ids): array
    {
        if (!isset(self::RECURSOS[$recurso]) || !$ids) {
            return [];
        }
        [$tabla, $pk, $columna, $tipo] = self::RECURSOS[$recurso];
        $filas = $db->table($tabla)->select("{$pk} AS clave, " . self::expresion($columna, $tipo) . ' AS version', false)->whereIn($pk, array_values($ids))->get()->getResultArray();
        $salida = [];
        foreach ($filas as $fila) {
            $salida[(string) $fila['clave']] = (string) $fila['version'];
        }

        return $salida;
    }

    /** Versión actual de un registro identificado por id numérico o uuid; null si no existe. */
    public static function actual($db, string $recurso, string $idOUuid): ?string
    {
        if (!isset(self::RECURSOS[$recurso]) || $idOUuid === '') {
            return null;
        }
        [$tabla, $pk, $columna, $tipo] = self::RECURSOS[$recurso];
        $consulta = $db->table($tabla)->select(self::expresion($columna, $tipo) . ' AS version', false);
        if (ctype_digit($idOUuid)) {
            $consulta->where($pk, (int) $idOUuid);
        } elseif ($db->fieldExists('uuid', $tabla)) {
            $consulta->where('uuid', $idOUuid);
        } else {
            return null;
        }
        $fila = $consulta->limit(1)->get()->getRowArray();

        return $fila ? (string) $fila['version'] : null;
    }
}
