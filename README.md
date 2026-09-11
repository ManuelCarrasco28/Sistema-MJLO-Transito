# Sistema MJLO Tránsito

Sistema de Gestión de Tránsito Municipal - Municipalidad Distrital de José Leonardo Ortiz.

## 1. Base de Datos

### Importar Estructura Base

Crear la base de datos e importar el archivo SQL:

```powershell
mysql -u root -e "CREATE DATABASE IF NOT EXISTS transitomunicipal CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
mysql -u root transitomunicipal < backend\app\Database\Schema\transitomunicipal_2026_09_10.sql
```

*(También se puede importar `backend/app/Database/Schema/transitomunicipal_2026_09_10.sql` directamente desde phpMyAdmin).*

### Cargar Datos y Cuentas (Seeder)

Ejecutar el seeder para poblar automáticamente los datos operativos (vehículos formales/informales, infracciones, papeletas, depósito) y habilitar los usuarios:

```powershell
cd backend
php spark db:seed DatabaseSeeder
```

### Usuarios y Credenciales

| Usuario | Contraseña | Rol | Acceso |
| :--- | :--- | :--- | :--- |
| `admin` | `Admin123!` | Subgerente de Tránsito | Web |
| `inspector1` | `Inspector123!` | Inspector de Tránsito | App Móvil / Web |
| `inspector2` | `Inspector123!` | Inspector de Tránsito | App Móvil / Web |
| `tecnico` | `Tecnico123!` | Inspector Técnico | Web (CERTICAV) |
| `deposito` | `Deposito123!` | Operador de Depósito | Web (Depósito) |

---

## 2. Backend (API)

```powershell
cd backend
copy .env.example .env
composer install
php spark serve --host 0.0.0.0 --port 8080
```

URL: `http://localhost:8080`

---

## 3. Frontend (Web)

```powershell
cd frontend
npm install
npm run dev
```

URL: `http://localhost:5173`

---

## 4. Mobile (Flutter)

```powershell
cd mobile
flutter pub get
flutter run
```

*Nota para celular físico:*
- Conectar la PC y el celular a la misma red Wi-Fi.
- Verificar o actualizar la IP en `mobile/lib/services/api_service.dart` (`_pcWifiBaseUrl`).
