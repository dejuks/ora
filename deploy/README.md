# Deploy the ORA platform to a test server

Result: `http://<server-ip>/` (platform), `/journal` (public journal site),
`http://<server-ip>:8025` (test e-mail inbox). One Ubuntu 22.04/24.04 server,
2 GB RAM minimum, 20 GB disk.

## 1. Prepare the server (once)

```bash
ssh root@<server-ip>
curl -fsSL https://get.docker.com | sh          # installs Docker + Compose plugin
apt-get install -y unzip rsync openssl curl
ufw allow 22 && ufw allow 80 && ufw allow 8025 && ufw --force enable   # if ufw is used
```
If your provider has its own firewall (cloud security group), open ports 80 and 8025 there too.

## 2. Copy the project to the server (from your Mac)

```bash
cd /Users/mac/develop
rsync -az --exclude node_modules --exclude build --exclude dist --exclude .git \
  --exclude '.env' --exclude 'services/*/.env' --exclude 'frontend/.env' --exclude uploads \
  ora-fresh/ root@<server-ip>:/opt/ora/
```
(Re-run the same command later to send updates; it only transfers changes.)

## 3. Deploy (on the server)

```bash
ssh root@<server-ip>
cd /opt/ora
./deploy/deploy.sh
```
First run builds the images (about 5-8 minutes). At the end it prints the
URLs and the super-admin password. Passwords and secrets are generated and
kept in `/opt/ora/deploy/.env` (never copied back to your Mac or Git).

## 4. Check it works

1. Open `http://<server-ip>/journal` -> journal home with Vol. 1 No. 1 and 6 articles.
2. Open `http://<server-ip>/login`, sign in as `jms_author@ora.local` / `Demo@12345`
   -> Author dashboard.
3. Register a new account -> open `http://<server-ip>:8025` -> the verification e-mail is there.

## Daily use

| Task | Command (in /opt/ora) |
|---|---|
| Update after new code | rsync again, then `./deploy/deploy.sh` |
| Logs | `docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml logs -f auth journal` |
| Restart | `docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml restart` |
| Skip demo users on next deploy | `SEED_DEMO=false ./deploy/deploy.sh` |
| Wipe everything (DB + uploads) | `docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml down -v` |
| Database backup | `docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml exec -T postgres pg_dump -U ora_app ora_platform > backup.sql` |

## Notes

* This is a **test** setup: plain http, a built-in test mail inbox (no real e-mail is sent),
  and demo users with a known password. Do not put real data on it.
* For real use later: add a domain, put HTTPS in front (Caddy or certbot), set
  `PUBLIC_URL=https://...` and `COOKIE_SECURE=true` in `deploy/.env`, use a real SMTP
  server, close port 8025 and run with `SEED_DEMO=false`.
* If the server's public IP is detected wrongly, set it yourself the first time:
  `PUBLIC_IP=1.2.3.4 ./deploy/deploy.sh`.
