#!/usr/bin/env bash
# Deploy / update the ORA test server.  Run ON THE SERVER, from the project root:
#
#   ./deploy/deploy.sh                 # first deploy or update
#   SEED_DEMO=false ./deploy/deploy.sh # skip demo users and demo journal content
#
# Safe to run again: .env is created once, migrations are idempotent,
# seeding only fills in what is missing.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
say() { printf '\n==> %s\n' "$*"; }
die() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null || die "Docker is not installed (see deploy/README.md, step 1)."
docker compose version >/dev/null 2>&1 || die "Docker Compose plugin is missing (see deploy/README.md, step 1)."

ENV_FILE=deploy/.env
if [ ! -f "$ENV_FILE" ]; then
  say "Creating $ENV_FILE"
  IP="${PUBLIC_IP:-$(curl -fsS -4 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')}"
  cat > "$ENV_FILE" <<ENVEOF
PUBLIC_URL=http://${IP}
COOKIE_SECURE=false
POSTGRES_USER=ora_app
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=ora_platform
ACCESS_TOKEN_SECRET=$(openssl rand -hex 32)
ADMIN_INITIAL_PASSWORD=Adm1n!$(openssl rand -hex 4)
ENVEOF
  chmod 600 "$ENV_FILE"
fi
set -a; . "$ENV_FILE"; set +a
DC="docker compose --env-file $ENV_FILE -f deploy/docker-compose.prod.yml"

say "Building images (first time takes a few minutes)"
$DC build

say "Starting the database"
$DC up -d postgres
for i in $(seq 1 60); do
  [ "$($DC ps --format '{{.Health}}' postgres)" = "healthy" ] && break; sleep 2
done
psql_in() { $DC exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"; }

HAS="$(psql_in -tAc "select to_regclass('iam.users') is not null" | tr -d '[:space:]')"
if [ "$HAS" != "t" ]; then
  say "Creating database schema"
  for f in infrastructure/postgres/init/*.sql; do psql_in -v ON_ERROR_STOP=1 -q < "$f" >/dev/null; echo "   loaded $f"; done
fi
say "Applying journal migrations"
for f in infrastructure/postgres/migrations/*.sql; do psql_in -v ON_ERROR_STOP=1 -q < "$f" >/dev/null; echo "   applied $f"; done

say "Starting all services"
$DC up -d

say "Seeding"
for i in $(seq 1 30); do $DC exec -T auth node -e "fetch('http://localhost:4000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" && break; sleep 2; done
if [ "$(psql_in -tAc 'select count(*) from iam.users' | tr -d '[:space:]')" = "0" ]; then
  $DC exec -T auth npm run db:seed --silent
fi
if [ "${SEED_DEMO:-true}" = "true" ]; then
  $DC exec -T journal npm run seed --silent
  $DC exec -T journal npm run seed:demo --silent
fi

cat <<DONE

==========================================================
 ORA test server is up.

 Platform   : ${PUBLIC_URL}
 Journal    : ${PUBLIC_URL}/journal
 Test inbox : http://${PUBLIC_URL#http://}:8025   (all e-mails land here)

 Super admin: superadmin / ${ADMIN_INITIAL_PASSWORD}
              (change the password when asked at first login)
 Demo users : jms_<role>@ora.local / Demo@12345  (see README, demo users)
 Credentials are stored in deploy/.env on this server only.
==========================================================
DONE
