<?php
namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Rol de campo del depósito oficial: la persona que recibe los vehículos, completa el inventario y la custodia.
 * Usa solo la aplicación móvil (no entra al sistema web), igual que los inspectores. Idempotente.
 */
class RolEncargadoDeposito extends Migration
{
    public function up()
    {
        if ($this->db->table('roles')->where('nombre', 'Encargado de Depósito')->countAllResults() === 0) {
            $this->db->table('roles')->insert(['nombre' => 'Encargado de Depósito', 'estado' => 'ACTIVO']);
        }
    }

    public function down()
    {
        $rol = $this->db->table('roles')->where('nombre', 'Encargado de Depósito')->get()->getRowArray();
        if ($rol && $this->db->table('usuarios')->where('id_rol', $rol['id'])->countAllResults() === 0) {
            $this->db->table('roles')->where('id', $rol['id'])->delete();
        }
    }
}
