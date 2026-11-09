#!/usr/bin/env bash
# ORA Digital Platform - one-command local setup (macOS / Linux).
#
#   ./scripts/setup.sh
#
# Safe to run again: it never overwrites an existing .env file, never
# re-creates the database schema, and only seeds the admin when the
# users table is empty.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- tools
for tool in node npm docker openssl; do
  command -v "$tool" >/dev/null 2>&1 || die "'$tool' is not installed or not in PATH."
done

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || die "Node.js 20 or newer is required (found $(node -v))."

docker info >/dev/null 2>&1 || die "Docker is not running. On macOS with Colima run: colima start"

# Many tools open files at once; macOS defaults to a very low limit (256).
ulimit -n 10240 2>/dev/null || true

# ------------------------------------------------------------ root .env
if [ ! -f .env ]; then
  say "Creating .env for Docker (PostgreSQL / RabbitMQ)"
  cat > .env <<ENVEOF
APP_NAME=ORA_Digital_Platform
APP_ENV=development

POSTGRES_USER=ora_app
POSTGRES_PASSWORD=$(openssl rand -hex 12)
POSTGRES_DB=ora_platform

RABBITMQ_USER=ora_worker
RABBITMQ_PASSWORD=$(openssl rand -hex 12)
ENVEOF
else
  say "Using existing .env"
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a

: "${POSTGRES_USER:?POSTGRES_USER missing in .env}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD missing in .env}"
: "${POSTGRES_DB:?POSTGRES_DB missing in .env}"

# ------------------------------------------------- auth-service .env
AUTH_ENV="services/auth-service/.env"
if [ ! -f "$AUTH_ENV" ]; then
  say "Creating $AUTH_ENV"
  cat > "$AUTH_ENV" <<ENVEOF
APP_NAME="ORA Authentication Service"
NODE_ENV=development
PORT=4000

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5433/${POSTGRES_DB}"

ACCESS_TOKEN_SECRET=$(openssl rand -base64 48 | tr -d '\n/+=')
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=7
REMEMBER_ME_REFRESH_TOKEN_EXPIRES_IN_DAYS=30

FRONTEND_URL=http://localhost:3000

# Super admin created by "npm run db:seed"
ADMIN_FIRST_NAME=ORA
ADMIN_LAST_NAME=Administrator
ADMIN_USERNAME=superadmin
ADMIN_EMAIL=admin@ora.local
ADMIN_INITIAL_PASSWORD=Adm1n!Strong

# Mailpit (development mail catcher, inbox: http://localhost:8025)
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
MAIL_FROM="ORA Platform <no-reply@ora.local>"

LOGIN_MAX_FAILED_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15
EMAIL_VERIFICATION_EXPIRES_IN_HOURS=24
PASSWORD_RESET_EXPIRES_IN_MINUTES=60
ENVEOF
else
  say "Using existing $AUTH_ENV"
fi

# ----------------------------------------------- journal-service .env
JMS_ENV="services/journal-service/.env"
AUTH_SECRET="$(grep -E '^ACCESS_TOKEN_SECRET=' "$AUTH_ENV" | head -1 | cut -d= -f2-)"
if [ ! -f "$JMS_ENV" ]; then
  say "Creating $JMS_ENV"
  cat > "$JMS_ENV" <<ENVEOF
APP_NAME="ORA Journal Service"
NODE_ENV=development
PORT=4001

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5433/${POSTGRES_DB}"

# Must be identical to ACCESS_TOKEN_SECRET of the auth service.
ACCESS_TOKEN_SECRET=${AUTH_SECRET}

FRONTEND_URL=http://localhost:3000

UPLOAD_DIR=./uploads
MAX_UPLOAD_MB=10

SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
MAIL_FROM="ORA Journals <no-reply@ora.local>"
ENVEOF
else
  say "Using existing $JMS_ENV"
  # The two services must share the token secret, otherwise every call is a 401.
  if ! grep -q "^ACCESS_TOKEN_SECRET=${AUTH_SECRET}\$" "$JMS_ENV"; then
    sed -i.bak "s|^ACCESS_TOKEN_SECRET=.*|ACCESS_TOKEN_SECRET=${AUTH_SECRET}|" "$JMS_ENV" && rm -f "$JMS_ENV.bak"
    echo "   aligned ACCESS_TOKEN_SECRET with the auth service"
  fi
