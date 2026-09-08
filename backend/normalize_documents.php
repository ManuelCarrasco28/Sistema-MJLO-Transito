<?php
// CLI-only, additive repair for the inspected local XAMPP database.
if (PHP_SAPI !== 'cli') { exit(1); }
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli('127.0.0.1', 'root', '', 'transitomunicipal');
$db->set_charset('utf8mb4');
function rows(string $sql): array { global $db; return $db->query($sql)->fetch_all(MYSQLI_ASSOC); }
function addColumns(string $table, array $columns): void {
    global $db;
    $existing = array_column(rows("SHOW COLUMNS FROM `$table`"), 'Field');
    foreach ($columns as $name => $type) {
        if (!in_array($name, $existing, true)) { $db->query("ALTER TABLE `$table` ADD COLUMN `$name` $type"); }
    }
}
function tableExists(string $table): bool {
    return (bool) rows("SHOW TABLES LIKE '$table'");
}
function dropColumnsIfEmpty(string $table, array $columns): void {
    global $db;
    $existing = array_column(rows("SHOW COLUMNS FROM `$table`"), 'Field');
    $present = array_values(array_filter($columns, fn($column) => in_array($column, $existing, true)));
    if (!$present) { return; }
    $conditions = implode(' OR ', array_map(fn($column) => "`$column` IS NOT NULL", $present));
    $used = rows("SELECT COUNT(*) AS total FROM `$table` WHERE $conditions")[0]['total'];
    if ((int) $used !== 0) { throw new RuntimeException("$table has legacy course certificate values; manual mapping required before dropping columns"); }
    $drops = implode(', ', array_map(fn($column) => "DROP COLUMN `$column`", $present));
    $db->query("ALTER TABLE `$table` $drops");
}
$backup = __DIR__ . '/writable/backups/transitomunicipal_20260907_before_normalization.sql';
if (!is_file($backup) || filesize($backup) < 1000) { throw new RuntimeException('Backup required'); }
$before = [];
foreach (rows('SHOW TABLES') as $entry) {
    $table = array_values($entry)[0];
    $columns = array_column(rows("SHOW COLUMNS FROM `$table`"), 'Field');
    $before[$table] = ['columns' => $columns, 'rows' => rows("SELECT * FROM `$table` ORDER BY id")];
}
// Duplicate form-shaped structures are not part of the operational model.
$archives = [];
foreach (['internamiento', 'orden_libertad'] as $table) {
    if (isset($before[$table]) && count($before[$table]['rows']) !== 0) {
        throw new RuntimeException("$table has records; manual mapping required before repair");
    }
    if (isset($before[$table])) { $db->query("DROP TABLE `$table`"); }
}
addColumns('cursos_seguridad_vial', [
    'codigo' => 'VARCHAR(50) NULL', 'nombre' => 'VARCHAR(150) NULL',
    'descripcion' => 'TEXT NULL', 'resolucion' => 'VARCHAR(150) NULL',
    'fecha_inicio' => 'DATE NULL', 'fecha_fin' => 'DATE NULL', 'lugar' => 'VARCHAR(250) NULL',
    'costo_inscripcion' => 'DECIMAL(12,2) NULL', 'cupos' => 'INT NULL', 'estado' => 'VARCHAR(20) NULL',
]);
dropColumnsIfEmpty('cursos_seguridad_vial', [
    'n_certificado', 'apellidos', 'nombres', 'dni', 'licencia', 'curso_nombre',
    'fecha_expedicion', 'fecha_vencimiento', 'autoridad_firma', 'cargo_autoridad',
]);
// Certificate belongs to a participant, not the shared course.
$db->query("CREATE TABLE IF NOT EXISTS certificados_curso (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    inscripcion_id BIGINT NOT NULL, numero_certificado VARCHAR(50) NOT NULL,
    fecha_expedicion DATE NULL, fecha_vencimiento DATE NULL,
    autoridad_id INT NULL, cargo_autoridad VARCHAR(150) NULL,
    UNIQUE KEY uq_certificado_numero (numero_certificado),
    FOREIGN KEY (inscripcion_id) REFERENCES inscripciones_curso(id),
    FOREIGN KEY (autoridad_id) REFERENCES personal(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
addColumns('inspeccion_criterios', ['seccion' => 'VARCHAR(60) NULL']);
addColumns('internamientos', [
    'remisor_id' => 'INT NULL REFERENCES personal(id)',
    'interesado_id' => 'INT NULL REFERENCES personas(id)',
    'grado_remisor' => 'VARCHAR(100) NULL', 'carnet_remisor' => 'VARCHAR(50) NULL',
    'autoridad_que_dispone' => 'VARCHAR(150) NULL', 'documento_referencia' => 'VARCHAR(100) NULL',
    'estado_carroceria' => 'TEXT NULL',
]);
$db->query("CREATE TABLE IF NOT EXISTS inventario_criterios (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, codigo VARCHAR(60) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL, seccion VARCHAR(50) NOT NULL, orden INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
// MariaDB 10.4 ignores inline REFERENCES; enforce explicit constraints.
foreach ([
    ['internamientos', 'remisor_id', 'personal'],
    ['internamientos', 'interesado_id', 'personas'],
] as [$table, $column, $parent]) {
    $keys = rows("SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='$table' AND COLUMN_NAME='$column' AND REFERENCED_TABLE_NAME IS NOT NULL");
    if (!$keys) { $db->query("ALTER TABLE `$table` ADD FOREIGN KEY (`$column`) REFERENCES `$parent`(id)"); }
}
$db->query("CREATE TABLE IF NOT EXISTS internamiento_inventario (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, internamiento_id BIGINT NOT NULL,
    criterio_id INT NOT NULL, cantidad INT NULL, estado VARCHAR(30) NULL,
    observacion VARCHAR(500) NULL,
    UNIQUE KEY uq_internamiento_item (internamiento_id, criterio_id),
    FOREIGN KEY (internamiento_id) REFERENCES internamientos(id),
    FOREIGN KEY (criterio_id) REFERENCES inventario_criterios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
// Distinct payment concepts, each with its own receipt; existing pago_id stays intact.
$db->query("CREATE TABLE IF NOT EXISTS orden_libertad_conceptos (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, orden_id BIGINT NOT NULL,
    concepto VARCHAR(30) NOT NULL, pago_id BIGINT NULL,
    numero_recibo_externo VARCHAR(50) NULL, monto DECIMAL(12,2) NULL,
    FOREIGN KEY (orden_id) REFERENCES ordenes_libertad(id),
    FOREIGN KEY (pago_id) REFERENCES pagos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
// Catalogs come from the supplied forms; no fabricated inspection results.
$inventoryFields = [
    'faro_grande_de', 'faro_chico_de', 'faros_posteriores', 'biceras', 'limpia_parabrisas',
    'luna', 'llantas', 'vasos', 'espejo_extr', 'chapas', 'antenas', 'parachoques',
    'llanta_de_rep', 'tablero', 'chapa_contacto', 'radio', 'encendedor', 'pisos',
    'manijas', 'ceniceros', 'parasolares', 'espejo_int', 'coderas', 'gata',
    'llave_de_ruedas', 'adornos', 'bateria', 'radiador', 'arrancador', 'alternador',
    'carburador', 'purificador', 'distribuidor', 'bobina', 'tapa_aceite', 'bujias', 'veh_gr_ab',
];
$stmt = $db->prepare('INSERT INTO inventario_criterios (codigo,nombre,seccion,orden) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM inventario_criterios WHERE codigo=?)');
foreach ($inventoryFields as $i => $field) {
    $name = ucfirst(str_replace('_', ' ', $field));
    $section = $i < 13 ? 'EXTERIOR' : ($i < 27 ? 'INTERIOR' : 'MOTOR');
    $stmt->bind_param('sssis', $field, $name, $section, $i, $field); $stmt->execute();
}
$inspectionFields = [
    'encendido_maquina', 'velocimetro', 'sonido_de_claxon', 'luces_direccionales_del_der',
    'luces_direccionales_del_izq', 'luces_direccionales_pos_der', 'luces_direccionales_pos_izq',
    'luces_faro_delantero_alta', 'luces_faro_delantero_baja', 'luces_freno_del_der',
    'luces_freno_del_izq', 'luces_freno_pos_der', 'luces_freno_pos_izq',
    'luces_faro_delantero_aux_del_der', 'luces_faro_delantero_aux_del_izq',
    'luces_faro_delantero_aux_pos_der', 'luces_faro_delantero_aux_pos_izq',
    'tapiz_del_asiento', 'tubo_de_escape', 'acelerador', 'embrague', 'tapa_tanque_combustible',
    'sistema_de_frenos', 'freno_de_pedal', 'freno_de_mano_auxiliar', 'espejos_retrovisores',
    'parabrisas_transparente', 'visibilidad_del_parabrisas', 'micas_transparentes',
    'placa_original_vehiculo', 'cinta_reflectiva_izq', 'cinta_reflectiva_der',
    'cinta_reflectiva_pos', 'pintado', 'placa_lado_posterior', 'placa_lado_superior_techo',
    'placa_interior_respaldar', 'razon_social_transportador_lado_superior',
    'razon_social_lado_interior',
];
$stmt = $db->prepare('INSERT INTO inspeccion_criterios (codigo,nombre,orden,seccion) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM inspeccion_criterios WHERE codigo=?)');
foreach ($inspectionFields as $i => $field) {
    $code = sprintf('FORM-%03d', $i + 1); $name = ucfirst(str_replace('_', ' ', $field)); $order = 100 + $i;
    $section = $i < 17 ? 'SISTEMA ELECTRICO' : ($i === 17 ? 'ASPECTOS INTERIORES' : ($i < 25 ? 'ESPECIFICACIONES MECANICAS' : 'ASPECTOS EXTERIORES'));
    $stmt->bind_param('ssiss', $code, $name, $order, $section, $code); $stmt->execute();
}
// Every pre-existing field/value must survive unchanged, including legacy course columns.
foreach ($before as $table => $snapshot) {
    $target = $archives[$table] ?? $table;
    $columns = '`' . implode('`,`', $snapshot['columns']) . '`';
    $after = rows("SELECT $columns FROM `$target` ORDER BY id");
    $byId = array_column($after, null, 'id');
    foreach ($snapshot['rows'] as $row) {
        if (($byId[$row['id']] ?? null) !== $row) { throw new RuntimeException("Verification failed: $table id " . $row['id']); }
    }
    echo "$table: " . count($snapshot['rows']) . " original records preserved\n";
}
echo "Repair complete. All original values preserved.\n";
