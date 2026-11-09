# ORA Digital Platform

Integrated digital research ecosystem for the Oromo Research Association (ORA).
Microservices (Node/Express + PostgreSQL + RabbitMQ) with a React frontend.

| Folder | Purpose |
|---|---|
| `services/auth-service` | Authentication, users, roles (Express 5, TypeScript, Prisma 7) |
| `services/journal-service` | Journal Management System API (Express 5, TypeScript, PostgreSQL schema `jms`) |
| `frontend` | React 19 + Ant Design + Tailwind (includes the journal site and portals under `src/features/jms`) |
| `infrastructure/postgres/init` | SQL that creates the auth schema (loaded by `scripts/setup.sh`) |
| `infrastructure/postgres/migrations` | Journal (JMS) schema and roles, applied on every `setup.sh` run (idempotent) |
| `compose.yaml` | PostgreSQL 17, RabbitMQ 4, Mailpit (dev mail catcher) |
| `scripts` | `setup.sh` (first-time setup), `start.sh` (run everything) |

## Requirements
macOS or Linux, Node.js 20+, Docker (on macOS: Colima, run `colima start`).

## Quick start (first time)
```bash
cd ora-digital-platform
./scripts/setup.sh      # creates .env files, starts Docker, loads schema, installs, seeds admin
./scripts/start.sh      # starts Docker + backend + frontend, Ctrl+C stops all
```
Open http://localhost:3000 and sign in as `superadmin` / `Adm1n!Strong`.
You are asked to choose a new password at once (8+ characters, upper and lower
case, a number and a special character, not containing `admin`).

Development mail (verification and reset links) arrives at http://localhost:8025.

## Run the pieces yourself
```bash
docker compose up -d
cd services/auth-service && npm run dev      # http://localhost:4000
cd services/journal-service && npm run dev   # http://localhost:4001
cd frontend && npm start                     # http://localhost:3000
```

## Journal Management System (JMS)
Public journal site: http://localhost:3000/journal (issues, articles, citations, editorial board, contact).

Each JMS role opens its own portal after sign-in:

| JMS role | Portal | What it does |
|---|---|---|
| Author (given to every self-registered user) | `/author/...` | submit, track, revise, pay the publication fee, approve proofs |
| Editor-in-Chief / Associate Editor / Editor | `/eic/...` | screen, invite reviewers, decide |
| Reviewer | `/reviewer/...` | accept or decline, submit the double-blind review |
| Journal Manager | `/managing-editor/...` | production, proofs, fees, issues, publish with DOI |
| Module Admin | `/admin/...` | journal settings, editorial board, categories, article types, messages |

Demo users (created by `setup.sh`, or run `cd services/journal-service && npm run seed` any time; password `Demo@12345` for all):

| Username | JMS role |
|---|---|
| `jms.moduleadmin` | Module Admin |
| `jms.manager` | Journal Manager |
| `jms.eic` | Editor-in-Chief |
| `jms.associate` | Associate Editor |
| `jms.editor` | Editor |
| `jms.reviewer1`, `jms.reviewer2` | Reviewer |
| `jms.author` | Author |
| `jms.reader` | Reader |

Change `SEED_PASSWORD` to use another password, and do not run the seed in production.

Give people roles in the app: **Users → Roles** (super admin). The same journal token secret
is shared with the auth service, so `ACCESS_TOKEN_SECRET` must be identical in both `.env` files
(`setup.sh` copies it for you).

Payment: there is no payment gateway. The author pays by Telebirr/CBEbirr outside the system and
enters the transaction reference; the Journal Manager confirms it (or waives the fee).

## Tests
```bash
cd services/journal-service
npm run typecheck
npm run test:smoke          # 145 API checks; creates its own users/data and cleans up
```
```bash
cd services/auth-service
npm run typecheck
ADMIN_IDENTIFIER=superadmin ADMIN_PASSWORD='<current admin password>' \
  BASE_URL=http://localhost:4000/api/v1 npm run test:smoke
```
Raise the rate limits first (`LOGIN_RATE_LIMIT=1000`, `REGISTER_RATE_LIMIT=1000`,
`EMAIL_ACTION_RATE_LIMIT=1000` in `services/auth-service/.env`) and remove them afterwards.

## Troubleshooting
| Problem | Fix |
|---|---|
| `POSTGRES_PASSWORD is required` | The root `.env` is missing. Run `./scripts/setup.sh`. |
| `Authentication failed ... for ora_app` | Postgres only reads its password when its volume is first created. Make `DATABASE_URL` match the root `.env`, or reset with `docker compose down -v` (deletes DB data) then `./scripts/setup.sh`. |
| `relation "iam.users" does not exist` | Schema not loaded. Run `./scripts/setup.sh` (it loads it). |
| TypeScript: cannot find `../generated/prisma/client.js` | Run `cd services/auth-service && npx prisma generate`. |
| `EAGAIN spawn sh` | macOS open-files limit. Run `ulimit -n 10240` in that terminal, or use `./scripts/start.sh`. |
| `ENOENT uv_cwd` | Your terminal is inside a folder that was deleted/replaced. `cd ~`, then `cd` into the project again (or open a new tab). |
| Logged out on every page reload | Use `http://localhost:3000` and `REACT_APP_API_URL=http://localhost:4000/api/v1` (never 127.0.0.1). |
| CORS error | `FRONTEND_URL` in `services/auth-service/.env` and `services/journal-service/.env` must be exactly `http://localhost:3000`. |
| Journal pages show `401` after login | `ACCESS_TOKEN_SECRET` differs between the auth and journal `.env`. Run `./scripts/setup.sh` (it aligns them) and restart. |
| `schema "jms" does not exist` | Migrations not applied. Run `./scripts/setup.sh`. |

## Never commit secrets
`.env` files are ignored by git. Only `.env.example` files are committed.
