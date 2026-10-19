<?php

namespace App\Filters;

use App\Libraries\Concurrencia;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class ConcurrenciaFilter implements FilterInterface
{
    private function segmentos(RequestInterface $request): array
    {
        $ruta = trim((string) $request->getUri()->getPath(), '/');
        $partes = $ruta === '' ? [] : explode('/', $ruta);
        if (($partes[0] ?? '') === 'index.php') {
            array_shift($partes);
        }
        if (($partes[0] ?? '') !== 'api') {
            return [];
        }

        return array_slice($partes, 1);
    }

    /** Al guardar: si el registro cambió desde que se leyó, se rechaza. */
    public function before(RequestInterface $request, $arguments = null)
    {
        if (!in_array(strtoupper($request->getMethod()), ['PUT', 'PATCH'], true)) {
            return null;
        }
        $version = trim((string) $request->getHeaderLine('X-Version-Registro'));
        $seg = $this->segmentos($request);
        if ($version === '' || count($seg) !== 2 || !isset(Concurrencia::RECURSOS[$seg[0]])) {
            return null;
        }
        $actual = Concurrencia::actual(\Config\Database::connect(), $seg[0], $seg[1]);
        if ($actual === null || $actual === $version) {
            return null;
        }

        return service('response')->setStatusCode(409)->setJSON([
            'status' => 409,
            'error' => 409,
            'messages' => ['error' => 'Otra persona modificó este registro mientras lo editaba. Se actualizó la pantalla: revise los datos y vuelva a guardar.'],
        ]);
    }

    /** Al leer: cada registro lleva su versión para devolverla al guardar. */
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        if (strtoupper($request->getMethod()) !== 'GET' || $response->getStatusCode() !== 200) {
            return null;
        }
        $seg = $this->segmentos($request);
        if (!in_array(count($seg), [1, 2], true) || !isset(Concurrencia::RECURSOS[$seg[0]])) {
            return null;
        }
        if (!str_contains(strtolower((string) $response->getHeaderLine('Content-Type')), 'json')) {
            return null;
        }
        $cuerpo = json_decode((string) $response->getBody());
        if (!is_object($cuerpo) || !isset($cuerpo->data)) {
            return null;
        }
        $filas = is_array($cuerpo->data) ? $cuerpo->data : [$cuerpo->data];
        $ids = [];
        foreach ($filas as $fila) {
            if (is_object($fila) && isset($fila->id) && ctype_digit((string) $fila->id)) {
                $ids[(string) $fila->id] = (int) $fila->id;
            }
        }
        if (!$ids) {
            return null;
        }
        $versiones = Concurrencia::versiones(\Config\Database::connect(), $seg[0], $ids);
        foreach ($filas as $fila) {
            if (is_object($fila) && isset($fila->id) && isset($versiones[(string) $fila->id])) {
                $fila->versionRegistro = $versiones[(string) $fila->id];
            }
        }
        $response->setBody(json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | JSON_PARTIAL_OUTPUT_ON_ERROR));

        return $response;
    }
}
