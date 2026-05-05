#!/bin/bash
set -e

# Skrypt deploymentu na VPS
# Użycie: ./deploy.sh

PROJECT_DIR="/opt/agency-panel"
REPO_URL="your-git-repo-url"

echo "=== Agency Panel Deploy ==="

# Pierwsze uruchomienie
if [ ! -d "$PROJECT_DIR" ]; then
  echo "Pierwsze uruchomienie — klonowanie repozytorium..."
  git clone $REPO_URL $PROJECT_DIR
  cd $PROJECT_DIR
  cp .env.example .env
  echo ""
  echo "WAŻNE: Uzupełnij plik .env przed kontynuowaniem!"
  echo "nano $PROJECT_DIR/.env"
  exit 0
fi

cd $PROJECT_DIR

echo "Pulling latest changes..."
git pull origin main

echo "Building images..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo "Running migrations..."
docker compose -f docker-compose.prod.yml exec api bun run db:push

echo "Cleaning up old images..."
docker image prune -f

echo "=== Deploy complete! ==="
echo "Frontend: http://localhost (via nginx)"
