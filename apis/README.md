# Consultas directas PIDE

Solo RENIEC, SUNARP y SUNAT RUC. No usa localhost ni login del sistema municipal.

1. Abre esta carpeta en Bruno y selecciona **Local**.
2. En las variables del entorno coloca **dni** (8 digitos), **placa** o **ruc** (11 digitos).
3. Abre la solicitud correspondiente y pulsa **Send**.
4. En **Response / JSON** aparecen todos los campos originales del proveedor, sin transformaciones del backend.

La key proporcionada esta en **api_key**, enviada como Authorization: Bearer desde los headers de la coleccion.
El archivo environments/Local.bru esta excluido de Git. No compartas la key ni respuestas con datos personales.
Puedes marcar api_key como Secret en Bruno. No necesitas usuario ni contrasena.

SUNARP usa POST con placa, codeZona y codeOficina. Inicialmente zona 11 y oficina 01 (Chiclayo); ajusta la oficina donde se registro el vehiculo.
RUC tiene inicialmente el numero solicitado: 20494100186.

Si clonaste el repositorio, copia examples/Local.bru a environments/Local.bru e ingresa tu key.
Cierra las pestanas antiguas sin guardarlas y vuelve a abrir la coleccion si aun aparecen las solicitudes eliminadas.
401/403 puede indicar key invalida/expirada o permisos insuficientes del proveedor.

No se ejecutaron consultas personales ni se verifico la vigencia de la key.

