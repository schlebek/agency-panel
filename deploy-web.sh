#!/bin/bash
set -e
PROJECT="/home/inservis/domains/panel.inservis.pl"
CONTAINER="panelinservispl-web-1"

echo "==> Building Next.js inside container..."
docker exec $CONTAINER sh -c "cd /app && pnpm --filter @agency/web build && cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static && cp -r apps/web/public apps/web/.next/standalone/apps/web/public 2>/dev/null || true"

echo "==> Restarting web server..."
docker compose -f $PROJECT/docker-compose.prod.yml restart web

echo "==> Done!"
