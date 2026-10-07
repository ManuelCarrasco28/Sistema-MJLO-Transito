<?php

namespace App\Libraries;

use CodeIgniter\Exceptions\PageNotFoundException;

/**
 * Hace que un controlador acepte el uuid público (además del id numérico) como PRIMER parámetro de la URL.
 *
 * El controlador declara:
 *   protected string $tablaUuid = 'vehiculos';            // tabla del recurso principal
 *   protected array $tablasUuidPorMetodo = {'activo': 'personas'};   // si un método recibe otro recurso
 *   protected array $soloUuidEnEstricto = ['fotos'];      // métodos que, en modo estricto, exigen uuid
 *
 * Los métodos siguen recibiendo el id numérico interno: no hay que tocar su lógica.
 */
trait ResuelveUuid
{
    public function _remap($method, ...$params)
    {
        if (!method_exists($this, $method)) {
            throw PageNotFoundException::forControllerNotFound(static::class, $method);
        }

        $tabla = ($this->tablasUuidPorMetodo[$method] ?? null) ?: ($this->tablaUuid ?? null);

        if ($tabla && array_key_exists(0, $params) && $params[0] !== null && $params[0] !== '') {
            $soloUuid = in_array($method, $this->soloUuidEnEstricto ?? [], true);
            $id = Identificador::resolverId(\Config\Database::connect(), $tabla, $params[0], $soloUuid);

            // Los ids sintéticos de pagos pendientes ("pap_pend_12") y los DNI no son uuid: se dejan pasar tal cual.
            if ($id === null && !$this->esIdEspecial($params[0])) {
                return $this->failNotFound('Registro no encontrado.');
            }
            if ($id !== null) {
                $params[0] = $id;
            }
        }

        return $this->{$method}(...$params);
    }

    private function esIdEspecial(mixed $valor): bool
    {
        return is_string($valor) && preg_match('/^[a-z]+_pend_\d+$/i', $valor) === 1;
    }
}
