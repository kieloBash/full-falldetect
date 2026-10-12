<!-- Location: full-falldetect/docs/launcher/E2E-TESTS.md -->

# Launcher Module — End-to-End Tests (Windows + macOS)

Run these on every computer that will be used for the demo. Tests marked **[Both]** run on each OS; **[Win]** and **[Mac]** tests are OS-specific. Mark each test Pass or Fail and note anything unexpected.

"Start", "Stop", "Setup" and "Shortcut" mean the `.bat` file on Windows and the `.command` file on macOS.

## Preconditions

- The module files are extracted into `full-falldetect/` and all four edits in `MAIN_PY_CHANGES.md` are done.
- `backend/.env` points `FRONTEND_INGEST_URL` to `http://localhost:3000/api/monitor/ingest`, and both `.env` files use the same `MONITOR_INGEST_SECRET`.
- At least one camera mapped in `CAMERA_ID_MAP` is available, and its `deviceId` (e.g. `CAM-201`) exists in the `sensors` table with a resident assigned to the room.
- You can sign in (e.g. `kel@bash.example` / `password123` from the seed).
- Nothing else is using ports 3000 or 8002.

---

## A. Setup

### A1. [Both] First-time setup
1. Delete `backend/venv`, `frontend/node_modules` and `frontend/.next` (or use a fresh copy).
2. Run Setup.

**Expected:** the Python and Node versions print, the venv is created, pip installs `requirements-launcher.txt`, npm installs packages, Prisma generates, the build succeeds and "Setup complete" appears. `frontend/public/screenshots` and `logs/` exist.

- [ ] Windows  - [ ] macOS

### A2. [Both] Missing env file
1. Rename `frontend/.env` to `frontend/.env.bak`, then run Setup.

**Expected:** it creates `frontend/.env` from the example, warns you to fill it in, and stops before installing anything. Restore `.env.bak` afterward.

- [ ] Windows  - [ ] macOS

### A3. [Mac] Gatekeeper and permissions
1. Download the zip fresh (so it has the quarantine flag), extract it, run `chmod +x *.command`, then double-click `setup-falldetect.command`.

**Expected:** macOS may block it the first time; right-click → Open works. After setup, double-clicking `start-falldetect.command` opens without any warning.

- [ ] Pass

### A4. [Mac] Old Python
1. On a Mac with only the built-in `python3` (3.9), run Setup.

**Expected:** a warning that Python is too old for the pinned PyTorch, with instructions to install 3.11–3.13.

- [ ] Pass

### A5. [Both] Desktop shortcuts
1. Run Shortcut.

**Expected:** Windows: "FallDetect" (FD icon) and "Stop FallDetect" (power icon) `.lnk` files on the desktop. macOS: "FallDetect.app" (FD icon) and "Stop FallDetect.app" on the Desktop. Double-clicking the macOS app opens Terminal and starts FallDetect.

- [ ] Windows  - [ ] macOS

---

## B. Start and stop

### B1. [Both] Cold start
1. Double-click the **FallDetect** shortcut.

**Expected:** one terminal window shows "Web app is up" and then "Detection service is up", with colored `[web]` and `[detect]` lines. The browser opens `http://localhost:3000/live-monitor` (or the login page, then the Live Monitor after signing in). The detection service does **not** ask which cameras to monitor.

- [ ] Windows · time to browser: ____ s  - [ ] macOS · time to browser: ____ s

### B2. [Mac] Camera permission on first run
1. Reset with `tccutil reset Camera com.apple.Terminal`, then Start.

**Expected:** macOS asks whether Terminal can use the camera. After allowing it, `/health` lists the camera. If you click "Don't Allow", the detection service reports no frames or no camera, and the start-up error mentions the camera permission.

- [ ] Pass

### B3. [Both] Camera health
1. Open `http://localhost:8002/health`.

**Expected:** `{"status": "ok", "streaming": ["CAM-201", ...]}` listing every connected mapped camera.

- [ ] Windows  - [ ] macOS

### B4. [Both] Start while already running
1. With the system running, run Start again.

**Expected:** "FallDetect is already running", a new browser tab opens, and no second set of services starts.

- [ ] Windows  - [ ] macOS

### B5. [Both] Stop with Ctrl+C
1. Press Ctrl+C in the FallDetect window.

**Expected:** "Stopping FallDetect..." then "FallDetect stopped." `http://localhost:3000` and `http://localhost:8002/health` no longer load. `.falldetect.pids` is deleted.

- [ ] Windows  - [ ] macOS

### B6. [Both] Stop by closing the window
1. Start, then close the terminal window with its close button (macOS: confirm "Terminate").

**Expected:** both ports are free afterward. Check with Stop: it should say "FallDetect was not running."

- [ ] Windows  - [ ] macOS

### B7. [Both] Stop from another window
1. Start, then run **Stop FallDetect**.

