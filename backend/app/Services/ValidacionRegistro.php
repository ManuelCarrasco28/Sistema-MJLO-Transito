<?php

namespace App\Services;

final class ValidacionRegistro
{
    public static function fechas(array $datos, array $campos, array $orden = []): array
    {
        $errores = [];
        foreach ($campos as $campo) {
            $valor = $datos[$campo] ?? null;
            if ($valor === null || $valor === '') continue;
            $fecha = is_string($valor) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $valor) : false;
            if (!$fecha || $fecha->format('Y-m-d') !== $valor) $errores[$campo] = 'Fecha no válida.';
        }
        foreach ($orden as [$inicio, $fin]) {
            if (!empty($datos[$inicio]) && !empty($datos[$fin]) && !isset($errores[$inicio]) && !isset($errores[$fin]) && $datos[$inicio] > $datos[$fin]) {
                $errores[$fin] = 'Debe ser igual o posterior a la fecha inicial.';
            }
        }
        return $errores;
    }

    public static function permiso(array $datos): array
    {
        $errores = self::fechas($datos, ['fecha_emision', 'fecha_inicio_vigencia', 'fecha_fin_vigencia'], [['fecha_inicio_vigencia', 'fecha_fin_vigencia']]);
        foreach (['fecha_emision', 'fecha_inicio_vigencia'] as $campo) {
            if (array_key_exists($campo, $datos) && empty($datos[$campo])) $errores[$campo] = 'Fecha obligatoria.';
        }
        if (!in_array($datos['estado'] ?? 'VIGENTE', ['VIGENTE', 'VENCIDO', 'ANULADO'], true)) $errores['estado'] = 'Estado no válido.';
        if (!in_array($datos['tipo_permiso'] ?? 'OPERACION', ['CARGA_DESCARGA', 'USO_VIAS', 'OPERACION', 'RENOVACION_OPERACION', 'CONTROL_VEHICULAR', 'ZONAS_RESERVADAS', 'ZONA_RESERVADA'], true)) $errores['tipoPermiso'] = 'Tipo de permiso no válido.';
        foreach (['horario_inicio', 'horario_fin'] as $campo) {
            if (!empty($datos[$campo]) && !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/', (string)$datos[$campo])) $errores[$campo] = 'Hora no válida.';
        }
        return $errores;
    }

    public static function documento(array $datos): array
    {
        $errores = self::fechas($datos, ['fecha_expedicion', 'fecha_expiracion'], [['fecha_expedicion', 'fecha_expiracion']]);
        if (trim((string)($datos['codigo'] ?? '')) === '') $errores['codigo'] = 'Ingrese el número de documento.';
        if (!in_array($datos['estado'] ?? 'VIGENTE', ['VIGENTE', 'VENCIDO', 'ANULADO'], true)) $errores['estado'] = 'Estado no válido.';
        return $errores;
    }
}
