<?php

namespace App\Libraries;

final class ReglasCurso
{
    public const ESTADOS = 'PROGRAMADO,ABIERTO,ACTIVO,EN_CURSO,FINALIZADO,CANCELADO';

    public static function admiteInscripcion(string $estado): bool
    {
        return in_array(strtoupper(trim($estado)), ['PROGRAMADO', 'ABIERTO', 'ACTIVO'], true);
    }

    /**
     * Inscripción que da derecho a carnet: aprobada (o con asistencia), con el curso pagado (o gratuito) y sin que el
     * curso haya sido cancelado.
     */
    public static function condicionAprobado(string $alias = 'ic'): string
    {
        return "(($alias.asistio = 1 AND $alias.estado NOT IN ('DESAPROBADO','ANULADO','CANCELADO'))"
            . " AND ($alias.estado_pago = 'PAGADO' OR NOT EXISTS (SELECT 1 FROM cursos_seguridad_vial cpg WHERE cpg.id = $alias.id_curso AND cpg.costo_inscripcion > 0))"
            . " AND NOT EXISTS (SELECT 1 FROM cursos_seguridad_vial ccx WHERE ccx.id = $alias.id_curso AND ccx.estado = 'CANCELADO'))";
    }

    /**
     * El estado del curso sigue sus fechas: programado antes del inicio, en curso entre el inicio y el fin,
     * finalizado al pasar el fin (también hacia atrás si se editan las fechas). No toca cursos cancelados ni los
     * marcados como finalizados a mano. Se usa al abrir las listas y con `php spark cursos:sincronizar-estados`.
     */
    public static function sincronizarEstados($db): void
    {
        $hoy = self::hoy();
        $abiertos = "('PROGRAMADO','ABIERTO','ACTIVO','EN_CURSO')";
        $db->query("UPDATE cursos_seguridad_vial SET estado = 'FINALIZADO' WHERE fecha_fin < ? AND estado IN $abiertos", [$hoy]);
        $db->query("UPDATE cursos_seguridad_vial SET estado = 'EN_CURSO' WHERE fecha_inicio <= ? AND fecha_fin >= ? AND estado IN $abiertos AND estado <> 'EN_CURSO'", [$hoy, $hoy]);
        $db->query("UPDATE cursos_seguridad_vial SET estado = 'PROGRAMADO' WHERE fecha_inicio > ? AND estado IN $abiertos AND estado <> 'PROGRAMADO'", [$hoy]);
    }

    public static function siguienteCodigo(int $ultimo, int $anio): string
    {
        return 'CSV-' . $anio . '-' . str_pad((string)($ultimo + 1), 3, '0', STR_PAD_LEFT);
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
