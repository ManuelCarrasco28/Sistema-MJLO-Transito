<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Services\AuditoriaService;

class AsociacionesController extends ResourceController
{
    use \App\Libraries\ResuelveUuid;

    protected string $tablaUuid = 'asociaciones';
    protected array $tablasUuidPorMetodo = [];
    protected array $soloUuidEnEstricto = [];

    protected $format = 'json';

    /**
     * Consulta base de asociaciones con datos del representante legal y
     * conteo de flota, compartida por index() y show().
     */
    private function asociacionSelectQuery($db)
    {
        return $db->table('asociaciones o')
            ->select("o.uuid AS uuid, 
                o.id,
                o.tipo,
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
                o.id_representante_legal AS idRepresentanteLegal,
                COALESCE(p_rep.numero, '') AS representanteDni,
                TRIM(CONCAT(COALESCE(c_rep.nombres, ''), ' ', COALESCE(c_rep.apellido_paterno, ''), ' ', COALESCE(c_rep.apellido_materno, ''))) AS representanteNombre,
                COALESCE(NULLIF(p_rep.telefono, ''), NULLIF(p_rep.celular, ''), '') AS representanteTelefono,
                o.estado,
                COUNT(v.id) AS flotaTotal
            ", false)
            ->join('personas p_rep', 'p_rep.id = o.id_representante_legal', 'left')
            ->join('ciudadanos c_rep', 'c_rep.id_persona = p_rep.id', 'left')
            ->join('vehiculos v', 'v.id_asociacion = o.id', 'left');
    }

    /**
     * Normaliza tipos y calcula los indicadores de cupo (disponibles,
     * porcentaje de ocupación, estado) a partir de flotaTotal/flotaAutorizada.
     */
    private function calcularCupo(array $r): array
    {
        $r['id'] = (int)$r['id'];
        $flotaTotal = (int)$r['flotaTotal'];
        $flotaAutorizada = max(1, (int)$r['flotaAutorizada']);
        $r['flotaTotal'] = $flotaTotal;
        $r['flotaAutorizada'] = $flotaAutorizada;
        $r['cuposDisponibles'] = max(0, $flotaAutorizada - $flotaTotal);
        $r['porcentajeOcupacion'] = round(($flotaTotal / $flotaAutorizada) * 100);
        $r['estadoCupo'] = $flotaTotal > $flotaAutorizada ? 'SOBRECUPO' : ($flotaTotal === $flotaAutorizada ? 'COMPLETO' : 'DISPONIBLE');
        return $r;
    }

    public function estadisticas()
    {
        $db = \Config\Database::connect();
        $row = $db->table('asociaciones')
            ->select("
                COUNT(*) as total,
                SUM(CASE WHEN tipo = 'PARTICULAR' THEN 1 ELSE 0 END) as particulares,
                SUM(CASE WHEN tipo = 'ASOCIACION' THEN 1 ELSE 0 END) as asociaciones
            ", false)
            ->get()->getRowArray();

        $flota = (int) $db->table('vehiculos')->where('id_asociacion IS NOT NULL', null, false)->countAllResults();

        return $this->respond(['data' => [
            'total' => (int) ($row['total'] ?? 0),
            'particulares' => (int) ($row['particulares'] ?? 0),
            'asociaciones' => (int) ($row['asociaciones'] ?? 0),
            'flotaAcumulada' => $flota,
        ]]);
    }

    public function index()
    {
        $db = \Config\Database::connect();
        $builder = $this->asociacionSelectQuery($db);

        $buscar = trim((string) $this->request->getGet('buscar'));
        if ($buscar !== '') {
            $builder->groupStart()
                ->like('o.razon_social', $buscar)
                ->orLike('o.ruc', $buscar)
                ->orLike('o.partida_registral', $buscar)
                ->orLike('o.resolucion_alcaldia', $buscar)
                ->orLike('p_rep.numero', $buscar)
                ->orLike('c_rep.nombres', $buscar)
                ->orLike('c_rep.apellido_paterno', $buscar)
                ->orLike('c_rep.apellido_materno', $buscar)
                ->orWhere(\App\Libraries\Busqueda::nombreCompleto($buscar, 'c_rep.nombres', 'c_rep.apellido_paterno', 'c_rep.apellido_materno'), null, false)
                ->groupEnd();
        }

        $tipoFiltro = strtoupper((string) $this->request->getGet('tipo'));
        if (in_array($tipoFiltro, ['ASOCIACION', 'PARTICULAR'], true)) {
            $builder->where('o.tipo', $tipoFiltro);
        }

        $estadoFiltro = strtoupper((string) $this->request->getGet('estado'));
        if (in_array($estadoFiltro, ['ACTIVO', 'INACTIVO'], true)) {
            $builder->where('o.estado', $estadoFiltro);
        }

        $page = (int) $this->request->getGet('page');
        $porPagina = max(1, min(200, (int) ($this->request->getGet('porPagina') ?: 20)));

        $builder->groupBy('o.id');

        $columnasOrdenables = [
            'razonSocial' => 'o.razon_social',
            'ruc' => 'o.ruc',
            'estado' => 'o.estado',
        ];

        if ($page > 0) {
            // Con groupBy activo, CodeIgniter cuenta las filas agrupadas envolviendo la consulta.
            $total = (clone $builder)->countAllResults(false);

            $rows = \App\Libraries\QuerySort::aplicar($builder, $this->request, $columnasOrdenables, 'o.id')
                ->limit($porPagina, ($page - 1) * $porPagina)
                ->get()
                ->getResultArray();

            $data = array_map([$this, 'calcularCupo'], $rows);

            return $this->respond([
                'data' => $data,
                'meta' => [
                    'total' => $total,
                    'page' => $page,
                    'porPagina' => $porPagina,
                    'totalPaginas' => (int) ceil($total / $porPagina),
                ],
            ]);
        }

        $rows = $builder->orderBy('o.id', 'DESC')
            ->get()
            ->getResultArray();

        $data = array_map([$this, 'calcularCupo'], $rows);

        return $this->respond(['data' => $data]);
    }

    public function show($id = null)
    {
        $db = \Config\Database::connect();

        if (!$id) {
            return $this->failNotFound('ID de asociación no especificado.');
        }

        $asociacion = $this->asociacionSelectQuery($db)
            ->where('o.id', $id)
            ->groupBy('o.id')
            ->get()
            ->getRowArray();

        if (!$asociacion) {
            return $this->failNotFound('Asociación no encontrada.');
        }

        $asociacion = $this->calcularCupo($asociacion);

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
                COALESCE(tv.nombre, 'Mototaxi') AS tipo,
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

    /**
     * Lista global de socios: propietarios con vehículos registrados en
     * cualquier asociación, junto con el nombre de la asociación a la que
     * pertenecen. Usado por la pestaña "Socios" del padrón.
     */
    public function opciones()
    {
        $db = \Config\Database::connect();
        $filas = $db->table('asociaciones')
            ->select('MIN(id) AS id, razon_social AS razonSocial, GROUP_CONCAT(id ORDER BY id SEPARATOR ",") AS ids', false)
            ->groupBy('razon_social')
            ->orderBy('razon_social', 'ASC')
            ->get()
            ->getResultArray();

        return $this->respond(['data' => $filas]);
    }

    /**
     * Padrón de socios: UNA fila por persona. Una persona puede ser socia de varias
     * asociaciones o empresas particulares y tener varios vehículos en cada una, así que
     * cada fila trae sus "vinculos" (organización + los vehículos que tiene en ella).
     * Los filtros de organización y de tipo también recortan los vínculos y los totales,
     * para que lo que se ve y lo que se descarga siempre sea coherente con el filtro.
     */
    public function socios()
    {
        $db = \Config\Database::connect();

        $base = static function ($db) {
            return $db->table('vehiculo_propietarios vp')
                ->join('vehiculos v', 'v.id = vp.id_vehiculo', 'inner')
                ->join('asociaciones o', 'o.id = v.id_asociacion', 'inner')
                ->where('vp.estado', 'ACTIVO');
        };
        $aplicarFiltros = function ($builder) {
            $idAsociacion = trim((string) $this->request->getGet('idAsociacion'));
            if ($idAsociacion !== '') {
                $ids = array_values(array_filter(array_map(
                    static fn ($id) => (int) trim($id),
                    explode(',', $idAsociacion)
                ), static fn ($id) => $id > 0));
                if (count($ids) === 1) {
                    $builder->where('o.id', $ids[0]);
                } elseif (count($ids) > 1) {
                    $builder->whereIn('o.id', $ids);
                }
            }
            $tipo = strtoupper(trim((string) $this->request->getGet('tipo')));
            if (in_array($tipo, ['ASOCIACION', 'PARTICULAR'], true)) {
                $builder->where('o.tipo', $tipo);
            }
            return $builder;
        };

        $sociosBase = $aplicarFiltros($base($db));
        $expresionVencidos = '0';
        if (in_array('documentosVencidos', array_map('trim', explode(',', (string) $this->request->getGet('sortBy'))), true)) {
            $sociosBase->join('documentos_vehiculo d', 'd.id_vehiculo = v.id', 'left');
            $expresionVencidos = "COUNT(DISTINCT CASE WHEN d.estado = 'VENCIDO' OR (d.fecha_expiracion IS NOT NULL AND d.fecha_expiracion < CURDATE()) THEN d.id END)";
        }
        $socios = $sociosBase
            ->select("
                p.id AS idPersona,
                COALESCE(p.numero, '') AS documento,
                TRIM(CONCAT(COALESCE(c.nombres, ''), ' ', COALESCE(c.apellido_paterno, ''), ' ', COALESCE(c.apellido_materno, ''))) AS nombre,
                COALESCE(NULLIF(p.telefono, ''), NULLIF(p.celular, ''), '') AS telefono,
                COALESCE(p.email, '') AS email,
                COUNT(DISTINCT o.id) AS asociacionesTotal,
                COUNT(DISTINCT vp.id_vehiculo) AS vehiculosTotal,
                {$expresionVencidos} AS documentosVencidos,
                MIN(o.razon_social) AS asociacionNombre
            ", false)
            ->join('personas p', 'p.id = vp.id_persona', 'inner')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->groupBy('p.id');

        $buscar = trim((string) $this->request->getGet('buscar'));
        $condicionBusqueda = null;
        if ($buscar !== '') {
            $like = $db->escapeLikeString($buscar);
            // Filtra personas con EXISTS sin recortar su flota ni agrupar todas las placas para buscar.
            $organizacionesBusqueda = $aplicarFiltros($base($db))
                ->select('vp.id_persona')->groupStart()->like('v.placa', $buscar)->orLike('o.razon_social', $buscar)->groupEnd()
                ->getCompiledSelect();
            $nombreSql = \App\Libraries\Busqueda::nombreCompleto($buscar, 'c.nombres', 'c.apellido_paterno', 'c.apellido_materno');
            $condicionBusqueda = "({$nombreSql} OR p.numero LIKE '%{$like}%' ESCAPE '!' OR p.telefono LIKE '%{$like}%' ESCAPE '!' "
                . "OR p.celular LIKE '%{$like}%' ESCAPE '!' OR p.email LIKE '%{$like}%' ESCAPE '!' "
                . "OR p.id IN ({$organizacionesBusqueda}))";
            $socios->where($condicionBusqueda, null, false);
        }

        $vehiculosFiltro = strtoupper(trim((string) $this->request->getGet('vehiculos')));
        if ($vehiculosFiltro === 'UNO') {
            $socios->having('vehiculosTotal', 1);
        } elseif ($vehiculosFiltro === 'DOS_TRES') {
            $socios->having('vehiculosTotal >=', 2);
            $socios->having('vehiculosTotal <=', 3);
        } elseif ($vehiculosFiltro === 'MAS_TRES') {
            $socios->having('vehiculosTotal >', 3);
        }

        $page = (int) $this->request->getGet('page');
        $meta = null;
        if ($page > 0) {
            $porPagina = max(1, min(200, (int) ($this->request->getGet('porPagina') ?: 20)));
            if (in_array($vehiculosFiltro, ['UNO', 'DOS_TRES', 'MAS_TRES'], true)) {
                $total = (clone $socios)->countAllResults(false);
            } else {
                $contador = $aplicarFiltros($base($db))->select('COUNT(DISTINCT vp.id_persona) AS total', false)
                    ->join('personas p', 'p.id = vp.id_persona', 'inner')->join('ciudadanos c', 'c.id_persona = p.id', 'left');
                if ($condicionBusqueda !== null) $contador->where($condicionBusqueda, null, false);
                $total = (int) ($contador->get()->getRowArray()['total'] ?? 0);
            }

            $columnasOrdenables = [
                'nombre' => 'nombre',
                'documento' => 'documento',
                'asociacionNombre' => 'asociacionNombre',
                'asociacionesTotal' => 'asociacionesTotal',
                'vehiculosTotal' => 'vehiculosTotal',
                'documentosVencidos' => 'documentosVencidos',
            ];

            $filas = \App\Libraries\QuerySort::aplicar($socios, $this->request, $columnasOrdenables, 'nombre', 'ASC')
                ->orderBy('idPersona', 'ASC')
                ->limit($porPagina, ($page - 1) * $porPagina)
                ->get()
                ->getResultArray();

            $meta = [
                'total' => $total,
                'page' => $page,
                'porPagina' => $porPagina,
                'totalPaginas' => (int) ceil($total / $porPagina),
            ];
        } else {
            $filas = $socios->orderBy('nombre', 'ASC')->orderBy('idPersona', 'ASC')->get()->getResultArray();
        }

        // Vínculos de las personas de esta página: organización + vehículos que tiene en ella
        $ids = array_map('intval', array_column($filas, 'idPersona'));
        $vinculos = [];
        foreach (array_chunk($ids, 1000) as $lote) {
            $q = $aplicarFiltros($base($db))
                ->select("
                    vp.id_persona AS idPersona,
                    o.id AS idAsociacion,
                    o.razon_social AS asociacionNombre,
                    o.tipo AS tipo,
                    COUNT(DISTINCT v.id) AS vehiculos,
                    GROUP_CONCAT(DISTINCT v.placa ORDER BY v.placa SEPARATOR ',') AS placas
                ", false)
                ->whereIn('vp.id_persona', $lote)
                ->groupBy('vp.id_persona, o.id')
                ->orderBy('o.razon_social', 'ASC');
            foreach ($q->get()->getResultArray() as $v) {
                $vinculos[(int) $v['idPersona']][] = [
                    'idAsociacion' => (int) $v['idAsociacion'],
                    'asociacionNombre' => $v['asociacionNombre'],
                    'tipo' => $v['tipo'],
                    'vehiculos' => (int) $v['vehiculos'],
                    'placas' => $v['placas'] !== null && $v['placas'] !== '' ? explode(',', $v['placas']) : [],
                ];
            }
        }

        // Solo contar documentos vencidos de las personas visibles, sin multiplicar el JOIN principal.
        $vencidos = [];
        foreach (array_chunk($ids, 1000) as $lote) {
            $q = $aplicarFiltros($base($db))->join('documentos_vehiculo d', 'd.id_vehiculo = v.id', 'inner')
                ->select('vp.id_persona, COUNT(DISTINCT d.id) AS total', false)
                ->whereIn('vp.id_persona', $lote)->groupStart()->where('d.estado', 'VENCIDO')
                ->orGroupStart()->where('d.fecha_expiracion IS NOT NULL', null, false)->where('d.fecha_expiracion < CURDATE()', null, false)->groupEnd()
                ->groupEnd()->groupBy('vp.id_persona');
            foreach ($q->get()->getResultArray() as $conteo) $vencidos[(int) $conteo['id_persona']] = (int) $conteo['total'];
        }

        foreach ($filas as &$fila) {
            $fila['idPersona'] = (int) $fila['idPersona'];
            $fila['asociacionesTotal'] = (int) $fila['asociacionesTotal'];
            $fila['vehiculosTotal'] = (int) $fila['vehiculosTotal'];
            $fila['documentosVencidos'] = $vencidos[$fila['idPersona']] ?? 0;
            $fila['vinculos'] = $vinculos[$fila['idPersona']] ?? [];
            unset($fila['placasBusqueda'], $fila['organizacionesBusqueda']);
        }
        unset($fila);

        return $this->respond($meta !== null ? ['data' => $filas, 'meta' => $meta] : ['data' => $filas]);
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
        if ($flotaAutorizada > 500) {
            return $this->failValidationErrors('La flota autorizada no puede superar las 500 unidades.');
        }

        $idRepresentante = null;
        if (!empty($input['idRepresentanteLegal'])) {
            $idRepresentante = (int)$input['idRepresentanteLegal'];
        } elseif (!empty($input['id_representante_legal'])) {
            $idRepresentante = (int)$input['id_representante_legal'];
        }

        $record = [
            'tipo'                   => strtoupper($input['tipo'] ?? 'ASOCIACION'),
            'razon_social'           => trim($input['razonSocial']),
            'id_representante_legal' => $idRepresentante,
            'ruc'                    => trim($input['ruc'] ?? ''),
            'partida_registral'      => trim($input['partidaRegistral'] ?? ''),
            'fecha_creacion'         => $input['fechaCreacion'] ?? null,
            'direccion'              => trim($input['direccion'] ?? ''),
            'coordenadas'            => trim($input['coordenadas'] ?? ''),
            'telefono_contacto'      => trim($input['telefono'] ?? ''),
            'email_contacto'         => trim($input['email'] ?? ''),
            'tipo_ambiente'          => trim($input['tipoAmbiente'] ?? ''),
            'numero_licencia'        => trim($input['numeroLicencia'] ?? ''),
            'resolucion_alcaldia'    => trim($input['resolucionAlcaldia'] ?? ''),
            'flota_autorizada'       => $flotaAutorizada,
            'estado'                 => strtoupper($input['estado'] ?? 'ACTIVO'),
        ];

        $record['uuid'] = \App\Libraries\Identificador::nuevo();
        $db->table('asociaciones')->insert($record);
        $insertId = $db->insertID();

        AuditoriaService::registrar(
            'ASOCIACIONES',
            'CREAR',
            "Se registró la asociación '{$record['razon_social']}' con cupo de $flotaAutorizada unidades",
            ['id' => $insertId, 'razonSocial' => $record['razon_social'], 'flotaAutorizada' => $flotaAutorizada, 'ruc' => $record['ruc']]
        );

        $repInfo = null;
        if ($idRepresentante) {
            $repInfo = $db->table('personas p')
                ->select("
                    p.numero AS representanteDni,
                    TRIM(CONCAT(COALESCE(c.nombres, ''), ' ', COALESCE(c.apellido_paterno, ''), ' ', COALESCE(c.apellido_materno, ''))) AS representanteNombre
                ", false)
                ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                ->where('p.id', $idRepresentante)
                ->get()
                ->getRowArray();
        }

        $newOrg = [
            'id'                   => (int)$insertId,
            'uuid'                 => $record['uuid'],
            'tipo'                 => $record['tipo'],
            'razonSocial'          => $record['razon_social'],
            'idRepresentanteLegal' => $record['id_representante_legal'],
            'representanteDni'     => $repInfo['representanteDni'] ?? '',
            'representanteNombre'  => $repInfo['representanteNombre'] ?? '',
            'ruc'                  => $record['ruc'],
            'partidaRegistral'     => $record['partida_registral'],
            'fechaCreacion'        => $record['fecha_creacion'] ?? '',
            'direccion'            => $record['direccion'],
            'coordenadas'          => $record['coordenadas'],
            'telefono'             => $record['telefono_contacto'],
            'email'                => $record['email_contacto'],
            'tipoAmbiente'         => $record['tipo_ambiente'],
            'numeroLicencia'       => $record['numero_licencia'],
            'resolucionAlcaldia'   => $record['resolucion_alcaldia'],
            'flotaAutorizada'      => $flotaAutorizada,
            'cuposDisponibles'     => $flotaAutorizada,
            'porcentajeOcupacion'  => 0,
            'estadoCupo'           => 'DISPONIBLE',
            'estado'               => $record['estado'],
            'flotaTotal'           => 0,
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
        if (array_key_exists('idRepresentanteLegal', $input) || array_key_exists('id_representante_legal', $input)) {
            $repVal = $input['idRepresentanteLegal'] ?? $input['id_representante_legal'] ?? null;
            $record['id_representante_legal'] = !empty($repVal) ? (int)$repVal : null;
        }
        
        if (isset($input['ruc'])) {
            $ruc = trim($input['ruc']);
            if ($ruc !== '') {
                if (!ctype_digit($ruc) || strlen($ruc) !== 11) {
                    return $this->failValidationErrors('El RUC debe tener exactamente 11 dígitos numéricos.');
                }
                if ($db->table('asociaciones')->where('ruc', $ruc)->where('id !=', $id)->countAllResults() > 0) {
                    return $this->failValidationErrors('El RUC ya se encuentra registrado en otra asociación o empresa.');
                }
            }
            $record['ruc'] = $ruc;
        }

        if (isset($input['partidaRegistral'])) $record['partida_registral'] = trim($input['partidaRegistral']);
        if (isset($input['fechaCreacion'])) $record['fecha_creacion'] = $input['fechaCreacion'] ?: null;
        if (isset($input['direccion'])) $record['direccion'] = trim($input['direccion']);
        if (isset($input['coordenadas'])) $record['coordenadas'] = trim($input['coordenadas']);
        if (isset($input['telefono'])) $record['telefono_contacto'] = trim($input['telefono']);
        if (isset($input['email'])) $record['email_contacto'] = trim($input['email']);
        if (isset($input['tipoAmbiente'])) $record['tipo_ambiente'] = trim($input['tipoAmbiente']);
        if (isset($input['numeroLicencia'])) $record['numero_licencia'] = trim($input['numeroLicencia']);
        if (isset($input['resolucionAlcaldia'])) $record['resolucion_alcaldia'] = trim($input['resolucionAlcaldia']);
        if (isset($input['flotaAutorizada'])) {
            $flotaAutorizada = max(1, (int)$input['flotaAutorizada']);
            $flotaActual = (int)$db->table('vehiculos')->where('id_asociacion', $id)->countAllResults();
            if ($flotaAutorizada < $flotaActual) {
                return $this->failValidationErrors("La flota autorizada no puede ser menor a {$flotaActual}, ya que actualmente hay {$flotaActual} vehículo(s) asociado(s).");
            }
            if ($flotaAutorizada > 500) {
                return $this->failValidationErrors('La flota autorizada no puede superar las 500 unidades.');
            }
            $record['flota_autorizada'] = $flotaAutorizada;
        }
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
