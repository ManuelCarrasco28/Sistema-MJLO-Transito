<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class NombresCiudadanosEnMayusculas extends Migration
{
    public function up()
    {
        $this->db->query("UPDATE ciudadanos SET
            nombres = UPPER(nombres),
            apellido_paterno = UPPER(apellido_paterno),
            apellido_materno = UPPER(apellido_materno)
            WHERE BINARY nombres <> BINARY UPPER(nombres)
               OR BINARY apellido_paterno <> BINARY UPPER(apellido_paterno)
               OR BINARY IFNULL(apellido_materno, '') <> BINARY UPPER(IFNULL(apellido_materno, ''))");
    }

    public function down()
    {
    }
}
