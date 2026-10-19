<?php

namespace App\Libraries;

use InvalidArgumentException;

class ProcedimientoDatos
{
    public static function validar(array $input): array
    {
        foreach (['codigo', 'nombre', 'descripcion', 'estado', 'baseLegal', 'tipoTramite'] as $field) {
            if (isset($input[$field]) && !is_string($input[$field])) {
                throw new InvalidArgumentException('El campo ' . $field . ' debe ser texto.');
            }
        }
        $codigo = strtoupper(trim($input['codigo'] ?? ''));
        $nombre = trim($input['nombre'] ?? '');
        $descripcion = trim($input['descripcion'] ?? '');
        $baseLegal = trim($input['baseLegal'] ?? '');
        $estado = $input['estado'] ?? 'ACTIVO';
        $tipo = $input['tipoTramite'] ?? 'INICIAL';
        $costo = $input['costo'] ?? null;
        if (!preg_match('/^[A-Z0-9][A-Z0-9._-]{0,49}$/', $codigo)) {
            throw new InvalidArgumentException('Ingrese un código válido de hasta 50 caracteres.');
        }
        if ($nombre === '' || mb_strlen($nombre) > 200) {
            throw new InvalidArgumentException('El nombre es obligatorio y admite hasta 200 caracteres.');
        }
        if (strlen($descripcion) > 60000 || strlen($baseLegal) > 60000) {
            throw new InvalidArgumentException('La descripción o base legal es demasiado extensa.');
        }
        if (!is_scalar($costo) || is_bool($costo) || !preg_match('/^\d{1,10}(?:\.\d{1,2})?$/', (string) $costo)) {
            throw new InvalidArgumentException('Ingrese un importe no negativo con un máximo de dos decimales.');
        }
        if (!in_array($estado, ['ACTIVO', 'INACTIVO'], true) || !in_array($tipo, ['INICIAL', 'RENOVACION', 'DUPLICADO'], true)) {
            throw new InvalidArgumentException('El estado o tipo de trámite no es válido.');
        }
        $plazo = $input['plazoAtencion'] ?? null;
        if ($plazo === '') $plazo = null;
        if ($plazo !== null && (!is_scalar($plazo) || is_bool($plazo) || !ctype_digit((string) $plazo) || (int) $plazo > 3650)) {
            throw new InvalidArgumentException('El plazo debe ser un número entero entre 0 y 3650 días.');
        }
        return [
            'codigo' => $codigo, 'nombre' => $nombre, 'descripcion' => $descripcion,
            'base_legal' => $baseLegal, 'estado' => $estado, 'tipo_tramite' => $tipo,
            'plazo_atencion' => $plazo === null ? null : (int) $plazo,
            'costo' => number_format((float) $costo, 2, '.', ''),
        ];
    }
}