**Expected:** "Stopping FallDetect (launcher PID ...)" and "FallDetect stopped." The FallDetect window shows it stopped (Windows: the window closes). Both ports are free.

- [ ] Windows  - [ ] macOS

### B8. [Both] Stop when nothing is running
1. Run Stop again.

**Expected:** "FallDetect was not running." No errors.

- [ ] Windows  - [ ] macOS

### B9. [Both] A service crashes
1. Start, then end only the Python process (Windows: Task Manager → python.exe → End task; macOS: `pkill -f "main.py --all"`).

**Expected:** the launcher reports that the detection service stopped unexpectedly, stops the web app too, and waits for Enter. Both ports are free.

- [ ] Windows  - [ ] macOS

### B10. [Both] Services started by hand
1. Run `npm run start` in `frontend/` manually, then run Stop.

**Expected:** the port fallback stops the process on port 3000.

- [ ] Windows  - [ ] macOS

---

## C. Pre-flight checks

### C1. [Both] Missing build
1. Rename `frontend/.next` to `.next.bak`, then Start.

**Expected:** "The web app has not been built yet. Run setup first." Nothing starts. Restore the folder.

- [ ] Windows  - [ ] macOS

### C2. [Both] Ingest URL and secret warnings
1. Set `FRONTEND_INGEST_URL` to the Vercel URL and change one `MONITOR_INGEST_SECRET`, then Start.

**Expected:** two yellow warnings (wrong ingest URL, secrets differ). The app still starts. Restore both values and restart.

- [ ] Windows  - [ ] macOS

### C3. [Both] Missing main.py edits
1. Temporarily remove the `launcher_args` / `--all` lines from `main.py`, then Start.

**Expected:** an immediate error pointing to edit 1 in `MAIN_PY_CHANGES.md` (no 180-second wait). Restore the edit.

- [ ] Windows  - [ ] macOS

### C4. [Mac] Hardcoded Windows weights path
1. Temporarily set `WEIGHTS_PATH = r"D:\Projects\full-falldetect\backend\model\best_v2.pt"`, then Start.

**Expected:** an immediate error that the path does not exist here, pointing to edit 2. Restore the edit.

- [ ] Pass

---

## D. Screenshot route

Start the system and sign in first.

### D1. [Both] Test seed
1. In `frontend/`, run `npx tsx prisma/seed-launcher-test.ts`.

**Expected:** the console shows the copied file and a new ACTIVE incident ID. Within about 3 seconds, the Live Monitor shows the room as active, and the fall alert modal shows the "LAUNCHER TEST SCREENSHOT" image.

- [ ] Windows  - [ ] macOS

### D2. [Both] Direct request while signed in
1. Open `http://localhost:3000/api/screenshots/LAUNCHER-TEST_2026-10-03_10-00-00.jpg`.

**Expected:** the image loads (`Content-Type: image/jpeg`).

- [ ] Windows  - [ ] macOS

### D3. [Both] Missing file
1. Open `http://localhost:3000/api/screenshots/NOPE_2026-01-01.jpg`.

**Expected:** 404 `{"error":"Screenshot not found"}`.

- [ ] Windows  - [ ] macOS

### D4. [Both] Invalid names
1. Open `/api/screenshots/test.txt` and `/api/screenshots/..%2F..%2Fpackage.json`.

**Expected:** 400 `{"error":"Invalid file name"}` (or 404) for both. File contents are never returned.

- [ ] Windows  - [ ] macOS

### D5. [Both] Signed out
1. Open a private browser window and request the D2 URL.

**Expected:** redirected to the login page (307 from `proxy.ts`). The image is not shown.

- [ ] Windows  - [ ] macOS

---

## E. Full flow

### E1. [Both] Real detection
1. Start the system and sign in as a nurse.
2. Make sure the person or object is detected on the bed, then leave the camera's view of the bed for more than 5 seconds.

**Expected:** `[detect]` lines show a saved screenshot and a successful POST to ingest. Within about 3 seconds, the room turns active in the Live Monitor, the alert tone plays, and the modal shows the **real** screenshot from this run. Acknowledge, then Resolve. The room returns to idle, and the activity feed shows each step.

- [ ] Windows  - [ ] macOS

### E2. [Both] Restart persistence
1. Stop and Start again.

**Expected:** resolved incidents remain in the database, and screenshots from the earlier run still load.

- [ ] Windows  - [ ] macOS

### E3. [Mac] Browser check
1. Repeat the login and E1 in Safari, then in Chrome.

**Expected:** both stay signed in. If Safari loops back to the login page, note it; Chrome is the supported browser for the demo.

- [ ] Safari  - [ ] Chrome

---

## Results

| Section | Windows (pass/fail) | macOS (pass/fail) | Notes |
|---|---|---|---|
| A. Setup | | | |
| B. Start and stop | | | |
| C. Pre-flight | | | |
| D. Screenshot route | | | |
| E. Full flow | | | |

Tested by: __________  Date: __________  Computers: __________
