# Sistema de Gestión de Tránsito Municipal — MDJLO

Plataforma integral para la administración, fiscalización, registro y control del tránsito y transporte de la **Municipalidad Distrital de José Leonardo Ortiz** (Chiclayo, Lambayeque, Perú).

---

## 🚀 Arquitectura y Tecnologías

El sistema está construido con una arquitectura moderna de cliente-servidor desacoplada y containerizada:

- **Frontend:** React 19, Vite, Tailwind CSS, React Router, Leaflet, SweetAlert2, TinyMCE.
- **Backend API:** PHP 8.2+, CodeIgniter 4 (REST API), Dompdf, autenticación basada en sesiones y control de roles por filtros.
- **Base de Datos:** MariaDB 10.6 / MySQL con soporte para migraciones y seeds automáticos.
- **Interoperabilidad (PIDE):** Integración con servicios de RENIEC (DNI/Personas) y SUNARP (Vehículos/Placas).
- **Entorno de Despliegue:** Docker y Docker Compose para orquestar todos los microservicios.

---

## 📦 Módulos Principales del Sistema

1. **Dashboard y Analítica:** Métricas en tiempo real de recaudación, infracciones, padrón vehicular, operativos y actividad reciente.
2. **Padrón Vehicular:** Registro detallado de flota (trimóviles, particulares), propietarios, inspección visual de placas y consulta rápida SUNARP/PIDE.
3. **Personas y Ciudadanos:** Búsqueda y validación automática de datos con RENIEC (PIDE), historial de infracciones y expedientes.
4. **Asociaciones y Particulares:** Gestión de empresas de transportes, paraderos, padrón de socios, geolocalización de sedes con mapas interactivos ultrarrápidos (Leaflet + OpenStreetMap) y enlace a Google Maps.
5. **Papeletas e Infracciones:** Emisión, consulta, evidencias fotográficas, conversión de reportes de fiscalizadores ciudadanos y firma digital.
6. **Caja y Pagos:** Registro de pagos en ventanilla, liquidación de papeletas, trámites, aranceles y reportes de arqueo diario.
7. **Cursos de Seguridad Vial:** Registro de convocatorias, control de participantes, evaluación de notas y certificación de conductores.
8. **Inspecciones Técnicas (CertiCAV):** Evaluación de condiciones físico-mecánicas de vehículos con generación e impresión de certificados oficiales y código QR.
9. **Retenciones e Internamiento:** Órdenes de internamiento al depósito municipal, control de inventario físico del vehículo (piezas, accesorios) y liquidación de custodia.
10. **Permisos y Autorizaciones:** Emisión de Tarjetas de Operatividad (TUC), permisos de Carga y Descarga, Uso de Vías y Zonas Reservadas con plantillas oficiales de impresión A4.
11. **Seguridad y Auditoría:** Control de accesos basado en roles (SUPERADMIN, GERENTE, SUBGERENTE, SECRETARIA, FISCALIZADOR), historial de cambios y configuración municipal.

---

## 🛠️ Ejecución con Docker (Recomendado)

### Requisitos Previos:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y en ejecución.
- Git instalado.

### 1. Iniciar los servicios

Abre una terminal en la raíz del proyecto y ejecuta:

```bash
docker compose up -d
```

### 2. URLs y Puertos de Acceso

