<?php

namespace App\Libraries;

use Ramsey\Uuid\Uuid;

class Identificador
{

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

    public static function esValido(mixed $valor): bool
    {
        return is_string($valor) && preg_match(self::PATRON_V7, $valor) === 1;
    }

    public static function modoEstricto(): bool
    {
        return filter_var(env('app.uuidEstricto', false), FILTER_VALIDATE_BOOLEAN);
    }

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
