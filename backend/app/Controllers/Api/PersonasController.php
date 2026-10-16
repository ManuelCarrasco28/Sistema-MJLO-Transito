<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PersonasController extends ResourceController
{
    use \App\Libraries\ResuelveUuid;

    protected string $tablaUuid = 'personas';
    protected array $tablasUuidPorMetodo = [];
    protected array $soloUuidEnEstricto = [];

    protected $format = 'json';

    /**
     * Decide cómo persistir el valor de foto recibido del formulario:
     * - Una foto subida manualmente por el usuario llega como data URI
     *   (base64) y se convierte a archivo real vía FileStorageService.
     * - Una foto de RENIEC/PIDE ya es una URL servible y se guarda tal cual.
     */
    /** Valida sexo y fecha de nacimiento antes de abrir la transacción (devuelve el mensaje de error o null). */
    private function errorSexoNacimiento(array $input): ?array
    {
        try {
            $this->normalizarSexo($input['sexo'] ?? null);
        } catch (\DomainException $e) {
            return ['sexo' => $e->getMessage()];
        }
        try {
            $this->normalizarFechaNacimiento($input['fechaNacimiento'] ?? null);
        } catch (\DomainException $e) {
            return ['fechaNacimiento' => $e->getMessage()];
        }
        return null;
    }

    /** Sexo como lo guarda la base: 'M' o 'F' (acepta también Masculino/Femenino); vacío = sin dato. */
    private function normalizarSexo($valor): ?string
    {
        $v = strtoupper(trim((string) $valor));
        if ($v === '') return null;
        if (in_array($v, ['M', 'MASCULINO'], true)) return 'M';
        if (in_array($v, ['F', 'FEMENINO'], true)) return 'F';
        throw new \DomainException('El sexo debe ser Masculino o Femenino.');
    }

    /** Fecha de nacimiento válida (AAAA-MM-DD), no futura y posterior a 1900; vacío = sin dato. */
    private function normalizarFechaNacimiento($valor): ?string
    {
        $v = substr(trim((string) $valor), 0, 10);
        if ($v === '') return null;
        $f = \DateTimeImmutable::createFromFormat('!Y-m-d', $v);
        if (!$f || $f->format('Y-m-d') !== $v || $v < '1900-01-01' || $v > date('Y-m-d')) {
            throw new \DomainException('La fecha de nacimiento no es válida.');
        }
        return $v;
    }

    private function resolverFotoParaGuardar(?string $valor): ?string
    {
        $valor = trim((string) $valor);
        if ($valor === '') {
            return null;
        }
        if (str_starts_with($valor, 'data:image')) {
            return (new \App\Services\FileStorageService())->guardarImagenBase64($valor, 'personas');
        }
        // Si es una URL externa (ej. RENIEC/PIDE), no se descarga nada al servidor; se deja vacía
        // en BD para que siempre se consulte la foto fresca en vivo a la API.
        if (str_starts_with($valor, 'https://')) {
            return null;
        }
        // Solo imágenes propias: la URL que arma el servidor se guarda como ruta relativa; cualquier otra URL
        // (externa) se descarta para no guardar enlaces a sitios de terceros.
        $pos = strpos($valor, '/api/files/');
        if ($pos !== false) {
            $valor = substr($valor, $pos + strlen('/api/files/'));
        }
        if (preg_match('#^[a-z]+/[A-Za-z0-9_\-]+\.(jpg|jpeg|png|webp)$#i', $valor)) {
            return $valor;
        }
        return null;
    }

    /**
     * Convierte la ruta relativa guardada (ej. "personas/abc.jpg") en una URL
     * servible por la API antes de devolverla al frontend; una URL externa
     * (RENIEC) se deja intacta.
     */
    private function aplicarFotoPublica(array $r): array
    {
        $fileStorage = new \App\Services\FileStorageService();
        $r['fotoUrl'] = $fileStorage->urlPublica($r['fotoUrl'] ?? null) ?? '';
        $r['fotoImg'] = $fileStorage->urlPublica($r['fotoImg'] ?? null) ?? '';
        return $r;
    }

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
     * Contadores agregados (total, con/sin licencia, activos/inactivos) vía
     * COUNT() en SQL. Antes esto se calculaba en el navegador recorriendo el
     * padrón completo ya cargado; con 30,000+ personas y paginación real, el
     * frontend ya no tiene todo el padrón en memoria, así que necesita estos
     * totales aparte.
     */
    public function estadisticas()
    {
        $db = \Config\Database::connect();
        $total = (int) $db->table('personas')->countAllResults();
        $conLicencia = (int) $db->table('personas p')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->where('c.numero_licencia IS NOT NULL', null, false)
            ->countAllResults();
        $activos = (int) $db->table('personas')->where('estado', 'ACTIVO')->countAllResults();

        return $this->respond(['data' => [
            'total' => $total,
            'conLicencia' => $conLicencia,
            'sinLicencia' => $total - $conLicencia,
            'activos' => $activos,
            'inactivos' => $total - $activos,
        ]]);
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
                p.uuid,
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
                'rules' => 'required',
                'errors' => ['required' => 'El apellido materno es requerido.']
            ],
            'numeroLicencia' => [
                'rules' => 'permit_empty|max_length[11]',
                'errors' => [
                    'max_length' => 'El número de licencia no puede exceder los 11 caracteres.'
                ]
            ],
            'direccion' => [
                'rules' => 'required',
                'errors' => ['required' => 'La dirección es requerida.']
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
        // Fuera de oficina (inspector) solo se admite la consulta exacta por un documento con formato válido;
        // no hay listado ni búsqueda por texto (ni valores como "0" que no filtrarían nada).
        $numeroConsulta = trim((string) $this->request->getGet('numeroDocumento'));
        if (!\App\Libraries\Acceso::esOficina() && !preg_match('/^[A-Za-z0-9]{8,15}$/', $numeroConsulta)) {
            return $this->failForbidden('Solo se permite consultar por número de documento.');
        }
        \App\Libraries\Acceso::limitarListadoCompleto($this->request, ['numeroDocumento']);

        $db = \Config\Database::connect();

        $user = \App\Services\AuthSession::resolveActiveUser($this->request->getCookie('session_user'));
        $rol = strtoupper($user['rol'] ?? '');

        $builder = $this->personaSelectQuery($db);

        $numero = trim((string) $this->request->getGet('numeroDocumento'));
        if ($numero !== '') {
            $builder->where('p.numero', $numero);
        }

        if ($rol !== 'SUPERADMIN') {
            $builder->where('p.numero !=', '00000001');
        }

        // Búsqueda por texto aplicada en SQL (antes se traía TODO y se filtraba
        // en el navegador; con 30,000+ personas eso era el cuello de botella).
        $buscar = trim((string) $this->request->getGet('buscar'));
        if ($buscar !== '') {
            $builder->groupStart()
                ->like('p.numero', $buscar)
                ->orLike('c.nombres', $buscar)
                ->orLike('c.apellido_paterno', $buscar)
                ->orLike('c.apellido_materno', $buscar)
                ->orWhere(\App\Libraries\Busqueda::nombreCompleto($buscar, 'c.nombres', 'c.apellido_paterno', 'c.apellido_materno'), null, false)
                ->orLike('c.apellido_materno', $buscar)
                ->orLike('c.numero_licencia', $buscar)
                ->groupEnd();
        }

        $estadoFiltro = strtoupper((string) $this->request->getGet('estado'));
        if (in_array($estadoFiltro, ['ACTIVO', 'INACTIVO'], true)) {
            $builder->where('p.estado', $estadoFiltro);
        }

        // Paginación real: si el cliente pide una página, solo se trae esa
        // porción y NO se calcula el historial (eso queda para show($id)).
        // Un tamaño explícito también pagina. El modo sin ambos parámetros
        // se conserva para clientes antiguos; las exportaciones web usan páginas.
        $page = (int) $this->request->getGet('page');
        // Un tamaño explícito siempre implica paginación, también en autocompletados antiguos.
        if ($this->request->getGet('porPagina') !== null) {
            $page = max(1, $page);
        }
        $porPagina = max(1, min(200, (int) ($this->request->getGet('porPagina') ?: 20)));

        $columnasOrdenables = [
            'numeroDocumento' => 'p.numero',
            'nombres' => 'c.nombres',
            'apellidoPaterno' => 'c.apellido_paterno',
            'estado' => 'p.estado',
        ];

        if ($page > 0) {
            $total = (clone $builder)->countAllResults(false);
            $rows = \App\Libraries\QuerySort::aplicar($builder, $this->request, $columnasOrdenables, 'p.id')
                ->limit($porPagina, ($page - 1) * $porPagina)
                ->get()->getResultArray();

            $data = array_map(function ($r) {
                $r['historialPapeletas'] = [];
                $r['historialCursos'] = [];
                return $this->aplicarFotoPublica($r);
            }, $rows);

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

        $rows = $builder->orderBy('p.id', 'DESC')->get()->getResultArray();

        $soloRegistrados = (bool)($this->request->getGet('soloRegistrados') || $this->request->getGet('sinPide'));
        if (!$soloRegistrados && empty($rows) && $numero && strlen(trim($numero)) === 8 && ctype_digit(trim($numero))) {
            $pideData = \App\Services\PideService::reniec(trim($numero));
            if ($pideData && !isset($pideData['error'])) {
                $rows[] = [
                    'id' => 0,
                    'idTipoDocumento' => 1,
                    'tipoDocumento' => 'DNI',
                    'tipoDocumentoNombre' => 'DOCUMENTO NACIONAL DE IDENTIDAD',
                    'numeroDocumento' => trim($numero),
                    'nombres' => $pideData['nombres'] ?? '',
                    'apellidoPaterno' => $pideData['apellidoPaterno'] ?? '',
                    'apellidoMaterno' => $pideData['apellidoMaterno'] ?? '',
                    'sexo' => '',
                    'fechaNacimiento' => null,
                    'estadoCivil' => $pideData['estadoCivil'] ?? '',
                    'profesion' => '',
                    'ubigeo' => '',
                    'fechaCreated' => date('Y-m-d H:i:s'),
                    'fechaUpdated' => date('Y-m-d H:i:s'),
                    'direccion' => $pideData['direccion'] ?? '',
                    'telefono' => '',
                    'celular' => '',
                    'email' => '',
                    'numeroLicencia' => '',
                    'fotoUrl' => $pideData['foto_url'] ?? '',
                    'fotoImg' => $pideData['foto_url'] ?? '',
                    'estado' => 'ACTIVO',
                ];
            }
        } elseif (!empty($rows) && $numero && strlen(trim($numero)) === 8 && ctype_digit(trim($numero))) {
            // Si la persona ya está en BD pero su foto está vacía (o es una URL expirada de PIDE),
            // se consulta la API de RENIEC en vivo para responderla al cliente.
            $fotoActual = trim((string)($rows[0]['fotoUrl'] ?? ''));
            if ($fotoActual === '' || str_starts_with($fotoActual, 'https://pide.munijlo.gob.pe')) {
                $pideData = \App\Services\PideService::reniec(trim($numero));
                $fotoPide = trim((string)($pideData['foto_url'] ?? $pideData['foto'] ?? ''));
                if ($fotoPide !== '') {
                    $rows[0]['fotoUrl'] = $fotoPide;
                    $rows[0]['fotoImg'] = $fotoPide;
                }
            }
        }

        // El historial de papeletas/cursos ya NO se calcula aquí: con un padrón
        // grande, hacerlo para todas las filas a la vez (WHERE IN con miles de
        // IDs) era el principal cuello de botella. Ahora se pide bajo demanda
        // en show($id), que solo lo calcula para una persona a la vez.
        $historialPapeletas = [];
        $historialCursos = [];

        $data = array_map(function($r) use ($historialPapeletas, $historialCursos) {
            $r['historialPapeletas'] = $historialPapeletas[$r['id']] ?? [];
            $r['historialCursos'] = $historialCursos[$r['id']] ?? [];
            return $this->aplicarFotoPublica($r);
        }, $rows);

        // ?ligero=1: solo lo que usan los autocompletados de los formularios (el padrón completo pesaba decenas de MB).
        if ($this->request->getGet('ligero')) {
            $campos = array_flip(['id', 'uuid', 'tipoDocumento', 'numeroDocumento', 'nombres', 'apellidoPaterno', 'apellidoMaterno', 'numeroLicencia', 'direccion', 'celular', 'estado']);
            $data = array_map(static fn (array $r) => array_intersect_key($r, $campos), $data);
        }

        return $this->respond(['data' => $data]);
    }

    /**
     * Detalle de una persona con su historial de papeletas y cursos (antes
     * este historial se calculaba para el padrón completo en index(), lo
     * cual era muy costoso con miles de personas; ahora se pide aquí, de a
     * una, solo cuando el usuario abre la ficha de detalle).
     */
    public function show($id = null)
    {
        if (!\App\Libraries\Acceso::esOficina()) {
            return $this->failForbidden('Acceso restringido al personal de oficina.');
        }
        $db = \Config\Database::connect();
        $id = (int) $id;
        if ($id <= 0) {
            return $this->failNotFound('Persona no encontrada.');
        }

        $row = $this->personaSelectQuery($db)->where('p.id', $id)->get()->getRowArray();
        if (!$row) {
            return $this->failNotFound('Persona no encontrada.');
        }

        $doc = trim((string)($row['numeroDocumento'] ?? ''));
        if (strlen($doc) === 8 && ctype_digit($doc)) {
            $fotoActual = trim((string)($row['fotoUrl'] ?? ''));
            if ($fotoActual === '' || str_starts_with($fotoActual, 'https://pide.munijlo.gob.pe')) {
                $pideData = \App\Services\PideService::reniec($doc);
                if (!empty($pideData['foto_url'])) {
                    $row['fotoUrl'] = $pideData['foto_url'];
                    $row['fotoImg'] = $pideData['foto_url'];
                }
            }
        }

        $papeletas = $db->table('papeletas pap')
            ->select("
                pap.numero_papeleta,
                pap.fecha_hora,
                pap.lugar,
                pap.estado,
                v.placa
            ", false)
            ->join('vehiculo_propietarios vp', 'vp.id_vehiculo = pap.id_vehiculo', 'inner')
            ->join('vehiculos v', 'v.id = pap.id_vehiculo', 'left')
            ->where('vp.id_persona', $id)
            ->orderBy('pap.fecha_hora', 'DESC')
            ->get()->getResultArray();

        $cursos = $db->table('inscripciones_curso ic')
            ->select("
                ic.fecha_inscripcion,
                ic.estado,
                ic.asistio,
                c.nombre as curso_nombre,
                c.codigo,
                c.fecha_inicio
            ", false)
            ->join('cursos_seguridad_vial c', 'c.id = ic.id_curso', 'inner')
            ->where('ic.id_persona', $id)
            ->orderBy('c.fecha_inicio', 'DESC')
            ->get()->getResultArray();

        $row['historialPapeletas'] = $papeletas;
        $row['historialCursos'] = $cursos;

        return $this->respond(['data' => $this->aplicarFotoPublica($row)]);
    }

    private function camposDuplicados($db, array $input, $id = null): array
    {
        $errores = [];
        $documento = trim((string)($input['numeroDocumento'] ?? ''));
        if ($documento !== '') {
            $consulta = $db->table('personas p')
                ->select("p.id, p.numero, TRIM(CONCAT(COALESCE(c.nombres, ''), ' ', COALESCE(c.apellido_paterno, ''), ' ', COALESCE(c.apellido_materno, ''))) as nombre_completo", false)
                ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                ->where('p.numero', $documento);
            if ($id !== null) {
                $consulta->where('p.id !=', $id);
            }
            $existente = $consulta->get()->getRowArray();
            if ($existente) {
                $nombre = trim($existente['nombre_completo'] ?? '');
                $detalle = $nombre !== '' ? " a nombre de {$nombre}" : '';
                $errores['numeroDocumento'] = "El documento {$documento} ya se encuentra registrado en el sistema{$detalle}.";
            }
        }
        $licencia = strtoupper(trim((string)($input['numeroLicencia'] ?? '')));
        if ($licencia !== '') {
            $consulta = $db->table('ciudadanos c')
                ->select("c.id_persona, c.numero_licencia, TRIM(CONCAT(COALESCE(c.nombres, ''), ' ', COALESCE(c.apellido_paterno, ''), ' ', COALESCE(c.apellido_materno, ''))) as nombre_completo", false)
                ->where('c.numero_licencia', $licencia);
            if ($id !== null) {
                $consulta->where('c.id_persona !=', $id);
            }
            $existente = $consulta->get()->getRowArray();
            if ($existente) {
                $nombre = trim($existente['nombre_completo'] ?? '');
                $detalle = $nombre !== '' ? " a nombre de {$nombre}" : '';
                $errores['numeroLicencia'] = "La licencia {$licencia} ya se encuentra registrada en el sistema{$detalle}.";
            }
        }
        return $errores;
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
            return $this->failValidationErrors(['numeroDocumento' => 'El DNI debe tener exactamente 8 dígitos numéricos.']);
        }
        if (!$isDni && ($docLen < 8 || $docLen > 15)) {
            return $this->failValidationErrors(['numeroDocumento' => 'El número de documento debe tener entre 8 y 15 caracteres.']);
        }

        try {
            \App\Services\CandadoPersona::adquirir($db);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        }
        try {
            $duplicados = $this->camposDuplicados($db, $input);
            if ($duplicados) return $this->failValidationErrors($duplicados);
            if ($errorPersonal = $this->errorSexoNacimiento($input)) return $this->failValidationErrors($errorPersonal);

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
            $pData['uuid'] = \App\Libraries\Identificador::nuevo();
            $db->table('personas')->insert($pData);
            $insertId = $db->insertID();

            $cData = [
                'id_persona'       => $insertId,
                'nombres'          => mb_strtoupper(trim($input['nombres']), 'UTF-8'),
                'apellido_paterno' => mb_strtoupper(trim($input['apellidoPaterno']), 'UTF-8'),
                'apellido_materno' => mb_strtoupper(trim($input['apellidoMaterno'] ?? ''), 'UTF-8'),
                'numero_licencia'  => strtoupper(trim($input['numeroLicencia'] ?? '')) ?: null,
                'estado_civil'     => trim($input['estadoCivil'] ?? '') ?: null,
                'sexo'             => $this->normalizarSexo($input['sexo'] ?? null),
                'fecha_nacimiento' => $this->normalizarFechaNacimiento($input['fechaNacimiento'] ?? null),
                'foto'             => $this->resolverFotoParaGuardar($input['fotoImg'] ?? $input['fotoUrl'] ?? null),
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
            $newPersona = $this->aplicarFotoPublica($newPersona);

            return $this->respondCreated(['status' => true, 'message' => 'Persona registrada con éxito', 'data' => $newPersona]);
        } catch (\Throwable $e) {
            $db->transRollback();
            if (stripos($e->getMessage(), 'Duplicate entry') !== false) {
                return $this->failValidationErrors($this->camposDuplicados($db, $input) ?: 'Datos duplicados.');
            }
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('No se pudo guardar la persona.');
        } finally {
            \App\Services\CandadoPersona::liberar($db);
        }
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

        if (array_key_exists('numeroDocumento', $input) || isset($input['tipoDocumento'])) {
            $numeroDoc = trim($input['numeroDocumento'] ?? $currentPersona['numero']);
            $currentTipoDoc = $tipoDocName ?? ($db->table('tipo_documentos_identidad')->where('id', $currentPersona['id_tipo_documento'])->get()->getRowArray()['nombre'] ?? 'DNI');
            $docLen = strlen($numeroDoc);
            $esDni = in_array(strtoupper($currentTipoDoc), ['DNI', 'DOCUMENTO NACIONAL DE IDENTIDAD', '1'], true);

            if ($esDni && ($docLen !== 8 || !ctype_digit($numeroDoc))) {
                return $this->failValidationErrors(['numeroDocumento' => 'El DNI debe tener exactamente 8 dígitos numéricos.']);
            }
            if (!$esDni && ($docLen < 8 || $docLen > 15)) {
                return $this->failValidationErrors(['numeroDocumento' => 'El número de documento debe tener entre 8 y 15 caracteres.']);
            }

        }

        try {
            \App\Services\CandadoPersona::adquirir($db);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        }
        try {
            $duplicados = $this->camposDuplicados($db, $input, $id);
            if ($duplicados) return $this->failValidationErrors($duplicados);

            if (!$this->validateData($input, $this->personaValidationRules(false))) {
                return $this->failValidationErrors($this->validator->getErrors());
            }
            if ($errorPersonal = $this->errorSexoNacimiento($input)) return $this->failValidationErrors($errorPersonal);

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
            if (isset($input['nombres'])) $cData['nombres'] = mb_strtoupper(trim($input['nombres']), 'UTF-8');
            if (isset($input['apellidoPaterno'])) $cData['apellido_paterno'] = mb_strtoupper(trim($input['apellidoPaterno']), 'UTF-8');
            if (isset($input['apellidoMaterno'])) $cData['apellido_materno'] = mb_strtoupper(trim($input['apellidoMaterno']), 'UTF-8');
            if (array_key_exists('numeroLicencia', $input)) $cData['numero_licencia'] = strtoupper(trim($input['numeroLicencia'] ?? '')) ?: null;
            if (array_key_exists('estadoCivil', $input)) $cData['estado_civil'] = trim($input['estadoCivil'] ?? '') ?: null;
            if (array_key_exists('sexo', $input)) $cData['sexo'] = $this->normalizarSexo($input['sexo']);
            if (array_key_exists('fechaNacimiento', $input)) $cData['fecha_nacimiento'] = $this->normalizarFechaNacimiento($input['fechaNacimiento']);
            if (array_key_exists('fotoUrl', $input) || array_key_exists('fotoImg', $input)) $cData['foto'] = $this->resolverFotoParaGuardar($input['fotoImg'] ?? $input['fotoUrl'] ?? null);

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
                'data'    => $persona ? $this->aplicarFotoPublica($persona) : $persona,
            ]);
        } catch (\Throwable $e) {
            $db->transRollback();
            if (stripos($e->getMessage(), 'Duplicate entry') !== false) {
                return $this->failValidationErrors($this->camposDuplicados($db, $input, $id) ?: 'Datos duplicados.');
            }
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('No se pudo actualizar la persona.');
        } finally {
            \App\Services\CandadoPersona::liberar($db);
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        if (!$id) return $this->failNotFound('ID de persona no especificado.');
        if (!$db->table('personas')->where('id', $id)->countAllResults()) return $this->failNotFound('Persona no encontrada.');

        try {
            // Ambas fichas se crean con la persona; no son trámites ni historial independiente.
            \App\Services\EliminacionSegura::eliminar($db, 'personas', (int)$id, [
                'ciudadanos' => 'id_persona', 'administrados' => 'id_persona',
            ]);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('No se pudo eliminar la persona. No se ha borrado ningún dato.');
        }

        \App\Services\AuditoriaService::registrar('PERSONAS', 'ELIMINAR', 'Persona eliminada (id ' . (int)$id . ')', ['id' => (int)$id]);
        return $this->respondDeleted(['status' => true, 'message' => 'Persona eliminada del registro']);
    }
}
