# FallDetect — Frontend

Next.js app (Live Monitor screen, auth, incident lifecycle) backed by
PostgreSQL via Prisma. Receives fall events from the ingest server and
displays them live to on-shift nurses.

```
model → ingest server (Python) → this app's /api/monitor/ingest → DB → Live Monitor UI
```

---

## 1. Prerequisites (Windows)

**Node.js** (v18.18+ or v20+ recommended for current Next.js versions):

1. Download from [nodejs.org](https://nodejs.org/) — the **LTS** version.
2. Run the installer, keep defaults (it adds Node/npm to PATH automatically).
3. Confirm in PowerShell or Command Prompt:
   ```powershell
   node --version
   npm --version
   ```

**PostgreSQL** — this app needs a Postgres database. Easiest option:
**`create-db`** — spins up a free hosted Postgres database instantly, no
signup or local Postgres install required.

From inside `frontend/`, once dependencies are installed (step 3 below):
```powershell
npx create-db@latest
```
This prints a `DATABASE_URL` connection string — copy it for use in step 4.
Unlike a local database, this one is hosted, so it persists independently of
whether your machine/terminal is running — no need to keep a separate
process alive alongside `npm run dev`.

> Already have your own Postgres instance (a real server, local install,
> Prisma's local dev DB, etc.)? That works too — just point `DATABASE_URL`
> at it instead. `create-db` is just the path of least setup for local
> testing/demo.

**git** — [git-scm.com](https://git-scm.com/downloads), if cloning fresh.

> macOS/Linux users: same tools apply — `brew install node postgresql` covers
> both on macOS.

---

## 2. Where this lives / where to run commands from

```
full-fall-detect/
├── server/            (Python ingest server — separate README)
└── frontend/           ← run ALL commands below from inside this folder
    ├── app/
    ├── prisma/
    │   └── schema.prisma
    ├── package.json
    ├── .env             (you create this — see step 4)
    └── README.md        (this file)
```

Open a terminal and `cd` into the frontend folder:

```powershell
cd path\to\full-fall-detect\frontend
```

> Adjust the folder name above (`frontend/`) to match your actual repo
> structure if it differs.

---

## 3. Installing packages on a fresh clone

```powershell
npm install
```

This installs everything listed in `package.json` — Next.js, Prisma client,
React Query, etc.

---

## 4. Environment setup

Create a `.env` file inside the frontend project root:

```env
# Database connection — paste the connection string printed by `npx create-db@latest`
DATABASE_URL="paste-the-connection-string-from-create-db-here"

# Session auth — used to sign/verify the fd_session JWT cookie
AUTH_JWT_SECRET=some-long-random-secret

# Shared secret for the Python ingest server → this app's /api/monitor/ingest
# MUST match the value in server/.env exactly
MONITOR_INGEST_SECRET=some-long-random-shared-secret
```

- `DATABASE_URL` — if using `npx create-db@latest` (step 1), copy the
  connection string it prints in the terminal. If using your own Postgres
  instance instead, use its connection string in the same
  `postgresql://user:password@host:port/dbname?schema=public` format.
- `AUTH_JWT_SECRET` — any long random string; used to sign nurse/admin login
  sessions. Keep it consistent between restarts or existing sessions will be
  invalidated.
- `MONITOR_INGEST_SECRET` — **must be identical** to the same variable in the
  Python server's `.env`, or the ingest server's calls will be rejected with
  `401 Unauthorized`.

`.env` is gitignored — you will not find it in a fresh clone; create it
yourself using the template above.

---

## 5. Database setup

Make sure `.env`'s `DATABASE_URL` has the connection string printed by
`npx create-db@latest` (step 1).

**Generate the Prisma client:**
```powershell
npx prisma generate
```

**Apply the schema to your database:**
```powershell
npx prisma migrate dev
```
This creates all tables (`facilities`, `rooms`, `incidents`, etc.) based on
`prisma/schema.prisma`. On a truly fresh database this will prompt to create
an initial migration — accept it.

**(Optional) Seed sample data** — if a seed script exists in the project
(check `package.json` for a `"prisma": { "seed": ... }` entry or a
`prisma/seed.ts` file):
```powershell
npx prisma db seed
```
This is how you'd get a facility, floors, rooms, and a test user without
manually clicking through the app first. Skip this if no seed script exists
yet — you'll need to register a user and create facility data through the UI
instead.

**Browse the database visually** (handy for debugging incident state):
```powershell
npx prisma studio
```
Opens at `http://localhost:5555`.

---

## 6. Running the app

```powershell
npm run dev
```

You should see:
```
▲ Next.js ...
- Local:        http://localhost:3000
```

Open **http://localhost:3000** in your browser. You'll land on the login
screen (`/`) — register a new user if this is a fresh database, or log in
with existing seeded credentials.

> **This app must be running** for the Python ingest server to have anywhere
> to forward fall events to — start this before testing the ingest server.

---

## 7. Verifying it's alive

Load `http://localhost:3000` in a browser and confirm the login screen
renders. There's no dedicated `/api/health` route by default — if you add
one later, `curl http://localhost:3000/api/health` is the equivalent check
used in the ingest server's README.

---

## 8. Triggering / testing incidents from this side

**Via the UI:** on the Live Monitor screen, use the **"Simulate fall"**
button in the top bar — creates a real `Incident` row through
`POST /api/alerts`, same as a real detection would.

**Via curl, hitting the ingest endpoint directly** (bypasses the Python
server — useful to test the frontend in isolation):

macOS/Linux:
```bash
curl -X POST http://localhost:3000/api/monitor/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <MONITOR_INGEST_SECRET from your .env>" \
  -d "{\"deviceId\":\"CAM-205\",\"confidence\":92,\"detectedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"eventType\":\"fall\"}"
```

Windows PowerShell:
```powershell
$now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
curl -X POST http://localhost:3000/api/monitor/ingest `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <MONITOR_INGEST_SECRET from your .env>" `
  -d "{\"deviceId\":\"CAM-205\",\"confidence\":92,\"detectedAt\":\"$now\",\"eventType\":\"fall\"}"
```

Replace `<MONITOR_INGEST_SECRET from your .env>` with the actual value from
your `.env` file. Replace `CAM-205` with a real `deviceId` that exists on a
`Sensor` row in your database (check via `npx prisma studio`).

> Always use a current timestamp for `detectedAt` — reusing a fixed/stale
> timestamp across repeated tests can collide with existing incident records
> and cause the UI to display a frozen or incorrect elapsed timer.

The Live Monitor screen polls automatically every few seconds — no refresh
needed to see a triggered incident appear.

---

## 9. Common issues

| Symptom | Likely cause |
|---|---|
| `401 Unauthorized` on `/api/monitor/ingest` | `MONITOR_INGEST_SECRET` mismatch between this app's `.env` and the ingest server's `.env` |
| `307 Temporary Redirect` on `/api/monitor/ingest` | Route isn't excluded from session-auth in `middleware.ts` — check the `matcher` config includes `api/monitor/ingest` in its exclusion list |
| Incident created but doesn't appear on screen without a manual refresh | Confirm `refetchInterval` is set on `useRoomsQuery`/`useActivityQuery` in `queries.ts` |
| Elapsed timer stuck at `0:00` | `detectedAt` sent was a future timestamp relative to your machine's clock — always use current time when testing |
| `Error: Could not find the module "...global-error.js#default"` | Stale Next.js dev cache — run `rm -rf .next` (or delete the `.next` folder on Windows) and restart `npm run dev` |
| Prisma errors on startup / migration | Confirm Postgres is actually running and `DATABASE_URL` credentials/port match your local setup |