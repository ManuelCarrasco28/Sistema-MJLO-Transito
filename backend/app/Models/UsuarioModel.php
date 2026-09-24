<?php

namespace App\Models;

use CodeIgniter\Model;

class UsuarioModel extends Model
{
    protected $table = 'usuarios';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'id_persona',
        'id_rol',
        'usuario',
        'clave',
        'fecha_logueo',
        'estado',
    ];
}
