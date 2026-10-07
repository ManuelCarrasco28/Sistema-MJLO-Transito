<?php

namespace Tests\Unit;

use App\Libraries\Identificador;
use PHPUnit\Framework\TestCase;

final class IdentificadorTest extends TestCase
{
    public function testGeneraUuidVersion7Valido(): void
    {
        $uuid = Identificador::nuevo();

        $this->assertTrue(Identificador::esValido($uuid));
        $this->assertSame('7', $uuid[14]);
        $this->assertSame(36, strlen($uuid));
    }

    public function testNoSeRepiteYVaOrdenadoPorFecha(): void
    {
        $uuids = [];
        for ($i = 0; $i < 200; $i++) {
            $uuids[] = Identificador::nuevo();
        }

        $this->assertCount(200, array_unique($uuids));
        $ordenados = $uuids;
        sort($ordenados);
        $this->assertSame($uuids, $ordenados);
    }

    public function testRechazaValoresQueNoSonUuid(): void
    {
        $this->assertFalse(Identificador::esValido('QR-VEH-2026-920'));
        $this->assertFalse(Identificador::esValido('123'));
        $this->assertFalse(Identificador::esValido(null));
        $this->assertFalse(Identificador::esValido(['x']));
    }

    public function testSoloAceptaElFormatoCanonicoDeLaVersion7(): void
    {
        $this->assertFalse(Identificador::esValido('550e8400-e29b-41d4-a716-446655440000'), 'versión 4');
        $this->assertFalse(Identificador::esValido('{' . Identificador::nuevo() . '}'), 'con llaves');
        $this->assertFalse(Identificador::esValido('urn:uuid:' . Identificador::nuevo()), 'con prefijo urn');
        $this->assertFalse(Identificador::esValido(str_replace('-', '', Identificador::nuevo())), 'sin guiones');
        $this->assertTrue(Identificador::esValido(strtoupper(Identificador::nuevo())), 'en mayúsculas se acepta y se baja a minúsculas al buscar');
    }

    public function testLasTablasQueSeExponenLlevanUuid(): void
    {
        foreach (['vehiculos', 'personas', 'papeletas', 'certificados_curso', 'tramites_documentarios', 'ordenes_libertad'] as $tabla) {
            $this->assertContains($tabla, Identificador::TABLAS);
        }
    }

    public function testSoloLasTablasListadasLlevanUuid(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Identificador::rellenar(\Config\Database::connect(), 'usuarios');
    }
}
