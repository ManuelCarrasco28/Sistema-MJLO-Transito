<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Services\AuditoriaService;

class AsociacionesController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();

        $rows = $db->table('asociaciones o')
            ->select("
                o.id,
                CASE WHEN o.tipo = 'EMPRESA' THEN 'PARTICULAR' ELSE o.tipo END AS tipo,
                o.razon_social AS razonSocial,
                COALESCE(o.ruc, '') AS ruc,
                COALESCE(o.partida_registral, '') AS partidaRegistral,
                COALESCE(o.fecha_creacion, '') AS fechaCreacion,
                COALESCE(o.direccion, '') AS direccion,
                COALESCE(o.coordenadas, '') AS coordenadas,
                COALESCE(o.telefono_contacto, '') AS telefono,
                COALESCE(o.email_contacto, '') AS email,
                COALESCE(o.tipo_ambiente, '') AS tipoAmbiente,
                COALESCE(o.numero_licencia, '') AS numeroLicencia,
                COALESCE(o.resolucion_alcaldia, '') AS resolucionAlcaldia,
                COALESCE(o.flota_autorizada, 50) AS flotaAutorizada,
                o.estado,
                COUNT(v.id) AS flotaTotal
            ", false)
            ->join('vehiculos v', 'v.id_asociacion = o.id', 'left')
            ->groupBy('o.id')
            ->orderBy('o.id', 'DESC')
            ->get()
            ->getResultArray();

        $data = array_map(static function (array $r) {
            $r['id'] = (int)$r['id'];
            $flotaTotal = (int)$r['flotaTotal'];
            $flotaAutorizada = max(1, (int)$r['flotaAutorizada']);
            $r['flotaTotal'] = $flotaTotal;
            $r['flotaAutorizada'] = $flotaAutorizada;
            $r['cuposDisponibles'] = max(0, $flotaAutorizada - $flotaTotal);
            $r['porcentajeOcupacion'] = round(($flotaTotal / $flotaAutorizada) * 100);
            $r['estadoCupo'] = $flotaTotal > $flotaAutorizada ? 'SOBRECUPO' : ($flotaTotal === $flotaAutorizada ? 'COMPLETO' : 'DISPONIBLE');
            return $r;
        }, $rows);

        return $this->respond(['data' => $data]);
    }

    public function show($id = null)
    {
        $db = \Config\Database::connect();

        if (!$id) {
            return $this->failNotFound('ID de asociación no especificado.');
        }

        $asociacion = $db->table('asociaciones o')
            ->select("
                o.id,
                CASE WHEN o.tipo = 'EMPRESA' THEN 'PARTICULAR' ELSE o.tipo END AS tipo,
                o.razon_social AS razonSocial,
                COALESCE(o.ruc, '') AS ruc,
                COALESCE(o.partida_registral, '') AS partidaRegistral,
                COALESCE(o.fecha_creacion, '') AS fechaCreacion,
                COALESCE(o.direccion, '') AS direccion,
                COALESCE(o.coordenadas, '') AS coordenadas,
                COALESCE(o.telefono_contacto, '') AS telefono,
                COALESCE(o.email_contacto, '') AS email,
                COALESCE(o.tipo_ambiente, '') AS tipoAmbiente,
                COALESCE(o.numero_licencia, '') AS numeroLicencia,
                COALESCE(o.resolucion_alcaldia, '') AS resolucionAlcaldia,
                COALESCE(o.flota_autorizada, 50) AS flotaAutorizada,
                o.estado,
                COUNT(v.id) AS flotaTotal
            ", false)
            ->join('vehiculos v', 'v.id_asociacion = o.id', 'left')
            ->where('o.id', $id)
            ->groupBy('o.id')
            ->get()
            ->getRowArray();

        if (!$asociacion) {
            return $this->failNotFound('Asociación no encontrada.');
        }

        $asociacion['id'] = (int)$asociacion['id'];
        $flotaTotal = (int)$asociacion['flotaTotal'];
        $flotaAutorizada = max(1, (int)$asociacion['flotaAutorizada']);
        $asociacion['flotaTotal'] = $flotaTotal;
        $asociacion['flotaAutorizada'] = $flotaAutorizada;
        $asociacion['cuposDisponibles'] = max(0, $flotaAutorizada - $flotaTotal);
        $asociacion['porcentajeOcupacion'] = round(($flotaTotal / $flotaAutorizada) * 100);
        $asociacion['estadoCupo'] = $flotaTotal > $flotaAutorizada ? 'SOBRECUPO' : ($flotaTotal === $flotaAutorizada ? 'COMPLETO' : 'DISPONIBLE');

        $socios = $db->table('vehiculo_propietarios vp')
            ->select("
                p.id AS idPersona,
                COALESCE(p.numero, '') AS documento,
                TRIM(CONCAT(COALESCE(c.nombres, ''), ' ', COALESCE(c.apellido_paterno, ''), ' ', COALESCE(c.apellido_materno, ''))) AS nombre,
                COALESCE(NULLIF(p.telefono, ''), NULLIF(p.celular, ''), '') AS telefono,
                COALESCE(p.email, '') AS email,
                COUNT(DISTINCT vp.id_vehiculo) AS vehiculosTotal,
                GROUP_CONCAT(DISTINCT v.placa ORDER BY v.placa SEPARATOR ', ') AS placas
            ", false)
            ->join('personas p', 'p.id = vp.id_persona', 'inner')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->join('vehiculos v', 'v.id = vp.id_vehiculo', 'inner')
            ->where('v.id_asociacion', $id)
            ->where('vp.estado', 'ACTIVO')
            ->groupBy('p.id')
            ->orderBy('nombre', 'ASC')
            ->get()
            ->getResultArray();

        $vehiculos = $db->table('vehiculos v')
            ->select("
                v.id,
                v.placa,
                COALESCE(tv.nombre, 'Mototaxi (Trimovil)') AS tipo,
                COALESCE(v.marca, '') AS marca,
                COALESCE(v.modelo, '') AS modelo,
                COALESCE(v.color, '') AS color,
                COALESCE(v.anio_fabricacion, '') AS anio,
                COALESCE(p.numero, '') AS propietarioDni,
                TRIM(CONCAT(COALESCE(c.nombres, ''), ' ', COALESCE(c.apellido_paterno, ''), ' ', COALESCE(c.apellido_materno, ''))) AS propietarioNombre
            ", false)
            ->join('tipos_vehiculo tv', 'tv.id = v.id_tipo_vehiculo', 'left')
            ->join('vehiculo_propietarios vp', 'vp.id_vehiculo = v.id AND vp.fecha_fin IS NULL', 'left')
            ->join('personas p', 'p.id = vp.id_persona', 'left')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->where('v.id_asociacion', $id)
            ->orderBy('v.placa', 'ASC')
            ->get()
            ->getResultArray();

        return $this->respond([
            'data' => array_merge($asociacion, [
                'socios'    => $socios,
                'vehiculos' => $vehiculos,
            ])
        ]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getPost();

        $rules = [
            'razonSocial' => [
                'rules'  => 'required',
                'errors' => ['required' => 'La razón social es obligatoria.']
            ],
            'ruc' => [
                'rules'  => 'permit_empty|numeric|exact_length[11]|is_unique[asociaciones.ruc]',
                'errors' => [
                    'numeric'      => 'El RUC debe tener exactamente 11 dígitos numéricos.',
                    'exact_length' => 'El RUC debe tener exactamente 11 dígitos numéricos.',
                    'is_unique'    => 'El RUC ya se encuentra registrado en otra asociación o empresa.'
                ]
            ],
            'email' => [
                'rules'  => 'permit_empty|valid_email',
                'errors' => ['valid_email' => 'El correo electrónico no es válido.']
            ],
            'telefono' => [
                'rules'  => 'permit_empty|numeric',
                'errors' => ['numeric' => 'El teléfono debe contener solo números.']
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $flotaAutorizada = isset($input['flotaAutorizada']) ? max(1, (int)$input['flotaAutorizada']) : 50;

        $record = [
            'tipo'                 => strtoupper($input['tipo'] ?? 'ASOCIACION'),
            'razon_social'         => trim($input['razonSocial']),
            'ruc'                  => trim($input['ruc'] ?? ''),
            'partida_registral'    => trim($input['partidaRegistral'] ?? ''),
            'fecha_creacion'       => $input['fechaCreacion'] ?? null,
            'direccion'            => trim($input['direccion'] ?? ''),
            'coordenadas'          => trim($input['coordenadas'] ?? ''),
            'telefono_contacto'    => trim($input['telefono'] ?? ''),
            'email_contacto'       => trim($input['email'] ?? ''),
            'tipo_ambiente'        => trim($input['tipoAmbiente'] ?? ''),
            'numero_licencia'      => trim($input['numeroLicencia'] ?? ''),
            'resolucion_alcaldia'  => trim($input['resolucionAlcaldia'] ?? ''),
            'flota_autorizada'     => $flotaAutorizada,
            'estado'               => strtoupper($input['estado'] ?? 'ACTIVO'),
        ];

        $db->table('asociaciones')->insert($record);
        $insertId = $db->insertID();

        AuditoriaService::registrar(
            'ASOCIACIONES',
            'CREAR',
            "Se registró la asociación '{$record['razon_social']}' con cupo de $flotaAutorizada unidades",
            ['id' => $insertId, 'razonSocial' => $record['razon_social'], 'flotaAutorizada' => $flotaAutorizada, 'ruc' => $record['ruc']]
        );

        $newOrg = [
            'id'                 => (int)$insertId,
            'tipo'               => $record['tipo'],
            'razonSocial'        => $record['razon_social'],
            'ruc'                => $record['ruc'],
            'partidaRegistral'   => $record['partida_registral'],
            'fechaCreacion'      => $record['fecha_creacion'] ?? '',
            'direccion'          => $record['direccion'],
            'coordenadas'        => $record['coordenadas'],
            'telefono'           => $record['telefono_contacto'],
            'email'              => $record['email_contacto'],
            'tipoAmbiente'       => $record['tipo_ambiente'],
            'numeroLicencia'     => $record['numero_licencia'],
            'resolucionAlcaldia' => $record['resolucion_alcaldia'],
            'flotaAutorizada'    => $flotaAutorizada,
            'cuposDisponibles'   => $flotaAutorizada,
            'porcentajeOcupacion'=> 0,
            'estadoCupo'         => 'DISPONIBLE',
            'estado'             => $record['estado'],
            'flotaTotal'         => 0,
        ];

        return $this->respondCreated(['status' => true, 'message' => 'Asociación registrada con éxito', 'data' => $newOrg]);
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getRawInput();

        if (!$id) {
            return $this->failNotFound('ID de asociación no especificado.');
        }

        $existente = $db->table('asociaciones')->where('id', $id)->get()->getRowArray();
        if (!$existente) {
            return $this->failNotFound('Asociación no encontrada.');
        }

        $rules = [
            'razonSocial' => [
                'rules'  => 'permit_empty',
            ],
            'ruc' => [
                'rules'  => "permit_empty|numeric|exact_length[11]|is_unique[asociaciones.ruc,id,{$id}]",
                'errors' => [
                    'numeric'      => 'El RUC debe tener exactamente 11 dígitos numéricos.',
                    'exact_length' => 'El RUC debe tener exactamente 11 dígitos numéricos.',
                    'is_unique'    => 'El RUC ya se encuentra registrado en otra asociación o empresa.'
                ]
            ],
            'email' => [
                'rules'  => 'permit_empty|valid_email',
                'errors' => ['valid_email' => 'El correo electrónico no es válido.']
            ],
            'telefono' => [
                'rules'  => 'permit_empty|numeric',
                'errors' => ['numeric' => 'El teléfono debe contener solo números.']
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $record = [];
        if (isset($input['tipo'])) $record['tipo'] = strtoupper($input['tipo']);
        if (isset($input['razonSocial'])) $record['razon_social'] = trim($input['razonSocial']);
        if (isset($input['ruc'])) $record['ruc'] = trim($input['ruc']);
        if (isset($input['partidaRegistral'])) $record['partida_registral'] = trim($input['partidaRegistral']);
        if (isset($input['fechaCreacion'])) $record['fecha_creacion'] = $input['fechaCreacion'] ?: null;
        if (isset($input['direccion'])) $record['direccion'] = trim($input['direccion']);
        if (isset($input['coordenadas'])) $record['coordenadas'] = trim($input['coordenadas']);
        if (isset($input['telefono'])) $record['telefono_contacto'] = trim($input['telefono']);
        if (isset($input['email'])) $record['email_contacto'] = trim($input['email']);
        if (isset($input['tipoAmbiente'])) $record['tipo_ambiente'] = trim($input['tipoAmbiente']);
        if (isset($input['numeroLicencia'])) $record['numero_licencia'] = trim($input['numeroLicencia']);
        if (isset($input['resolucionAlcaldia'])) $record['resolucion_alcaldia'] = trim($input['resolucionAlcaldia']);
        if (isset($input['flotaAutorizada'])) $record['flota_autorizada'] = max(1, (int)$input['flotaAutorizada']);
        if (isset($input['estado'])) $record['estado'] = strtoupper($input['estado']);

        if (!empty($record)) {
            $db->table('asociaciones')->where('id', $id)->update($record);

            AuditoriaService::registrar(
                'ASOCIACIONES',
                'MODIFICAR',
                "Se actualizaron los datos de la asociación '{$existente['razon_social']}'",
                ['id' => $id, 'cambios' => $record]
            );
        }

        return $this->respond(['status' => true, 'message' => 'Asociación actualizada con éxito']);
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();

        if (!$id) {
            return $this->failNotFound('ID de asociación no especificado.');
        }

        $existente = $db->table('asociaciones')->where('id', $id)->get()->getRowArray();
        if (!$existente) {
            return $this->failNotFound('Asociación no encontrada.');
        }

        $db->table('asociaciones')->where('id', $id)->delete();

        AuditoriaService::registrar(
            'ASOCIACIONES',
            'ELIMINAR',
            "Se eliminó la asociación '{$existente['razon_social']}' (ID: $id)",
            ['id' => $id, 'razonSocial' => $existente['razon_social']]
        );

        return $this->respondDeleted(['status' => true, 'message' => 'Asociación eliminada del padrón']);
    }
}
