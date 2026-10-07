<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class MunicipalidadController extends ResourceController
{
    protected $format = 'json';

    public function config()
    {
        $this->response->setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        $this->response->setHeader('Pragma', 'no-cache');

        $db = \Config\Database::connect();

        if (!$db->tableExists('municipalidad') || !$db->tableExists('municipalidad_anio')) {
            return $this->respond([
                'data' => [
                    'municipalidad' => null,
                    'anios' => [],
                    'configuracion' => $this->configuracionSistema($db),
                ],
            ]);
        }

        $municipalidad = $db->table('municipalidad')
            ->orderBy("CASE WHEN estado = 'ACTIVO' THEN 0 ELSE 1 END", '', false)
            ->orderBy('id', 'ASC')
            ->get()
            ->getRowArray();

        $anios = [];
        if ($municipalidad) {
            // No seleccionar 'token': es un secreto (bearer de PIDE) y este
            // endpoint lo consulta cualquier usuario autenticado, no solo superadmin.
            // Se agrega 'tokenConfigurado' (booleano) para que la UI pueda
            // mostrar si ya hay uno guardado sin revelar su valor.
            $anios = $db->table('municipalidad_anio')
                ->select("id, id_municipalidad, fecha_created, fecha_updated, nombre, anio, uit, (token IS NOT NULL AND token != '') as tokenConfigurado", false)
                ->where('id_municipalidad', $municipalidad['id'])
                ->orderBy('anio', 'DESC')
                ->get()
                ->getResultArray();

            foreach ($anios as &$anioRow) {
                $anioRow['tokenConfigurado'] = (bool) $anioRow['tokenConfigurado'];
            }
            unset($anioRow);
        }

        return $this->respond([
            'data' => [
                'municipalidad' => $municipalidad,
                'anios' => $anios,
                'configuracion' => $this->configuracionSistema($db),
            ],
        ]);
    }

    /**
     * Endpoint ligero para el dashboard móvil.
     * Retorna sólo los conteos del día para el inspector + config de permisos.
     * Evita descargar todo el historial de papeletas y reportes.
     */
    public function mobileDashboard()
    {
        $db = \Config\Database::connect();
        $config = $this->configuracionSistema($db);
        $permitePapeleta = ($config['mobile_permite_aplicar_papeleta']['valor'] ?? '0') === '1';

        // El inspector sale de la sesión: antes cualquier usuario podía ver el conteo de otro enviando su
        // inspector_id. Solo el personal de oficina puede consultar a otro inspector.
        $usuarioSesion = \App\Libraries\Acceso::usuario();
        $inspectorId = \App\Libraries\Acceso::esOficina($usuarioSesion)
            ? (int) ($this->request->getGet('inspector_id') ?: ($usuarioSesion['id_persona'] ?? 0))
            : (int) ($usuarioSesion['id_persona'] ?? 0);
        $hoy = date('Y-m-d');

        $papeletasHoy = 0;
        $reportesHoy = 0;

        if ($inspectorId > 0) {
            $papeletasHoy = (int)$db->table('papeletas')
                ->where('id_inspector', $inspectorId)
                ->where('fecha_hora >=', $hoy . ' 00:00:00')
                ->where('fecha_hora <=', $hoy . ' 23:59:59')
                ->countAllResults();

            if ($db->tableExists('reportes_intervencion')) {
                $reportesHoy = (int)$db->table('reportes_intervencion')
                    ->where('id_inspector', $inspectorId)
                    ->where('fecha_hora >=', $hoy . ' 00:00:00')
                    ->where('fecha_hora <=', $hoy . ' 23:59:59')
                    ->countAllResults();
            }
        }

        return $this->response
            ->setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->setHeader('Pragma', 'no-cache')
            ->setJSON([
            'data' => [
                'permite_aplicar_papeleta' => $permitePapeleta,
                'papeletas_hoy' => $papeletasHoy,
                'reportes_hoy' => $reportesHoy,
            ],
        ]);
    }

    public function mobileConfig()
    {
        $db = \Config\Database::connect();
        $config = $this->configuracionSistema($db);

        return $this->response
            ->setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->setHeader('Pragma', 'no-cache')
            ->setJSON([
            'data' => [
                'permite_aplicar_papeleta' => ($config['mobile_permite_aplicar_papeleta']['valor'] ?? '0') === '1',
            ],
        ]);
    }

    public function update($id = null)
    {
        $input = $this->request->getJSON(true) ?: [];

        $data = $this->onlyMunicipalidadFields($input);
        $required = ['ruc', 'razon_social', 'direccion_fiscal', 'departamento', 'provincia', 'distrito', 'telefono', 'email', 'mesa_partes'];
        foreach ($required as $field) {
            if (empty(trim((string)($data[$field] ?? '')))) {
                return $this->failValidationErrors('Complete los campos obligatorios de municipalidad.');
            }
        }

        if (!preg_match('/^\d{11}$/', $data['ruc'])) {
            return $this->failValidationErrors('El RUC de la municipalidad debe tener 11 dígitos.');
        }

        $data['estado'] = in_array($data['estado'] ?? 'ACTIVO', ['ACTIVO', 'INACTIVO'], true) ? $data['estado'] : 'ACTIVO';

        $db = \Config\Database::connect();
        if (!$db->tableExists('municipalidad')) {
            return $this->failServerError('Falta crear la tabla municipalidad.');
        }

        $exists = $db->table('municipalidad')->where('id', $id)->get()->getRowArray();
        if (!$exists) {
            return $this->failNotFound('Municipalidad no encontrada.');
        }

        $db->table('municipalidad')->where('id', $id)->update($data);

        return $this->respond([
            'message' => 'Datos de municipalidad actualizados correctamente.',
            'data' => array_merge($exists, $data, ['id' => (int)$id]),
        ]);
    }

    public function saveAnio()
    {
        $input = $this->request->getJSON(true) ?: [];
        $idMunicipalidad = (int)($input['id_municipalidad'] ?? 0);
        $anio = trim((string)($input['anio'] ?? ''));
        $nombre = trim((string)($input['nombre'] ?? ''));
        $uit = (float)($input['uit'] ?? 0);
        $token = trim((string)($input['token'] ?? ''));

        // El token de PIDE es un secreto: solo el SuperAdmin puede ponerlo o cambiarlo.
        if ($token !== '' && \App\Libraries\Acceso::rol() !== 'SUPERADMIN') {
            return $this->fail('Solo un SuperAdmin puede registrar o cambiar el token de PIDE.', 403);
        }

        if ($idMunicipalidad <= 0 || !preg_match('/^\d{4}$/', $anio) || $uit <= 0) {
            return $this->failValidationErrors('Indique municipalidad, año válido y UIT mayor a cero.');
        }

        if ($nombre === '') {
            $nombre = 'Año Fiscal ' . $anio;
        }

        $db = \Config\Database::connect();
        if (!$db->tableExists('municipalidad_anio')) {
            return $this->failServerError('Falta crear la tabla municipalidad_anio.');
        }

        $municipalidad = $db->table('municipalidad')->where('id', $idMunicipalidad)->get()->getRowArray();
        if (!$municipalidad) {
            return $this->failNotFound('Municipalidad no encontrada.');
        }

        $existing = $db->table('municipalidad_anio')
            ->where('id_municipalidad', $idMunicipalidad)
            ->where('anio', $anio)
            ->get()
            ->getRowArray();

        $data = [
            'id_municipalidad' => $idMunicipalidad,
            'nombre' => $nombre,
            'anio' => $anio,
            'uit' => $uit,
        ];

        // El modal de edición nunca puede pre-cargar el token real (es un
        // secreto que el endpoint de lectura no expone), así que llega vacío
        // salvo que el usuario lo haya vuelto a escribir. Si viene vacío en
        // una edición, se conserva el token que ya estaba guardado en vez de
        // borrarlo sin querer.
        if ($token !== '' || !$existing) {
            // Se guarda cifrado (AES-256 con encryption.key del .env): nunca en texto plano.
            $data['token'] = $token === '' ? null : \App\Libraries\SecretoCifrado::cifrar($token);
        }

        if ($existing) {
            $db->table('municipalidad_anio')->where('id', $existing['id'])->update($data);
            $id = (int)$existing['id'];
            $tokenConfigurado = $token !== '' ? true : !empty($existing['token']);
        } else {
            $db->table('municipalidad_anio')->insert($data);
            $id = (int)$db->insertID();
            $tokenConfigurado = $token !== '';
        }

        if ($token !== '') {
            \App\Services\AuditoriaService::registrar('CONFIGURACION', 'CAMBIAR_TOKEN_PIDE', "Se registró o cambió el token de PIDE del año {$anio}", ['anio' => $anio]);
        }

        // Nunca se devuelve el token (ni siquiera cifrado).
        unset($data['token']);

        return $this->respond([
            'message' => 'UIT del año guardada correctamente.',
            'data' => array_merge($data, ['id' => $id, 'tokenConfigurado' => $tokenConfigurado]),
        ]);
    }

    /** Quita el token de PIDE de un año fiscal (lo deja vacío) sin borrar el año ni su UIT. */
    public function quitarTokenAnio($id = null)
    {
        $db = \Config\Database::connect();

        $anio = $db->table('municipalidad_anio')->select('id, anio')->where('id', (int) $id)->get()->getRowArray();
        if (!$anio) {
            return $this->failNotFound('Año fiscal no encontrado.');
        }

        $db->table('municipalidad_anio')->where('id', $anio['id'])->update(['token' => null]);

        \App\Services\AuditoriaService::registrar('CONFIGURACION', 'QUITAR_TOKEN_PIDE', "Se quitó el token de PIDE del año {$anio['anio']}", ['anio' => $anio['anio']]);

        return $this->respond(['message' => 'Token de PIDE quitado correctamente.']);
    }

    public function deleteAnio($id = null)
    {
        $db = \Config\Database::connect();
        if (!$id) {
            return $this->failNotFound('ID de año fiscal no especificado.');
        }
        if (!$db->tableExists('municipalidad_anio')) {
            return $this->failServerError('Falta crear la tabla municipalidad_anio.');
        }

        $anio = $db->table('municipalidad_anio')->where('id', $id)->get()->getRowArray();
        if (!$anio) {
            return $this->failNotFound('Año fiscal no encontrado.');
        }

        $db->table('municipalidad_anio')->where('id', $id)->delete();

        \App\Services\AuditoriaService::registrar(
            'CONFIGURACION',
            'ELIMINAR',
            "Se eliminó el año fiscal {$anio['anio']} ({$anio['nombre']}).",
            ['id' => (int)$id, 'anio' => $anio['anio']]
        );

        return $this->respondDeleted(['message' => 'Año fiscal eliminado correctamente.']);
    }

    public function saveConfiguracion()
    {
        $input = $this->request->getJSON(true) ?: [];
        $clave = trim((string)($input['clave'] ?? ''));

        $permitidas = [
            'mobile_permite_aplicar_papeleta' => 'Permite que los inspectores registren papeletas directamente desde la app móvil.',
        ];

        if (!array_key_exists($clave, $permitidas)) {
            return $this->failValidationErrors('Configuración no permitida.');
        }

        $valor = $this->normalizarValorBooleano($input['valor'] ?? '0');
        $descripcion = $permitidas[$clave];

        $db = \Config\Database::connect();
        if (!$db->tableExists('configuracion_sistema')) {
            return $this->failServerError('Falta crear la tabla configuracion_sistema.');
        }

        $existing = $db->table('configuracion_sistema')->where('clave', $clave)->get()->getRowArray();
        $data = [
            'clave' => $clave,
            'valor' => $valor,
            'descripcion' => $descripcion,
        ];

        if ($existing) {
            $db->table('configuracion_sistema')->where('id', $existing['id'])->update($data);
            $id = (int)$existing['id'];
        } else {
            $db->table('configuracion_sistema')->insert($data);
            $id = (int)$db->insertID();
        }

        return $this->respond([
            'message' => 'Configuración actualizada correctamente.',
            'data' => array_merge($data, ['id' => $id]),
        ]);
    }

    private function configuracionSistema($db): array
    {
        if (!$db->tableExists('configuracion_sistema')) {
            return [
                'mobile_permite_aplicar_papeleta' => [
                    'clave' => 'mobile_permite_aplicar_papeleta',
                    'valor' => '1',
                    'descripcion' => 'Permite que los inspectores registren papeletas directamente desde la app móvil.',
                ],
            ];
        }

        $rows = $db->table('configuracion_sistema')->get()->getResultArray();
        $config = [];
        foreach ($rows as $row) {
            $config[$row['clave']] = $row;
        }

        if (!isset($config['mobile_permite_aplicar_papeleta'])) {
            $config['mobile_permite_aplicar_papeleta'] = [
                'clave' => 'mobile_permite_aplicar_papeleta',
                'valor' => '1',
                'descripcion' => 'Permite que los inspectores registren papeletas directamente desde la app móvil.',
            ];
        }

        return $config;
    }

    private function normalizarValorBooleano(mixed $value): string
    {
        return in_array($value, [true, 1, '1', 'true', 'TRUE', 'on', 'ACTIVO'], true) ? '1' : '0';
    }

    private function onlyMunicipalidadFields(array $input): array
    {
        $fields = [
            'ruc',
            'razon_social',
            'nombre_abreviado',
            'sigla',
            'direccion_fiscal',
            'departamento',
            'provincia',
            'distrito',
            'telefono',
            'email',
            'mesa_partes',
            'logo',
            'estado',
        ];

        $data = [];
        foreach ($fields as $field) {
            if (array_key_exists($field, $input)) {
                $data[$field] = is_string($input[$field]) ? trim($input[$field]) : $input[$field];
            }
        }

        return $data;
    }
}
