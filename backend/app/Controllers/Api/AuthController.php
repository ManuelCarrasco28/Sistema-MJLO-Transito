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
            ->select('usuarios.*, ciudadanos.nombres, TRIM(CONCAT(ciudadanos.apellido_paterno, " ", IFNULL(ciudadanos.apellido_materno, ""))) as apellidos, COALESCE(ciudadanos.foto, "") as foto_img, cargos.nombre as cargo, trabajadores.id_persona as id_persona')
            ->join('trabajadores', 'trabajadores.id_persona = usuarios.id_trabajador', 'inner')
            ->join('ciudadanos', 'ciudadanos.id_persona = trabajadores.id_persona', 'inner')
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
            'id_persona'  => (int) $userRecord['id_persona'],
            'foto_img'    => $userRecord['foto_img'] ?? '',
        ];

        $cookieUserData = $userData;
        unset($cookieUserData['foto_img']);

        helper('cookie');
        set_cookie(
            'session_user',
            json_encode($cookieUserData),
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

    public function cambiarPassword()
    {
        $json = $this->request->getJSON();

        $userId = (int) ($json->id_usuario ?? 0);
        $actual = $json->password_actual ?? '';
        $nuevo = $json->password_nuevo ?? '';

        if ($userId <= 0 || $actual === '' || $nuevo === '') {
            return $this->failValidationErrors('Debe proporcionar usuario, contraseña actual y nueva contraseña.');
        }

        if (strlen($nuevo) < 6) {
            return $this->failValidationErrors('La nueva contraseña debe tener al menos 6 caracteres.');
        }

        $usuarioModel = new UsuarioModel();
        $userRecord = $usuarioModel->asArray()->find($userId);

        if (!$userRecord || !password_verify($actual, $userRecord['password_hash'])) {
            return $this->failUnauthorized('La contraseña actual es incorrecta.');
        }

        $usuarioModel->update($userId, [
            'password_hash' => password_hash($nuevo, PASSWORD_DEFAULT),
        ]);

        return $this->respond([
            'status'  => true,
            'message' => 'Contraseña actualizada correctamente.',
        ]);
    }

    public function options()
    {
        return $this->respond(null, 204);
    }
}
