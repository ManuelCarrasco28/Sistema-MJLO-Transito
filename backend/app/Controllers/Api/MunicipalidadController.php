<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class MunicipalidadController extends ResourceController
{
    protected $format = 'json';

    public function config()
    {
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
            $anios = $db->table('municipalidad_anio')
                ->where('id_municipalidad', $municipalidad['id'])
                ->orderBy('anio', 'DESC')
                ->get()
                ->getResultArray();
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

        $inspectorId = (int)($this->request->getGet('inspector_id') ?? 0);
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

        if ($existing) {
            $db->table('municipalidad_anio')->where('id', $existing['id'])->update($data);
            $id = (int)$existing['id'];
        } else {
            $db->table('municipalidad_anio')->insert($data);
            $id = (int)$db->insertID();
        }

        return $this->respond([
            'message' => 'UIT del año guardada correctamente.',
            'data' => array_merge($data, ['id' => $id]),
        ]);
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
