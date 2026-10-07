<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class UsuariosController extends ResourceController
{
    private function errorTipoInspector($db, int $personaId, string $rol, string $estado): ?string
    {
        if ($estado !== 'ACTIVO') return null;
        $tipo = $db->table('trabajadores')->where('id_persona', $personaId)->get()->getRow('tipo_inspector');
        if ($tipo === 'TECNICO') return 'Los inspectores de inspección técnica se registran sin cuenta de acceso.';
        if ($tipo === 'TRANSITO' && strtoupper($rol) !== 'TRABAJADOR') {
            return 'El inspector de tránsito debe usar el rol Trabajador, destinado al acceso móvil.';
        }
        return null;
    }
    protected $format = 'json';

    /**
     * Usuario de sistema con protecciones especiales (no se puede eliminar,
     * ni modificar su rol/estado/contraseña salvo por otro SuperAdmin).
     * Único punto de verdad para no repetir el literal en cada método.
     */
    private const USUARIO_PROTEGIDO = 'superadmin';

    /**
     * Jerarquía de roles: un usuario que no es SuperAdmin solo puede crear, modificar, restablecer la
     * contraseña o eliminar cuentas con un rol MÁS BAJO que el suyo, y solo asignar roles más bajos.
     * Antes un Gerente o SubGerente podía darse (o dar a otro) el rol SuperAdmin, o cambiarle la
     * contraseña a un SuperAdmin cualquiera, saltándose todos los permisos.
     */
    private function sinJerarquia(array $actor, string $rolAfectado): bool
    {
        $rolActor = \App\Libraries\Acceso::rol($actor);
        if ($rolActor === 'SUPERADMIN') {
            return false;
        }

        return \App\Libraries\Acceso::rango($rolAfectado) <= \App\Libraries\Acceso::rango($rolActor);
    }

    private function rolDeUsuario($db, $id): string
    {
        $fila = $db->table('usuarios u')
            ->select('r.nombre')
            ->join('roles r', 'r.id = u.id_rol', 'left')
            ->where('u.id', (int) $id)
            ->get()->getRowArray();

        return (string) ($fila['nombre'] ?? '');
    }

    public function index()
    {
        $model = new \App\Models\UsuarioModel();

        $rows = $model
            ->select("
                usuarios.id,
                usuarios.id_persona,
                usuarios.id_persona as id_trabajador,
                usuarios.usuario as nombre_usuario,
                usuarios.id_rol,
                r.nombre as rol,
                usuarios.estado as usuario_estado,
                c.nombres,
                c.apellido_paterno,
                c.apellido_materno,
                CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, '')) AS nombre_completo,
                ca.nombre as cargo
            ", false)
            ->join('ciudadanos c', 'c.id_persona = usuarios.id_persona', 'inner')
            ->join('roles r', 'r.id = usuarios.id_rol', 'inner')
            ->join('desplazamiento_oficina dof', 'dof.id_trabajador = usuarios.id_persona AND (dof.fecha_termino IS NULL OR dof.fecha_termino > CURDATE())', 'left')
            ->join('cargos ca', 'ca.id = dof.id_cargo', 'left')
            ->orderBy('usuarios.id', 'DESC')
            ->findAll();

        return $this->respond(['data' => $rows]);
    }

    public function roles()
    {
        $db = \Config\Database::connect();
        $rows = $db->table('roles')->select('id, nombre')->where('estado', 'ACTIVO')->orderBy('nombre')->get()->getResultArray();
        return $this->respond(['data' => $rows]);
    }

    public function create()
    {
        $input = $this->request->getJSON(true) ?: [];

        $rules = [
            'id_persona' => [
                'rules'  => 'required|is_natural_no_zero',
                'errors' => ['required' => 'Debe seleccionar un trabajador.', 'is_natural_no_zero' => 'Trabajador no válido.']
            ],
            'usuario' => [
                'rules'  => 'required|alpha_dash|min_length[3]|max_length[50]|is_unique[usuarios.usuario]',
                'errors' => [
                    'required'   => 'El nombre de usuario es obligatorio.',
                    'alpha_dash' => 'El usuario solo puede contener letras, números, guiones y guiones bajos.',
                    'min_length' => 'El usuario debe tener al menos 3 caracteres.',
                    'max_length' => 'El usuario no puede superar los 50 caracteres.',
                    'is_unique'  => 'El nombre de usuario ya se encuentra registrado.'
                ]
            ],
            'password' => [
                'rules'  => 'required|min_length[8]|max_length[128]',
                'errors' => [
                    'required'   => 'La contraseña es obligatoria.',
                    'min_length' => 'La contraseña debe tener al menos 8 caracteres.',
                    'max_length' => 'La contraseña no puede superar los 128 caracteres.'
                ]
            ],
            'id_rol' => [
                'rules'  => 'required|is_natural_no_zero',
                'errors' => ['required' => 'Debe seleccionar un rol.', 'is_natural_no_zero' => 'Rol no válido.']
            ],
            'estado' => [
                'rules'  => 'permit_empty|in_list[ACTIVO,INACTIVO]',
                'errors' => ['in_list' => 'El estado debe ser ACTIVO o INACTIVO.']
            ]
        ];

        // Compatibilidad con campos alternativos enviados por clientes móviles o formularios legados
        if (!isset($input['id_persona']) && isset($input['id_trabajador'])) {
            $input['id_persona'] = $input['id_trabajador'];
        }
        if (!isset($input['usuario']) && isset($input['nombre_usuario'])) {
            $input['usuario'] = $input['nombre_usuario'];
        }

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $idPersona = (int) $input['id_persona'];
        $nombreUsuario = trim($input['usuario']);
        $password = $input['password'];
        $idRol = (int) $input['id_rol'];
        $estado = strtoupper(trim($input['estado'] ?? 'ACTIVO'));

        $db = \Config\Database::connect();

        $rolRow = $db->table('roles')->where('id', $idRol)->where('estado', 'ACTIVO')->get()->getRowArray();
        if (!$rolRow) {
            return $this->failValidationErrors('El rol seleccionado no es válido o no está activo.');
        }

        $actor = \App\Libraries\Acceso::usuario();
        if ($actor && $this->sinJerarquia($actor, $rolRow['nombre'])) {
            return $this->fail('No puede asignar un rol igual o superior al suyo.', 403);
        }

        $errorPassword = \App\Libraries\Acceso::errorDePassword((string) $password, $nombreUsuario);
        if ($errorPassword) {
            return $this->failValidationErrors($errorPassword);
        }

        $personaExiste = $db->table('ciudadanos')->where('id_persona', $idPersona)->countAllResults() > 0;
        if (!$personaExiste) {
            return $this->failValidationErrors('La persona seleccionada no existe en el padrón. Regístrela primero en Personas.');
        }

        if ($error = $this->errorTipoInspector($db, $idPersona, $rolRow['nombre'], $estado)) {
            return $this->failValidationErrors($error);
        }

        $db->transStart();

        // Una persona del padrón que aún no es trabajador se registra como tal al crearle la cuenta
        // (el cargo y la unidad se completan después en Trabajadores; los cargos no son lo mismo que los roles).
        if (!$db->table('trabajadores')->where('id_persona', $idPersona)->countAllResults()) {
            $db->table('trabajadores')->insert([
                'id_persona'   => $idPersona,
                'tipo'         => 'INTERNO',
                'tiene_cuenta' => 0,
                'estado'       => 'ACTIVO',
            ]);
        }

        $trabajador = $db->table('trabajadores t')
            ->select('t.*, c.nombres, c.apellido_paterno, c.apellido_materno', false)
            ->join('ciudadanos c', 'c.id_persona = t.id_persona', 'inner')
            ->where('t.id_persona', $idPersona)
            ->get()
            ->getRowArray();

        $existUserPersona = $db->table('usuarios')->where('id_persona', $idPersona)->countAllResults();
        if ($existUserPersona > 0) {
            $db->transRollback();
            return $this->failValidationErrors('La persona seleccionada ya cuenta con un usuario registrado.');
        }

        $db->table('usuarios')->insert([
            'id_persona' => $idPersona,
            'id_rol'     => $idRol,
            'usuario'    => $nombreUsuario,
            'clave'      => password_hash($password, PASSWORD_DEFAULT),
            'estado'     => $estado
        ]);
        $newUserId = $db->insertID();

        if ($estado === 'ACTIVO' && strtoupper($rolRow['nombre']) === 'TRABAJADOR') {
            $db->table('trabajadores')->where('id_persona', $idPersona)->update(['tipo_inspector' => 'TRANSITO']);
        }

        $db->table('trabajadores')->where('id_persona', $idPersona)->update([
            'tiene_cuenta' => $estado === 'ACTIVO' ? 1 : 0
        ]);

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->failServerError('No se pudo registrar el usuario.');
        }

        \App\Services\AuditoriaService::registrar(
            'USUARIOS',
            'CREAR',
            "Se creó la cuenta de usuario '$nombreUsuario' con rol '{$rolRow['nombre']}'",
            ['id_usuario' => $newUserId, 'usuario' => $nombreUsuario, 'rol' => $rolRow['nombre'], 'estado' => $estado]
        );

        return $this->respondCreated([
            'message' => 'Usuario creado exitosamente.',
            'data' => [
                'id' => $newUserId,
                'id_persona' => $idPersona,
                'id_trabajador' => $idPersona,
                'nombre_usuario' => $nombreUsuario,
                'id_rol' => $idRol,
                'rol' => $rolRow['nombre'],
                'usuario_estado' => $estado,
                'nombres' => $trabajador['nombres'],
                'apellido_paterno' => $trabajador['apellido_paterno'],
                'apellido_materno' => $trabajador['apellido_materno'],
                'nombre_completo' => trim($trabajador['nombres'] . ' ' . $trabajador['apellido_paterno'] . ' ' . ($trabajador['apellido_materno'] ?? '')),
            ]
        ]);
    }

    public function update($id = null)
    {
        $input = $this->request->getJSON(true) ?: [];

        if (!isset($input['id_rol']) || !isset($input['estado'])) {
            return $this->failValidationErrors('Datos incompletos.');
        }

        $idRol = (int)$input['id_rol'];
        $estado = strtoupper(trim((string) $input['estado']));
        if (!in_array($estado, ['ACTIVO', 'INACTIVO'], true)) {
            return $this->failValidationErrors('El estado debe ser ACTIVO o INACTIVO.');
        }

        $db = \Config\Database::connect();

        $usuario = $db->table('usuarios')->where('id', $id)->get()->getRowArray();
        if (!$usuario) {
            return $this->failNotFound('Usuario no encontrado.');
        }

        $actor = \App\Services\AuthSession::resolveActiveUser($this->request->getCookie('session_user'));
        $actorRol = strtoupper((string)($actor['rol'] ?? ''));
        if ($usuario['usuario'] === self::USUARIO_PROTEGIDO && $actorRol !== 'SUPERADMIN') {
            return $this->fail('Solo un SuperAdmin puede modificar la cuenta superadmin principal.', 403);
        }

        // Nadie cambia su propio rol ni su estado (evita auto-ascensos y quedarse sin acceso).
        if ($actor && (int) ($actor['id'] ?? 0) === (int) $id) {
            return $this->fail('No puede cambiar su propio rol ni su estado.', 403);
        }

        $rolRow = $db->table('roles')->where('id', $idRol)->where('estado', 'ACTIVO')->get()->getRowArray();
        if (!$rolRow) {
            return $this->failValidationErrors('El rol seleccionado no es válido.');
        }

        if ($actor && ($this->sinJerarquia($actor, $this->rolDeUsuario($db, $id)) || $this->sinJerarquia($actor, $rolRow['nombre']))) {
            return $this->fail('No tiene jerarquía para modificar esta cuenta ni para asignar ese rol.', 403);
        }

        if ($error = $this->errorTipoInspector($db, (int)$usuario['id_persona'], $rolRow['nombre'], $estado)) {
            return $this->failValidationErrors($error);
        }

        $db->transStart();

        $db->table('usuarios')->where('id', $id)->update([
            'id_rol' => $idRol,
            'estado' => $estado
        ]);
        if ($estado === 'ACTIVO' && strtoupper($rolRow['nombre']) === 'TRABAJADOR') {
            $db->table('trabajadores')->where('id_persona', $usuario['id_persona'])->update(['tipo_inspector' => 'TRANSITO']);
        }
        $db->table('trabajadores')->where('id_persona', $usuario['id_persona'])->update([
            'tiene_cuenta' => $estado === 'ACTIVO' ? 1 : 0
        ]);

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->failServerError('Error al actualizar el usuario.');
        }

        // El rol o estado cambió: cualquier sesión activa de ese usuario con
        // permisos anteriores queda invalidada de inmediato.
        \App\Services\AuthSession::invalidateSessions((int)$id);

        \App\Services\AuditoriaService::registrar(
            'USUARIOS',
            'MODIFICAR',
            "Se actualizó la cuenta de usuario '{$usuario['usuario']}': estado '$estado', rol '{$rolRow['nombre']}'",
            ['id_usuario' => $id, 'usuario' => $usuario['usuario'], 'estado' => $estado, 'rol' => $rolRow['nombre']]
        );

        return $this->respond(['message' => 'Usuario actualizado correctamente.']);
    }

    public function updatePassword($id = null)
    {
        $input = $this->request->getJSON(true) ?: [];

        $db = \Config\Database::connect();

        $usuario = $db->table('usuarios')->where('id', $id)->get()->getRowArray();
        if (!$usuario) {
            return $this->failNotFound('Usuario no encontrado.');
        }

        $errorPassword = \App\Libraries\Acceso::errorDePassword((string) ($input['password'] ?? ''), (string) $usuario['usuario']);
        if ($errorPassword) {
            return $this->failValidationErrors($errorPassword);
        }

        $actor = \App\Services\AuthSession::resolveActiveUser($this->request->getCookie('session_user'));
        $actorRol = strtoupper((string)($actor['rol'] ?? ''));
        if ($usuario['usuario'] === self::USUARIO_PROTEGIDO && $actorRol !== 'SUPERADMIN') {
            return $this->fail('Solo un SuperAdmin puede restablecer la contraseña de la cuenta superadmin principal.', 403);
        }

        $esMismaCuenta = $actor && (int) ($actor['id'] ?? 0) === (int) $id;
        if ($actor && !$esMismaCuenta && $this->sinJerarquia($actor, $this->rolDeUsuario($db, $id))) {
            return $this->fail('No tiene jerarquía para restablecer la contraseña de esta cuenta.', 403);
        }

        $db->table('usuarios')->where('id', $id)->update([
            'clave' => password_hash($input['password'], PASSWORD_DEFAULT)
        ]);
        // Fuerza el cierre de cualquier sesión activa con la contraseña anterior.
        \App\Services\AuthSession::invalidateSessions((int)$id);

        \App\Services\AuditoriaService::registrar(
            'USUARIOS',
            'CAMBIO_PASSWORD',
            "Se restableció la contraseña del usuario '{$usuario['usuario']}'",
            ['id_usuario' => $id, 'usuario' => $usuario['usuario']]
        );

        unset($usuario['clave']);
        return $this->respond(['message' => 'Contraseña actualizada correctamente.', 'data' => $usuario]);
    }

    public function delete($id = null)
    {
        $model = new \App\Models\UsuarioModel();

        $usuario = $model->find($id);
        if (!$usuario) {
            return $this->failNotFound('Usuario no encontrado.');
        }

        if ($usuario['usuario'] === self::USUARIO_PROTEGIDO) {
            return $this->fail('No se puede eliminar al usuario superadmin principal.', 403);
        }

        $actor = \App\Libraries\Acceso::usuario();
        if ($actor && (int) ($actor['id'] ?? 0) === (int) $id) {
            return $this->fail('No puede eliminar su propia cuenta.', 403);
        }
        if ($actor && $this->sinJerarquia($actor, $this->rolDeUsuario(\Config\Database::connect(), $id))) {
            return $this->fail('No tiene jerarquía para eliminar esta cuenta.', 403);
        }

        try {
            $model->delete($id);

            \App\Services\AuditoriaService::registrar(
                'USUARIOS',
                'ELIMINAR',
                "Se eliminó la cuenta de usuario '{$usuario['usuario']}'",
                ['id_usuario' => $id, 'usuario' => $usuario['usuario']]
            );

            return $this->respondDeleted($this->formatResponse(true, 'Usuario eliminado correctamente.'));
        } catch (\Exception $e) {
            log_message('error', 'Error al eliminar el usuario: ' . $e->getMessage());
            return $this->failServerError('Error al eliminar el usuario. Intente nuevamente.');
        }
    }
}
