# ORA Auth - what changed and how to run it

## 1. One-time setup
1. `docker compose up -d` (now also starts **Mailpit**: inbox http://localhost:8025, SMTP 1025).
2. `services/auth-service`: `npm install` (adds `nodemailer`), then add the new keys from
   `.env.example` to your `.env` (SMTP_*, MAIL_FROM, REMEMBER_ME_REFRESH_TOKEN_EXPIRES_IN_DAYS,
   LOGIN_* ...). Set `REFRESH_TOKEN_EXPIRES_IN_DAYS=7` (SRS) - code default is now 7.
3. `frontend/.env`: set `REACT_APP_API_URL=http://localhost:4000/api/v1` (**localhost, not 127.0.0.1**,
   otherwise the browser will not send the refresh cookie).
4. Restart the auth service. No database migration is needed (no schema change).

## 2. API (all under /api/v1/auth)
| Method | Path | Notes |
|---|---|---|
| POST | /register | self-registration -> status PENDING, role JMS/AUTHOR, verification e-mail (24 h) |
| POST | /verify-email | `{token}` activates the account |
| POST | /resend-verification | `{email}` generic answer, 60 s cooldown |
| POST | /login | `{identifier,password,rememberMe}`; lockout 5 failures / 15 min |
| POST | /refresh | rotates the httpOnly refresh cookie, returns new access token |
| POST | /logout | revokes the session, clears cookie |
| GET/PATCH | /me | profile, roles, modules, permissions |
| POST | /change-password | signs out other devices, returns a fresh token |
| POST | /forgot-password, /reset-password | e-mail link, 60 min, single use, revokes all sessions |

Users (Super Admin): `GET /users` (filters: search, status, module_code, role_code), `GET /users/stats`, `GET /users/options`, `POST /users`, `PATCH /users/:id/status`.

Access token claims for other microservices: `sub`, `sid`, `roles` (system role codes),
`modules` (`{JMS:["AUTHOR"]}`), `mcp` (must change password). HS256, issuer `ora-auth-service`,
audience `ora-digital-platform` - other services verify with the same `ACCESS_TOKEN_SECRET`.

## 3. Test
`ADMIN_IDENTIFIER=superadmin ADMIN_PASSWORD='...' npm run test:smoke` (service + Mailpit running).
