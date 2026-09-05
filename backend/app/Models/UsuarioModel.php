<?php

namespace App\Models;

use CodeIgniter\Model;

class UsuarioModel extends Model
{
    protected $table = 'usuarios';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'personal_id',
        'nombre_usuario',
        'password_hash',
        'estado',
    ];
}
