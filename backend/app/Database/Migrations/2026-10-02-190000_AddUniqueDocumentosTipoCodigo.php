<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

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
