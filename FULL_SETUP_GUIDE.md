# FallDetect Installation and Setup Guide

## Overview

FallDetect runs on **two laptops on the same Wi-Fi**, plus a free **Supabase** project online:

|  | Laptop 1 — Head Nurse | Laptop 2 — Camera Laptop |
| --- | --- | --- |
| Folder used | `frontend/` | `backend/` and `config/` |
| Runs | The FallDetect website (port 3000) | Camera AI + live video (port 8002) |
| Needs | Node.js, internet (database) | Python, the webcams, internet (screenshots only) |

Supabase holds the database and the fall screenshots. Laptop 2 sends alerts and a heartbeat to laptop 1 over Wi-Fi; the nurse's browser loads the video straight from laptop 2.

**Do the parts in order:** Part 1 once online, Part 2 on laptop 1, Part 3 on laptop 2. After that, Part 4 is all you need each day.

**Before you start, have ready:**

- [ ] Both laptops on the **same Wi-Fi** (not a guest network)
- [ ] The FallDetect project folder copied to **both** laptops
- [ ] A Supabase account ([supabase.com](https://supabase.com), free)
- [ ] The webcams plugged into laptop 2

> Commands in this guide are shown for **Windows (PowerShell)** and **Mac (Terminal)** where they differ. Anything in `<angle brackets>` is a value you replace.

## Part 1 — Supabase (once, in the browser)

### 1.1 Create the project

1. Sign in at [supabase.com](https://supabase.com) → **New project**.
2. Name it `falldetect`, set a **database password**, and pick the closest region.
3. Write the password down — you need it in Part 2.

### 1.2 Create the screenshot storage

1. In the project, open **SQL Editor** → **New query**.
2. Paste the whole contents of `supabase/storage-setup.sql` from the project folder.
3. Click **Run**. You should see "Success".

This creates a private `fall-screenshots` bucket that the camera laptop can only upload to.

### 1.3 Copy these four values

Keep them in a notepad for Parts 2 and 3:

| Value | Where to find it | Goes on |
| --- | --- | --- |
| **Connection string** | Click **Connect** (top bar) → **Session pooler** → copy. Replace `[YOUR-PASSWORD]` with your database password. | Laptop 1 |
| **Project URL** | Project Settings → API → Project URL (`https://xxxx.supabase.co`) | Both laptops |
| **Secret key** | Project Settings → API Keys → Secret key (`sb_secret_…`) | **Laptop 1 only** |
| **Publishable key** | Project Settings → API Keys → Publishable key (`sb_publishable_…`) | Laptop 2 |

> Never put the **secret key** on laptop 2 or share it.

### 1.4 Make two shared secrets

Both laptops must use the **same** two secrets. Generate each one on any laptop with Node.js (run it twice, once per secret):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Call them `MONITOR_INGEST_SECRET` and `STREAM_TOKEN_SECRET`. Generate a third one for `AUTH_JWT_SECRET` (laptop 1 only).

## Part 2 — Laptop 1: Head Nurse (website)

### 2.1 Install Node.js

Install **Node.js 22 LTS** from [nodejs.org](https://nodejs.org). Check it in a new terminal:

```bash
node -v
```

It should print `v20.9` or higher.

### 2.2 Find and fix laptop 1's IP address

Laptop 2 needs this address, so it must not change.

- **Windows:** `ipconfig` → "IPv4 Address" under *Wireless LAN adapter Wi-Fi*
- **Mac:** `ipconfig getifaddr en0`

Example: `192.168.68.105`. In your router's app, give laptop 1 a **fixed / reserved IP** (often called *DHCP reservation* or *Address reservation*) so it stays the same after restarts.

### 2.3 Create `frontend/.env`

In the `frontend` folder, copy the example file:

- **Windows:** `copy .env.example .env`
- **Mac:** `cp .env.example .env`

Open `.env` and fill in:

```bash
DATABASE_URL="<Supabase Session pooler connection string>"
DIRECT_URL="<the same connection string>"
AUTH_JWT_SECRET=<secret 3 from Part 1.4>
COOKIE_SECURE=false
MONITOR_INGEST_SECRET=<secret 1 from Part 1.4>
STREAM_TOKEN_SECRET=<secret 2 from Part 1.4>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=<sb_secret_...>
SUPABASE_BUCKET=fall-screenshots
NEXT_PUBLIC_SHOW_SIMULATE_FALL=false
```

Set `NEXT_PUBLIC_SHOW_SIMULATE_FALL=true` only for testing or a demo.

### 2.4 Install and create the database

In a terminal inside `frontend`:

```bash
npm install
npx prisma migrate deploy
npx prisma db seed
```

- `migrate deploy` creates the tables in Supabase.
- `db seed` creates the facility and the admin account: **admin@fall.example / password123**. Change this password after your first sign-in (Admin → User Management → Reset password).

### 2.5 Link the cameras to rooms and patients

Open `config/cameras.json` (project root) and set one line per camera:

```json
{ "cameraIndex": 0, "deviceId": "CAM-201", "floor": "2", "room": "201", "patient": "Eleanor Whitfield" }
```

`cameraIndex` is the webcam number on laptop 2 (0 = first, 1 = second). Then, in `frontend`:

```bash
npm run seed:cameras
```

It prints a table of camera → sensor → room → patient. Copy the **same** `cameras.json` to laptop 2.

### 2.6 Allow port 3000 through the firewall

- **Windows** (PowerShell **as Administrator**):

  ```powershell
  New-NetFirewallRule -DisplayName "FallDetect web app" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
  ```

  Also set the Wi-Fi to **Private network** (Settings → Network → Wi-Fi → your network).
- **Mac:** when macOS asks whether `node` may accept incoming connections, click **Allow**.

### 2.7 Build and start

```bash
npm run build
npm run start:lan
```

Open `http://localhost:3000` and sign in as the admin. Keep this terminal open — closing it stops the website.

> For development you can use `npm run dev:lan` instead of build + start. Plain `npm run dev` does **not** accept connections from laptop 2.

## Part 3 — Laptop 2: Camera Laptop (backend)

### 3.1 Install Python and the packages

Install **Python 3.11 or newer** from [python.org](https://www.python.org) (Windows: tick *Add python.exe to PATH*). Then, in a terminal inside `backend`:

**Windows (PowerShell):**

```powershell
python -m venv .fallvenv
.fallvenv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r requirements-node.txt
```

**Mac (Terminal):**

```bash
python3 -m venv .fallvenv
source .fallvenv/bin/activate
pip install -r requirements.txt
pip install -r requirements-node.txt
```

The first install downloads the AI libraries and can take several minutes. Check that the model file exists: `backend/model/best_v2.pt`.

### 3.2 Create `backend/.env`

Copy `backend/.env.example` to `backend/.env` and fill in:

```bash
FRONTEND_BASE_URL=http://<laptop 1 IP from Part 2.2>:3000
MONITOR_INGEST_SECRET=<same secret 1 as laptop 1>
STREAM_TOKEN_SECRET=<same secret 2 as laptop 1>
NODE_KEY=floor2-laptop
NODE_NAME=Floor 2 camera laptop
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_UPLOAD_KEY=<sb_publishable_...>
SUPABASE_BUCKET=fall-screenshots
STREAM_PORT=8002
```

**Check these three things — they cause most problems:**

1. `FRONTEND_BASE_URL` is **laptop 1's real IP**. The first three numbers must match laptop 2's IP (e.g. both `192.168.68.x`).
2. The two secrets are **exactly the same** as in `frontend/.env`.
3. There is **no** `CAMERA_ID_MAP=` line. Cameras come from `config/cameras.json`.

### 3.3 Camera setup file

The project's `config/` folder must sit next to `backend/`, with the **same** `cameras.json` as laptop 1. If it lives elsewhere, add its full path to `backend/.env`:

```bash
CAMERA_CONFIG_FILE=/full/path/to/cameras.json
```

### 3.4 Allow port 8002 (video)

- **Windows** (PowerShell **as Administrator**):

  ```powershell
  New-NetFirewallRule -DisplayName "FallDetect video" -Direction Inbound -Protocol TCP -LocalPort 8002 -Action Allow -Profile Private
  ```

  If Windows asks to "Allow Python to communicate", tick **Private networks**.
- **Mac:** the first time `main.py` runs, macOS asks whether Python may accept incoming connections — click **Allow**. The camera permission prompt also needs **Allow** (System Settings → Privacy & Security → Camera → Terminal).

### 3.5 Run the pre-flight check

With laptop 1's website running (Part 2.7):

```bash
python check_node.py
```

Every line should say **OK**, and the camera table should list your rooms and patients. Fix any **FAIL** using Part 6, then run it again.

### 3.6 Start monitoring

```bash
python main.py
```

Press **Enter** to monitor all listed cameras. Leave the terminal open. Within 30 seconds, **Admin → Camera Laptops** on laptop 1 shows this laptop as online.

> No webcams yet? `python demo_stream.py` sends a test video and heartbeat instead. `python demo_stream.py --alert CAM-201` also sends one fake fall.

## Part 4 — Every day: start and stop

### Start (in this order)

1. **Laptop 1:** connect to the Wi-Fi, open a terminal in `frontend`, run:

   ```bash
   npm run start:lan
   ```
2. **Laptop 2:** plug in the webcams, open a terminal in `backend`, activate the environment, and start:
   - **Windows:** `.fallvenv\Scripts\Activate.ps1` then `python main.py`
   - **Mac:** `source .fallvenv/bin/activate` then `python main.py`
3. **Laptop 1:** open `http://localhost:3000`, sign in, go to **Live Monitor**, and **click once anywhere on the page** so the browser allows the alarm sound.

### Stop

1. Laptop 2: press **Ctrl + C** in the `main.py` terminal.
2. Laptop 1: press **Ctrl + C** in the website terminal.

The order matters only a little: if laptop 1 is off, laptop 2 keeps alerts in a queue for up to 60 minutes and sends them when laptop 1 is back.

### After changing code or `.env` on laptop 1

```bash
npm run build
npm run start:lan
```

`NEXT_PUBLIC_…` settings (like the alarm sound or Simulate Fall) only change after a rebuild.

## Part 5 — Resetting the database

> **A reset permanently deletes** all incidents, patients, rooms, and staff accounts. There is no undo. Only the admin account (**admin@fall.example / password123**) is recreated.

Run these on **laptop 1**, in a terminal inside `frontend`. Stop the website first (**Ctrl + C**).

### Option A — Clear all data (most common)

Use this before a demo or a new round of testing. The tables stay; the data is wiped.

```bash
npx prisma db seed
npm run seed:cameras
```

- `db seed` empties every table and creates the facility + admin again.
- `seed:cameras` puts back your rooms, sensors, and patients from `config/cameras.json`.
- Optional instead of `seed:cameras`: `npm run seed:demo` for sample floors, rooms, patients and a nurse (`nurse@fall.example / password123`). Don't run both on the same rooms.

### Option B — Full reset (drop and rebuild the tables)

Use this only if migrations failed or the tables are broken.

```bash
npx prisma migrate reset
npx prisma db seed
npm run seed:cameras
```

`migrate reset` asks you to confirm, then drops every table and runs all migrations again.

### After either reset

1. **Clear old screenshots (optional):** Supabase → **Storage** → `fall-screenshots` → select the folders → **Delete**. The database reset does not remove them.
2. **Laptop 2:** stop `main.py` and delete `backend/pending_alerts.json` if it exists, so old queued alerts aren't sent to the new database.
3. **Every browser:** sign out, then sign in again. Old sessions belong to accounts that no longer exist.
4. Start the website again (`npm run start:lan`), then `main.py` on laptop 2.

| I want to… | Run |
| --- | --- |
| Start fresh for a demo | Option A |
| Only change which camera is in which room / patient | Edit `config/cameras.json` → `npm run seed:cameras` (no reset needed) |
| Fix broken tables | Option B |

## Part 6 — Check that it works, and fixes

### 5-minute check

- [ ] Laptop 2: `python check_node.py` → all lines **OK**
- [ ] Laptop 1: **Admin → Camera Laptops** shows the camera laptop **online**
- [ ] Laptop 1: **Live Monitor** shows rooms 201/202 with your patients' names
- [ ] Room → **Live camera feed** shows the right camera
- [ ] Step out of bed view for 5+ seconds → fall pop-up with the right room and patient, alarm loops
- [ ] **Acknowledge** → alarm stops → **Mark resolved**

### Common problems

| Problem | Fix |
| --- | --- |
| `check_node`: "Laptop 1 port 3000 reachable" **FAIL** | Wrong IP in `FRONTEND_BASE_URL` (first three numbers must match laptop 2's IP); website started with plain `npm run dev` instead of `start:lan`/`dev:lan`; firewall rule missing (Part 2.6); laptops on different or guest Wi-Fi. Test from laptop 2: `curl -I http://<laptop-1-IP>:3000` |
| `check_node`: "MONITOR\_INGEST\_SECRET" **FAIL** (401) | The secret differs between `frontend/.env` and `backend/.env`. Copy it again, restart both |
| `check_node`: "Supabase reachable" **FAIL** | `SUPABASE_URL` still the placeholder or mistyped, no internet, or the project is paused (restore it in the Supabase dashboard). Alerts still work, without screenshots |
| `main.py` log: "CAM-203 is not linked to any room" | That camera isn't in the database. Add it to `config/cameras.json` on both laptops and run `npm run seed:cameras` on laptop 1 |
| `[config] camera setup file not found` | `config/` isn't next to `backend/` — copy it, or set `CAMERA_CONFIG_FILE` |
| Live video says it can't load | Port 8002 blocked on laptop 2 (Part 3.4). From laptop 1 open `http://<laptop-2-IP>:8002/health` |
| No alarm sound | Click once on the Live Monitor page (browsers block sound until you do); check the volume |
| Website won't start: database error | No internet, wrong `DATABASE_URL` password, or Supabase project paused |
| Signed in but pages show errors after a reset | Sign out and sign in again (Part 5) |
| Laptop 1's IP changed | Set a reserved IP in the router (Part 2.2), update `FRONTEND_BASE_URL` on laptop 2, restart `main.py` |

### Where to look for more

- `docs/detection-node/LAN_SETUP.md` — network details
- `docs/camera-setup/README.md` — the camera file
- `docs/admin/ADMIN_E2E_TESTS.md`, `docs/alert-sound/ALERT_SOUND_E2E_TESTS.md`, `docs/camera-setup/CAMERA_SETUP_E2E_TESTS.md` — full test lists
