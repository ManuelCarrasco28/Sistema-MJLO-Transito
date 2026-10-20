# Endpoints de la API — Sistema MJLO Tránsito

Base en producción: `https://transito.munijlo.gob.pe/api/v1`  
Base en local: `http://localhost:8080/api`

Todas las rutas exigen sesión, salvo `POST /login` y `GET /status`. `{id}` es el identificador del registro.
Total: 173 endpoints.


## status

- `GET /status`

## files

- `GET /files/{id}/{id}`

## inspecciones

- `GET /inspecciones`
- `POST /inspecciones`
- `GET /inspecciones/certicav-estado`
- `POST /inspecciones/certicav-solicitar`
- `GET /inspecciones/certicav-solicitudes`
- `GET /inspecciones/estadisticas`
- `GET /inspecciones/siguiente-correlativo`
- `GET /inspecciones/{id}`
- `PUT /inspecciones/{id}`
- `PATCH /inspecciones/{id}`
- `DELETE /inspecciones/{id}`
- `GET /inspecciones/{id}/pdf`

## mobile

- `GET /mobile/config`
- `GET /mobile/dashboard`
- `GET /mobile/inspeccion-criterios`
- `GET /mobile/inspecciones`
- `POST /mobile/inspecciones`
- `PUT /mobile/inspecciones/{id}`
- `GET /mobile/inspecciones/{id}/pdf`
- `PUT /mobile/papeletas/{id}`
- `PUT /mobile/reportes-intervencion/{id}`
- `GET /mobile/vehiculos-formales`
- `GET /mobile/vehiculos/buscar`

## internamientos

- `GET /internamientos`
- `POST /internamientos`
- `GET /internamientos/estadisticas`
- `GET /internamientos/tarifas`
- `PUT /internamientos/tarifas`
- `GET /internamientos/{id}`
- `PUT /internamientos/{id}`
- `PATCH /internamientos/{id}`
- `DELETE /internamientos/{id}`
- `POST /internamientos/{id}/liberar`

## inventario-criterios

- `GET /inventario-criterios`

## personal

- `GET /personal`
- `POST /personal`
- `GET /personal/catalogos`
- `GET /personal/estadisticas`
- `PUT /personal/{id}`
- `PATCH /personal/{id}`
- `DELETE /personal/{id}`

## asociaciones

- `GET /asociaciones`
- `POST /asociaciones`
- `GET /asociaciones/estadisticas`
- `GET /asociaciones/opciones`
- `GET /asociaciones/socios`
- `GET /asociaciones/{id}`
- `PUT /asociaciones/{id}`
- `PATCH /asociaciones/{id}`
- `DELETE /asociaciones/{id}`

## documentos

- `GET /documentos`
- `POST /documentos`
- `GET /documentos/estadisticas`
- `GET /documentos/vehiculo/{id}`
- `GET /documentos/{id}`
- `PUT /documentos/{id}`
- `PATCH /documentos/{id}`
- `DELETE /documentos/{id}`

## pagos

- `GET /pagos`
- `POST /pagos`
- `GET /pagos/arqueo-diario`
- `GET /pagos/deudas`
- `GET /pagos/estadisticas`
- `GET /pagos/origen`
- `GET /pagos/origenes`
- `DELETE /pagos/{id}`
- `POST /pagos/{id}/confirmar`

## permisos

- `GET /permisos`
- `POST /permisos`
- `GET /permisos/buscar-administrados`
- `GET /permisos/estadisticas`
- `GET /permisos/tramites-disponibles`
- `GET /permisos/{id}`
- `PUT /permisos/{id}`
- `PATCH /permisos/{id}`
- `DELETE /permisos/{id}`

## procedimientos-admin

- `GET /procedimientos-admin`

## catalogo-procedimientos

- `GET /catalogo-procedimientos`
- `POST /catalogo-procedimientos`
- `GET /catalogo-procedimientos/{id}`
- `PUT /catalogo-procedimientos/{id}`
- `DELETE /catalogo-procedimientos/{id}`

