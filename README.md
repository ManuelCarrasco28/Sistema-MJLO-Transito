# Sistema MJLO Tránsito

Sistema de Gestión de Tránsito Municipal de la Municipalidad Distrital de José Leonardo Ortiz.

## Estructura del Proyecto

El proyecto está compuesto por un frontend en React (Vite) y un backend en PHP (CodeIgniter 4). Toda la infraestructura está contenida dentro de un entorno Docker.

## Ejecución del Proyecto (Docker)

Asegúrate de tener Docker y Docker Compose instalados en tu sistema.

1. Abre una terminal en la raíz del proyecto.
2. Ejecuta el siguiente comando para levantar los servicios (Frontend, Backend, Base de Datos y PhpMyAdmin):

`ash
docker compose up -d
`

### URLs de Acceso

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8080/api/status
- **PhpMyAdmin:** http://localhost:8081

## Contexto de Base de Datos

- **Base de datos:** 	ransitomunicipal (MySQL / MariaDB)
- **Estructura:** Gestionada mediante migraciones de CodeIgniter.

### Modelos y Tablas principales:
- sociaciones: Reemplaza a la antigua tabla organizaciones.
- personas y ciudadanos: Gestión de personas y validación PIDE (RENIEC).
- ehiculos y ehiculo_propietarios: Registro de flota vehicular.
- documentos_vehiculo: Centraliza SOAT, Tarjeta de Propiedad, Tarjeta de Operatividad y CERTICAV.
- papeletas y pagos: Gestión de multas e infracciones de tránsito.
- permisos_circulacion: Generación de pases libres y resoluciones de carga/descarga.

*(Para aplicar cambios en la BD desde otros compañeros, ejecuta: docker compose down -v y luego docker compose up -d)*
