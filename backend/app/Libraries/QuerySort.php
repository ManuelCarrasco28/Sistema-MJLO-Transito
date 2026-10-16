<?php

namespace App\Libraries;

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
        $direccionDefecto = strtoupper($direccionDefecto);
        $claves = array_map('trim', explode(',', (string) $request->getGet('sortBy')));
        $direcciones = array_map(
            static fn($d) => strtoupper(trim($d)),
            explode(',', (string) $request->getGet('sortDir'))
        );

        $aplicadas = [];
        foreach ($claves as $i => $clave) {
            if ($clave === '' || !isset($columnas[$clave]) || in_array($columnas[$clave], $aplicadas, true)) {
                continue;
            }
            $dir = in_array($direcciones[$i] ?? '', ['ASC', 'DESC'], true) ? $direcciones[$i] : $direccionDefecto;
            $builder->orderBy($columnas[$clave], $dir);
            $aplicadas[] = $columnas[$clave];
        }

        if ($aplicadas !== [] && !in_array($columnaDefecto, $aplicadas, true)) {
            $builder->orderBy($columnaDefecto, $direccionDefecto);
        }

        if ($aplicadas === []) {
            $dir = in_array($direcciones[0] ?? '', ['ASC', 'DESC'], true) ? $direcciones[0] : $direccionDefecto;
            $builder->orderBy($columnaDefecto, $dir);
        }

        return $builder;
    }
}
