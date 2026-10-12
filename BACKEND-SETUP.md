# EsportsHub backend — setup guide (v0.6 pilot)

**Status:** Real Worker API and connected pilot UI are implemented, but NOT deployed or integrated into the original local-demo dashboard. The browser demo in `index.html` continues to use localStorage; `live.html` is the separate real-data test portal. Don't submit sensitive real player concerns until you've completed a security review and verified permissions with separate test users.

## 1. Prerequisites (free tiers)

- Node.js LTS, npm, a GitHub account.
- Turso account and database (get your database URL and database auth token).
- Cloudflare account and Workers access.

## 2. Create the database

Create an empty Turso SQLite database via Turso dashboard or CLI. Apply `database/schema.sql` using the Turso SQL console, or Turso CLI:

```bash
# Run from the EsportsHub folder; replace database-name
# If your installed Turso CLI supports shell redirection:
turso db shell database-name < database/schema.sql
```

You may also paste schema.sql into the database SQL editor. It creates accounts, roles, games, teams, events, attendance availability, shared reports, confidential concerns, invitations, and sessions. No real users or test rosters are automatically imported.

## 3. Configure Cloudflare Workers

```bash
cd backend
npm install
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your **private** Turso database URL/token and a long random `BOOTSTRAP_SECRET`. Never commit `.dev.vars`. For deployment, set actual Cloudflare secrets:

```bash
npx wrangler login
npx wrangler secret put TURSO_DATABASE_URL
npx wrangler secret put TURSO_AUTH_TOKEN
npx wrangler secret put BOOTSTRAP_SECRET
```

Edit `backend/wrangler.jsonc` to set `FRONTEND_ORIGIN` to the *exact* site origin, e.g. `https://YOURNAME.github.io` (no path). During local testing, `http://localhost:8000` is preset. To allow both, comma-separate origins. Deploy:

```bash
npm run deploy
```

Copy the resulting `https://...workers.dev` URL into `live.html`'s API URL field.

## 4. Initialize your first administrator

Only run ONCE on a new database, with your configured setup secret. You need a personal email and a password of at least 12 characters:

```bash
curl -X POST 'https://YOUR-WORKER.workers.dev/setup' \
  -H 'Content-Type: application/json' \
  -H 'X-Bootstrap-Secret: YOUR-LONG-SECRET' \
  -d '{"name":"Primary Admin","email":"you@example.com","password":"CHANGE-THIS-TO-A-LONG-UNIQUE-PASSWORD"}'
```

Setup refuses to run if an account already exists. **Do not embed the setup secret or Turso token in frontend code.** After initializing, consider deleting the `BOOTSTRAP_SECRET` secret so this endpoint is inaccessible.

## 5. Test the live interface

From the `EsportsHub/` folder:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/live.html`. Set the Worker URL and sign in. Create a team for Overwatch. Generate role-specific invitations and try registration in a separate browser profile. Team players can view schedules/shared reports, submit their own availability, and submit private concerns. Captains can schedule events and publish team reports. Game managers can review team concerns and manage teams in their game. Admins can create games, teams, and staff invitations.

The legacy `index.html` demo account selector is **not** connected to these accounts and is **not** an access-control mechanism. The new live portal is deliberately separate to avoid exposing private database information through demo role switching.

## 6. Publish frontend free on GitHub Pages

Upload all frontend files including `live.html` and `js/live.js` to your existing static website repository. Remember that GitHub Pages serves static content only; Cloudflare Workers hosts the real backend. Set Worker `FRONTEND_ORIGIN` to `https://YOURNAME.github.io` and redeploy. The site URL will be `https://YOURNAME.github.io/REPOSITORY/live.html` unless using a root user site.

## API implemented

| Method | Endpoint | Access |
|---|---|---|
| POST | /setup | One-time bootstrap with server secret |
| POST | /auth/login, /auth/register | Public (registration requires valid invitation) |
| POST | /auth/logout | Signed in |
| GET | /me | Signed in |
| GET, POST | /games | Assigned games; create admin-only |
| GET, POST | /teams | Assigned teams; create game manager/admin |
| GET, PATCH, DELETE | /teams/:id | Team members; edit/delete manager/admin |
| POST | /invites | Scoped management permissions |
| GET, POST | /teams/:id/events | Team read; captain+ write |
| GET, PUT | /teams/:id/availability | Own data for players, team data for captains+; own write |
| GET, POST | /teams/:id/reports | Team read; captain+ write |
| POST | /teams/:id/concerns | Team members submit privately |
| GET | /teams/:id/concerns | Game manager/admin **only** |

## Security and remaining work

- Authorization is enforced **in the Worker**, not in dropdowns or browser storage. API secrets stay server-side. Invitations are hashed in storage, one-use, and expire after 72 hours. Login uses salted PBKDF2 password hashes and hashed, 7-day session tokens.
- Currently only new registered users show up in the live portal. The 6 local demo rosters are not real registered accounts and are not synced yet.
- Before real rollout: add login rate limiting, audit logging for confidential concerns, user consent and retention/deletion policy, password reset, email verification, invitation redemption concurrency protection, session/account management, backups and tests for role boundaries.
- The original When2meet grid is not connected to the live API yet. The live pilot stores weekly availability as half-hour slot numbers, pending the interactive grid integration.
- The live portal is a minimal integration test UI, not yet the finished main dashboard. No automatic transfer of localStorage reports into Turso.
