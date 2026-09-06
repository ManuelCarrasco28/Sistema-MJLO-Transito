<?php

namespace App\Controllers\Api;

use App\Models\UsuarioModel;
use CodeIgniter\RESTful\ResourceController;

class AuthController extends ResourceController
{
    protected $format = 'json';

    public function login()
    {
        $json = $this->request->getJSON();

        $usuario = trim($json->usuario ?? '');
        $password = $json->password ?? '';

        if ($usuario === '' || $password === '') {
            return $this->failValidationErrors('Debe proporcionar usuario y contraseña.');
        }

        $usuarioModel = new UsuarioModel();
        $userRecord = $usuarioModel->asArray()
            ->select('usuarios.*, personal.nombres, personal.apellidos, personal.cargo')
            ->join('personal', 'personal.id = usuarios.personal_id', 'inner')
            ->where('usuarios.nombre_usuario', $usuario)
            ->first();

        if (!$userRecord || !password_verify($password, $userRecord['password_hash'])) {
            return $this->failUnauthorized('El usuario o la contraseña son incorrectos.');
        }

        if (($userRecord['estado'] ?? '') !== 'ACTIVO') {
            return $this->failUnauthorized('El usuario se encuentra inactivo.');
        }

        $userData = [
            'id'        => $userRecord['id'],
            'nombres'   => $userRecord['nombres'],
            'apellidos' => $userRecord['apellidos'],
            'usuario'   => $userRecord['nombre_usuario'],
            'cargo'     => $userRecord['cargo'],
        ];

        helper('cookie');
        set_cookie(
            'session_user',
            json_encode($userData),
            7200,
            '',
            '/',
            '',
            false,
            true
        );

        return $this->respond([
            'status'  => true,
            'message' => 'Inicio de sesión exitoso',
            'data'    => $userData,
        ]);
    }

    public function options()
    {
        return $this->respond(null, 204);
    }
}
