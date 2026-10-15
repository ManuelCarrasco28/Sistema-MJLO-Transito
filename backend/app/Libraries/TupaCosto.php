<?php

namespace App\Libraries;

class TupaCosto
{

    public static function sql(string $alias = 'pa'): string
    {
        return "(SELECT c.costo FROM procedimiento_administrativo_costo c WHERE c.id_proc_admin = {$alias}.id AND c.estado = 'ACTIVO'"
            . ' AND c.fecha_inicio <= CURDATE() AND (c.fecha_fin IS NULL OR c.fecha_fin >= CURDATE())'
            . ' ORDER BY c.fecha_inicio DESC, c.id DESC LIMIT 1)';
    }

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
