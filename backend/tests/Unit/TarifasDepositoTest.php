<?php

namespace Tests\Unit;

use App\Libraries\TarifasDeposito;
use PHPUnit\Framework\TestCase;

final class TarifasDepositoTest extends TestCase
{
    private array $tarifas = ['guardianiaDia' => 10.0, 'remolque' => 80.0];

    public function testMontoExactoEsValidoParaSecretaria(): void
    {
        $this->assertFalse(TarifasDeposito::validar($this->tarifas, 3, 30.0, 80.0, false));
        $this->assertFalse(TarifasDeposito::validar($this->tarifas, 3, 30.0, 0.0, false), 'sin remolque no se exige');
    }

    public function testSecretariaNoPuedeRebajarLaGuardiania(): void
    {
        $this->expectException(\DomainException::class);
        TarifasDeposito::validar($this->tarifas, 3, 10.0, 0.0, false);
    }

    public function testSecretariaNoPuedeExonerarLaGuardiania(): void
    {
        $this->expectException(\DomainException::class);
        TarifasDeposito::validar($this->tarifas, 3, 0.0, 0.0, false);
    }

    public function testNadieCobraDeMasQueLaTarifa(): void
    {
        $this->expectException(\DomainException::class);
        TarifasDeposito::validar($this->tarifas, 3, 31.0, 0.0, true);
    }

    public function testLaJefaturaPuedeRebajarYQuedaMarcado(): void
    {
        $this->assertTrue(TarifasDeposito::validar($this->tarifas, 3, 10.0, 80.0, true));
        $this->assertTrue(TarifasDeposito::validar($this->tarifas, 3, 30.0, 40.0, true));
    }

    public function testSinTarifaConfiguradaNoSeValida(): void
    {
        $this->assertFalse(TarifasDeposito::validar(['guardianiaDia' => 0.0, 'remolque' => 0.0], 5, 999.0, 999.0, false));
    }
}
