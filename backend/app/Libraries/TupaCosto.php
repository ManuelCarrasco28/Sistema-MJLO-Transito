<?php

namespace App\Libraries;

/**
 * Costo vigente de un trámite del TUPA. El costo vive en procedimiento_administrativo_costo (con fecha de inicio y
 * fin), así un cambio de tarifa no altera lo que ya se cobró; aquí se resuelve cuál es la tarifa de hoy.
 */
class TupaCosto
{
    /** Subconsulta SQL con el costo vigente del procedimiento cuyo alias de tabla es $alias (por defecto `pa`). */
    public static function sql(string $alias = 'pa'): string
    {
        return "(SELECT c.costo FROM procedimiento_administrativo_costo c WHERE c.id_proc_admin = {$alias}.id AND c.estado = 'ACTIVO'"
            . ' AND c.fecha_inicio <= CURDATE() AND (c.fecha_fin IS NULL OR c.fecha_fin >= CURDATE())'
            . ' ORDER BY c.fecha_inicio DESC, c.id DESC LIMIT 1)';
    }

    /** Costo vigente de un procedimiento, o null si no tiene tarifa definida. */
    public static function vigente($db, int $idProcedimiento): ?float
    {
        $fila = $db->query(
            "SELECT c.costo FROM procedimiento_administrativo_costo c WHERE c.id_proc_admin = ? AND c.estado = 'ACTIVO'"
            . ' AND c.fecha_inicio <= CURDATE() AND (c.fecha_fin IS NULL OR c.fecha_fin >= CURDATE())'
            . ' ORDER BY c.fecha_inicio DESC, c.id DESC LIMIT 1',
            [$idProcedimiento]
        )->getRowArray();

        return $fila ? (float) $fila['costo'] : null;
    }
}
