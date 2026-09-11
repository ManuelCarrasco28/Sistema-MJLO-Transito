<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PersonasController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $rows = \Config\Database::connect()->table('personas p')
            ->select("
                p.id,
                COALESCE(tdi.codigo, 'DNI') AS tipoDocumento,
                p.numero AS numeroDocumento,
                COALESCE(c.nombres, '') AS nombres,
                COALESCE(c.apellido_paterno, '') AS apellidoPaterno,
                COALESCE(c.apellido_materno, '') AS apellidoMaterno,
                COALESCE(p.direccion, '') AS direccion,
                COALESCE(p.telefono, '') AS telefono,
                COALESCE(p.celular, '') AS celular,
                COALESCE(p.email, '') AS email,
                COALESCE(c.numero_licencia, '') AS numeroLicencia,
                COALESCE(c.foto, '') AS fotoUrl,
                COALESCE(c.foto, '') AS fotoImg,
                COALESCE(p.estado, 'ACTIVO') AS estado
            ", false)
            ->join('tipo_documentos_identidad tdi', 'tdi.id = p.id_tipo_documento', 'left')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
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

        $db->transException(true)->transBegin();

        try {
            $persona = [
                'id_tipo_documento' => $this->tipoDocumentoId($db, $input['tipoDocumento'] ?? 'DNI'),
                'numero'            => substr(trim($input['numeroDocumento']), 0, 11),
                'direccion'         => trim($input['direccion'] ?? ''),
                'telefono'          => trim($input['telefono'] ?? ''),
                'celular'           => trim($input['celular'] ?? ''),
                'email'             => trim($input['email'] ?? ''),
                'estado'            => strtoupper($input['estado'] ?? 'ACTIVO'),
            ];

            $db->table('personas')->insert($persona);
            $personaId = (int)$db->insertID();

            $ciudadano = [
                'id_persona'       => $personaId,
                'nombres'          => substr(trim($input['nombres']), 0, 50),
                'apellido_paterno' => substr(trim($input['apellidoPaterno']), 0, 50),
                'apellido_materno' => substr(trim($input['apellidoMaterno'] ?? ''), 0, 50) ?: null,
                'numero_licencia'  => substr(strtoupper(trim($input['numeroLicencia'] ?? '')), 0, 30) ?: null,
                'foto'             => trim($input['fotoImg'] ?? $input['fotoUrl'] ?? '') ?: null,
            ];
            $db->table('ciudadanos')->insert($ciudadano);

            $db->transCommit();

            return $this->respondCreated([
                'status' => true,
                'message' => 'Persona registrada con éxito',
                'data' => [
                    'id' => $personaId,
                    'tipoDocumento' => strtoupper($input['tipoDocumento'] ?? 'DNI'),
                    'numeroDocumento' => $persona['numero'],
                    'nombres' => $ciudadano['nombres'],
                    'apellidoPaterno' => $ciudadano['apellido_paterno'],
                    'apellidoMaterno' => $ciudadano['apellido_materno'] ?? '',
                    'direccion' => $persona['direccion'],
                    'telefono' => $persona['telefono'],
                    'celular' => $persona['celular'],
                    'email' => $persona['email'],
                    'numeroLicencia' => $ciudadano['numero_licencia'] ?? '',
                    'fotoUrl' => $ciudadano['foto'] ?? '',
                    'fotoImg' => $ciudadano['foto'] ?? '',
                    'estado' => $persona['estado'],
                ],
            ]);
        } catch (\Throwable $e) {
            $db->transRollback();
            return $this->failServerError('No se pudo registrar la persona: ' . $e->getMessage());
        }
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

        $persona = [];
        if (isset($input['tipoDocumento'])) $persona['id_tipo_documento'] = $this->tipoDocumentoId($db, $input['tipoDocumento']);
        if (isset($input['numeroDocumento'])) $persona['numero'] = substr(trim($input['numeroDocumento']), 0, 11);
        if (isset($input['direccion'])) $persona['direccion'] = trim($input['direccion']);
        if (isset($input['telefono'])) $persona['telefono'] = trim($input['telefono']);
        if (isset($input['celular'])) $persona['celular'] = trim($input['celular']);
        if (isset($input['email'])) $persona['email'] = trim($input['email']);
        if (isset($input['estado'])) $persona['estado'] = strtoupper($input['estado']);

        $ciudadano = [];
        if (isset($input['nombres'])) $ciudadano['nombres'] = substr(trim($input['nombres']), 0, 50);
        if (isset($input['apellidoPaterno'])) $ciudadano['apellido_paterno'] = substr(trim($input['apellidoPaterno']), 0, 50);
        if (isset($input['apellidoMaterno'])) $ciudadano['apellido_materno'] = substr(trim($input['apellidoMaterno']), 0, 50) ?: null;
        if (array_key_exists('numeroLicencia', $input)) {
            $ciudadano['numero_licencia'] = substr(strtoupper(trim($input['numeroLicencia'] ?? '')), 0, 30) ?: null;
        }
        if (array_key_exists('fotoImg', $input) || array_key_exists('fotoUrl', $input)) {
            $ciudadano['foto'] = trim($input['fotoImg'] ?? $input['fotoUrl'] ?? '') ?: null;
        }

        $db->transException(true)->transBegin();
        try {
            if ($persona) $db->table('personas')->where('id', $id)->update($persona);
            if ($ciudadano) {
                if ($db->table('ciudadanos')->where('id_persona', $id)->countAllResults() > 0) {
                    $db->table('ciudadanos')->where('id_persona', $id)->update($ciudadano);
                } else {
                    $db->table('ciudadanos')->insert($ciudadano + [
                        'id_persona' => (int)$id,
                        'nombres' => $ciudadano['nombres'] ?? 'SIN NOMBRE',
                        'apellido_paterno' => $ciudadano['apellido_paterno'] ?? 'SIN APELLIDO',
                    ]);
                }
            }
            $db->transCommit();
            return $this->respond(['status' => true, 'message' => 'Persona actualizada con éxito']);
        } catch (\Throwable $e) {
            $db->transRollback();
            return $this->failServerError('No se pudo actualizar la persona: ' . $e->getMessage());
        }
    }

    public function delete($id = null)
    {
        if (!$id) return $this->failNotFound('ID de persona no especificado.');

        \Config\Database::connect()->table('personas')->where('id', $id)->update(['estado' => 'INACTIVO']);
        return $this->respondDeleted(['status' => true, 'message' => 'Persona inactivada del registro']);
    }

    private function tipoDocumentoId($db, string $codigo): int
    {
        $codigo = strtoupper(trim($codigo ?: 'DNI'));
        $row = $db->table('tipo_documentos_identidad')
            ->select('id')
            ->where('codigo', $codigo)
            ->where('estado', 'ACTIVO')
            ->get()
            ->getRowArray();

        return (int)($row['id'] ?? 1);
    }
}
