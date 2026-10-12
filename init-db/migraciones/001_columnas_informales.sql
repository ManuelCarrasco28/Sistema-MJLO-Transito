-- Columnas de conductores/propietarios informales (antes se creaban en caliente desde los controladores).
-- Seguro de ejecutar varias veces (MariaDB 10.0+). Necesario solo en bases creadas antes de este cambio.
ALTER TABLE papeletas
  ADD COLUMN IF NOT EXISTS placa VARCHAR(20) NULL AFTER id_vehiculo,
  ADD COLUMN IF NOT EXISTS `dueño_informal_nombres` VARCHAR(255) NULL AFTER placa,
  ADD COLUMN IF NOT EXISTS `dueño_informal_dni` VARCHAR(20) NULL AFTER `dueño_informal_nombres`,
  ADD COLUMN IF NOT EXISTS conductor_informal_nombres VARCHAR(255) NULL AFTER `dueño_informal_dni`,
  ADD COLUMN IF NOT EXISTS conductor_informal_dni VARCHAR(20) NULL AFTER conductor_informal_nombres;

ALTER TABLE reportes_intervencion
  ADD COLUMN IF NOT EXISTS id_operativo INT NULL AFTER id_papeleta,
  ADD COLUMN IF NOT EXISTS id_conductor INT NULL AFTER id_vehiculo,
  ADD COLUMN IF NOT EXISTS dueno_informal_nombres VARCHAR(255) NULL AFTER placa,
  ADD COLUMN IF NOT EXISTS dueno_informal_dni VARCHAR(20) NULL AFTER dueno_informal_nombres,
  ADD COLUMN IF NOT EXISTS conductor_informal_nombres VARCHAR(255) NULL AFTER dueno_informal_dni,
  ADD COLUMN IF NOT EXISTS conductor_informal_dni VARCHAR(20) NULL AFTER conductor_informal_nombres;