| Servicio | URL / Puerto | Descripción |
| :--- | :--- | :--- |
| **Frontend Web** | [http://localhost:5173](http://localhost:5173) | Aplicación web (React + Vite) |
| **Backend API** | [http://localhost:8080/api/status](http://localhost:8080/api/status) | API REST (CodeIgniter 4) |
| **PhpMyAdmin** | [http://localhost:8081](http://localhost:8081) | Gestor web de base de datos |
| **Base de Datos** | `localhost:3307` | Servidor MariaDB (`root:root`) |

---

## 🗄️ Contexto y Gestión de Base de Datos

- **Nombre de BD:** `transitomunicipal`
- **Usuario:** `root`
- **Contraseña:** `root`
- **Puerto expuesto en host:** `3307` (puerto interno en Docker: `3306`)

### Estructura de tablas destacadas:
- `asociaciones`: Empresas de transportes y particulares registradas.
- `personas`: Personas naturales y jurídicas con datos validados de RENIEC.
- `vehiculos` y `vehiculo_propietarios`: Padrón vehicular municipal y relación de dueños.
- `documentos_vehiculo`: Centralización de TUC, SOAT, Tarjeta de Propiedad y CertiCAV.
- `papeletas` y `pagos`: Control de sanciones, deudas, cobros y arqueos.
- `permisos_circulacion`: Resoluciones y autorizaciones de tránsito vehicular.
- `internamientos` e `inventario_criterios`: Control de vehículos ingresados al depósito.

### Identificadores públicos (UUID)
Los registros principales llevan una columna `uuid` (UUID versión 7, librería `ramsey/uuid`, helper `App\Libraries\Identificador`): personas, vehículos, asociaciones, documentos, papeletas, inscripciones y cursos, CertiCAV, internamientos, órdenes de libertad, operativos, permisos, trámites, certificados de curso, reportes de intervención y pagos.

- El `id` numérico sigue siendo la llave interna; el `uuid` es lo que se muestra, se pone en enlaces y se codifica en los QR. Es obligatorio (`NOT NULL`, único).
- **Código QR de los vehículos:** es el mismo `uuid` del vehículo. El QR impreso lleva 3 líneas (`MDJLO - …`, `Codigo QR: <uuid>`, `Placa del vehiculo: <placa>`); la app móvil lee la línea `Codigo QR:`.
- **Rutas:** las rutas de recursos aceptan el `uuid` además del id numérico (`GET /api/vehiculos/{uuid}`, `/api/papeletas/{uuid}/fotos`…). Con `app.uuidEstricto=true` en el `.env`, las rutas expuestas a roles bajos (fotos, firma y pago de papeletas, reportes de intervención) dejan de aceptar el id numérico. Se activa cuando la app móvil instalada ya use uuid.
- **Registros nuevos:** todo insert debe pasar `'uuid' => Identificador::nuevo()`. Los seeders ya lo hacen. Si se carga data por otra vía, `php spark uuid:rellenar` asigna uuid a lo que falte (la columna es obligatoria, así que un insert sin uuid falla).
  - Las migraciones versionadas están en `backend/app/Database/Migrations/`: en un servidor nuevo hay que ejecutar `php spark migrate`, o levantar la base desde `init-db/transitomunicipal.sql`, que ya incluye el esquema completo.

### Reiniciar y reaplicar base de datos limpia:
Si necesitas resetear la base de datos a su estado inicial con las migraciones y seeders oficiales:

```bash
docker compose down -v
docker compose up -d
```

---

## 💻 Desarrollo Local (Sin Docker)

Si prefieres ejecutar los componentes de manera nativa:

### Frontend:
```bash
cd frontend
npm install
npm run dev
```
Disponible en `http://localhost:5173`.

### Backend:
```bash
cd backend
composer install
php spark serve --port 8080
```
Asegúrate de configurar las credenciales en `backend/.env` apuntando a tu servidor MySQL/MariaDB local.

---

### App móvil (Flutter) conectada a tu backend
La app no lee el `.env` por sí sola: la dirección del backend se le pasa con `--dart-define=API_URL=...`. Para no escribirla cada vez:

1. En el `.env` de la raíz (cada persona tiene el suyo y no se sube a GitHub; hay un modelo en `.env.example`) pon la IP de **tu PC** en la red Wi-Fi: `MOBILE_API_URL=http://192.168.0.10:8080/api`.
2. Ejecuta el script desde `mobile/`: `.\run-dev.ps1` (Windows) o `./run-dev.sh` (Linux/macOS/Git Bash). Los argumentos extra pasan a `flutter run` (`.\run-dev.ps1 --device-id <dispositivo>`; en PowerShell `-d` no sirve porque es la abreviatura de `-Debug`).

Sin `MOBILE_API_URL` la app usa `10.0.2.2` (emulador de Android). Si tu IP cambia, solo editas el `.env`; no se cambia nada en el código.

## 📄 Licencia y Derechos

Desarrollado para la **Subgerencia de Tránsito y Transporte** — *Municipalidad Distrital de José Leonardo Ortiz*. Todos los derechos reservados.
