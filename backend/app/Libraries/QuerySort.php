<?php

namespace App\Libraries;

/**
 * Resuelve de forma segura el ordenamiento (columna + dirección) pedido por
 * el cliente vía querystring (?sortBy=...&sortDir=...), validando la columna
 * contra una lista blanca (nunca se concatena el nombre recibido directo al
 * SQL) para no abrir una inyección SQL a través del parámetro de orden.
 */
class QuerySort
{
    /**
     * @param object $request Request actual (para leer sortBy/sortDir de la querystring).
     * @param array $columnas Mapa clave-de-frontend => columna SQL real permitida, ej. ['nombre' => 'c.nombres'].
     * @param string $columnaDefecto Columna SQL a usar si no se pide ninguna (o la pedida no es válida).
     * @param string $direccionDefecto 'ASC' o 'DESC' cuando no se especifica dirección.
     */
    public static function aplicar($builder, $request, array $columnas, string $columnaDefecto, string $direccionDefecto = 'DESC')
    {
        $sortBy = trim((string) $request->getGet('sortBy'));
        $sortDirRaw = strtoupper(trim((string) $request->getGet('sortDir')));
        $sortDir = in_array($sortDirRaw, ['ASC', 'DESC'], true) ? $sortDirRaw : strtoupper($direccionDefecto);

        $columnaSql = $columnas[$sortBy] ?? $columnaDefecto;

        return $builder->orderBy($columnaSql, $sortDir);
    }
}
