#!/bin/bash
# Użycie: ./deploy-api.sh apps/api/src/routes/settings.ts apps/api/src/index.ts
set -e
PROJECT="/home/inservis/domains/panel.inservis.pl"
CONTAINER="panelinservispl-api-1"

if [ $# -eq 0 ]; then
  echo "Podaj pliki do wdrożenia, np: ./deploy-api.sh apps/api/src/routes/settings.ts"
  exit 1
fi

for f in "$@"; do
  echo "==> Kopiowanie $f..."
  docker cp "$PROJECT/$f" "$CONTAINER:/app/$f"
done

echo "==> Restarting API..."
docker compose -f $PROJECT/docker-compose.prod.yml restart api

echo "==> Done!"
