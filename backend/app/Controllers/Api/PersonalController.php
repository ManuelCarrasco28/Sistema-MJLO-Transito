<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PersonalController extends ResourceController
{
    protected $format = 'json';

    public function estadisticas()
    {
        $db = \Config\Database::connect();
        $row = $db->table('trabajadores')
            ->select("
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'ACTIVO' THEN 1 ELSE 0 END) as activos,
                SUM(CASE WHEN estado = 'INACTIVO' THEN 1 ELSE 0 END) as inactivos
            ", false)
            ->get()->getRowArray();

        return $this->respond(['data' => [
            'total' => (int) ($row['total'] ?? 0),
            'activos' => (int) ($row['activos'] ?? 0),
            'inactivos' => (int) ($row['inactivos'] ?? 0),
        ]]);
    }

    public function index()
    {
        $db = \Config\Database::connect();
        $user = \App\Services\AuthSession::resolveActiveUser($this->request->getCookie('session_user'));
        $rol = strtoupper($user['rol'] ?? '');

        $builder = $db->table('trabajadores pe')
            ->select("
                pe.id_persona as id,
                pe.id_persona as id_persona,
                COALESCE(td.nombre, 'DNI') as tipo_documento,
                p.numero as numero_documento,
                c.nombres,
                c.apellido_paterno,
                c.apellido_materno,
                CONCAT(c.apellido_paterno, ' ', COALESCE(c.apellido_materno, '')) AS apellidos,
                '' as email,
                ca.nombre as cargo,
                dof.id_unidad_organica,
                uo.nombre as unidad_organica,
                jo.nombre as jerarquia,
                dof.tipo_funcion,
                dof.solicitud,
                dof.documento,
                dof.fecha_documento,
                dof.firma_documento,
                dof.fecha_termino,
                CASE WHEN ua.id IS NULL THEN 0 ELSE 1 END AS tiene_cuenta,
                pe.estado
            ", false)
            ->join('personas p', 'p.id = pe.id_persona', 'inner')
            ->join('ciudadanos c', 'c.id_persona = pe.id_persona', 'inner')
            ->join('tipo_documentos_identidad td', 'td.id = p.id_tipo_documento', 'left')
            ->join('desplazamiento_oficina dof', 'dof.id_trabajador = pe.id_persona AND (dof.fecha_termino IS NULL OR dof.fecha_termino > CURDATE())', 'left')
            ->join('cargos ca', 'ca.id = dof.id_cargo', 'left')
            ->join('unidades_organicas uo', 'uo.id = dof.id_unidad_organica', 'left')
            ->join('jerarquia_organizacional jo', 'jo.id = uo.id_jerarquia', 'left')
            ->join('usuarios ua', "ua.id_persona = pe.id_persona AND ua.estado = 'ACTIVO'", 'left');
            
        if ($rol !== 'SUPERADMIN') {
            $builder->where('p.numero !=', '00000001');
        }

        $buscar = trim((string)$this->request->getGet('buscar'));
        if ($buscar !== '') {
            $builder->groupStart()
                ->like('p.numero', $buscar)
                ->orLike('c.nombres', $buscar)
                ->orLike('c.apellido_paterno', $buscar)
                ->orLike('c.apellido_materno', $buscar)
                ->orWhere(\App\Libraries\Busqueda::nombreCompleto($buscar, 'c.nombres', 'c.apellido_paterno', 'c.apellido_materno'), null, false)
                ->orLike('ca.nombre', $buscar)
                ->orLike('uo.nombre', $buscar)
                ->groupEnd();
        }

        $estado = strtoupper(trim((string)$this->request->getGet('estado')));
        if (in_array($estado, ['ACTIVO', 'INACTIVO'], true)) {
            $builder->where('pe.estado', $estado);
        }

        $page = (int)$this->request->getGet('page');
        $porPagina = max(1, min(200, (int)($this->request->getGet('porPagina') ?: 20)));

        $columnasOrdenables = [
            'nombres' => 'c.nombres',
            'numeroDocumento' => 'p.numero',
            'estado' => 'pe.estado',
        ];

        if ($page > 0) {
            $total = (clone $builder)->countAllResults(false);
            $rows = \App\Libraries\QuerySort::aplicar($builder, $this->request, $columnasOrdenables, 'pe.id_persona')
                ->limit($porPagina, ($page - 1) * $porPagina)
                ->get()->getResultArray();

            $trabajadorIds = array_column($rows, 'id');
            $historialAgrupado = [];
            if (!empty($trabajadorIds)) {
                $historialRows = $db->table('desplazamiento_oficina dof')
                    ->select('dof.id_trabajador, dof.solicitud, dof.documento, dof.fecha_documento, dof.firma_documento, dof.tipo_funcion, dof.fecha_created, dof.fecha_termino, ca.nombre as cargo, uo.nombre as unidad_organica, jo.nombre as jerarquia', false)
                    ->join('cargos ca', 'ca.id = dof.id_cargo', 'left')
                    ->join('unidades_organicas uo', 'uo.id = dof.id_unidad_organica', 'left')
                    ->join('jerarquia_organizacional jo', 'jo.id = uo.id_jerarquia', 'left')
                    ->whereIn('dof.id_trabajador', $trabajadorIds)
                    ->orderBy('dof.fecha_created', 'DESC')
                    ->get()->getResultArray();
                foreach ($historialRows as $h) {
                    $tid = (int)$h['id_trabajador'];
                    unset($h['id_trabajador']);
                    $historialAgrupado[$tid][] = $h;
                }
            }

            foreach ($rows as &$row) {
                $row['historial'] = $historialAgrupado[$row['id']] ?? [];
            }
            unset($row);

            return $this->respond([
                'data' => $rows,
                'meta' => [
                    'total' => $total,
                    'page' => $page,
                    'porPagina' => $porPagina,
                    'totalPaginas' => (int) ceil($total / $porPagina),
                ],
            ]);
        }

        $rows = $builder->orderBy('pe.id_persona', 'DESC')
            ->get()->getResultArray();

        $trabajadorIds = array_column($rows, 'id');
        $historialAgrupado = [];
        if (!empty($trabajadorIds)) {
            $historialRows = $db->table('desplazamiento_oficina dof')
                ->select('dof.id_trabajador, dof.solicitud, dof.documento, dof.fecha_documento, dof.firma_documento, dof.tipo_funcion, dof.fecha_created, dof.fecha_termino, ca.nombre as cargo, uo.nombre as unidad_organica, jo.nombre as jerarquia', false)
                ->join('cargos ca', 'ca.id = dof.id_cargo', 'left')
                ->join('unidades_organicas uo', 'uo.id = dof.id_unidad_organica', 'left')
                ->join('jerarquia_organizacional jo', 'jo.id = uo.id_jerarquia', 'left')
                ->whereIn('dof.id_trabajador', $trabajadorIds)
                ->orderBy('dof.fecha_created', 'DESC')
                ->get()->getResultArray();
            foreach ($historialRows as $h) {
                $tid = (int)$h['id_trabajador'];
                unset($h['id_trabajador']);
                $historialAgrupado[$tid][] = $h;
            }
        }

        foreach ($rows as &$row) {
            $row['historial'] = $historialAgrupado[$row['id']] ?? [];
        }
        unset($row);

        return $this->respond(['data' => $rows]);
    }

    private function getTrabajadorRow($id_persona)
    {
        $db = \Config\Database::connect();
        $builder = $db->table('trabajadores pe')
            ->select("
                pe.id_persona as id,
                pe.id_persona as id_persona,
                COALESCE(td.nombre, 'DNI') as tipo_documento,
                p.numero as numero_documento,
                c.nombres,
                c.apellido_paterno,
                c.apellido_materno,
                CONCAT(c.apellido_paterno, ' ', COALESCE(c.apellido_materno, '')) AS apellidos,
                '' as email,
                ca.nombre as cargo,
                dof.id_unidad_organica,
                uo.nombre as unidad_organica,
                jo.nombre as jerarquia,
                dof.tipo_funcion,
                dof.solicitud,
                dof.documento,
                dof.fecha_documento,
                dof.firma_documento,
                dof.fecha_termino,
                CASE WHEN ua.id IS NULL THEN 0 ELSE 1 END AS tiene_cuenta,
                pe.estado
            ", false)
            ->join('personas p', 'p.id = pe.id_persona', 'inner')
            ->join('ciudadanos c', 'c.id_persona = pe.id_persona', 'inner')
            ->join('tipo_documentos_identidad td', 'td.id = p.id_tipo_documento', 'left')
            ->join('desplazamiento_oficina dof', 'dof.id_trabajador = pe.id_persona AND (dof.fecha_termino IS NULL OR dof.fecha_termino > CURDATE())', 'left')
            ->join('cargos ca', 'ca.id = dof.id_cargo', 'left')
            ->join('unidades_organicas uo', 'uo.id = dof.id_unidad_organica', 'left')
            ->join('jerarquia_organizacional jo', 'jo.id = uo.id_jerarquia', 'left')
            ->join('usuarios ua', "ua.id_persona = pe.id_persona AND ua.estado = 'ACTIVO'", 'left')
            ->where('pe.id_persona', $id_persona);
            
        $row = $builder->get()->getRowArray();
        
        if ($row) {
            $row['historial'] = $db->table('desplazamiento_oficina dof')
                ->select('dof.solicitud, dof.documento, dof.fecha_documento, dof.firma_documento, dof.tipo_funcion, dof.fecha_created, dof.fecha_termino, ca.nombre as cargo, uo.nombre as unidad_organica, jo.nombre as jerarquia', false)
                ->join('cargos ca', 'ca.id = dof.id_cargo', 'left')
                ->join('unidades_organicas uo', 'uo.id = dof.id_unidad_organica', 'left')
                ->join('jerarquia_organizacional jo', 'jo.id = uo.id_jerarquia', 'left')
                ->where('dof.id_trabajador', $row['id'])
                ->orderBy('dof.fecha_created', 'DESC')
                ->get()->getResultArray();
        }

        return $row;
    }


    public function catalogos()
    {
        $db = \Config\Database::connect();
        return $this->respond([
            'cargos' => $db->table('cargos')->select('id, nombre')->where('estado', 'ACTIVO')->orderBy('nombre')->get()->getResultArray(),
            'unidades' => $db->table('unidades_organicas uo')
                ->select('uo.id, uo.nombre, uo.siglas, jo.nombre as jerarquia', false)
                ->join('jerarquia_organizacional jo', 'jo.id = uo.id_jerarquia', 'left')
                ->where('uo.estado', 'ACTIVO')
                ->orderBy('uo.nombre')
                ->get()->getResultArray(),
        ]);
    }

    public function create()
    {
        return $this->saveRecord();
    }

    public function update($id = null)
    {
        return $this->saveRecord($id);
    }

    private function saveRecord($id = null)
    {
        $input = $this->request->getJSON(true) ?: [];

        $rules = [
            'cargo' => [
                'rules' => 'required',
                'errors' => ['required' => 'El cargo es obligatorio.']
            ],
            'estado' => [
                'rules' => 'required|in_list[ACTIVO,INACTIVO]',
                'errors' => [
                    'required' => 'El estado es obligatorio.',
                    'in_list' => 'Estado no válido.'
                ]
            ]
        ];

        if ($id === null) {
            $rules['id_persona'] = [
                'rules' => 'required',
                'errors' => ['required' => 'Seleccione una persona registrada para crear el trabajador.']
            ];
        }

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $estado = trim($input['estado']);

        $db = \Config\Database::connect();
        $db->transStart();
        
        // 1. Cargo
        $cargoRow = $db->table('cargos')->where('nombre', $input['cargo'])->get()->getRowArray();
        if (!$cargoRow) {
            $db->table('cargos')->insert(['nombre' => $input['cargo'], 'estado' => 'ACTIVO']);
            $cargoId = $db->insertID();
        } else {
            $cargoId = $cargoRow['id'];
        }
        $unidadId = !empty($input['id_unidad_organica']) ? (int)$input['id_unidad_organica'] : null;
        $tipoFuncion = trim($input['tipo_funcion'] ?? 'Titular') ?: 'Titular';
        $solicitud = trim($input['solicitud'] ?? '');
        $documento = trim($input['documento'] ?? ('DESIGNACION-' . date('Y'))) ?: ('DESIGNACION-' . date('Y'));
        $fechaDocumento = trim($input['fecha_documento'] ?? date('Y-m-d')) ?: date('Y-m-d');
        $firmaDocumento = trim($input['firma_documento'] ?? '');
        $fechaTermino = !empty($input['fecha_termino']) ? $input['fecha_termino'] : null;

        if ($id === null) {
            $id = (int)$input['id_persona'];
            $persona = $db->table('personas')->where('id', $id)->get()->getRowArray();
            if (!$persona) {
                return $this->failValidationErrors('La persona seleccionada no existe.');
            }
            if ($db->table('trabajadores')->where('id_persona', $id)->countAllResults() > 0) {
                return $this->failValidationErrors('La persona seleccionada ya está registrada como trabajador.');
            }

            // Insert Trabajador
            $db->table('trabajadores')->insert([
                'id_persona' => $id,
                'tipo' => 'INTERNO',
                'tiene_cuenta' => 0,
                'estado' => $input['estado']
            ]);

            // Insert Desplazamiento
            $db->table('desplazamiento_oficina')->insert([
                'id_unidad_organica' => $unidadId,
                'id_trabajador' => $id,
                'id_cargo' => $cargoId,
                'solicitud' => $solicitud,
                'documento' => $documento,
                'fecha_documento' => $fechaDocumento,
                'firma_documento' => $firmaDocumento,
                'tipo_funcion' => $tipoFuncion,
                'fecha_termino' => $fechaTermino,
            ]);

        } else {
            if (!$db->table('trabajadores')->where('id_persona', $id)->countAllResults()) {
                return $this->failNotFound('Trabajador no encontrado.');
            }
            
            // Update Trabajador
            $db->table('trabajadores')->where('id_persona', $id)->update([
                'estado' => $input['estado'],
            ]);
            
            // Update Desplazamiento
            $existDof = $db->table('desplazamiento_oficina')
                ->where('id_trabajador', $id)
                ->groupStart()
                    ->where('fecha_termino IS NULL', null, false)
                    ->orWhere('fecha_termino >', date('Y-m-d'))
                ->groupEnd()
                ->orderBy('fecha_created', 'DESC')
                ->get()->getRowArray();
            if ($existDof) {
                $db->table('desplazamiento_oficina')->where('id', $existDof['id'])->update([
                    'id_unidad_organica' => $unidadId,
                    'id_cargo' => $cargoId,
                    'solicitud' => $solicitud,
                    'documento' => $documento,
                    'fecha_documento' => $fechaDocumento,
                    'firma_documento' => $firmaDocumento,
                    'tipo_funcion' => $tipoFuncion,
                    'fecha_termino' => $fechaTermino,
                ]);
            } else {
                $db->table('desplazamiento_oficina')->insert([
                    'id_unidad_organica' => $unidadId,
                    'id_trabajador' => $id,
                    'id_cargo' => $cargoId,
                    'solicitud' => $solicitud,
                    'documento' => $documento,
                    'fecha_documento' => $fechaDocumento,
                    'firma_documento' => $firmaDocumento,
                    'tipo_funcion' => $tipoFuncion,
                    'fecha_termino' => $fechaTermino,
                ]);
            }
        }
        
        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->failServerError('Error guardando trabajador');
        }

        if (func_num_args() === 0) {
            return $this->respondCreated(['data' => $this->getTrabajadorRow($id)]);
        }
        return $this->respond(['data' => $this->getTrabajadorRow($id)]);
    }
}
