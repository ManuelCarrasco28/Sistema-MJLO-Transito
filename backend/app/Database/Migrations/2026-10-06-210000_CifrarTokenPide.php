<?php

namespace App\Database\Migrations;

use App\Libraries\SecretoCifrado;
use CodeIgniter\Database\Migration;

/**
 * Cifra el token de la API PIDE guardado en municipalidad_anio.token.
 * Requiere encryption.key en el .env. Es repetible: los tokens ya cifrados no se tocan.
 */
class CifrarTokenPide extends Migration
{
    public function up()
    {
        // El texto cifrado es más largo que el token original (varchar(500) podía quedarse corto).
        $this->db->query('ALTER TABLE municipalidad_anio MODIFY token TEXT NULL');

        $filas = $this->db->table('municipalidad_anio')->select('id, token')->where('token IS NOT NULL', null, false)->get()->getResultArray();
        foreach ($filas as $fila) {
            if ($fila['token'] === '' || SecretoCifrado::estaCifrado($fila['token'])) {
                continue;
            }
            $this->db->table('municipalidad_anio')->where('id', $fila['id'])->update(['token' => SecretoCifrado::cifrar($fila['token'])]);
        }
    }

    public function down()
    {
        $filas = $this->db->table('municipalidad_anio')->select('id, token')->where('token IS NOT NULL', null, false)->get()->getResultArray();
        foreach ($filas as $fila) {
            if (!SecretoCifrado::estaCifrado($fila['token'])) {
                continue;
            }
            $this->db->table('municipalidad_anio')->where('id', $fila['id'])->update(['token' => SecretoCifrado::descifrar($fila['token'])]);
        }
    }
}
