<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Un mismo número de documento (póliza SOAT, resolución de la tarjeta de
 * operatividad, partida de la tarjeta de propiedad) no puede registrarse dos
 * veces para el mismo tipo. La validación del formulario avisa con un mensaje
 * claro; este índice es la garantía final si dos usuarios guardan a la vez.
 */
class AddUniqueDocumentosTipoCodigo extends Migration
{
    private const INDICE = 'uq_docveh_tipo_codigo';

    public function up()
    {
        if (!$this->db->query("SHOW INDEX FROM documentos_vehiculo WHERE Key_name = '" . self::INDICE . "'")->getRow()) {
            $this->db->query('ALTER TABLE documentos_vehiculo ADD UNIQUE INDEX ' . self::INDICE . ' (tipo_documento, codigo)');
        }
    }

    public function down()
    {
        if ($this->db->query("SHOW INDEX FROM documentos_vehiculo WHERE Key_name = '" . self::INDICE . "'")->getRow()) {
            $this->db->query('ALTER TABLE documentos_vehiculo DROP INDEX ' . self::INDICE);
        }
    }
}
