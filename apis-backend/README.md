# Colección Bruno del backend

1. Abre esta carpeta en Bruno (Open Collection) y elige el entorno **Produccion**.
2. Rellena `usuario` y `password` (y `mobileKey` si el login exige la clave móvil) en el entorno. Esos valores quedan en tu PC: no los subas.
3. Ejecuta primero **00 Sesion / POST login**. Bruno guarda la cookie de sesión y las demás peticiones la usan solas.
4. `{{id}}` es el identificador del registro: cámbialo en el entorno o dentro de cada petición.

Todas las rutas salen de `apis/ENDPOINTS.md`.
