#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()     { echo -e "${GREEN}✓${NC} $*"; }
info()    { echo -e "${BLUE}→${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC} $*"; }
section() { echo; echo -e "${BOLD}${CYAN}──── $* ────${NC}"; echo; }
error()   { echo -e "\n${RED}✗ BŁĄD:${NC} $*\n" >&2; exit 1; }
ask()     { echo -ne "${YELLOW}?${NC} $* "; }

COMPOSE_FILE="docker-compose.prod.yml"
IMAGE_REGISTRY="ghcr.io"
IMAGE_OWNER="schlebek"
INSTALL_DIR="/opt/agency-panel"
SSL_EMAIL=""

# ─── Banner ───────────────────────────────────────────────────────────────────
print_banner() {
  clear
  echo -e "${BOLD}${CYAN}"
  echo "  ╔══════════════════════════════════════════╗"
  echo "  ║          Agency Panel Installer          ║"
  echo "  ╚══════════════════════════════════════════╝"
  echo -e "${NC}"
  echo "  Instalator skonfiguruje Agency Panel na Twoim serwerze."
  echo "  Wymagania: VPS z systemem Linux, min. 2 GB RAM."
  echo
}

# ─── Requirements ─────────────────────────────────────────────────────────────
check_requirements() {
  section "Sprawdzanie wymagań"

  if ! command -v docker &>/dev/null; then
    error "Docker nie jest zainstalowany.\nZainstaluj: curl -fsSL https://get.docker.com | sh"
  fi
  log "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)"

  if ! docker compose version &>/dev/null 2>&1; then
    error "Docker Compose v2 nie jest zainstalowany.\nSprawdź: https://docs.docker.com/compose/install/"
  fi
  log "Docker Compose OK"

  for cmd in openssl curl; do
    command -v "$cmd" &>/dev/null || error "$cmd nie jest zainstalowany. Zainstaluj: apt install $cmd"
  done
  log "openssl, curl: OK"
}

# ─── Install directory ────────────────────────────────────────────────────────
setup_directory() {
  section "Katalog instalacji"

  ask "Gdzie zainstalować Agency Panel? [${INSTALL_DIR}]"
  read -r input
  INSTALL_DIR="${input:-$INSTALL_DIR}"

  if [ -f "${INSTALL_DIR}/.env" ]; then
    warn "Znaleziono istniejącą instalację w ${INSTALL_DIR}."
    ask "Nadpisać konfigurację? Dane w bazie zostaną zachowane. (t/N)"
    read -r overwrite
    [[ "${overwrite,,}" != "t" && "${overwrite,,}" != "tak" ]] && error "Instalacja przerwana."
  fi

  mkdir -p "$INSTALL_DIR"
  cd "$INSTALL_DIR"
  log "Katalog: $INSTALL_DIR"
}

# ─── License key ──────────────────────────────────────────────────────────────
LICENSE_KEY=""

setup_license() {
  section "Klucz licencyjny"

  ask "Podaj klucz licencyjny Agency Panel:"
  read -rs LICENSE_KEY
  echo

  [ -z "$LICENSE_KEY" ] && error "Klucz licencyjny jest wymagany."

  info "Weryfikacja klucza..."
  if ! echo "$LICENSE_KEY" | docker login "$IMAGE_REGISTRY" \
    -u "agency-panel-license" --password-stdin &>/dev/null 2>&1; then
    error "Nieprawidłowy klucz licencyjny. Skontaktuj się z supportem."
  fi
  log "Klucz licencyjny poprawny."
}

# ─── Domain ───────────────────────────────────────────────────────────────────
DOMAIN=""
USE_SSL="no"
APP_URL=""

