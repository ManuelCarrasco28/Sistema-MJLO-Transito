<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CrearOficinasRegistrales extends Migration
{
    public function up()
    {
        if (!$this->db->tableExists('oficina_registral')) {
            $this->db->query("
                CREATE TABLE IF NOT EXISTS `oficina_registral` (
                  `cod_zona` varchar(2) NOT NULL,
                  `cod_oficina` varchar(2) NOT NULL,
                  `descripcion` varchar(100) NOT NULL,
                  PRIMARY KEY (`cod_zona`,`cod_oficina`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
            ");
        }

        $count = (int) $this->db->table('oficina_registral')->countAllResults();
        if ($count === 0) {
            $this->db->query("
                INSERT INTO `oficina_registral` (`cod_zona`, `cod_oficina`, `descripcion`) VALUES
                ('01', '01', 'LIMA'),
                ('01', '02', 'CALLAO'),
                ('01', '03', 'HUARAL'),
                ('01', '04', 'HUACHO'),
                ('01', '05', 'CAÑETE'),
                ('01', '06', 'BARRANCA'),
                ('02', '01', 'HUANCAYO'),
                ('02', '02', 'HUANUCO'),
                ('02', '04', 'PASCO'),
                ('02', '05', 'SATIPO'),
                ('02', '06', 'LA MERCED (SELVA CENTRAL)'),
                ('02', '07', 'TARMA'),
                ('02', '08', 'TINGO MARIA'),
                ('02', '09', 'HUANCAVELICA'),
                ('03', '01', 'AREQUIPA'),
                ('03', '02', 'CAMANA'),
                ('03', '03', 'CASTILLA - APLAO'),
                ('03', '04', 'ISLAY - MOLLENDO'),
                ('04', '01', 'HUARAZ'),
                ('04', '02', 'CASMA'),
                ('04', '03', 'CHIMBOTE'),
                ('05', '01', 'PIURA'),
                ('05', '02', 'SULLANA'),
                ('05', '03', 'TUMBES'),
                ('06', '01', 'CUSCO'),
                ('06', '02', 'ABANCAY'),
                ('06', '03', 'MADRE DE DIOS'),
                ('06', '04', 'QUILLABAMBA'),
                ('06', '05', 'SICUANI'),
                ('06', '06', 'ESPINAR'),
                ('06', '07', 'ANDAHUAYLAS'),
                ('07', '01', 'TACNA'),
                ('07', '02', 'ILO'),
                ('07', '03', 'JULIACA'),
                ('07', '04', 'MOQUEGUA'),
                ('07', '05', 'PUNO'),
                ('08', '01', 'TRUJILLO'),
                ('08', '02', 'CHEPEN'),
                ('08', '03', 'HUAMACHUCO'),
                ('08', '04', 'OTUZCO'),
                ('08', '05', 'SAN PEDRO'),
                ('09', '01', 'MAYNAS'),
                ('10', '01', 'ICA'),
                ('10', '02', 'CHINCHA'),
                ('10', '03', 'PISCO'),
                ('10', '04', 'NAZCA'),
                ('11', '01', 'CHICLAYO'),
                ('11', '02', 'CAJAMARCA'),
                ('11', '03', 'JAEN'),
                ('11', '04', 'BAGUA'),
                ('11', '05', 'CHACHAPOYAS'),
                ('11', '06', 'CHOTA'),
                ('12', '01', 'MOYOBAMBA'),
                ('12', '02', 'TARAPOTO'),
                ('12', '03', 'JUANJUI'),
                ('12', '04', 'YURIMAGUAS'),
                ('13', '01', 'PUCALLPA'),
                ('14', '01', 'AYACUCHO'),
                ('14', '02', 'HUANTA');
            ");
        }
    }

    public function down()
    {
        $this->forge->dropTable('oficina_registral', true);
    }
}
