#!/usr/bin/env bash
# Ejecuta la app móvil apuntando al backend de TU PC (Linux / macOS / Git Bash).
#
# Lee MOBILE_API_URL del .env de la raíz del proyecto (cada persona tiene el suyo, con la IP de su PC; el .env
# no se sube a GitHub) y se la pasa a Flutter como --dart-define=API_URL=...
#
# Uso:  ./run-dev.sh            -> flutter run con la IP del .env
#       ./run-dev.sh -d <id>    -> los argumentos extra se pasan a flutter run
#       MOSTRAR_SOLO=1 ./run-dev.sh   -> solo muestra el comando

set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE="../.env"
URL=""
if [ -f "$ENV_FILE" ]; then
  URL="$(grep -E '^[[:space:]]*MOBILE_API_URL[[:space:]]*=' "$ENV_FILE" | head -n1 | sed -E 's/^[[:space:]]*MOBILE_API_URL[[:space:]]*=[[:space:]]*//' | tr -d '"'"'"'\r' || true)"
fi

KEY=""
if [ -f "$ENV_FILE" ]; then
  KEY="$(grep -E '^[[:space:]]*app\.mobileKey[[:space:]]*=' "$ENV_FILE" | head -n1 | sed -E 's/^[[:space:]]*app\.mobileKey[[:space:]]*=[[:space:]]*//' | tr -d '"'"'"'' || true)"
fi

ARGS=(run)
if [ -n "$URL" ]; then
  echo "Backend de la app: $URL (de MOBILE_API_URL en .env)"
  ARGS+=("--dart-define=API_URL=$URL")
else
  echo "MOBILE_API_URL no está en el .env: se usa la dirección por defecto de la app (10.0.2.2, emulador)."
fi
[ -n "$KEY" ] && ARGS+=("--dart-define=MOBILE_KEY=$KEY")
ARGS+=("$@")

if [ "${MOSTRAR_SOLO:-0}" = "1" ]; then
  echo "flutter ${ARGS[*]}"
  exit 0
fi

exec flutter "${ARGS[@]}"
