<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Token de la Plataforma de Interoperabilidad del Estado (PIDE), usado
 * para las consultas a RENIEC/SUNARP. Se guarda por año fiscal en
 * `municipalidad_anio` en vez de en `.env`, para que el superadmin lo
 * pueda rotar desde el panel sin tocar el servidor.
 *
 * Importante: este campo NUNCA debe seleccionarse en endpoints que
 * devuelvan `municipalidad_anio.*` a usuarios autenticados en general
 * (ver MunicipalidadController::config()), porque es un secreto.
 */
class AddTokenToMunicipalidadAnio extends Migration
{
    public function up()
    {
        if ($this->db->fieldExists('token', 'municipalidad_anio')) {
            return;
        }

        $this->forge->addColumn('municipalidad_anio', [
            'token' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
                'after'      => 'uit',
            ],
        ]);
    }

    public function down()
    {
        if ($this->db->fieldExists('token', 'municipalidad_anio')) {
            $this->forge->dropColumn('municipalidad_anio', 'token');
        }
    }
}
