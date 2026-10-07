<?php

namespace App\Libraries;

use Ramsey\Uuid\Uuid;

/**
 * Identificadores públicos (UUID versión 7) de los registros principales.
 *
 * El `id` numérico se queda como llave interna (relaciones, índices): es compacto y rápido. El `uuid` es lo
 * que se puede mostrar o usar en enlaces y QR: no se puede adivinar ni recorrer uno a uno, y al ser versión 7
 * va ordenado por fecha, así que no desordena los índices como lo haría un UUID aleatorio.
 */
class Identificador
{
    /** Tablas que llevan columna `uuid`. */
    public const TABLAS = [
        'personas',
        'vehiculos',
        'asociaciones',
        'documentos_vehiculo',
        'papeletas',
        'inscripciones_curso',
        'cursos_seguridad_vial',
        'certicav',
        'ordenes_internamiento',
        'operativos',
        'permisos_circulacion',
        'reportes_intervencion',
        'pagos_transito',
        'ordenes_libertad',
        'tramites_documentarios',
        'certificados_curso',
    ];

    private const PATRON_V7 = '/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';

    public static function nuevo(): string
    {
        return Uuid::uuid7()->toString();
    }

    /** Solo el formato canónico de 36 caracteres, versión 7 (sin llaves, sin "urn:uuid:", sin otras versiones). */
    public static function esValido(mixed $valor): bool
    {
        return is_string($valor) && preg_match(self::PATRON_V7, $valor) === 1;
    }

    /**
     * Si el modo estricto está activo (app.uuidEstricto=true en el .env), las rutas expuestas a roles bajos
     * dejan de aceptar el id numérico y exigen el uuid. Mientras la app móvil instalada siga mandando ids
     * numéricos queda apagado (por defecto): se aceptan los dos.
     */
    public static function modoEstricto(): bool
    {
        return filter_var(env('app.uuidEstricto', false), FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Resuelve el valor recibido en una URL (uuid o id numérico) al id interno de la tabla.
     * Devuelve null si no existe o no tiene un formato válido.
     */
    public static function resolverId(\CodeIgniter\Database\BaseConnection $db, string $tabla, mixed $valor, bool $soloUuid = false): ?int
    {
        if (!in_array($tabla, self::TABLAS, true)) {
            return null;
        }

        if (self::esValido($valor)) {
            $fila = $db->table($tabla)->select('id')->where('uuid', strtolower($valor))->get()->getRowArray();

            return $fila ? (int) $fila['id'] : null;
        }

        if ($soloUuid && self::modoEstricto()) {
            return null;
        }

        return is_string($valor) || is_int($valor) ? (ctype_digit((string) $valor) && (int) $valor > 0 ? (int) $valor : null) : null;
    }

    /**
     * Asigna un UUID a los registros de la tabla que todavía no lo tienen (los anteriores a esta columna o
     * los que se hayan insertado por una vía que no lo puso). Devuelve cuántos rellenó.
     */
    public static function rellenar(\CodeIgniter\Database\BaseConnection $db, string $tabla, int $lote = 1000): int
    {
        if (!in_array($tabla, self::TABLAS, true)) {
            throw new \InvalidArgumentException("La tabla {$tabla} no lleva uuid.");
        }

        $total = 0;
        do {
            $ids = array_column(
                $db->table($tabla)->select('id')->where('uuid IS NULL', null, false)->orderBy('id', 'ASC')->limit($lote)->get()->getResultArray(),
                'id'
            );
            if ($ids === []) {
                break;
            }

            $casos = '';
            foreach ($ids as $id) {
                $casos .= ' WHEN ' . (int) $id . " THEN '" . self::nuevo() . "'";
            }
            $db->query("UPDATE `{$tabla}` SET uuid = CASE id{$casos} END WHERE id IN (" . implode(',', array_map('intval', $ids)) . ')');
            $total += count($ids);
        } while (count($ids) === $lote);

        return $total;
    }
}
