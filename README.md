# Sistema de Gestión de Tránsito Municipal — MDJLO

Plataforma para fiscalizar, registrar y cobrar el tránsito y transporte de la **Municipalidad Distrital de José Leonardo Ortiz** (Chiclayo, Perú). Una web para la oficina y una app móvil para los inspectores en campo.

![Frontend](https://img.shields.io/badge/FRONTEND-REACT%2019-61DAFB?style=for-the-badge&logo=react&logoColor=white&labelColor=4a4a4a)
![Build](https://img.shields.io/badge/BUILD-VITE%208-646CFF?style=for-the-badge&logo=vite&logoColor=white&labelColor=4a4a4a)
![Estilos](https://img.shields.io/badge/ESTILOS-TAILWIND%204-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white&labelColor=4a4a4a)
![Backend](https://img.shields.io/badge/BACKEND-CODEIGNITER%204-EF4223?style=for-the-badge&logo=codeigniter&logoColor=white&labelColor=4a4a4a)
![Lenguaje](https://img.shields.io/badge/LENGUAJE-PHP%208.2-777BB4?style=for-the-badge&logo=php&logoColor=white&labelColor=4a4a4a)
![Base de datos](https://img.shields.io/badge/BASE%20DE%20DATOS-MARIADB%2010.6-003545?style=for-the-badge&logo=mariadb&logoColor=white&labelColor=4a4a4a)
![Móvil](https://img.shields.io/badge/MÓVIL-FLUTTER-02569B?style=for-the-badge&logo=flutter&logoColor=white&labelColor=4a4a4a)
![Contenedores](https://img.shields.io/badge/CONTENEDORES-DOCKER-2496ED?style=for-the-badge&logo=docker&logoColor=white&labelColor=4a4a4a)
![Integración](https://img.shields.io/badge/INTEGRACIÓN-PIDE%20RENIEC%20%7C%20SUNARP-C8102E?style=for-the-badge&labelColor=4a4a4a)

---

## Cómo funciona

```mermaid
flowchart LR
    A["📱 Inspector<br/>app móvil"] -->|papeleta o reporte + fotos| B(("API<br/>CodeIgniter"))
    C["🖥️ Oficina<br/>web React"] <-->|sesión + roles| B
    B <--> D[("MariaDB")]
    B -->|DNI / placa| E["PIDE<br/>RENIEC · SUNARP"]
    B --> F["📁 Fotos y firmas<br/>writable/uploads"]
```

**Flujo de una infracción**

```mermaid
flowchart LR
    R["Inspector registra"] --> P["Papeleta"]
    R -.->|sin permiso móvil| RP["Reporte"] -->|oficina revisa| P
    P --> C["Caja cobra<br/>recibo"]
    P -->|vehículo retenido| I["Internamiento<br/>depósito"] --> L["Cobro de<br/>guardianía + remolque"] --> O["Orden de<br/>libertad"]
```

## Módulos

| Módulo | Qué hace |
| :--- | :--- |
| **Padrón** | Personas, vehículos, asociaciones, trabajadores; consulta RENIEC y SUNARP |
| **Fiscalización** | Operativos, papeletas, reportes de intervención, fotos y firma |
| **Caja** | Pagos, recibos, arqueo diario, tarifas del depósito |
| **Depósito** | Internamientos, inventario del vehículo, órdenes de libertad |
| **Trámites** | Documentos (SOAT, TUC), permisos, inspecciones CERTICAV, cursos de seguridad vial |
| **Administración** | Usuarios y roles, auditoría, configuración municipal, dashboard |

## Roles

| Rol | Acceso |
| :--- | :--- |
| `SUPERADMIN` · `GERENTE` · `SUBGERENTE` | Todo, incluido borrar, anular y rebajar cobros |
| `SECRETARIA` | Oficina: registra y cobra, no borra ni anula |
| `TRABAJADOR` | Inspector: solo la app móvil (sus papeletas y reportes) |

---

## Puesta en marcha

Requisitos: [Docker Desktop](https://www.docker.com/products/docker-desktop/) y Git.

```bash
cp .env.example .env        # completa las claves; no subas el .env
docker compose up -d
docker exec mjlo_backend php spark migrate
docker exec mjlo_backend php spark db:seed UsuariosSeeder
```

> Guarda `encryption.key` en un lugar seguro: sin ella no se descifran los datos cifrados (token PIDE).
> Las credenciales iniciales están en `backend/app/Database/Seeds/UsuariosSeeder.php`; cámbialas al primer ingreso.

| Servicio | URL |
| :--- | :--- |
| Web | http://localhost:5173 |
| API | http://localhost:8080/api/status |
| phpMyAdmin | http://localhost:8081 (solo desde tu PC) |
| MariaDB | `localhost:3307` (solo desde tu PC) |

Reiniciar la base desde cero: `docker compose down -v && docker compose up -d`.

## Desarrollo

```bash
cd frontend && npm install && npm run dev          # web
cd backend  && composer install && php spark serve --port 8080
docker exec mjlo_backend vendor/bin/phpunit        # pruebas del backend
cd frontend && npx vitest run                      # pruebas del frontend
```

**App móvil:** pon la IP de tu PC en `MOBILE_API_URL` del `.env` y ejecuta `mobile/run-dev.ps1` (Windows) o `mobile/run-dev.sh`. Sin esa variable usa `10.0.2.2` (emulador Android).

## Notas

- Los registros llevan un `uuid` público (v7) además del `id`; el QR del vehículo es ese `uuid`. Todo insert nuevo debe usar `Identificador::nuevo()`.
- Estados de cursos, documentos y permisos se actualizan solos; puedes programar `php spark cursos:sincronizar-estados` una vez al día.
- El editor de permisos es **TinyMCE 8 autohospedado** (`frontend/public/tinymce`, licencia GPL v2+): no usa claves ni servicios externos. Para actualizarlo, reemplaza esa carpeta con la nueva versión y conserva `langs/es.js`.
- Las migraciones están en `backend/app/Database/Migrations/`; `init-db/transitomunicipal.sql` trae el esquema completo.

---

## Licencia

Desarrollado para la **Subgerencia de Tránsito y Transporte** — *Municipalidad Distrital de José Leonardo Ortiz*. Todos los derechos reservados.

---

## Equipo de desarrollo

| | Rol | Nombre | Contacto |
| :---: | :--- | :--- | :--- |
| 💻 | ![Full Stack Developer](https://img.shields.io/badge/ROL-FULL%20STACK%20DEVELOPER-0EA5E9?style=for-the-badge&labelColor=4a4a4a) | ![Carrasco Millan Jose Manuel](https://img.shields.io/badge/CARRASCO%20MILLAN-JOSE%20MANUEL-7C3AED?style=for-the-badge&labelColor=4a4a4a) | [![LinkedIn](https://img.shields.io/badge/LINKEDIN-PERFIL-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white&labelColor=4a4a4a)](https://www.linkedin.com/in/jose-manuel-carrasco-millan-0a2b91323/) |
| 📱 | ![Mobile Developer](https://img.shields.io/badge/ROL-MOBILE%20DEVELOPER-02569B?style=for-the-badge&logo=flutter&logoColor=white&labelColor=4a4a4a) | ![Saavedra Benavides Juan Angelo](https://img.shields.io/badge/SAAVEDRA%20BENAVIDES-JUAN%20ANGELO-F97316?style=for-the-badge&labelColor=4a4a4a) | [![LinkedIn](https://img.shields.io/badge/LINKEDIN-PERFIL-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white&labelColor=4a4a4a)](https://www.linkedin.com/in/juan-angelo-jhosep-saavedra-benavides-b97890387/) |
