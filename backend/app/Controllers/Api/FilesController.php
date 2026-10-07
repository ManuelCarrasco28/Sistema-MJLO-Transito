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

        // Lista blanca de subcarpetas autorizadas
        $subcarpetasPermitidas = ['papeletas', 'reportes', 'firmas', 'personal', 'personas', 'vehiculos'];
        if (!in_array($subcarpeta, $subcarpetasPermitidas, true)) {
            return $this->failForbidden('Acceso no permitido a este recurso.');
        }

        // Validar formato seguro del nombre de archivo (hexadecimal.ext o alphanumeric.ext)
        if (!preg_match('/^[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|webp|pdf)$/i', $archivo)) {
            return $this->failNotFound('Archivo inválido.');
        }

        $ruta = WRITEPATH . 'uploads/' . $subcarpeta . '/' . $archivo;
        if (!is_file($ruta)) {
            return $this->failNotFound('Archivo no encontrado.');
        }

        // Fotos y firmas de papeletas/reportes: el inspector solo puede ver las suyas. La oficina ve todo.
        $sesion = \App\Libraries\Acceso::usuario();
        if (!\App\Libraries\Acceso::esOficina($sesion) && in_array($subcarpeta, ['papeletas', 'reportes', 'firmas'], true)) {
            $db = \Config\Database::connect();
            $relativa = $subcarpeta . '/' . $archivo;
            $miId = (int) ($sesion['id_persona'] ?? -1);
            $consulta = match ($subcarpeta) {
                'papeletas' => $db->table('papeleta_fotos f')->join('papeletas p', 'p.id = f.id_papeleta')
                    ->where('f.foto', $relativa)->where('p.id_inspector', $miId),
                'reportes' => $db->table('reporte_intervencion_fotos f')->join('reportes_intervencion r', 'r.id = f.id_reporte')
                    ->where('f.foto', $relativa)->where('r.id_inspector', $miId),
                default => $db->table('papeletas p')->where('p.firma_conductor_img', $relativa)->where('p.id_inspector', $miId),
            };
            if ($consulta->countAllResults() === 0) {
                return $this->failNotFound('Archivo no encontrado.');
            }
        }

        $mime = mime_content_type($ruta) ?: 'application/octet-stream';

        // Prevenir sniffing y ejecución accidental en navegador
        return $this->response
            ->setHeader('Content-Type', $mime)
            ->setHeader('X-Content-Type-Options', 'nosniff')
            ->setHeader('Cache-Control', 'private, max-age=86400')
            ->setBody(file_get_contents($ruta));
    }
}
