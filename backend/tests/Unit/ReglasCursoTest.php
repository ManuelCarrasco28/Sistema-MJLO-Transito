<?php

namespace Tests\Unit;

use App\Libraries\ReglasCurso;
use PHPUnit\Framework\TestCase;

final class ReglasCursoTest extends TestCase
{
    public function testSoloCursosAbiertosAdmitenInscripcion(): void
    {
        foreach (['PROGRAMADO','ABIERTO','ACTIVO'] as $estado) $this->assertTrue(ReglasCurso::admiteInscripcion($estado));
        foreach (['EN_CURSO','FINALIZADO','CANCELADO','OTRO',''] as $estado) $this->assertFalse(ReglasCurso::admiteInscripcion($estado));
    }

    public function testCodigoUsaCorrelativoExistenteYAnioActual(): void
    {
        $this->assertSame('CSV-2026-001', ReglasCurso::siguienteCodigo(0, 2026));
        $this->assertSame('CSV-2026-053', ReglasCurso::siguienteCodigo(52, 2026));
        $this->assertSame('CSV-2027-1001', ReglasCurso::siguienteCodigo(1000, 2027));
    }

    public function testReprobacionExplicitaImpideEmitirCarnetPorAsistencia(): void
    {
        $sql = ReglasCurso::condicionAprobado();
        $this->assertStringContainsString("ic.estado = 'APROBADO'", $sql);
        $this->assertStringContainsString("ic.estado NOT IN ('DESAPROBADO','ANULADO','CANCELADO')", $sql);
    }

    public function testReprogramacionCalculaElFinalDesdeLaNuevaFecha(): void
    {
        $this->assertSame('2026-11-02', ReglasCurso::fechaFin('2026-10-30'));
        $this->assertSame('2027-01-03', ReglasCurso::fechaFin('2026-12-31'));
    }

    private function calendario(): array
    {
        return ['fechaInscripcionInicio'=>'2026-10-01', 'fechaInscripcionFin'=>'2026-10-10', 'fecha'=>'2026-10-11', 'fechaFin'=>'2026-10-20', 'horaInicio'=>'09:00', 'horaFin'=>'12:30'];
    }

    public function testGuardaUnPeriodoExplicitoSinImponerTresDias(): void
    {
        $this->assertNull(ReglasCurso::validarCalendario($this->calendario()));
    }

    public function testRechazaFechasYHorasIncoherentes(): void
    {
        foreach (['fechaFin'=>'2026-10-09','fechaInscripcionInicio'=>'2026-10-12','fechaInscripcionFin'=>'2026-10-21','horaFin'=>'08:59','horaInicio'=>'25:00','fecha'=>'2026-02-30'] as $campo=>$valor) {
            $this->assertNotNull(ReglasCurso::validarCalendario(array_replace($this->calendario(), [$campo=>$valor])));
        }
        $this->assertNotNull(ReglasCurso::validarCalendario([]));
    }

    public function testInscripcionSeAbreYCierraPorFechaInclusive(): void
    {
        $curso = ['estado'=>'PROGRAMADO', 'fecha_inscripcion_inicio'=>'2026-10-01', 'fecha_inscripcion_fin'=>'2026-10-10'];
        $this->assertFalse(ReglasCurso::inscripcionAbierta($curso, '2026-09-30'));
        $this->assertTrue(ReglasCurso::inscripcionAbierta($curso, '2026-10-01'));
        $this->assertTrue(ReglasCurso::inscripcionAbierta($curso, '2026-10-10'));
        $this->assertFalse(ReglasCurso::inscripcionAbierta($curso, '2026-10-11'));
        $curso['estado'] = 'CANCELADO';
        $this->assertFalse(ReglasCurso::inscripcionAbierta($curso, '2026-10-05'));
    }
}