## cursos

- `GET /cursos`
- `POST /cursos`
- `GET /cursos/carnets`
- `GET /cursos/finalizados`
- `PUT /cursos/inscripciones/{id}/entrega`
- `PUT /cursos/inscripciones/{id}/retiro`
- `GET /cursos/personas-vigentes`
- `GET /cursos/vigencias`
- `GET /cursos/{id}`
- `PUT /cursos/{id}`
- `PATCH /cursos/{id}`
- `DELETE /cursos/{id}`
- `POST /cursos/{id}/participantes`
- `PUT /cursos/{id}/participantes/{id}`

## operativos

- `GET /operativos`
- `POST /operativos`
- `GET /operativos/activo/{id}`
- `GET /operativos/estadisticas`
- `GET /operativos/{id}`
- `PUT /operativos/{id}`
- `PATCH /operativos/{id}`
- `DELETE /operativos/{id}`
- `POST /operativos/{id}/cancelar`

## vehiculos

- `GET /vehiculos`
- `POST /vehiculos`
- `GET /vehiculos/estadisticas`
- `GET /vehiculos/persona/dni`
- `GET /vehiculos/qr`
- `GET /vehiculos/{id}`
- `PUT /vehiculos/{id}`
- `PATCH /vehiculos/{id}`
- `DELETE /vehiculos/{id}`

## dashboard

- `GET /dashboard`

## personas

- `GET /personas`
- `POST /personas`
- `GET /personas/estadisticas`
- `GET /personas/{id}`
- `PUT /personas/{id}`
- `PATCH /personas/{id}`
- `DELETE /personas/{id}`

## papeletas

- `GET /papeletas`
- `POST /papeletas`
- `GET /papeletas/estadisticas`
- `PUT /papeletas/{id}`
- `PATCH /papeletas/{id}`
- `DELETE /papeletas/{id}`
- `POST /papeletas/{id}/firma`
- `GET /papeletas/{id}/fotos`
- `POST /papeletas/{id}/pagar`

## inspeccion-criterios

- `GET /inspeccion-criterios`

## notificaciones

- `GET /notificaciones/resumen`

## ruc

- `GET /ruc/{id}`

## municipalidad

- `POST /municipalidad/anios`
- `DELETE /municipalidad/anios/{id}`
- `DELETE /municipalidad/anios/{id}/token`
- `GET /municipalidad/config`
- `GET /municipalidad/config-mobile`
- `PUT /municipalidad/{id}`

## pide

- `GET /pide/oficinas-registrales`
- `GET /pide/reniec/{id}`
- `POST /pide/sunarp`

## me

- `GET /me`

## tipo-documentos

- `GET /tipo-documentos`

## tipos-infraccion

- `GET /tipos-infraccion`

## reportes-intervencion

- `GET /reportes-intervencion`
- `POST /reportes-intervencion`
- `PUT /reportes-intervencion/{id}`
- `POST /reportes-intervencion/{id}/convertir`
- `GET /reportes-intervencion/{id}/fotos`
- `POST /reportes-intervencion/{id}/rechazar`

## catalogo-infracciones

- `GET /catalogo-infracciones`
- `POST /catalogo-infracciones`
- `PUT /catalogo-infracciones/{id}`
- `PATCH /catalogo-infracciones/{id}`
- `DELETE /catalogo-infracciones/{id}`

## auditoria

- `GET /auditoria`
- `GET /auditoria/estadisticas`

## usuarios

- `GET /usuarios`
- `POST /usuarios`
- `GET /usuarios/roles`
- `PUT /usuarios/{id}`
- `DELETE /usuarios/{id}`
- `PUT /usuarios/{id}/password`

## login

- `POST /login`

## logout

- `POST /logout`

## perfil

- `POST /perfil/password`
- `PUT /perfil/preferencias`

## export-pdf

- `POST /export-pdf`

## configuracion-sistema

- `PUT /configuracion-sistema`
