<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class NormalizarEstadoRevisionCerticav extends Migration
{
    public function up()
    {
        $this->db->query("UPDATE certicav_detalles SET estado_revision = 'MAL_ESTADO' WHERE estado_revision IN ('M.E.', 'ME', 'M.E')");
        $this->db->query("UPDATE certicav_detalles SET estado_revision = 'NO_TIENE' WHERE estado_revision IN ('N.T.', 'NT', 'N.T')");
        $this->db->query("UPDATE certicav_detalles SET estado_revision = 'BIEN' WHERE estado_revision IN ('B', 'B.')");
    }

    public function down()
    {
    }
}
