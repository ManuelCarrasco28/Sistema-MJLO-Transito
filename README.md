# Sistema MJLO Tránsito

Sistema de Gestión de Tránsito Municipal de la Municipalidad Distrital de José Leonardo Ortiz.

## Estructura del Proyecto

```text
Sistema-MJLO-Transito/
├── backend/
│   ├── app/
│   │   ├── Config/
│   │   └── Controllers/
│   │       ├── Api/
│   │       │   └── StatusController.php
│   │       ├── BaseController.php
│   │       └── Home.php
│   ├── public/
│   ├── spark
│   └── composer.json
├── frontend/
│   ├── public/
│   │   ├── css/
│   │   │   └── index.css
│   │   ├── img/
│   │   │   └── logo-mjlo.png
│   │   └── js/
│   │       ├── dashboardData.js
│   │       └── navigation.js
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Ejecución del Frontend

```bash
cd frontend
npm install
npm run dev
```

Disponible en `http://localhost:5173`.
Credenciales de acceso:
Usuario: diegobarturen
Contra: diego123

Usuario: manuelcarrasco
Contra: manuel123

Usuario: milenkasegundo
Contra: milenka123

Usuario: angelosaavedra
Contra: angelo123

## Ejecución del Backend

```bash
cd backend
php spark serve --port 8080
```

Disponible en `http://localhost:8080/api/status`.

## Contexto de Base de Datos

Base de datos: `transitomunicipal`

Motor: MySQL / MariaDB

Proyecto: Sistema de Gestion de Transito Municipal de la Municipalidad Distrital de Jose Leonardo Ortiz, Area de Transito, Transporte y Seguridad Vial.

### Regla de documentos del vehiculo

Los documentos asociados al vehiculo se guardan en la tabla `documentos_vehiculo`.

Aqui van:

- SOAT
- Tarjeta de propiedad
- Tarjeta de operatividad
- CERTICAV

La tarjeta de operatividad ya no usa una tabla aparte. Se registra asi:

```text
documentos_vehiculo
- id
- id_vehiculo
- tipo_documento
- codigo
- fecha_expedicion
- fecha_expiracion
- estado
```

Ejemplo:

```text
id_vehiculo: 5
tipo_documento: TARJETA_OPERATIVIDAD
codigo: 034-2023
fecha_expedicion: 2023-01-01
fecha_expiracion: 2024-01-01
estado: VIGENTE
```

Estados para tarjeta de operatividad:

- VIGENTE
- VENCIDO
- ANULADO
- EN_TRAMITE

No debe existir una tabla separada llamada `tarjetas_operatividad`.

### Tablas finales

#### personal

- id
- tipo_documento
- numero_documento
- nombres
- apellidos
- cargo
- estado

#### usuarios

- id
- id_personal
- nombre_usuario
- password_hash
- estado

#### personas

- id
- tipo_documento
- numero_documento
- nombres
- apellido_paterno
- apellido_materno
- direccion
- telefono
- celular
- email
- numero_licencia_conducir
- foto_url
- estado

#### organizaciones

- id
- tipo
- razon_social
- ruc
- partida_registral
- representante_legal
- direccion
- telefono_contacto
- email_contacto
- estado

#### tipos_vehiculo

- id
- nombre
- descripcion
- estado

#### vehiculos

- id
- id_tipo_vehiculo
- placa
- marca
- modelo
- color
- anio_fabricacion
- numero_serie
- serie_motor
- partida_registral
- codigo_qr
- id_asociacion

#### vehiculo_propietarios

- id
- id_vehiculo
- id_persona
- fecha_inicio
- fecha_fin
- documento_sustento
- estado

#### documentos_vehiculo

- id
- id_vehiculo
- tipo_documento
- codigo
- fecha_expedicion
- fecha_expiracion
- estado

Valores de `documentos_vehiculo.tipo_documento`:

- SOAT
- TARJETA_PROPIEDAD
- TARJETA_OPERATIVIDAD
- CERTICAV

