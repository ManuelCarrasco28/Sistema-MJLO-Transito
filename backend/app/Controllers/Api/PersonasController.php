<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PersonasController extends ResourceController
{
    protected $format = 'json';

    public function tiposDocumento()
    {
        $db = \Config\Database::connect();
        $rows = $db->table('tipo_documentos_identidad')
            ->select('id, nombre, codigo, estado')
            ->where('estado', 'ACTIVO')
            ->orderBy('id', 'ASC')
            ->get()
            ->getResultArray();

        return $this->respond(['data' => $rows]);
    }

    /**
     * Consulta base de personas + datos de ciudadano, compartida por
     * findPersona() e index() para evitar duplicar el SELECT/JOIN.
     */
    private function personaSelectQuery($db)
    {
        return $db->table('personas p')
            ->select("
                p.id,
                p.id_tipo_documento AS idTipoDocumento,
                COALESCE(td.codigo, td.nombre, 'DNI') AS tipoDocumento,
                COALESCE(td.nombre, 'DOCUMENTO NACIONAL DE IDENTIDAD') AS tipoDocumentoNombre,
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
    }

    private function findPersona($id)
    {
        $db = \Config\Database::connect();

        return $this->personaSelectQuery($db)->where('p.id', $id)->get()->getRowArray();
    }

    /**
     * Reglas de validación compartidas por create() y update(); en creación
     * además se exige el número de documento.
     */
    private function personaValidationRules(bool $esCreacion): array
    {
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
                'rules' => 'permit_empty',
            ],
            'numeroLicencia' => [
                'rules' => 'permit_empty|max_length[9]',
                'errors' => [
                    'max_length' => 'El número de licencia no puede exceder los 9 caracteres.'
                ]
            ],
            'direccion' => [
                'rules' => 'permit_empty',
            ],
            'email' => [
                'rules' => 'permit_empty|valid_email',
                'errors' => [
                    'valid_email' => 'Por favor ingresa un correo electrónico válido.'
                ]
            ],
            'celular' => [
                'rules' => 'permit_empty|numeric|exact_length[9]',
                'errors' => [
                    'numeric' => 'El número de celular debe contener solo números.',
                    'exact_length' => 'El número de celular debe tener exactamente 9 dígitos.'
                ]
            ]
        ];

        if ($esCreacion) {
            $rules['numeroDocumento'] = [
                'rules' => 'required',
                'errors' => ['required' => 'El número de documento es requerido.']
            ];
        }

        return $rules;
    }

    /**
     * Resuelve el id de tipo_documentos_identidad a partir del código,
     * nombre o id escrito en el formulario; por defecto DNI (id 1).
     */
    private function resolverTipoDocumentoId($db, string $tipoDocNombre): int
    {
        $tipoDocRow = $db->table('tipo_documentos_identidad')
            ->groupStart()
                ->where('codigo', $tipoDocNombre)
                ->orWhere('nombre', $tipoDocNombre)
                ->orWhere('id', is_numeric($tipoDocNombre) ? (int)$tipoDocNombre : 0)
            ->groupEnd()
            ->get()->getRowArray();

        return $tipoDocRow ? (int)$tipoDocRow['id'] : 1;
    }

    public function index()
    {
        $db = \Config\Database::connect();

        $user = \App\Services\AuthSession::resolveActiveUser($this->request->getCookie('session_user'));
        $rol = strtoupper($user['rol'] ?? '');

        $builder = $this->personaSelectQuery($db);

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

        if (!$this->validateData($input, $this->personaValidationRules(true))) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $numeroDoc = trim($input['numeroDocumento']);
        $tipoDocName = trim($input['tipoDocumento'] ?? 'DNI');
        $docLen = strlen($numeroDoc);

        $isDni = in_array(strtoupper($tipoDocName), ['DNI', 'DOCUMENTO NACIONAL DE IDENTIDAD', '1'], true);

        if ($isDni && ($docLen !== 8 || !ctype_digit($numeroDoc))) {
            return $this->failValidationErrors('El DNI debe tener exactamente 8 dígitos numéricos.');
        }
        if (!$isDni && ($docLen < 8 || $docLen > 15)) {
            return $this->failValidationErrors('El número de documento debe tener entre 8 y 15 caracteres.');
        }

        if ($db->table('personas')->where('numero', $numeroDoc)->countAllResults() > 0) {
            return $this->failValidationErrors('El número de documento ya se encuentra registrado en el sistema.');
        }

        $db->transStart();

        $tipoDocId = $this->resolverTipoDocumentoId($db, $tipoDocName);

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
            'estado_civil'     => trim($input['estadoCivil'] ?? '') ?: null,
            'foto'             => trim($input['fotoImg'] ?? $input['fotoUrl'] ?? '') ?: null,
        ];
        $db->table('ciudadanos')->insert($cData);

        // Registrar como administrado
        $db->table('administrados')->insert(['id_persona' => $insertId]);

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->failServerError('Error guardando la persona.');
        }

        $newPersona = array_merge(['id' => (int)$insertId, 'tipoDocumento' => $tipoDocName, 'numeroDocumento' => $pData['numero'], 'numeroLicencia' => $cData['numero_licencia'] ?? ''], $cData, $pData);
        unset($newPersona['id_persona'], $newPersona['id_tipo_documento'], $newPersona['numero'], $newPersona['foto'], $newPersona['estado_civil']);
        $newPersona['apellidoPaterno'] = $cData['apellido_paterno'];
        $newPersona['apellidoMaterno'] = $cData['apellido_materno'];
        $newPersona['estadoCivil'] = $cData['estado_civil'];
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

        if (!$this->validateData($input, $this->personaValidationRules(false))) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $db->transStart();

        $pData = [];
        if (isset($input['tipoDocumento'])) {
            $pData['id_tipo_documento'] = $this->resolverTipoDocumentoId($db, trim($input['tipoDocumento']));
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
        if (array_key_exists('estadoCivil', $input)) $cData['estado_civil'] = trim($input['estadoCivil'] ?? '') ?: null;
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
