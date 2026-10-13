<?php

namespace Tests\Unit;

use App\Libraries\Acceso;
use PHPUnit\Framework\TestCase;

final class AccesoTest extends TestCase
{
    public function testLaJerarquiaOrdenaLosRolesDeMasAMenosPrivilegio(): void
    {
        $this->assertLessThan(Acceso::rango('GERENTE'), Acceso::rango('SUPERADMIN'));
        $this->assertLessThan(Acceso::rango('SUBGERENTE'), Acceso::rango('GERENTE'));
        $this->assertLessThan(Acceso::rango('TRABAJADOR'), Acceso::rango('SECRETARIA'));
        $this->assertSame(Acceso::rango('SubGerente'), Acceso::rango('SUBGERENTE'));
    }

    public function testUnRolDesconocidoNoTienePrivilegios(): void
    {
        $this->assertGreaterThan(Acceso::rango('TRABAJADOR'), Acceso::rango('INVENTADO'));
    }

    private function peticion(array $cabeceras): object
    {
        return new class($cabeceras) {
            public function __construct(private array $cabeceras)
            {
            }

            public function getHeaderLine(string $nombre): string
            {
                return $this->cabeceras[$nombre] ?? '';
            }
        };
    }

    public function testDistingueLaAppMovilDelNavegadorWeb(): void
    {
        $this->assertTrue(Acceso::esClienteMovil($this->peticion(['X-Mobile-App' => 'MJLO-TRANSITO'])));
        $this->assertTrue(Acceso::esClienteMovil($this->peticion(['User-Agent' => 'Dart/3.4 (dart:io)', 'Origin' => 'http://localhost:5173'])));
        $this->assertTrue(Acceso::esClienteMovil($this->peticion([])), 'sin Origin no es un navegador');
        $this->assertFalse(Acceso::esClienteMovil($this->peticion(['Origin' => 'http://localhost:5173', 'User-Agent' => 'Mozilla/5.0'])));
    }

    public function testLaPasswordDebeCumplirLaPolitica(): void
    {
        $this->assertNotNull(Acceso::errorDePassword('corta1'));
        $this->assertNotNull(Acceso::errorDePassword('soloLetrasLargas'));
        $this->assertNotNull(Acceso::errorDePassword('12345678901'));
        $this->assertNotNull(Acceso::errorDePassword('admin12345', 'ADMIN12345'));
        $this->assertNull(Acceso::errorDePassword('Clave12345', 'admin'));
    }

    public function testVerificaTipoDeInspectorDeTransito(): void
    {
        $this->assertTrue(Acceso::esInspectorTransito(['tipo_inspector' => 'TRANSITO']));
        $this->assertTrue(Acceso::esInspectorTransito(['tipo_inspector' => 'transito']));
        $this->assertFalse(Acceso::esInspectorTransito(['tipo_inspector' => 'TECNICO']));
        $this->assertFalse(Acceso::esInspectorTransito(['tipo_inspector' => null]));
        $this->assertFalse(Acceso::esInspectorTransito([]));
    }
}
