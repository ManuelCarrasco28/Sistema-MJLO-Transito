<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PersonasController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();

        $rows = $db->table('personas p')
            ->select("
                p.id,
                COALESCE(td.nombre, 'DNI') AS tipoDocumento,
                p.numero AS numeroDocumento,
                c.nombres,
                c.apellido_paterno AS apellidoPaterno,
                COALESCE(c.apellido_materno, '') AS apellidoMaterno,
                COALESCE(p.direccion, '') AS direccion,
                COALESCE(p.telefono, '') AS telefono,
                COALESCE(p.celular, '') AS celular,
                COALESCE(p.email, '') AS email,
                COALESCE(c.numero_licencia, '') AS numeroLicencia,
                COALESCE(c.foto, '') AS fotoUrl,
                COALESCE(c.foto, '') AS fotoImg,
                p.estado
            ", false)
            ->join('ciudadanos c', 'c.id_persona = p.id', 'inner')
            ->join('tipo_documentos_identidad td', 'td.id = p.id_tipo_documento', 'left')
            ->orderBy('p.id', 'DESC')
            ->get()
            ->getResultArray();

        return $this->respond(['data' => $rows]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getPost();

        if (empty($input['numeroDocumento']) || empty($input['nombres']) || empty($input['apellidoPaterno'])) {
            return $this->failValidationErrors('Número de documento, nombres y apellido paterno son requeridos.');
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
            'foto'             => trim($input['fotoUrl'] ?? $input['fotoImg'] ?? '') ?: null,
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

        return $this->respondCreated(['status' => true, 'message' => 'Persona registrada con éxito', 'data' => $newPersona]);
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getRawInput();

        if (!$id) {
            return $this->failNotFound('ID de persona no especificado.');
        }

        if (!$db->table('personas')->where('id', $id)->countAllResults()) {
            return $this->failNotFound('Persona no encontrada.');
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
        if (array_key_exists('fotoUrl', $input) || array_key_exists('fotoImg', $input)) $cData['foto'] = trim($input['fotoUrl'] ?? $input['fotoImg'] ?? '') ?: null;

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

        return $this->respond(['status' => true, 'message' => 'Persona actualizada con éxito']);
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
