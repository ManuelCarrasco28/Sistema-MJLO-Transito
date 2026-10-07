<?php

namespace Tests\Unit;

use App\Libraries\SecretoCifrado;
use CodeIgniter\Test\CIUnitTestCase;

final class SecretoCifradoTest extends CIUnitTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if ((string) config('Encryption')->key === '') {
            $this->markTestSkipped('Falta encryption.key en el .env.');
        }
    }

    public function testCifraYDescifraSinPerderElValor(): void
    {
        $cifrado = SecretoCifrado::cifrar('eyJ0eXAiOiJKV1QifQ.token.firma');

        $this->assertTrue(SecretoCifrado::estaCifrado($cifrado));
        $this->assertStringNotContainsString('eyJ0eXAi', $cifrado);
        $this->assertSame('eyJ0eXAiOiJKV1QifQ.token.firma', SecretoCifrado::descifrar($cifrado));
    }

    public function testElMismoTextoSeCifraDistintoCadaVez(): void
    {
        $this->assertNotSame(SecretoCifrado::cifrar('secreto'), SecretoCifrado::cifrar('secreto'));
    }

    public function testNoSeCifraDosVecesNiSeGuardaVacio(): void
    {
        $cifrado = SecretoCifrado::cifrar('secreto');

        $this->assertSame($cifrado, SecretoCifrado::cifrar($cifrado));
        $this->assertNull(SecretoCifrado::cifrar('   '));
        $this->assertNull(SecretoCifrado::descifrar(null));
    }

    public function testUnSecretoAntiguoSinCifrarSigueFuncionando(): void
    {
        $this->assertSame('token-antiguo', SecretoCifrado::descifrar('token-antiguo'));
    }

    public function testUnValorAlteradoNoSeDescifra(): void
    {
        $cifrado = SecretoCifrado::cifrar('secreto');
        $alterado = substr($cifrado, 0, -4) . 'AAAA';

        $this->assertNull(SecretoCifrado::descifrar($alterado));
    }
}
