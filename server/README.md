# FallDetect — Ingest Server

Python (FastAPI) service that sits between the fall-detection model and the
Next.js frontend. Receives fall events, validates/forwards them to the
frontend's `/api/monitor/ingest` route.

```
model (detects fall) → this server (validates, forwards) → Next.js /api/monitor/ingest → DB
```

---

## 1. Prerequisites (Windows)

You need **Python 3.11+** installed and on your `PATH`.

1. Download Python from [python.org/downloads](https://www.python.org/downloads/).
2. During install, **check the box "Add python.exe to PATH"** on the first
   install screen — easy to miss, and everything below assumes this was done.
3. Confirm it worked. Open **PowerShell** or **Command Prompt** and run:
   ```powershell
   python --version
   ```
   You should see something like `Python 3.11.x` or `Python 3.13.x`. If you
   get `'python' is not recognized...`, Python isn't on your PATH — reinstall
   and make sure that checkbox is ticked, or restart your terminal after
   installing.
4. Confirm `pip` (Python's package manager) came with it:
   ```powershell
   pip --version
   ```

You'll also need **git** if you're cloning the repo fresh — [git-scm.com](https://git-scm.com/downloads).

> macOS/Linux users: Python 3 is usually preinstalled, but confirm with
> `python3 --version`. All commands below use `python`/`pip` — swap in
> `python3`/`pip3` if your system requires it.

---

## 2. Where this lives / where to run commands from

After cloning the full project repo, this service lives in the `server/`
folder:

```
full-fall-detect/
├── frontend/          (or wherever the Next.js app lives)
└── server/            ← run ALL commands below from inside this folder
    ├── app/
    │   ├── main.py
    │   ├── config.py
    │   ├── schemas.py
    │   └── frontend_client.py
    ├── requirements.txt
    ├── .env            (you create this — see step 4)
    └── README.md       (this file)
```

Open a terminal and `cd` into `server/` before doing anything else:

```powershell
cd path\to\full-fall-detect\server
```

---

## 3. Installing packages on a fresh clone

**Step 1 — create a virtual environment** (keeps this project's Python
packages isolated from the rest of your system):

```powershell
python -m venv venv
```

**Step 2 — activate it.**

Windows (PowerShell):
```powershell
venv\Scripts\Activate.ps1
```
> If PowerShell blocks the script with an execution-policy error, run this
> once: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, then
> retry the activate command.

Windows (Command Prompt / `cmd.exe`):
```cmd
venv\Scripts\activate.bat
```

macOS/Linux:
```bash
source venv/bin/activate
```

Your terminal prompt should now be prefixed with `(venv)` — confirm this
before continuing.

**Step 3 — install dependencies:**

```powershell
pip install -r requirements.txt
```

This installs `fastapi`, `uvicorn`, `httpx`, `python-dotenv`, `pydantic`, and
their sub-dependencies, all scoped to this `venv`.

> **Every time you open a new terminal to work on this project**, you need
> to re-activate the venv (step 2 above) before running anything — activation
> doesn't persist across terminal sessions.

---

## 4. Environment setup

Create a `.env` file inside `server/` (same folder as this README):

```env
MONITOR_INGEST_SECRET=some-long-random-shared-secret
FRONTEND_INGEST_URL=http://localhost:3000/api/monitor/ingest
```

- `MONITOR_INGEST_SECRET` must be **identical** to the value set in the
  Next.js project's own `.env` (same variable name on that side) — this is
  the shared secret used to authenticate server-to-server calls.
- `FRONTEND_INGEST_URL` should point at wherever the Next.js app is running
  locally (default dev port `3000`).

`.env` is gitignored — you will not find it in a fresh clone; you must create
it yourself using the values above (ask whoever owns the shared secret for
the real value, don't invent your own for a shared/demo environment).

---

## 5. Running the server

With the venv activated (`(venv)` visible in your prompt) and `.env` in
place:

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

> **Why `python -m uvicorn` instead of just `uvicorn`:** on some machines,
> a globally-installed `uvicorn` shadows the one inside your venv, causing
> confusing "module not found" errors even though everything is installed
> correctly. `python -m uvicorn` guarantees it runs inside the active venv.

You should see:
```
INFO:     Will watch for changes in these directories: [...]
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

The server is now running at **http://localhost:8000**.

**Also make sure the Next.js frontend is running** (`npm run dev`, typically
on `http://localhost:3000`) — this server has nothing to forward events to
otherwise.

---

## 6. Verifying it's alive

Interactive API docs (Swagger UI) — open in your browser:
```
http://localhost:8000/docs
```

Or check the health endpoint:
```bash
curl http://localhost:8000/health
```
Expected response:
```json
{"status": "ok"}
```

---

## 7. Triggering a fall event (mock requests)

### Using curl

**macOS/Linux/Git Bash:**
```bash
curl -X POST http://localhost:8000/events/fall \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"CAM-201\",\"confidence\":92,\"detectedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
```

**Windows PowerShell:**
```powershell
$now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
curl -X POST http://localhost:8000/events/fall `
  -H "Content-Type: application/json" `
  -d "{\"deviceId\":\"CAM-201\",\"confidence\":92,\"detectedAt\":\"$now\"}"
```

> **Important:** always use a *current* timestamp for `detectedAt`, not a
> hardcoded one — reusing the same timestamp across test requests can cause
> collisions with existing incident records and make the frontend behave
> unexpectedly (stuck timers, wrong alert state).

**Simple version with a fixed timestamp** (fine for quick one-off tests, but
prefer the dynamic version above for repeated testing):
```bash
curl -X POST http://localhost:8000/events/fall \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"CAM-201","confidence":92,"detectedAt":"2026-08-09T12:00:00Z"}'
```

### Using Swagger UI (no terminal needed)

1. Go to `http://localhost:8000/docs`
2. Expand `POST /events/fall`
3. Click **"Try it out"**
4. Edit the JSON body, e.g.:
   ```json
   {
     "deviceId": "CAM-201",
     "confidence": 92,
     "detectedAt": "2026-08-09T12:00:00Z"
   }
   ```
5. Click **"Execute"** and check the response below.

### What a successful response looks like

```json
{
  "roomId": "cmsl9gs3b00098lkhjfz7xx1b",
  "incidentId": "cmsla7ub30001tukh27ps8ggc"
}
```

If instead you get errors:

| Response | Likely cause |
|---|---|
| `401 Unauthorized` | `MONITOR_INGEST_SECRET` mismatch between this server's `.env` and the frontend's `.env` |
| `404 Unknown device` | `deviceId` doesn't match any `Sensor` row in the database |
| `502 Could not reach frontend ingest endpoint` | Next.js dev server isn't running, or `FRONTEND_INGEST_URL` is wrong |
| `409` / `already_open` | That room already has an open (unresolved) incident |

---

## 8. Common issues

- **`ModuleNotFoundError: No module named 'httpx'` (or similar) despite
  installing it** — you're likely running `uvicorn` from outside the venv.
  Always activate the venv first, and run with `python -m uvicorn ...`, not
  bare `uvicorn ...`.
- **VS Code shows red squiggly import errors** even though the server runs
  fine — your editor's Python interpreter isn't set to the venv. In VS Code:
  `Cmd/Ctrl+Shift+P` → "Python: Select Interpreter" → choose the one inside
  `server/venv/`.
- **`307 Temporary Redirect` when calling the frontend** — usually means the
  Next.js auth middleware is intercepting the request. Confirm
  `/api/monitor/ingest` is excluded from the session-auth matcher in the
  frontend's `middleware.ts`.