<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PersonalController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        $rows = $db->table('trabajadores pe')
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
                pe.estado
            ", false)
            ->join('personas p', 'p.id = pe.id_persona', 'inner')
            ->join('ciudadanos c', 'c.id_persona = pe.id_persona', 'inner')
            ->join('tipo_documentos_identidad td', 'td.id = p.id_tipo_documento', 'left')
            ->join('desplazamiento_oficina dof', 'dof.id_trabajador = pe.id_persona AND (dof.fecha_termino IS NULL OR dof.fecha_termino > CURDATE())', 'left')
            ->join('cargos ca', 'ca.id = dof.id_cargo', 'left')
            ->join('unidades_organicas uo', 'uo.id = dof.id_unidad_organica', 'left')
            ->join('jerarquia_organizacional jo', 'jo.id = uo.id_jerarquia', 'left')
            ->orderBy('pe.id_persona', 'DESC')
            ->get()->getResultArray();

        foreach ($rows as &$row) {
            $row['historial'] = $db->table('desplazamiento_oficina dof')
                ->select('dof.solicitud, dof.documento, dof.fecha_documento, dof.firma_documento, dof.tipo_funcion, dof.fecha_created, dof.fecha_termino, ca.nombre as cargo, uo.nombre as unidad_organica, jo.nombre as jerarquia', false)
                ->join('cargos ca', 'ca.id = dof.id_cargo', 'left')
                ->join('unidades_organicas uo', 'uo.id = dof.id_unidad_organica', 'left')
                ->join('jerarquia_organizacional jo', 'jo.id = uo.id_jerarquia', 'left')
                ->where('dof.id_trabajador', $row['id'])
                ->orderBy('dof.fecha_created', 'DESC')
                ->get()->getResultArray();
        }

        return $this->respond(['data' => $rows]);
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
        foreach (['tipo_documento', 'numero_documento', 'nombres', 'apellidos', 'cargo', 'estado'] as $field) {
            if (!isset($input[$field]) || !is_string($input[$field]) || trim($input[$field]) === '') {
                return $this->failValidationErrors('Complete todos los campos del trabajador.');
            }
        }

        $estado = trim($input['estado']);
        if (!in_array($estado, ['ACTIVO', 'INACTIVO'], true)) {
            return $this->failValidationErrors('Estado no válido.');
        }

        $db = \Config\Database::connect();
        $db->transStart();
        
        // 1. Tipo de documento
        $tipoDocRow = $db->table('tipo_documentos_identidad')->where('nombre', $input['tipo_documento'])->get()->getRowArray();
        $tipoDocId = $tipoDocRow ? $tipoDocRow['id'] : 1; // Default to DNI

        // 2. Cargo
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

        // Split apellidos
        $apellidos = explode(' ', $input['apellidos'], 2);
        $apePaterno = $apellidos[0];
        $apeMaterno = $apellidos[1] ?? '';

        if ($id === null) {
            // Validate duplicate
            if ($db->table('personas')->where('numero', $input['numero_documento'])->countAllResults() > 0) {
                return $this->failValidationErrors('Ya existe un trabajador con ese documento.');
            }

            // Insert Persona
            $db->table('personas')->insert([
                'id_tipo_documento' => $tipoDocId,
                'numero' => $input['numero_documento'],
                'estado' => 'ACTIVO'
            ]);
            $id = $db->insertID();

            // Insert Ciudadano
            $db->table('ciudadanos')->insert([
                'id_persona' => $id,
                'nombres' => $input['nombres'],
                'apellido_paterno' => $apePaterno,
                'apellido_materno' => $apeMaterno
            ]);

            // Insert Trabajador
            $db->table('trabajadores')->insert([
                'id_persona' => $id,
                'tipo' => 'INTERNO',
                'tiene_cuenta' => 1,
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
            
            // Update Persona
            $db->table('personas')->where('id', $id)->update([
                'id_tipo_documento' => $tipoDocId,
                'numero' => $input['numero_documento']
            ]);

            // Update Ciudadano
            $db->table('ciudadanos')->where('id_persona', $id)->update([
                'nombres' => $input['nombres'],
                'apellido_paterno' => $apePaterno,
                'apellido_materno' => $apeMaterno
            ]);

            // Update Trabajador
            $db->table('trabajadores')->where('id_persona', $id)->update([
                'estado' => $input['estado']
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
            return $this->respondCreated(['data' => ['id' => $id] + $input]);
        }
        return $this->respond(['data' => ['id' => $id] + $input]);
    }
}
