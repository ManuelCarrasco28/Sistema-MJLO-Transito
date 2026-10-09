<?php

namespace App\Libraries;

final class ReglasCurso
{
    public const ESTADOS = 'PROGRAMADO,ABIERTO,ACTIVO,EN_CURSO,FINALIZADO,CANCELADO';

    public static function admiteInscripcion(string $estado): bool
    {
        return in_array(strtoupper(trim($estado)), ['PROGRAMADO', 'ABIERTO', 'ACTIVO'], true);
    }

    public static function condicionAprobado(string $alias = 'ic'): string
    {
        return "($alias.estado = 'APROBADO' OR ($alias.asistio = 1 AND $alias.estado NOT IN ('DESAPROBADO','ANULADO','CANCELADO')))";
    }

    public static function siguienteCodigo(int $ultimo, int $anio): string
    {
        return 'CUR-' . $anio . '-' . str_pad((string)($ultimo + 1), 3, '0', STR_PAD_LEFT);
    }

    public static function fechaFin(string $inicio): string
    {
        return (new \DateTimeImmutable($inicio))->modify('+3 days')->format('Y-m-d');
    }

    public static function validarCalendario(array $datos): ?string
    {
        foreach (['fecha', 'fechaFin', 'fechaInscripcionInicio', 'fechaInscripcionFin'] as $campo) {
            $valor = $datos[$campo] ?? '';
            if (!is_string($valor) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $valor)) return 'Complete todas las fechas del curso y de inscripción.';
            [$anio,$mes,$dia] = array_map('intval', explode('-', $valor));
            if (!checkdate($mes,$dia,$anio)) return 'Ingrese fechas válidas.';
        }
        if ($datos['fechaInscripcionInicio'] > $datos['fechaInscripcionFin']) return 'El cierre de inscripción debe ser posterior o igual a su apertura.';
        if ($datos['fechaInscripcionFin'] > $datos['fecha']) return 'La inscripción debe cerrar antes o el mismo día que comienza el curso.';
        if ($datos['fechaFin'] < $datos['fecha']) return 'El fin del curso no puede ser anterior a su inicio.';
        foreach (['horaInicio','horaFin'] as $campo) {
            if (!is_string($datos[$campo] ?? null) || !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $datos[$campo])) return 'Seleccione horas válidas de inicio y fin.';
        }
        if ($datos['horaFin'] <= $datos['horaInicio']) return 'La hora de fin debe ser posterior a la hora de inicio.';
        return null;
    }

    public static function inscripcionAbierta(array $curso, string $hoy): bool
    {
        return self::admiteInscripcion($curso['estado'] ?? '')
            && (empty($curso['fecha_inscripcion_inicio']) || $hoy >= $curso['fecha_inscripcion_inicio'])
            && (empty($curso['fecha_inscripcion_fin']) || $hoy <= $curso['fecha_inscripcion_fin']);
    }

    public static function hoy(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('America/Lima')))->format('Y-m-d');
    }
}