setup_domain() {
  section "Domena i SSL"

  ask "Podaj domenę lub adres IP serwera\n  (np. panel.twojafirma.pl lub 123.45.67.89):"
  read -r DOMAIN
  [ -z "$DOMAIN" ] && error "Domena jest wymagana."

  if [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    warn "Adres IP — SSL zostanie pominięty."
    USE_SSL="no"
  else
    ask "Włączyć automatyczny SSL (Let's Encrypt)? (t/N)"
    read -r ssl_answer
    if [[ "${ssl_answer,,}" == "t" || "${ssl_answer,,}" == "tak" ]]; then
      USE_SSL="yes"
      ask "Email dla certyfikatu SSL (wymagany przez Let's Encrypt):"
      read -r SSL_EMAIL
      [ -z "$SSL_EMAIL" ] && error "Email jest wymagany dla Let's Encrypt."
    fi
  fi

  APP_URL="$( [ "$USE_SSL" = "yes" ] && echo "https://${DOMAIN}" || echo "http://${DOMAIN}" )"
  log "URL aplikacji: $APP_URL"
}

# ─── Secrets ──────────────────────────────────────────────────────────────────
POSTGRES_PASSWORD=""
AUTH_SECRET=""
MINIO_SECRET_KEY=""
REDIS_PASSWORD=""

generate_secrets() {
  POSTGRES_PASSWORD=$(openssl rand -hex 16)
  AUTH_SECRET=$(openssl rand -hex 32)
  MINIO_SECRET_KEY=$(openssl rand -hex 16)
  REDIS_PASSWORD=$(openssl rand -hex 16)
}

# ─── Optional integrations ────────────────────────────────────────────────────
RESEND_API_KEY="" SENUTO_EMAIL="" SENUTO_PASSWORD=""
GOOGLE_CLIENT_ID="" GOOGLE_CLIENT_SECRET="" GEMINI_API_KEY=""

setup_integrations() {
  section "Integracje (opcjonalne)"
  echo "  Wszystkie integracje możesz skonfigurować później w Ustawieniach."
  echo "  Naciśnij Enter, aby pominąć."
  echo

  ask "Klucz API Resend (wysyłka emaili, np. re_xxxx):"
  read -r RESEND_API_KEY

  ask "Email konta Senuto (analizy SEO):"
  read -r SENUTO_EMAIL
  if [ -n "$SENUTO_EMAIL" ]; then
    ask "Hasło Senuto:"
    read -rs SENUTO_PASSWORD; echo
  fi

  ask "Google OAuth Client ID (Google Search Console):"
  read -r GOOGLE_CLIENT_ID
  if [ -n "$GOOGLE_CLIENT_ID" ]; then
    ask "Google OAuth Client Secret:"
    read -rs GOOGLE_CLIENT_SECRET; echo
  fi

  ask "Klucz API Gemini (AI Monitor):"
  read -r GEMINI_API_KEY
}

# ─── Create .env ──────────────────────────────────────────────────────────────
create_env() {
  section "Tworzenie konfiguracji"

  cat > .env << EOF
# Agency Panel — wygenerowano $(date)
# NIE udostępniaj tego pliku — zawiera hasła i sekrety.

DOMAIN=${DOMAIN}
APP_URL=${APP_URL}
VERSION=latest

# Baza danych
POSTGRES_DB=agency_panel
POSTGRES_USER=agency
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}

# Autoryzacja
AUTH_SECRET=${AUTH_SECRET}

# Storage (MinIO)
MINIO_ACCESS_KEY=agencyadmin
MINIO_SECRET_KEY=${MINIO_SECRET_KEY}

# Email (Resend)
RESEND_API_KEY=${RESEND_API_KEY:-}

# Senuto SEO
SENUTO_EMAIL=${SENUTO_EMAIL:-}
SENUTO_PASSWORD=${SENUTO_PASSWORD:-}

# Google Search Console
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}

# AI Monitor
GEMINI_API_KEY=${GEMINI_API_KEY:-}
EOF

  chmod 600 .env
  log ".env utworzony"
}

# ─── Nginx config ─────────────────────────────────────────────────────────────
create_nginx() {
  mkdir -p nginx/ssl

  if [ "$USE_SSL" = "yes" ]; then
    cat > nginx/nginx.conf << NGINX
events { worker_connections 1024; }

http {
  upstream web { server web:3000; }
  upstream api { server api:3001; }

  server {
    listen 80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\$host\$request_uri; }
  }

  server {
    listen 443 ssl;
    server_name ${DOMAIN};
    http2 on;

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    location /api/ {
      proxy_pass         http://api/;
      proxy_set_header   Host \$host;
      proxy_set_header   X-Real-IP \$remote_addr;
      proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto \$scheme;
      proxy_read_timeout 120s;
    }

    location / {
      proxy_pass         http://web;
      proxy_set_header   Host \$host;
      proxy_set_header   X-Real-IP \$remote_addr;
      proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto \$scheme;
    }
  }
}
NGINX
  else
    cat > nginx/nginx.conf << NGINX
events { worker_connections 1024; }

http {
  upstream web { server web:3000; }
  upstream api { server api:3001; }

  server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 50M;

    location /api/ {
      proxy_pass         http://api/;
      proxy_set_header   Host \$host;
      proxy_set_header   X-Real-IP \$remote_addr;
      proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto \$scheme;
      proxy_read_timeout 120s;
    }

    location / {
      proxy_pass         http://web;
      proxy_set_header   Host \$host;
      proxy_set_header   X-Real-IP \$remote_addr;
      proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto \$scheme;
    }
  }
}
NGINX
  fi

  log "Konfiguracja nginx gotowa."
}

