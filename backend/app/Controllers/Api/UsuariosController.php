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
        
        $doc = trim($input['numero_documento'] ?? '');
        $nombres = trim($input['nombres'] ?? '');
        $apePaterno = trim($input['apellido_paterno'] ?? '');
        $apeMaterno = trim($input['apellido_materno'] ?? '');
        $nombreUsuario = trim($input['nombre_usuario'] ?? '');
        $password = trim($input['password'] ?? '');
        $cargo = trim($input['cargo'] ?? 'Inspector de Tránsito');
        $estado = trim($input['estado'] ?? 'ACTIVO');

        if (empty($doc) || empty($nombres) || empty($apePaterno) || empty($nombreUsuario) || empty($password)) {
            return $this->failValidationErrors('Complete los campos obligatorios (Documento, Nombres, Apellido Paterno, Usuario y Contraseña).');
        }

        if (strlen($password) < 6) {
            return $this->failValidationErrors('La contraseña debe tener al menos 6 caracteres.');
        }

        $db = \Config\Database::connect();

        // 1. Verificar si el nombre_usuario ya existe
        $existUser = $db->table('usuarios')->where('nombre_usuario', $nombreUsuario)->countAllResults();
        if ($existUser > 0) {
            return $this->failValidationErrors('El nombre de usuario ya se encuentra registrado.');
        }

        $db->transStart();

        // 2. Verificar o insertar en personas
        $persona = $db->table('personas')->where('numero', $doc)->get()->getRowArray();
        if ($persona) {
            $idPersona = $persona['id'];
        } else {
            $db->table('personas')->insert([
                'id_tipo_documento' => 1, // DNI
                'numero' => $doc,
                'estado' => 'ACTIVO'
            ]);
            $idPersona = $db->insertID();
        }

        // 3. Verificar o insertar en ciudadanos
        $ciudadano = $db->table('ciudadanos')->where('id_persona', $idPersona)->get()->getRowArray();
        if (!$ciudadano) {
            $db->table('ciudadanos')->insert([
                'id_persona' => $idPersona,
                'nombres' => $nombres,
                'apellido_paterno' => $apePaterno,
                'apellido_materno' => $apeMaterno
            ]);
        }

        // 4. Verificar o insertar en trabajadores
        $trabajador = $db->table('trabajadores')->where('id_persona', $idPersona)->get()->getRowArray();
        if (!$trabajador) {
            $db->table('trabajadores')->insert([
                'id_persona' => $idPersona,
                'tipo' => 'INTERNO',
                'tiene_cuenta' => 1,
                'estado' => 'ACTIVO'
            ]);
        } else {
            $db->table('trabajadores')->where('id_persona', $idPersona)->update([
                'tiene_cuenta' => 1,
                'estado' => 'ACTIVO'
            ]);
        }

        // 5. Verificar si este trabajador ya tiene usuario
        $existUserTrabajador = $db->table('usuarios')->where('id_trabajador', $idPersona)->countAllResults();
        if ($existUserTrabajador > 0) {
            $db->transRollback();
            return $this->failValidationErrors('El trabajador con este documento ya cuenta con un usuario registrado.');
        }

        // 6. Obtener o crear el cargo
        $cargoRow = $db->table('cargos')->where('nombre', $cargo)->get()->getRowArray();
        if (!$cargoRow) {
            $db->table('cargos')->insert(['nombre' => $cargo, 'estado' => 'ACTIVO']);
            $cargoId = $db->insertID();
        } else {
            $cargoId = $cargoRow['id'];
        }

        // 7. Registrar desplazamiento_oficina
        $existDof = $db->table('desplazamiento_oficina')->where('id_trabajador', $idPersona)->get()->getRowArray();
        if ($existDof) {
            $db->table('desplazamiento_oficina')->where('id', $existDof['id'])->update([
                'id_cargo' => $cargoId
            ]);
        } else {
            $db->table('desplazamiento_oficina')->insert([
                'id_trabajador' => $idPersona,
                'id_cargo' => $cargoId,
                'documento' => 'DESIGNACION-' . date('Y'),
                'fecha_documento' => date('Y-m-d'),
                'tipo_funcion' => 'Titular'
            ]);
        }

        // 8. Insertar usuario
        $db->table('usuarios')->insert([
            'id_trabajador' => $idPersona,
            'nombre_usuario' => $nombreUsuario,
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'estado' => $estado
        ]);
        $newUserId = $db->insertID();

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->failServerError('No se pudo registrar el usuario.');
        }

        return $this->respondCreated([
            'message' => 'Usuario creado exitosamente.',
            'data' => [
                'id' => $newUserId,
                'id_trabajador' => $idPersona,
                'nombre_usuario' => $nombreUsuario,
                'usuario_estado' => $estado,
                'nombres' => $nombres,
                'apellido_paterno' => $apePaterno,
                'apellido_materno' => $apeMaterno,
                'nombre_completo' => trim("$nombres $apePaterno $apeMaterno"),
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

        return $this->respond(['message' => 'Contraseña restablecida correctamente.']);
    }
}
