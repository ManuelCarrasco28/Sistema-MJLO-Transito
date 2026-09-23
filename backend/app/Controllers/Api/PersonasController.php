<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PersonasController extends ResourceController
{
    protected $format = 'json';

    private function findPersona($id)
    {
        $db = \Config\Database::connect();

        return $db->table('personas p')
            ->select("
                p.id,
                COALESCE(td.nombre, 'DNI') AS tipoDocumento,
                p.numero AS numeroDocumento,
                c.nombres,
                c.apellido_paterno AS apellidoPaterno,
                COALESCE(c.apellido_materno, '') AS apellidoMaterno,
                COALESCE(c.sexo, '') AS sexo,
                c.fecha_nacimiento AS fechaNacimiento,
                COALESCE(c.estado_civil, '') AS estadoCivil,
                COALESCE(c.profesion, '') AS profesion,
                COALESCE(p.id_ubigeo, '') AS ubigeo,
                p.fecha_created AS fechaCreated,
                p.fecha_updated AS fechaUpdated,
                COALESCE(p.direccion, '') AS direccion,
                COALESCE(p.telefono, '') AS telefono,
                COALESCE(p.celular, '') AS celular,
                COALESCE(p.email, '') AS email,
                COALESCE(c.numero_licencia, '') AS numeroLicencia,
                COALESCE(c.foto, '') AS fotoUrl,
                COALESCE(c.foto, '') AS fotoImg,
                p.estado
            ", false)
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->join('tipo_documentos_identidad td', 'td.id = p.id_tipo_documento', 'left')
            ->where('p.id', $id)
            ->get()
            ->getRowArray();
    }

    public function index()
    {
        $db = \Config\Database::connect();

        $cookie = $this->request->getCookie('session_user');
        $rol = '';
        if ($cookie && str_contains($cookie, '.')) {
            [$payload] = explode('.', $cookie, 2);
            $json = base64_decode(strtr($payload, '-_', '+/'));
            $user = $json ? json_decode($json, true) : null;
            $rol = strtoupper($user['rol'] ?? '');
        }

        $builder = $db->table('personas p')
            ->select("
                p.id,
                COALESCE(td.nombre, 'DNI') AS tipoDocumento,
                p.numero AS numeroDocumento,
                c.nombres,
                c.apellido_paterno AS apellidoPaterno,
                COALESCE(c.apellido_materno, '') AS apellidoMaterno,
                COALESCE(c.sexo, '') AS sexo,
                c.fecha_nacimiento AS fechaNacimiento,
                COALESCE(c.estado_civil, '') AS estadoCivil,
                COALESCE(c.profesion, '') AS profesion,
                COALESCE(p.id_ubigeo, '') AS ubigeo,
                p.fecha_created AS fechaCreated,
                p.fecha_updated AS fechaUpdated,
                COALESCE(p.direccion, '') AS direccion,
                COALESCE(p.telefono, '') AS telefono,
                COALESCE(p.celular, '') AS celular,
                COALESCE(p.email, '') AS email,
                COALESCE(c.numero_licencia, '') AS numeroLicencia,
                COALESCE(c.foto, '') AS fotoUrl,
                COALESCE(c.foto, '') AS fotoImg,
                p.estado
            ", false)
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->join('tipo_documentos_identidad td', 'td.id = p.id_tipo_documento', 'left');

        $numero = $this->request->getGet('numeroDocumento');
        if ($numero) {
            $builder->where('p.numero', trim($numero));
        }

        if ($rol !== 'SUPERADMIN') {
            $builder->where('p.numero !=', '00000001');
        }

        $rows = $builder->orderBy('p.id', 'DESC')->get()->getResultArray();

        $personaIds = array_map(function($r) { return $r['id']; }, $rows);
        
        $historialPapeletas = [];
        $historialCursos = [];
        
        if (!empty($personaIds)) {
            // Historial Papeletas (a través de los vehículos del que es propietario)
            $papeletas = $db->table('papeletas pap')
                ->select("
                    vp.id_persona,
                    pap.numero_papeleta,
                    pap.fecha_hora,
                    pap.lugar,
                    pap.estado,
                    v.placa
                ", false)
                ->join('vehiculo_propietarios vp', 'vp.id_vehiculo = pap.id_vehiculo', 'inner')
                ->join('vehiculos v', 'v.id = pap.id_vehiculo', 'left')
                ->whereIn('vp.id_persona', $personaIds)
                ->orderBy('pap.fecha_hora', 'DESC')
                ->get()->getResultArray();
                
            foreach ($papeletas as $pap) {
                $pId = $pap['id_persona'];
                unset($pap['id_persona']);
                $historialPapeletas[$pId][] = $pap;
            }
            
            // Historial Cursos
            $cursos = $db->table('inscripciones_curso ic')
                ->select("
                    ic.id_persona,
                    ic.fecha_inscripcion,
                    ic.estado,
                    ic.asistio,
                    c.nombre as curso_nombre,
                    c.codigo,
                    c.fecha_inicio
                ", false)
                ->join('cursos_seguridad_vial c', 'c.id = ic.id_curso', 'inner')
                ->whereIn('ic.id_persona', $personaIds)
                ->orderBy('c.fecha_inicio', 'DESC')
                ->get()->getResultArray();
                
            foreach ($cursos as $cur) {
                $pId = $cur['id_persona'];
                unset($cur['id_persona']);
                $historialCursos[$pId][] = $cur;
            }
        }
        
        $data = array_map(function($r) use ($historialPapeletas, $historialCursos) {
            $r['historialPapeletas'] = $historialPapeletas[$r['id']] ?? [];
            $r['historialCursos'] = $historialCursos[$r['id']] ?? [];
            return $r;
        }, $rows);

        return $this->respond(['data' => $data]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getPost();

        $rules = [
            'numeroDocumento' => [
                'rules' => 'required',
                'errors' => ['required' => 'El número de documento es requerido.']
            ],
            'nombres' => [
                'rules' => 'required',
                'errors' => ['required' => 'Los nombres son requeridos.']
            ],
            'apellidoPaterno' => [
                'rules' => 'required',
                'errors' => ['required' => 'El apellido paterno es requerido.']
            ],
            'apellidoMaterno' => [
                'rules' => 'required',
                'errors' => ['required' => 'El apellido materno es requerido.']
            ],
            'numeroLicencia' => [
                'rules' => 'required|max_length[9]',
                'errors' => [
                    'required' => 'El número de licencia es requerido.',
                    'max_length' => 'El número de licencia no puede exceder los 9 caracteres.'
                ]
            ],
            'direccion' => [
                'rules' => 'required',
                'errors' => ['required' => 'La dirección es requerida.']
            ],
            'email' => [
                'rules' => 'required|valid_email',
                'errors' => [
                    'required' => 'El correo electrónico es requerido.',
                    'valid_email' => 'Por favor ingresa un correo electrónico válido.'
                ]
            ],
            'celular' => [
                'rules' => 'required|numeric|exact_length[9]',
                'errors' => [
                    'required' => 'El número de celular es requerido.',
                    'numeric' => 'El número de celular debe contener solo números.',
                    'exact_length' => 'El número de celular debe tener exactamente 9 dígitos.'
                ]
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $numeroDoc = trim($input['numeroDocumento']);
        $tipoDocName = $input['tipoDocumento'] ?? 'DNI';
        $docLen = strlen($numeroDoc);

        if ($tipoDocName === 'DNI' && ($docLen !== 8 || !ctype_digit($numeroDoc))) {
            return $this->failValidationErrors('El DNI debe tener exactamente 8 dígitos numéricos.');
        }
        if ($tipoDocName !== 'DNI' && ($docLen < 8 || $docLen > 15)) {
            return $this->failValidationErrors('El número de documento debe tener entre 8 y 15 caracteres.');
        }

        if ($db->table('personas')->where('numero', $numeroDoc)->countAllResults() > 0) {
            return $this->failValidationErrors('El número de documento ya se encuentra registrado en el sistema.');
        }

        $db->transStart();

        $tipoDocName = $input['tipoDocumento'] ?? 'DNI';
        $tipoDocRow = $db->table('tipo_documentos_identidad')->where('nombre', $tipoDocName)->get()->getRowArray();
        $tipoDocId = $tipoDocRow ? $tipoDocRow['id'] : 1;

        $pData = [
            'id_tipo_documento' => $tipoDocId,
            'numero'            => trim($input['numeroDocumento']),
            'direccion'         => trim($input['direccion'] ?? ''),
            'telefono'          => trim($input['telefono'] ?? ''),
            'celular'           => trim($input['celular'] ?? ''),
            'email'             => trim($input['email'] ?? ''),
            'estado'            => strtoupper($input['estado'] ?? 'ACTIVO'),
        ];
        $db->table('personas')->insert($pData);
        $insertId = $db->insertID();

        $cData = [
            'id_persona'       => $insertId,
            'nombres'          => trim($input['nombres']),
            'apellido_paterno' => trim($input['apellidoPaterno']),
            'apellido_materno' => trim($input['apellidoMaterno'] ?? ''),
            'numero_licencia'  => strtoupper(trim($input['numeroLicencia'] ?? '')) ?: null,
            'foto'             => trim($input['fotoImg'] ?? $input['fotoUrl'] ?? '') ?: null,
        ];
        $db->table('ciudadanos')->insert($cData);

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->failServerError('Error guardando la persona.');
        }

        $newPersona = array_merge(['id' => (int)$insertId, 'tipoDocumento' => $tipoDocName, 'numeroDocumento' => $pData['numero'], 'numeroLicencia' => $cData['numero_licencia'] ?? ''], $cData, $pData);
        unset($newPersona['id_persona'], $newPersona['id_tipo_documento'], $newPersona['numero'], $newPersona['foto']);
        $newPersona['apellidoPaterno'] = $cData['apellido_paterno'];
        $newPersona['apellidoMaterno'] = $cData['apellido_materno'];
        $newPersona['fotoUrl'] = $cData['foto'];
        $newPersona['fotoImg'] = $cData['foto'];

        return $this->respondCreated(['status' => true, 'message' => 'Persona registrada con éxito', 'data' => $newPersona]);
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getRawInput();

        if (!$id) {
            return $this->failNotFound('ID de persona no especificado.');
        }

        $currentPersona = $db->table('personas')->where('id', $id)->get()->getRowArray();
        if (!$currentPersona) {
            return $this->failNotFound('Persona no encontrada.');
        }

        $tipoDocName = $input['tipoDocumento'] ?? null;
        
        if (isset($input['numeroDocumento'])) {
            $numeroDoc = trim($input['numeroDocumento']);
            $currentTipoDoc = $tipoDocName ?? ($db->table('tipo_documentos_identidad')->where('id', $currentPersona['id_tipo_documento'])->get()->getRowArray()['nombre'] ?? 'DNI');
            $docLen = strlen($numeroDoc);

            if ($currentTipoDoc === 'DNI' && ($docLen !== 8 || !ctype_digit($numeroDoc))) {
                return $this->failValidationErrors('El DNI debe tener exactamente 8 dígitos numéricos.');
            }
            if ($currentTipoDoc !== 'DNI' && ($docLen < 8 || $docLen > 15)) {
                return $this->failValidationErrors('El número de documento debe tener entre 8 y 15 caracteres.');
            }

            if ($db->table('personas')->where('numero', $numeroDoc)->where('id !=', $id)->countAllResults() > 0) {
                return $this->failValidationErrors('El número de documento ya se encuentra registrado en el sistema.');
            }
        }

        $rules = [
            'nombres' => [
                'rules' => 'required',
                'errors' => ['required' => 'Los nombres son requeridos.']
            ],
            'apellidoPaterno' => [
                'rules' => 'required',
                'errors' => ['required' => 'El apellido paterno es requerido.']
            ],
            'apellidoMaterno' => [
                'rules' => 'required',
                'errors' => ['required' => 'El apellido materno es requerido.']
            ],
            'numeroLicencia' => [
                'rules' => 'required|max_length[9]',
                'errors' => [
                    'required' => 'El número de licencia es requerido.',
                    'max_length' => 'El número de licencia no puede exceder los 9 caracteres.'
                ]
            ],
            'direccion' => [
                'rules' => 'required',
                'errors' => ['required' => 'La dirección es requerida.']
            ],
            'email' => [
                'rules' => 'required|valid_email',
                'errors' => [
                    'required' => 'El correo electrónico es requerido.',
                    'valid_email' => 'Por favor ingresa un correo electrónico válido.'
                ]
            ],
            'celular' => [
                'rules' => 'required|numeric|exact_length[9]',
                'errors' => [
                    'required' => 'El número de celular es requerido.',
                    'numeric' => 'El número de celular debe contener solo números.',
                    'exact_length' => 'El número de celular debe tener exactamente 9 dígitos.'
                ]
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $db->transStart();

        $pData = [];
        if (isset($input['tipoDocumento'])) {
            $tipoDocRow = $db->table('tipo_documentos_identidad')->where('nombre', $input['tipoDocumento'])->get()->getRowArray();
            $pData['id_tipo_documento'] = $tipoDocRow ? $tipoDocRow['id'] : 1;
        }
        if (isset($input['numeroDocumento'])) $pData['numero'] = trim($input['numeroDocumento']);
        if (isset($input['direccion'])) $pData['direccion'] = trim($input['direccion']);
        if (isset($input['telefono'])) $pData['telefono'] = trim($input['telefono']);
        if (isset($input['celular'])) $pData['celular'] = trim($input['celular']);
        if (isset($input['email'])) $pData['email'] = trim($input['email']);
        if (isset($input['estado'])) $pData['estado'] = strtoupper($input['estado']);

        if (!empty($pData)) {
            $db->table('personas')->where('id', $id)->update($pData);
        }

        $cData = [];
        if (isset($input['nombres'])) $cData['nombres'] = trim($input['nombres']);
        if (isset($input['apellidoPaterno'])) $cData['apellido_paterno'] = trim($input['apellidoPaterno']);
        if (isset($input['apellidoMaterno'])) $cData['apellido_materno'] = trim($input['apellidoMaterno']);
        if (array_key_exists('numeroLicencia', $input)) $cData['numero_licencia'] = strtoupper(trim($input['numeroLicencia'] ?? '')) ?: null;
        if (array_key_exists('fotoUrl', $input) || array_key_exists('fotoImg', $input)) $cData['foto'] = trim($input['fotoImg'] ?? $input['fotoUrl'] ?? '') ?: null;

        if (!empty($cData)) {
            if ($db->table('ciudadanos')->where('id_persona', $id)->countAllResults()) {
                $db->table('ciudadanos')->where('id_persona', $id)->update($cData);
            } else {
                $cData['id_persona'] = $id;
                $db->table('ciudadanos')->insert($cData);
            }
        }

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->failServerError('Error actualizando la persona.');
        }

        $persona = $this->findPersona($id);

        return $this->respond([
            'status'  => true,
            'message' => 'Persona actualizada con éxito',
            'data'    => $persona,
        ]);
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        if (!$id) return $this->failNotFound('ID de persona no especificado.');
        if (!$db->table('personas')->where('id', $id)->countAllResults()) return $this->failNotFound('Persona no encontrada.');
        
        $db->transStart();
        $db->table('ciudadanos')->where('id_persona', $id)->delete();
        $db->table('personas')->where('id', $id)->delete();
        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->failServerError('Error eliminando persona.');
        }

        return $this->respondDeleted(['status' => true, 'message' => 'Persona eliminada del registro']);
    }
}
