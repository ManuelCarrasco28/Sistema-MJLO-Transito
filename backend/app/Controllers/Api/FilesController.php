<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class FilesController extends ResourceController
{
    /**
     * Sirve un archivo guardado en writable/uploads/{subcarpeta}/{archivo}.
     * basename() evita cualquier intento de path traversal (../).
     */
    public function ver($subcarpeta = null, $archivo = null)
    {
        $subcarpeta = basename((string) $subcarpeta);
        $archivo = basename((string) $archivo);

        if ($subcarpeta === '' || $archivo === '') {
            return $this->failNotFound('Archivo no encontrado.');
        }

        $ruta = WRITEPATH . 'uploads/' . $subcarpeta . '/' . $archivo;
        if (!is_file($ruta)) {
            return $this->failNotFound('Archivo no encontrado.');
        }

        $mime = mime_content_type($ruta) ?: 'application/octet-stream';

        return $this->response
            ->setHeader('Content-Type', $mime)
            ->setHeader('Cache-Control', 'private, max-age=86400')
            ->setBody(file_get_contents($ruta));
    }
}
