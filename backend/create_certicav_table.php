<?php
if (PHP_SAPI !== 'cli') { exit(1); }

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli('127.0.0.1', 'root', '', 'transitomunicipal');
$db->set_charset('utf8mb4');

$backup = __DIR__ . '/writable/backups/transitomunicipal_20260907_before_certicav_table.sql';
if (!is_file($backup) || filesize($backup) < 1000) {
    throw new RuntimeException('Backup required before creating certicav table');
}

$db->query("CREATE TABLE IF NOT EXISTS certicav (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    documento_vehiculo_id BIGINT NULL,
    vehiculo_id INT NOT NULL,
    conductor_id INT NULL,
    tecnico_id INT NULL,
    numero_registro VARCHAR(50) NULL,
    numero_serie_certicav VARCHAR(50) NULL,
    fecha DATE NOT NULL,
    primera_evaluacion VARCHAR(20) NULL,
    segunda_evaluacion VARCHAR(20) NULL,
    resultado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    observaciones VARCHAR(1000) NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_certicav_numero_serie (numero_serie_certicav),
    KEY idx_certicav_vehiculo (vehiculo_id),
    KEY idx_certicav_documento (documento_vehiculo_id),
    KEY idx_certicav_conductor (conductor_id),
    KEY idx_certicav_tecnico (tecnico_id),
    CONSTRAINT fk_certicav_documento FOREIGN KEY (documento_vehiculo_id) REFERENCES documentos_vehiculo(id),
    CONSTRAINT fk_certicav_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id),
    CONSTRAINT fk_certicav_conductor FOREIGN KEY (conductor_id) REFERENCES personas(id),
    CONSTRAINT fk_certicav_tecnico FOREIGN KEY (tecnico_id) REFERENCES personal(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$db->query("CREATE TABLE IF NOT EXISTS certicav_detalles (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    certicav_id BIGINT NOT NULL,
    criterio_id INT NOT NULL,
    estado_revision VARCHAR(15) NOT NULL,
    observacion VARCHAR(500) NULL,
    UNIQUE KEY uq_certicav_criterio (certicav_id, criterio_id),
    KEY idx_certicav_detalle_criterio (criterio_id),
    CONSTRAINT fk_certicav_detalle_certicav FOREIGN KEY (certicav_id) REFERENCES certicav(id),
    CONSTRAINT fk_certicav_detalle_criterio FOREIGN KEY (criterio_id) REFERENCES inspeccion_criterios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

echo 'Certicav tables ready.' . PHP_EOL;
