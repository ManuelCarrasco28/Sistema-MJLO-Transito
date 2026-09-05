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