# ─── docker-compose.prod.yml (embedded) ───────────────────────────────────────
create_compose() {
  cat > "$COMPOSE_FILE" << 'COMPOSE'
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-agency_panel}
      POSTGRES_USER: ${POSTGRES_USER:-agency}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-agency} -d ${POSTGRES_DB:-agency_panel}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - internal
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:-agencyadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    networks:
      - internal
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  migrate:
    image: ghcr.io/schlebek/agency-panel-api:${VERSION:-latest}
    restart: "no"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-agency}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-agency_panel}
    command: ["pnpm", "--filter", "@agency/db", "db:push"]
    networks:
      - internal
    depends_on:
      postgres:
        condition: service_healthy

  api:
    image: ghcr.io/schlebek/agency-panel-api:${VERSION:-latest}
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: "3001"
      DATABASE_URL: postgresql://${POSTGRES_USER:-agency}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-agency_panel}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      BETTER_AUTH_SECRET: ${AUTH_SECRET}
      BETTER_AUTH_URL: ${APP_URL}
      FRONTEND_URL: ${APP_URL}
      MINIO_ENDPOINT: minio
      MINIO_PORT: "9000"
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY:-agencyadmin}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      MINIO_BUCKET: agency-panel
      MINIO_USE_SSL: "false"
      RESEND_API_KEY: ${RESEND_API_KEY:-}
      SENUTO_EMAIL: ${SENUTO_EMAIL:-}
      SENUTO_PASSWORD: ${SENUTO_PASSWORD:-}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
      GEMINI_API_KEY: ${GEMINI_API_KEY:-}
    networks:
      - internal
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s

  web:
    image: ghcr.io/schlebek/agency-panel-web:${VERSION:-latest}
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: "3000"
      API_URL: http://api:3001
      BETTER_AUTH_URL: ${APP_URL}
      BETTER_AUTH_SECRET: ${AUTH_SECRET}
      NEXT_TELEMETRY_DISABLED: "1"
    networks:
      - internal
    depends_on:
      api:
        condition: service_healthy

  nginx:
    image: nginx:1.25-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot_www:/var/www/certbot:ro
      - certbot_conf:/etc/letsencrypt:ro
    networks:
      - internal
    depends_on:
      - web
      - api

volumes:
  postgres_data:
  redis_data:
  minio_data:
  certbot_www:
  certbot_conf:

networks:
  internal:
    driver: bridge
COMPOSE

  log "docker-compose.prod.yml gotowy."
}

# ─── update.sh (embedded) ─────────────────────────────────────────────────────
create_update_script() {
  cat > update.sh << 'UPDATESCRIPT'
#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log()   { echo -e "${GREEN}✓${NC} $*"; }
info()  { echo -e "→ $*"; }
error() { echo -e "${RED}✗ BŁĄD:${NC} $*" >&2; exit 1; }

COMPOSE_FILE="docker-compose.prod.yml"

[ ! -f "$COMPOSE_FILE" ] && error "Uruchom skrypt z katalogu instalacji (/opt/agency-panel)."
[ ! -f ".env" ]          && error "Nie znaleziono .env. Uruchom skrypt z katalogu instalacji."

echo -e "${BOLD}${CYAN}── Agency Panel Update ──${NC}"
echo

info "Pobieranie nowych obrazów..."
docker compose -f "$COMPOSE_FILE" pull --quiet
log "Obrazy pobrane."

info "Uruchamianie migracji..."
docker compose -f "$COMPOSE_FILE" run --rm migrate
log "Migracje wykonane."

info "Restartowanie usług..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
log "Usługi zaktualizowane."

docker image prune -f &>/dev/null || true

echo
log "Aktualizacja zakończona pomyślnie."
UPDATESCRIPT

  chmod +x update.sh
  log "update.sh gotowy."
}

# ─── Start services ───────────────────────────────────────────────────────────
start_services() {
  section "Uruchamianie usług"

  info "Pobieranie obrazów Docker (może potrwać kilka minut)..."
  docker compose -f "$COMPOSE_FILE" pull --quiet
  log "Obrazy pobrane."

  info "Uruchamianie infrastruktury (baza, redis, storage)..."
  docker compose -f "$COMPOSE_FILE" up -d postgres redis minio

  info "Oczekiwanie na gotowość bazy danych..."
  local attempts=0
  until docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_isready -U agency -d agency_panel &>/dev/null 2>&1; do
    attempts=$((attempts + 1))
    [ $attempts -gt 30 ] && error "Timeout — baza danych nie odpowiada po 60 sekundach."
    printf "."
    sleep 2
  done
  echo
  log "Baza danych gotowa."

  info "Uruchamianie migracji..."
  docker compose -f "$COMPOSE_FILE" run --rm migrate
  log "Migracje wykonane."

  info "Uruchamianie aplikacji..."
  docker compose -f "$COMPOSE_FILE" up -d
  log "Wszystkie usługi uruchomione."
}

