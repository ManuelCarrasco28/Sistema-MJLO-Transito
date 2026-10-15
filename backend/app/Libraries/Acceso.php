<?php

namespace App\Libraries;

use App\Services\AuthSession;

class Acceso
{
    public const ROLES_OFICINA = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE', 'SECRETARIA'];

    private const RANGO = [
        'SUPERADMIN' => 1,
        'GERENTE'    => 2,
        'SUBGERENTE' => 3,
        'SECRETARIA' => 4,
        'TRABAJADOR' => 5,
    ];

    public static function usuario(): ?array
    {
        return AuthSession::resolveActiveUser(service('request')->getCookie('session_user'));
    }

    public static function rol(?array $usuario = null): string
    {
        $usuario ??= self::usuario();

        return strtoupper((string) ($usuario['rol'] ?? ''));
    }

    public static function esOficina(?array $usuario = null): bool
    {
        return in_array(self::rol($usuario), self::ROLES_OFICINA, true);
    }

    public static function limitarListadoCompleto($request, array $filtrosPuntuales = []): void
    {
        if (self::esOficina() || (int) $request->getGet('page') > 0) {
            return;
        }

        foreach ($filtrosPuntuales as $filtro) {
            if (trim((string) $request->getGet($filtro)) !== '') {
                return;
            }
        }

        $get = $request->getGet() ?? [];
        $get['page'] = 1;
        $get['porPagina'] = max(1, min(50, (int) ($get['porPagina'] ?? 20)));
        $request->setGlobal('get', $get);
    }

    public static function esClienteMovil($request): bool
    {
        $agente = (string) $request->getHeaderLine('User-Agent');

        return $request->getHeaderLine('X-Mobile-App') === 'MJLO-TRANSITO'
            || str_contains($agente, 'Dart/')
            || trim((string) $request->getHeaderLine('Origin')) === '';
    }

    public static function esInspectorTransito(?array $usuario = null): bool
    {
        $usuario ??= self::usuario();
        if (isset($usuario['tipo_inspector'])) {
            return strtoupper(trim((string) $usuario['tipo_inspector'])) === 'TRANSITO';
        }

        $idPersona = (int) ($usuario['id_persona'] ?? 0);
        if ($idPersona <= 0) {
            return false;
        }

        $db = \Config\Database::connect();
        $fila = $db->table('trabajadores')->select('tipo_inspector')->where('id_persona', $idPersona)->get()->getRowArray();

        return strtoupper(trim((string) ($fila['tipo_inspector'] ?? ''))) === 'TRANSITO';
    }

    public static function movilPuedeAplicarPapeletas(): bool
    {
        $db = \Config\Database::connect();
        if (!$db->tableExists('configuracion_sistema')) {
            return true;
        }

        $fila = $db->table('configuracion_sistema')->select('valor')->where('clave', 'mobile_permite_aplicar_papeleta')->get()->getRowArray();

        return $fila === null || in_array(strtolower(trim((string) $fila['valor'])), ['1', 'true', 'si', 'sí', 'activo'], true);
    }

    public static function rango(string $rol): int
    {
        return self::RANGO[strtoupper($rol)] ?? 99;
    }

    public static function errorDePassword(string $password, string $usuario = ''): ?string
    {
        $largo = mb_strlen($password);
        if ($largo < 8) {
            return 'La contraseña debe tener al menos 8 caracteres.';
        }
        if ($largo > 128) {
            return 'La contraseña no puede superar los 128 caracteres.';
        }
        if (!preg_match('/\p{L}/u', $password) || !preg_match('/\d/', $password)) {
            return 'La contraseña debe combinar letras y números.';
        }
        if ($usuario !== '' && strcasecmp($password, $usuario) === 0) {
            return 'La contraseña no puede ser igual al nombre de usuario.';
        }

        return null;
    }
}
