<!-- location: QUICKSTART.md (project root) -->
# FallDetect — Quick Start

For when `frontend/.env` (laptop 1) and `backend/.env` (laptop 2) are **already filled in**.
First-time Supabase and `.env` setup: see the full *Installation and Setup Guide*.

| | Laptop 1 — Head Nurse | Laptop 2 — Camera Laptop |
|---|---|---|
| Folder | `frontend/` | `backend/` + `config/` |
| Runs | Website, port **3000** | Cameras + AI + video, port **8002** |

Both laptops: **same Wi-Fi**, same copy of `config/cameras.json`.

---

## 1. Install (once)

### Laptop 1 — Head Nurse

Needs **Node.js 22 LTS** (`node -v` → v20.9 or higher).

```bash
cd frontend
npm install
npx prisma migrate deploy
npx prisma db seed          # creates admin@fall.example / password123 (wipes the database!)
npm run seed:cameras        # rooms, sensors and patients from config/cameras.json
npm run build
```

Firewall (Windows, PowerShell **as Administrator**):

```powershell
New-NetFirewallRule -DisplayName "FallDetect web app" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

Mac: click **Allow** when asked if `node` can accept incoming connections.

### Laptop 2 — Camera Laptop

Needs **Python 3.11+**.

**Windows (PowerShell):**

```powershell
cd backend
python -m venv .fallvenv
.fallvenv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r requirements-node.txt
```

**Mac (Terminal):**

```bash
cd backend
python3 -m venv .fallvenv
source .fallvenv/bin/activate
pip install -r requirements.txt
pip install -r requirements-node.txt
```

Firewall (Windows, PowerShell **as Administrator**):

```powershell
New-NetFirewallRule -DisplayName "FallDetect video" -Direction Inbound -Protocol TCP -LocalPort 8002 -Action Allow -Profile Private
```

Mac: click **Allow** for incoming connections and for the camera the first time `main.py` runs.

---

## 2. Run (every day, in this order)

### Step 1 — Laptop 1

```bash
cd frontend
npm run start:lan
```

Keep the terminal open.

### Step 2 — Laptop 2

**Windows:**

```powershell
cd backend
.fallvenv\Scripts\Activate.ps1
python check_node.py      # optional: every line should say OK
python main.py            # press Enter to monitor all cameras
```

**Mac:**

```bash
cd backend
source .fallvenv/bin/activate
python check_node.py      # optional: every line should say OK
python main.py            # press Enter to monitor all cameras
```

Keep the terminal open.

### Step 3 — Laptop 1 browser

1. Open `http://localhost:3000` and sign in.
2. Go to **Live Monitor**.
3. **Click once anywhere on the page** so the browser allows the alarm sound.

**Admin → Camera Laptops** shows laptop 2 online within ~30 seconds.

### Stop

Press **Ctrl + C** in the laptop 2 terminal, then in the laptop 1 terminal.

---

## 3. Handy commands

| Task | Where | Command |
|---|---|---|
| Rebuild after code or `.env` changes | Laptop 1 `frontend/` | `npm run build` then `npm run start:lan` |
| Development mode (no build) | Laptop 1 `frontend/` | `npm run dev:lan` |
| Changed `config/cameras.json` | Laptop 1 `frontend/` | `npm run seed:cameras`, then restart `main.py` on laptop 2 |
| Test without webcams | Laptop 2 `backend/` | `python demo_stream.py` (add `--alert CAM-201` for a fake fall) |
| Clear all data (keeps admin) | Laptop 1 `frontend/` | `npx prisma db seed` then `npm run seed:cameras` |
| Full database reset | Laptop 1 `frontend/` | `npx prisma migrate reset` → `npx prisma db seed` → `npm run seed:cameras` |

After a reset: delete `backend/pending_alerts.json` on laptop 2 (if it exists) and sign out/in on every browser.

---

## 4. If something fails

| Symptom | Check |
|---|---|
| Laptop 2 can't reach laptop 1 | `FRONTEND_BASE_URL` in `backend/.env` = laptop 1's current IP (first three numbers match laptop 2's); website started with `start:lan`, not `dev` |
| 401 / secret mismatch | `MONITOR_INGEST_SECRET` and `STREAM_TOKEN_SECRET` identical in both `.env` files |
| "not linked to any room" | Camera missing from `config/cameras.json` on laptop 1 → `npm run seed:cameras` |
| No live video | Port 8002 firewall on laptop 2; open `http://<laptop-2-IP>:8002/health` from laptop 1 |
| No alarm sound | Click once on the Live Monitor page; check volume |
| Website database error | Internet on laptop 1; Supabase project not paused |
