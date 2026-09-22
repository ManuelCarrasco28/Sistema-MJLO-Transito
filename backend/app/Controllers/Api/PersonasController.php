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

    private function findPersona($id)
    {
        $db = \Config\Database::connect();

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
            ->join('tipo_documentos_identidad td', 'td.id = p.id_tipo_documento', 'left')
            ->where('p.id', $id)
            ->get()
            ->getRowArray();
    }

    public function index()
    {
        $db = \Config\Database::connect();

        $builder = $db->table('personas p')
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

        $numero = $this->request->getGet('numeroDocumento');
        if ($numero) {
            $builder->where('p.numero', trim($numero));
        }

        $rows = $builder->orderBy('p.id', 'DESC')->get()->getResultArray();

        return $this->respond(['data' => $rows]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getPost();

        if (empty($input['numeroDocumento']) || empty($input['nombres']) || empty($input['apellidoPaterno'])) {
            return $this->failValidationErrors('Número de documento, nombres y apellido paterno son requeridos.');
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

        if (!empty($input['email']) && !filter_var(trim($input['email']), FILTER_VALIDATE_EMAIL)) {
            return $this->failValidationErrors('Por favor ingresa un correo electrónico válido.');
        }

        if (!empty($input['celular']) && (!ctype_digit(trim($input['celular'])) || strlen(trim($input['celular'])) !== 9)) {
            return $this->failValidationErrors('El número de celular debe tener exactamente 9 dígitos numéricos.');
        }

        if ($db->table('personas')->where('numero', $numeroDoc)->countAllResults() > 0) {
            return $this->failValidationErrors('El número de documento ya se encuentra registrado en el sistema.');
        }

        $db->transStart();

        $tipoDocRow = $db->table('tipo_documentos_identidad')
            ->groupStart()
                ->where('codigo', $tipoDocName)
                ->orWhere('nombre', $tipoDocName)
                ->orWhere('id', is_numeric($tipoDocName) ? (int)$tipoDocName : 0)
            ->groupEnd()
            ->get()->getRowArray();
        $tipoDocId = $tipoDocRow ? (int)$tipoDocRow['id'] : 1;

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

        // Registrar como administrado
        $db->table('administrados')->insert(['id_persona' => $insertId]);

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

        if (isset($input['email'])) {
            $email = trim($input['email']);
            if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $this->failValidationErrors('Por favor ingresa un correo electrónico válido.');
            }
        }

        if (isset($input['celular'])) {
            $celular = trim($input['celular']);
            if ($celular !== '' && (!ctype_digit($celular) || strlen($celular) !== 9)) {
                return $this->failValidationErrors('El número de celular debe tener exactamente 9 dígitos numéricos.');
            }
        }

        $db->transStart();

        $pData = [];
        if (isset($input['tipoDocumento'])) {
            $tipoDocInput = trim($input['tipoDocumento']);
            $tipoDocRow = $db->table('tipo_documentos_identidad')
                ->groupStart()
                    ->where('codigo', $tipoDocInput)
                    ->orWhere('nombre', $tipoDocInput)
                    ->orWhere('id', is_numeric($tipoDocInput) ? (int)$tipoDocInput : 0)
                ->groupEnd()
                ->get()->getRowArray();
            $pData['id_tipo_documento'] = $tipoDocRow ? (int)$tipoDocRow['id'] : 1;
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