# ─── SSL setup ────────────────────────────────────────────────────────────────
setup_ssl() {
  [ "$USE_SSL" != "yes" ] && return

  section "Konfiguracja SSL (Let's Encrypt)"

  # Tymczasowy nginx HTTP-only do weryfikacji domeny przez certbot
  local ssl_backup
  ssl_backup=$(cat nginx/nginx.conf)
  cat > nginx/nginx.conf << NGINX
events { worker_connections 1024; }
http {
  server {
    listen 80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'SSL setup in progress...'; add_header Content-Type text/plain; }
  }
}
NGINX
  docker compose -f "$COMPOSE_FILE" restart nginx
  sleep 2

  info "Generowanie certyfikatu SSL..."
  if ! docker run --rm \
    -v "certbot_www:/var/www/certbot" \
    -v "certbot_conf:/etc/letsencrypt" \
    certbot/certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email "$SSL_EMAIL" \
    --agree-tos --no-eff-email \
    -d "$DOMAIN"; then
    echo "$ssl_backup" > nginx/nginx.conf
    error "Nie udało się wygenerować certyfikatu. Upewnij się, że:\n  • Domena ${DOMAIN} wskazuje na IP tego serwera\n  • Port 80 jest otwarty\n  Możesz dodać SSL ręcznie później."
  fi

  # Przywróć właściwą konfigurację z SSL
  echo "$ssl_backup" > nginx/nginx.conf
  docker compose -f "$COMPOSE_FILE" restart nginx
  log "SSL skonfigurowany. Certyfikat ważny 90 dni (auto-odnowienie: skonfiguruj cron)."

  # Dodaj cron do odnowienia certyfikatu
  (crontab -l 2>/dev/null; echo "0 3 * * * docker run --rm -v certbot_www:/var/www/certbot -v certbot_conf:/etc/letsencrypt certbot/certbot renew --quiet && docker compose -f ${INSTALL_DIR}/docker-compose.prod.yml restart nginx") | crontab -
  log "Auto-odnowienie SSL skonfigurowane (cron: 3:00 każdej nocy)."
}

# ─── Wait for app ─────────────────────────────────────────────────────────────
wait_for_app() {
  info "Oczekiwanie na uruchomienie aplikacji..."
  local attempts=0
  until curl -sf "${APP_URL}/api/health" &>/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ $attempts -gt 20 ]; then
      warn "Aplikacja jeszcze się uruchamia."
      warn "Sprawdź logi: docker compose -f ${COMPOSE_FILE} logs -f"
      return
    fi
    printf "."
    sleep 3
  done
  echo
  log "Aplikacja odpowiada."
}

# ─── Success ──────────────────────────────────────────────────────────────────
show_success() {
  echo
  echo -e "${BOLD}${GREEN}════════════════════════════════════════${NC}"
  echo -e "${BOLD}${GREEN}  Instalacja zakończona pomyślnie!${NC}"
  echo -e "${BOLD}${GREEN}════════════════════════════════════════${NC}"
  echo
  echo -e "  ${BOLD}Adres panelu:${NC}  ${CYAN}${APP_URL}${NC}"
  echo -e "  ${BOLD}Katalog:${NC}       ${INSTALL_DIR}"
  echo
  echo -e "  ${YELLOW}Pierwsze kroki:${NC}"
  echo -e "  1. Otwórz ${CYAN}${APP_URL}/setup${NC} i utwórz konto administratora"
  echo -e "  2. Skonfiguruj integracje w Ustawieniach panelu"
  echo
  echo -e "  ${YELLOW}Zarządzanie:${NC}"
  echo -e "  • Aktualizacja:  cd ${INSTALL_DIR} && bash update.sh"
  echo -e "  • Logi API:      docker compose -f ${COMPOSE_FILE} logs -f api"
  echo -e "  • Restart:       docker compose -f ${COMPOSE_FILE} restart"
  echo -e "  • Stop:          docker compose -f ${COMPOSE_FILE} down"
  echo
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  print_banner
  check_requirements
  setup_directory
  setup_license
  setup_domain
  generate_secrets
  setup_integrations
  create_env
  create_nginx
  create_compose
  create_update_script
  start_services
  setup_ssl
  wait_for_app
  show_success
}

main "$@"