fi

# -------------------------------------------------------- frontend .env
if [ ! -f frontend/.env ]; then
  say "Creating frontend/.env"
  # "localhost" (not 127.0.0.1) so the refresh cookie is sent by the browser.
  echo 'REACT_APP_API_URL=http://localhost:4000/api/v1' > frontend/.env
fi
grep -q '^REACT_APP_JMS_API_URL=' frontend/.env || \
  echo 'REACT_APP_JMS_API_URL=http://localhost:4001/api/v1/jms' >> frontend/.env

# ------------------------------------------------------------- Docker
say "Starting PostgreSQL, RabbitMQ and Mailpit"
docker compose up -d

say "Waiting for PostgreSQL to become healthy"
for i in $(seq 1 60); do
  status="$(docker inspect -f '{{.State.Health.Status}}' ora-postgres 2>/dev/null || echo starting)"
  [ "$status" = "healthy" ] && break
  sleep 2
done
[ "$status" = "healthy" ] || die "PostgreSQL did not become healthy. See: docker compose logs postgres"

# A Postgres data volume keeps the password it was created with. If an older
# volume exists, .env and the database disagree ("Authentication failed").
# Connect through the container's local socket (no password) and align it.
docker exec -i ora-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -qAt \
  -c "ALTER ROLE \"$POSTGRES_USER\" WITH PASSWORD '$POSTGRES_PASSWORD'" >/dev/null 2>&1 \
  || die "Could not sync the database password. Run: docker compose down -v && ./scripts/setup.sh"

psql_in_container() {
  docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" ora-postgres \
    psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
}

# ---------------------------------------------------- database schema
# Docker only runs infrastructure/postgres/init/*.sql the first time the
# data volume is created, so load it here when it is missing.
HAS_SCHEMA="$(psql_in_container -tAc "select to_regclass('iam.users') is not null" 2>/dev/null | tr -d '[:space:]' || true)"
if [ "$HAS_SCHEMA" != "t" ]; then
  say "Creating database schema"
  for file in infrastructure/postgres/init/*.sql; do
    psql_in_container -v ON_ERROR_STOP=1 -q < "$file" >/dev/null \
      || die "Failed to load $file"
    echo "   loaded $file"
  done
else
  say "Database schema already exists"
fi

# -------------------------------------------------- journal migrations
# The migrations are idempotent, so they are applied on every run.
say "Applying journal (JMS) database migrations"
for file in infrastructure/postgres/migrations/*.sql; do
  psql_in_container -v ON_ERROR_STOP=1 -q < "$file" >/dev/null \
    || die "Failed to apply $file"
  echo "   applied $file"
done

# ---------------------------------------------------------- npm install
say "Installing backend packages (also generates the Prisma client)"
(cd services/auth-service && npm install --no-audit --no-fund && npx prisma generate)

say "Installing journal-service packages"
(cd services/journal-service && npm install --no-audit --no-fund)

say "Seeding demo users for every journal role (password Demo@12345)"
(cd services/journal-service && npm run seed --silent) || echo "   (journal seed skipped - run: cd services/journal-service && npm run seed)"
(cd services/journal-service && npm run seed:demo --silent) || echo "   (demo content skipped - run: cd services/journal-service && npm run seed:demo)"

say "Installing frontend packages"
(cd frontend && npm install --no-audit --no-fund)

# ------------------------------------------------------------ admin seed
USER_COUNT="$(psql_in_container -tAc "select count(*) from iam.users" | tr -d '[:space:]')"
if [ "$USER_COUNT" = "0" ]; then
  say "Creating the Super Admin"
  (cd services/auth-service && npm run db:seed)
else
  say "Users already exist - skipping the admin seed"
fi

cat <<'DONE'

==========================================================
 Setup finished.

 Start everything:   ./scripts/start.sh
 Open the app:       http://localhost:3000   (journal site: /journal)
 Mail inbox (dev):   http://localhost:8025

 First login:   superadmin   /   Adm1n!Strong
 (you are asked to choose a new password straight away)
==========================================================
DONE
