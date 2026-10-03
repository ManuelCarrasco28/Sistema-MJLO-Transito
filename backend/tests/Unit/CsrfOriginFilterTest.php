<?php

namespace Tests\Unit;

use App\Filters\CsrfOriginFilter;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Test\CIUnitTestCase;
use Config\Services;

/**
 * @internal
 */
final class CsrfOriginFilterTest extends CIUnitTestCase
{
    private CsrfOriginFilter $filtro;

    protected function setUp(): void
    {
        parent::setUp();
        $this->filtro = new CsrfOriginFilter();
        putenv('app.corsAllowedOrigins');
        unset($_ENV['app.corsAllowedOrigins'], $_SERVER['app.corsAllowedOrigins']);
    }

    public function testBloqueaPostDesdeUnOrigenAjeno(): void
    {
        $resultado = $this->filtro->before($this->peticion('post', 'http://evil.com'));

        $this->assertInstanceOf(ResponseInterface::class, $resultado);
        $this->assertSame(403, $resultado->getStatusCode());
    }

    public function testPermiteElOrigenDelFrontendPorDefecto(): void
    {
        $this->assertNull($this->filtro->before($this->peticion('post', 'http://localhost:5173')));
    }

    public function testPermiteElMismoHostDelBackend(): void
    {
        $this->assertNull($this->filtro->before($this->peticion('delete', 'https://api.ejemplo.test')));
    }

    public function testPermiteClientesSinOriginComoLaAppMovil(): void
    {
        $this->assertNull($this->filtro->before($this->peticion('post', '')));
    }

    public function testNoRestringeMetodosSeguros(): void
    {
        $this->assertNull($this->filtro->before($this->peticion('get', 'http://evil.com')));
        $this->assertNull($this->filtro->before($this->peticion('options', 'http://evil.com')));
    }

    public function testOrigenNullDeUnSandboxSeRechaza(): void
    {
        $resultado = $this->filtro->before($this->peticion('put', 'null'));

        $this->assertSame(403, $resultado->getStatusCode());
    }

    private function peticion(string $metodo, string $origin)
    {
        $peticion = Services::incomingrequest(null, false)->withMethod($metodo);
        $peticion->setGlobal('server', ['HTTP_HOST' => 'api.ejemplo.test']);
        if ($origin !== '') {
            $peticion = $peticion->setHeader('Origin', $origin);
        }

        return $peticion;
    }
}
