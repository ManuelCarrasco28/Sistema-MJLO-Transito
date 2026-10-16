<?php

namespace App\Services;

class AuditoriaService
{
/**
     * Registra un evento en la tabla de auditoría.
     *
     * @param string $modulo (e.g. 'USUARIOS', 'VEHICULOS', 'ASOCIACIONES', 'PAPELETAS', 'PAGOS', 'DOCUMENTOS', 'SEGURIDAD', 'CONFIGURACION')
     * @param string $accion (e.g. 'CREAR', 'MODIFICAR', 'ELIMINAR', 'LOGIN', 'LOGOUT', 'ANULAR', 'CONFIRMAR')
     * @param string $descripcion Resumen legible del evento
     * @param array|null $detalles Metadatos adicionales o datos anteriores/nuevos
     * @param array|null $usuarioManual Opcional: ['id' => ..., 'usuario' => ..., 'rol' => ...]
     */
    public static function registrar(
        string $modulo,
        string $accion,
        string $descripcion,
        ?array $detalles = null,
        ?array $usuarioManual = null
    ): void {
        try {
            $db = \Config\Database::connect();
            if (!$db->tableExists('auditoria_logs')) {
                return;
            }

            $request = service('request');
            $idUsuario = $usuarioManual['id'] ?? null;
            $nombreUsuario = $usuarioManual['usuario'] ?? null;
            $rol = $usuarioManual['rol'] ?? null;

            if (!$nombreUsuario && $request) {
                $user = AuthSession::decodeCookie($request->getCookie('session_user'));
                if ($user) {
                    $idUsuario = $user['id'] ?? null;
                    $nombreUsuario = $user['usuario'] ?? null;
                    $rol = $user['rol'] ?? null;
                }
            }

            $ip = $request ? $request->getIPAddress() : null;
            $userAgent = $request && $request->getUserAgent() ? (string)$request->getUserAgent() : null;
            if ($userAgent && strlen($userAgent) > 250) {
                $userAgent = substr($userAgent, 0, 250);
            }

            $db->table('auditoria_logs')->insert([
                'id_usuario'     => $idUsuario,
                'nombre_usuario' => $nombreUsuario ?: 'sistema',
                'rol'            => $rol ?: 'SISTEMA',
                'modulo'         => strtoupper($modulo),
                'accion'         => strtoupper($accion),
                'descripcion'    => $descripcion,
                'detalles'       => $detalles ? json_encode($detalles, JSON_UNESCAPED_UNICODE) : null,
                'ip'             => $ip,
                'user_agent'     => $userAgent,
                'fecha_hora'     => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'Error al registrar auditoria: ' . $e->getMessage());
        }
    }
}
