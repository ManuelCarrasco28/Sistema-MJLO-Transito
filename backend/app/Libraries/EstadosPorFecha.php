<?php

namespace App\Libraries;

final class EstadosPorFecha
{
    public static function sincronizar($db): void
    {
        $hoy = ReglasCurso::hoy();
        $db->query("UPDATE documentos_vehiculo SET estado = 'VENCIDO' WHERE estado = 'VIGENTE' AND fecha_expiracion IS NOT NULL AND fecha_expiracion < ?", [$hoy]);
        $db->query("UPDATE documentos_vehiculo SET estado = 'VIGENTE' WHERE estado = 'VENCIDO' AND fecha_expiracion IS NOT NULL AND fecha_expiracion >= ?", [$hoy]);
        $db->query("UPDATE permisos_circulacion SET estado = 'VENCIDO' WHERE estado = 'VIGENTE' AND fecha_fin_vigencia IS NOT NULL AND fecha_fin_vigencia < ?", [$hoy]);
        $db->query("UPDATE permisos_circulacion SET estado = 'VIGENTE' WHERE estado = 'VENCIDO' AND fecha_fin_vigencia IS NOT NULL AND fecha_fin_vigencia >= ?", [$hoy]);
    }

    public static function alDia($db): void
    {
        try {
            $cache = cache();
            if ($cache->get('estados_por_fecha') === ReglasCurso::hoy()) {
                return;
            }
            self::sincronizar($db);
            $cache->save('estados_por_fecha', ReglasCurso::hoy(), 600);
        } catch (\Throwable $e) {
            log_message('error', 'No se pudieron actualizar los estados por fecha: ' . $e->getMessage());
        }
    }
}