#### inspeccion_criterios

- id
- codigo
- nombre
- descripcion
- obligatorio
- orden
- estado

#### inspecciones_tecnicas

- id
- numero_inspeccion
- id_vehiculo
- id_tecnico
- fecha_inspeccion
- resultado
- primera_evaluacion
- segunda_evaluacion
- observaciones
- estado

#### inspeccion_detalles

- id
- id_inspeccion
- id_criterio
- estado_revision
- observacion

Valores de `inspeccion_detalles.estado_revision`:

- BIEN
- MAL_ESTADO
- NO_TIENE

#### cursos_seguridad_vial

- id
- codigo
- nombre
- descripcion
- resolucion
- fecha_inicio
- fecha_fin
- lugar
- costo_inscripcion
- cupos
- estado

#### inscripciones_curso

- id
- id_curso
- id_persona
- id_vehiculo
- numero_ri
- fecha_inscripcion
- estado_pago
- asistio
- estado

#### tramites_documentarios

- id
- numero_formulario
- tipo_tramite
- id_persona
- id_asociacion
- id_vehiculo
- funcionario_dirigido
- cargo_funcionario
- detalle_solicitud
- fecha_solicitud
- estado

#### tipos_infraccion

- id
- codigo
- descripcion
- gravedad
- monto_base
- estado

#### papeletas

- id
- numero_papeleta
- id_vehiculo
- id_persona_infractor
- id_inspector
- fecha_hora
- lugar
- servicio
- unidad_autoridad
- nombre_autoridad
- observacion_autoridad
- observaciones_conductor
- monto_total
- estado

#### papeleta_detalles

- id
- id_papeleta
- id_tipo_infraccion
- monto
- descuento
- monto_final

#### pagos

- id
- tipo_pago
- id_papeleta
- id_tramite
- numero_recibo
- numero_voucher
- fecha_pago
- hora_pago
- cajero
- caja
- codigo_contribuyente
- concepto
- subtotal
- reajuste
- intereses
- descuento_aplicado
- redondeo
- total
- estado

Valores de `pagos.tipo_pago`:

- PAPELETA
- TRAMITE

#### retenciones_vehiculo

- id
- id_papeleta
- fecha_ingreso
- deposito
- motivo
- numero_boleta
- total_dias
- estado
- fecha_salida
- observaciones

#### ordenes_libertad

- id
- numero_orden
- id_retencion
- id_pago
- id_persona_autorizada
- fecha_emision
- monto_total
- observaciones

#### permisos_circulacion

- id
- id_tramite
- numero_autorizacion
- tipo_permiso
- asunto
- referencia_sisgedo
- expediente
- registro_numero
- contenido
- zona_circulacion
- horario_inicio
- horario_fin
- fecha_emision
- fecha_inicio_vigencia
- fecha_fin_vigencia
- estado

Valores de `permisos_circulacion.tipo_permiso`:

- CARGA_DESCARGA
- CIRCULACION
- ESTACIONAMIENTO

### Tablas descartadas

Estas tablas no forman parte del modelo final:

- soats
- tarjetas_operatividad
- certicaps
- roles
- modulos
- rol_modulos
- qr_codes
- lote_qr_detalles
- lote_impresion
- conductores
- vehiculo_conductores
- organizacion_personas
- pagos_papeleta
- pagos_tramite
- auditoria
- operativos
- vistas

### Resumen logico

- SOAT, tarjeta de propiedad, tarjeta de operatividad y CERTICAV se manejan en `documentos_vehiculo`.
- El curso vial pertenece a personas mediante `inscripciones_curso`.
- CERTICAV no tiene tabla propia porque se maneja como documento del vehiculo.
- Los pagos se manejan en una sola tabla: `pagos`.
- Las papeletas se dividen en `papeletas` y `papeleta_detalles` porque una papeleta puede tener varias infracciones.
- El QR va como atributo `codigo_qr` dentro de `vehiculos`.
