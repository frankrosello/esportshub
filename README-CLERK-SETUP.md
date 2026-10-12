# EsportsHub Clerk migration (backend starter)

This is a replacement for `backend/src/index.js` and uses Clerk sign-in. **Do not deploy before preparing the frontend and testing.** The older `setup.html` that accepts a password is no longer compatible.

## 1. Prepare Turso

Existing users table requires `password_hash TEXT NOT NULL`; this Worker fills it with an unusable random placeholder for Clerk-created users until a proper schema migration removes that column. It does **not** store or derive Clerk passwords.

Run these commands only if the column/index do not already exist:

```sql
ALTER TABLE users ADD COLUMN clerk_user_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
```

Before using real accounts, ensure `users` and `memberships` have the schema from v0.6. Do not drop or recreate your database. Future migration should remove `password_hash` after confirming every account is Clerk-backed.

## 2. Install and configure

From backend directory:

```sh
npm install @clerk/backend @libsql/client
npx wrangler secret put CLERK_SECRET_KEY --name esportshub-api
npx wrangler secret put CLERK_PUBLISHABLE_KEY --name esportshub-api
```

Keep `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and temporarily `BOOTSTRAP_SECRET` in Cloudflare secrets. `FRONTEND_ORIGIN` in `wrangler.jsonc` must list the exact allowed website origins, e.g. `http://localhost:8000,https://YOURUSERNAME.github.io` (not the page path). Copy `backend/src/index.js` into your project. Run `node --check src/index.js` then `npx wrangler deploy`.

## 3. Frontend changes REQUIRED

Create a Clerk application and sign in through its JavaScript frontend SDK. The user's verified Clerk session token must be passed to the Worker as `Authorization: Bearer <session token>` on every protected request. The Worker independently validates that token. Never send your Clerk secret key to the website, and never trust a role sent by the browser.

After signing into Clerk and verifying your email, use the token to call **POST /setup** with header `X-Bootstrap-Secret: <existing secret>`. No JSON password is necessary. In JS, once Clerk has loaded and a signed-in session exists:

```js
const sessionToken = await window.Clerk.session.getToken();
const response = await fetch('https://esportshub-api.frankierose212005.workers.dev/setup', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'X-Bootstrap-Secret': bootstrapSecret
  }
});
console.log(response.status, await response.json());
```

Use the Clerk frontend SDK according to its current documentation; the snippet above assumes Clerk is already loaded and signed in. Do not store or log tokens or secrets. The one-time setup assigns the first Clerk user the Admin role and creates Overwatch if necessary. Check `GET /me` using the Clerk bearer token. Once the admin signs in and succeeds, delete `BOOTSTRAP_SECRET` from your Worker secrets and remove the first-admin form from public hosting.

Existing `/auth/login`, `/auth/register`, and `/auth/logout` endpoints are intentionally removed. Account signup and logout happen via Clerk. To join EsportsHub, a signed-in Clerk user calls `POST /invites/redeem` with `{"inviteToken":"..."}`. Admins/managers/captains issue invitations via `POST /invites` with the existing role/game/team constraints.

## 4. Testing and limitations

- `GET /health` and `GET /health/db` test API availability and a read query. They do not prove authentication works.
- Test first-admin enrollment, `GET /me`, normal invites, cross-team isolation, and private concerns before inviting actual users.
- This is a **starter**, not audited production auth. Single-use invitation claiming under concurrent requests, race-free bootstrap enrollment, secure user-deletion sync, account recovery, audit trails, and migration of existing users need further work.
- Private concern records should **not** be collected until this backend has received a security review and access testing.
- The old `live.html` custom password form will not authenticate against this backend. Update the frontend before swapping production Workers.
