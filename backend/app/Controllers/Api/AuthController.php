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

        $usuario = trim($json->usuario ?? $json->username ?? '');
        $password = $json->password ?? '';

        if ($usuario === '' || $password === '') {
            return $this->failValidationErrors('Debe proporcionar usuario y contraseña.');
        }

        $usuarioModel = new UsuarioModel();
        $userRecord = $usuarioModel->asArray()
            ->select("
                usuarios.*,
                ciudadanos.nombres,
                CONCAT(ciudadanos.apellido_paterno, ' ', COALESCE(ciudadanos.apellido_materno, '')) AS apellidos,
                COALESCE(cargos.nombre, 'Inspector Municipal') AS cargo,
                trabajadores.id_persona AS id_persona,
                usuarios.id_trabajador AS id_trabajador
            ", false)
            ->join('trabajadores', 'trabajadores.id_persona = usuarios.id_trabajador', 'inner')
            ->join('personas', 'personas.id = trabajadores.id_persona', 'inner')
            ->join('ciudadanos', 'ciudadanos.id_persona = personas.id', 'left')
            ->join('desplazamiento_oficina', 'desplazamiento_oficina.id_trabajador = trabajadores.id_persona AND (desplazamiento_oficina.fecha_termino IS NULL OR desplazamiento_oficina.fecha_termino > CURDATE())', 'left')
            ->join('cargos', 'cargos.id = desplazamiento_oficina.id_cargo', 'left')
            ->where('usuarios.nombre_usuario', $usuario)
            ->first();

        if (!$userRecord || !password_verify($password, $userRecord['password_hash'])) {
            return $this->failUnauthorized('El usuario o la contraseña son incorrectos.');
        }

        if (($userRecord['estado'] ?? '') !== 'ACTIVO') {
            return $this->failUnauthorized('El usuario se encuentra inactivo.');
        }

        $userData = [
            'id'          => $userRecord['id'],
            'nombres'     => $userRecord['nombres'],
            'apellidos'   => $userRecord['apellidos'],
            'usuario'     => $userRecord['nombre_usuario'],
            'cargo'       => $userRecord['cargo'],
            'id_persona'  => (int)$userRecord['id_persona'],
            'id_trabajador' => (int)$userRecord['id_trabajador'],
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
