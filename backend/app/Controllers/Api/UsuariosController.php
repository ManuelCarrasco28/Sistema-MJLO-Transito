<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class UsuariosController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        
        $rows = $db->table('usuarios u')
            ->select("
                u.id,
                u.id_trabajador,
                u.nombre_usuario,
                u.estado as usuario_estado,
                c.nombres,
                c.apellido_paterno,
                c.apellido_materno,
                CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, '')) AS nombre_completo,
                ca.nombre as cargo
            ", false)
            ->join('ciudadanos c', 'c.id_persona = u.id_trabajador', 'inner')
            ->join('desplazamiento_oficina dof', 'dof.id_trabajador = u.id_trabajador AND (dof.fecha_termino IS NULL OR dof.fecha_termino > CURDATE())', 'left')
            ->join('cargos ca', 'ca.id = dof.id_cargo', 'left')
            ->orderBy('u.id', 'DESC')
            ->get()->getResultArray();

        return $this->respond(['data' => $rows]);
    }

    public function create()
    {
        $input = $this->request->getJSON(true) ?: [];

        $idTrabajador = (int)($input['id_trabajador'] ?? 0);
        $nombreUsuario = trim($input['nombre_usuario'] ?? '');
        $password = trim($input['password'] ?? '');
        $cargo = trim($input['cargo'] ?? 'Inspector de Tránsito');
        $estado = trim($input['estado'] ?? 'ACTIVO');

        if (empty($idTrabajador) || empty($nombreUsuario) || empty($password)) {
            return $this->failValidationErrors('Seleccione un trabajador y complete Usuario y Contraseña.');
        }

        if (strlen($password) < 6) {
            return $this->failValidationErrors('La contraseña debe tener al menos 6 caracteres.');
        }

        $db = \Config\Database::connect();

        $existUser = $db->table('usuarios')->where('nombre_usuario', $nombreUsuario)->countAllResults();
        if ($existUser > 0) {
            return $this->failValidationErrors('El nombre de usuario ya se encuentra registrado.');
        }

        $trabajador = $db->table('trabajadores t')
            ->select('t.*, c.nombres, c.apellido_paterno, c.apellido_materno', false)
            ->join('ciudadanos c', 'c.id_persona = t.id_persona', 'inner')
            ->where('t.id_persona', $idTrabajador)
            ->get()
            ->getRowArray();

        if (!$trabajador) {
            return $this->failValidationErrors('El trabajador seleccionado no existe. Regístrelo primero en Trabajadores.');
        }

        $existUserTrabajador = $db->table('usuarios')->where('id_trabajador', $idTrabajador)->countAllResults();
        if ($existUserTrabajador > 0) {
            return $this->failValidationErrors('El trabajador seleccionado ya cuenta con un usuario registrado.');
        }

        $db->transStart();

        $cargoRow = $db->table('cargos')->where('nombre', $cargo)->get()->getRowArray();
        if (!$cargoRow) {
            $db->table('cargos')->insert(['nombre' => $cargo, 'estado' => 'ACTIVO']);
            $cargoId = $db->insertID();
        } else {
            $cargoId = $cargoRow['id'];
        }

        $existDof = $db->table('desplazamiento_oficina')->where('id_trabajador', $idTrabajador)->get()->getRowArray();
        if ($existDof) {
            $db->table('desplazamiento_oficina')->where('id', $existDof['id'])->update([
                'id_cargo' => $cargoId
            ]);
        } else {
            $db->table('desplazamiento_oficina')->insert([
                'id_trabajador' => $idTrabajador,
                'id_cargo' => $cargoId,
                'documento' => 'DESIGNACION-' . date('Y'),
                'fecha_documento' => date('Y-m-d'),
                'tipo_funcion' => 'Titular'
            ]);
        }

        $db->table('usuarios')->insert([
            'id_trabajador' => $idTrabajador,
            'nombre_usuario' => $nombreUsuario,
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'estado' => $estado
        ]);
        $newUserId = $db->insertID();

        $db->table('trabajadores')->where('id_persona', $idTrabajador)->update([
            'tiene_cuenta' => $estado === 'ACTIVO' ? 1 : 0
        ]);

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->failServerError('No se pudo registrar el usuario.');
        }

        return $this->respondCreated([
            'message' => 'Usuario creado exitosamente.',
            'data' => [
                'id' => $newUserId,
                'id_trabajador' => $idTrabajador,
                'nombre_usuario' => $nombreUsuario,
                'usuario_estado' => $estado,
                'nombres' => $trabajador['nombres'],
                'apellido_paterno' => $trabajador['apellido_paterno'],
                'apellido_materno' => $trabajador['apellido_materno'],
                'nombre_completo' => trim($trabajador['nombres'] . ' ' . $trabajador['apellido_paterno'] . ' ' . ($trabajador['apellido_materno'] ?? '')),
                'cargo' => $cargo
            ]
        ]);
    }
    public function update($id = null)
    {
        $input = $this->request->getJSON(true) ?: [];
        
        if (!isset($input['cargo']) || !isset($input['estado'])) {
            return $this->failValidationErrors('Datos incompletos.');
        }

        $db = \Config\Database::connect();
        $db->transStart();

        // 1. Obtener usuario
        $usuario = $db->table('usuarios')->where('id', $id)->get()->getRowArray();
        if (!$usuario) {
            return $this->failNotFound('Usuario no encontrado.');
        }

        // 2. Actualizar estado del usuario
        $db->table('usuarios')->where('id', $id)->update([
            'estado' => $input['estado']
        ]);
        $db->table('trabajadores')->where('id_persona', $usuario['id_trabajador'])->update([
            'tiene_cuenta' => $input['estado'] === 'ACTIVO' ? 1 : 0
        ]);

        // 3. Obtener o crear el cargo
        $cargoRow = $db->table('cargos')->where('nombre', $input['cargo'])->get()->getRowArray();
        if (!$cargoRow) {
            $db->table('cargos')->insert(['nombre' => $input['cargo'], 'estado' => 'ACTIVO']);
            $cargoId = $db->insertID();
        } else {
            $cargoId = $cargoRow['id'];
        }

        // 4. Actualizar desplazamiento_oficina del trabajador
        $idTrabajador = $usuario['id_trabajador'];
        $existDof = $db->table('desplazamiento_oficina')->where('id_trabajador', $idTrabajador)->get()->getRowArray();
        
        if ($existDof) {
            $db->table('desplazamiento_oficina')->where('id', $existDof['id'])->update([
                'id_cargo' => $cargoId
            ]);
        } else {
            $db->table('desplazamiento_oficina')->insert([
                'id_trabajador' => $idTrabajador,
                'id_cargo' => $cargoId,
                'documento' => 'DESIGNACION-' . date('Y'),
                'fecha_documento' => date('Y-m-d'),
                'tipo_funcion' => 'Titular'
            ]);
        }

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->failServerError('Error al actualizar el usuario.');
        }

        return $this->respond(['message' => 'Usuario actualizado correctamente.']);
    }

    public function updatePassword($id = null)
    {
        $input = $this->request->getJSON(true) ?: [];
        
        if (!isset($input['password']) || empty(trim($input['password']))) {
            return $this->failValidationErrors('La contraseña es requerida.');
        }

        $db = \Config\Database::connect();
        
        $usuario = $db->table('usuarios')->where('id', $id)->get()->getRowArray();
        if (!$usuario) {
            return $this->failNotFound('Usuario no encontrado.');
        }

        $db->table('usuarios')->where('id', $id)->update([
            'password_hash' => password_hash($input['password'], PASSWORD_BCRYPT)
        ]);

        return $this->respond($this->formatResponse(true, 'Contraseña actualizada correctamente.', $usuario), 200);
    }

    public function delete($id = null)
    {
        $model = new UsuarioModel();
        
        $usuario = $model->find($id);
        if (!$usuario) {
            return $this->failNotFound('Usuario no encontrado.');
        }

        if ($usuario['nombre_usuario'] === 'superadmin') {
            return $this->fail('No se puede eliminar al usuario superadmin principal.', 403);
        }

        try {
            $model->delete($id);
            return $this->respondDeleted($this->formatResponse(true, 'Usuario eliminado correctamente.'));
        } catch (\Exception $e) {
            return $this->failServerError('Error al eliminar el usuario: ' . $e->getMessage());
        }
    }
}

