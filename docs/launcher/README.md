<!-- Location: full-falldetect/docs/launcher/README.md -->

# FallDetect Launcher Module (Windows + macOS)

The launcher runs the whole FallDetect system on one computer with a double-click. It starts the Next.js web app and the Python detection service in **one terminal window**, waits until both respond, and opens the Live Monitor in the browser. Pressing Ctrl+C or closing the window stops everything.

The same launcher works on Windows and macOS. All the logic lives in one Node.js script, `scripts/falldetect.mjs`, and each OS gets small double-click wrappers. Node.js is already required for the web app, so nothing extra is installed.

The database still runs on Supabase, so the computer needs an internet connection.

## Files in this module

| File | Purpose |
|---|---|
| `scripts/falldetect.mjs` | All launcher logic: `setup`, `start`, `stop`, `shortcut` |
| `start-falldetect.bat` / `.command` | Start the system and open the Live Monitor |
| `stop-falldetect.bat` / `.command` | Stop the system from another window |
| `setup-falldetect.bat` / `.command` | One-time setup (venv, pip, npm, Prisma, build) |
| `create-desktop-shortcut.bat` / `.command` | Desktop shortcuts (`.lnk` on Windows, `.app` on macOS) |
| `scripts/falldetect.ico` / `.icns` | Shortcut icons for Windows / macOS |
| `backend/launcher_args.py` | Adds the `--all` flag so `main.py` skips the camera prompt |
| `backend/requirements-launcher.txt` | Cross-platform Python dependencies |
| `backend/.env.local.example` | Local values for the detection service |
| `frontend/.env.local.example` | Local values for the web app |
| `frontend/app/api/screenshots/[file]/route.ts` | Serves screenshots saved while the app is running |
| `frontend/lib/live-monitor/screenshot-url.ts` | Converts the stored screenshot path into that route's URL |
| `frontend/prisma/seed-launcher-test.ts` | Non-destructive test data (one incident with a screenshot) |
| `frontend/prisma/fixtures/LAUNCHER-TEST_...jpg` | Sample screenshot used by the test seed |
| `docs/launcher/MAIN_PY_CHANGES.md` | Manual edits needed in existing files |
| `docs/launcher/E2E-TESTS.md` | End-to-end test cases for both OSes |

`.bat` files are for Windows, `.command` files are for macOS. The other OS's files can stay in the project; they do nothing there.

You can also run any command directly from a terminal in the project root: `node scripts/falldetect.mjs start`.

## Requirements

| | Windows 10/11 | macOS (Apple Silicon or Intel) |
|---|---|---|
| Node.js | 20.9+ LTS from nodejs.org | 20.9+ LTS from nodejs.org or `brew install node` |
| Python | 3.11–3.13 from python.org, "Add to PATH" ticked | 3.11–3.13 from python.org or `brew install python@3.13` (the built-in `python3` is too old) |
| Camera | USB or built-in, mapped in `CAMERA_ID_MAP` | Same; Terminal must have camera permission |
| Model | `backend/model/best_v2.pt` | Same |

## Installation

1. Extract the zip into the project root (`full-falldetect/`). The folder layout in the zip matches the project.
2. Make the edits in `docs/launcher/MAIN_PY_CHANGES.md`. Edits 1 (`--all`), 2 (weights path), 3 and 4 (screenshot URL) are all required.
3. Check the environment files:
   - `backend/.env`: `FRONTEND_INGEST_URL=http://localhost:3000/api/monitor/ingest`, not the Vercel URL.
   - `MONITOR_INGEST_SECRET` must be identical in `backend/.env` and `frontend/.env`. The start command warns if they differ.
   - If either file is missing, setup creates it from the example and asks you to fill it in.
4. Add these lines to `.gitignore`: `.falldetect.pids` and `logs/`.
5. Run setup:
   - **Windows:** double-click `setup-falldetect.bat`.
   - **macOS:** in Terminal, run `chmod +x *.command` once in the project folder (zip tools sometimes drop the execute permission), then double-click `setup-falldetect.command`. If macOS says the file can't be opened, right-click it → **Open** → **Open**. Setup clears that flag on all the launcher files, so this only happens once.
   
   The first run takes several minutes because PyTorch is large.
6. Optional: run `create-desktop-shortcut` for a desktop icon.
7. **macOS only:** on the first start, allow Terminal to use the camera when asked. If you missed the prompt: System Settings → Privacy & Security → Camera → turn on Terminal, then restart FallDetect.

## Daily use

Double-click **FallDetect** on the desktop (or `start-falldetect.bat` / `start-falldetect.command`). One terminal window opens and shows:

- `[FallDetect]` lines (cyan): launcher progress.
- `[web]` lines (blue): Next.js output.
- `[detect]` lines (magenta): YOLO, camera and alert output.

When both services are up, the browser opens `http://localhost:3000/live-monitor`. Keep the window open while you use the app.

**To stop:** press **Ctrl+C** in that window, or close it. You can also run **Stop FallDetect** (or `stop-falldetect`) from anywhere.

If you click Start while the system is already running, it just opens the Live Monitor again.

The same output is saved to `logs/web.log` and `logs/detect.log`, which is useful if the window closed before you could read an error.

## How it works

The `start` command runs these steps in order:

1. **Pre-flight checks:** Node version, venv, production build and both `.env` files exist. It also checks that `main.py` has the `--all` flag and no hardcoded `D:\` weights path, warns if `FRONTEND_INGEST_URL` isn't localhost, and warns if the two ingest secrets differ.
2. **Port check:** if ports 3000 and 8002 are both busy, the app is already running, so it opens the browser and exits. If only one is busy, it asks you to run stop first.
3. **Starts the web app** (`npm run start` in `frontend/`) and polls it for up to 90 seconds.
4. **Starts the detection service** (`venv` Python, `main.py --all` in `backend/`) only after the web app is up, so the first fall alert has somewhere to go. It polls `/health` on port 8002 for up to 180 seconds while the YOLO models load.
5. **Opens** the Live Monitor and writes `.falldetect.pids`.

While running, if either service crashes, the launcher stops the other one too and reports which one failed. This avoids a half-running system where the dashboard looks fine but no falls are detected.

**Stopping.** On Ctrl+C or window close, the launcher stops both services. On Windows it uses `taskkill /T` (cmd → npm → node, python). On macOS each service runs in its own process group, so it gets `SIGTERM` first, then `SIGKILL` after 5 seconds if needed. The `stop` command signals the launcher recorded in `.falldetect.pids`, but only after confirming that process is still the FallDetect launcher, so it never kills an unrelated program that reused the same process ID. As a fallback, it also stops anything still listening on ports 3000 and 8002.

### Why the screenshot route is needed

The launcher runs Next.js in production mode (`next start`) because it is faster and more stable than dev mode. In production mode, Next.js only serves files that were in `public/` at build time, so screenshots saved during a run would show as broken images. `/api/screenshots/[file]` reads them from disk instead. It is protected by `proxy.ts` like every other `/api/*` route, and it rejects file names containing `..` or anything that isn't a `.jpg`, `.jpeg` or `.png`.

## Seed and test data

This module adds no tables, so there is no new schema seed. Two options:

- **Full reset:** `npx prisma db seed` runs the existing `prisma/seed.ts`. **It wipes every table**, so only use it on a test database.
- **Launcher test data:** `npx tsx prisma/seed-launcher-test.ts` (run inside `frontend/`). It copies the sample screenshot into `public/screenshots/` and creates one ACTIVE incident that uses it. It deletes nothing. If your `seed.ts` imports `PrismaClient` from a different path, use the same path in this file.

## Configuration

Settings are at the top of `scripts/falldetect.mjs`:

| Setting | Default | When to change |
|---|---|---|
| `WEB_PORT` | `3000` | Only if you also change the Next.js port |
| `STREAM_PORT` | `8002` | Must match `STREAM_PORT` in `main.py` |
| `WEB_TIMEOUT_SEC` | `90` | Raise it on slow computers |
| `DETECT_TIMEOUT_SEC` | `180` | Raise it if YOLO takes longer to load (two cameras = two models) |

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| "The web app has not been built yet" | Run setup. Re-run it after any code change, since production mode uses the last build. |
| "main.py does not support --all yet" or "WEIGHTS_PATH ... does not exist here" | Apply edits 1 and 2 in `MAIN_PY_CHANGES.md`. |
| Detection service doesn't start in time | Read the `[detect]` lines or `logs/detect.log`. Common causes: no camera found, missing weights file, or a Python package error. |
| macOS: detection starts but finds no camera | Terminal has no camera permission (System Settings → Privacy & Security → Camera), or another app is using the camera. Restart FallDetect after changing the permission. |
| macOS: "cannot be opened because it is from an unidentified developer" | Right-click the `.command` file → Open → Open. Running setup once clears this for all launcher files. |
| macOS: double-click opens the file in a text editor | The execute permission was lost. Run `chmod +x *.command` in the project folder. |
| macOS: setup fails installing torch | Python is too old (the built-in `python3` is 3.9). Install Python 3.13 from python.org or Homebrew, delete `backend/venv`, and run setup again. |
| Port already in use | Run stop. If another app uses port 3000, the stop fallback will also close it, so check the name it prints. |
| Falls detected but nothing appears in the Live Monitor | `FRONTEND_INGEST_URL` still points to Vercel, or the two `MONITOR_INGEST_SECRET` values differ (ingest returns 401). The start command warns about both. |
| Screenshot shows as a broken image | Edits 3 and 4 in `MAIN_PY_CHANGES.md` are missing, or the build is older than those edits. |
| Login works, then you're sent back to the login page | Open the app at `http://localhost:3000`, not an IP address. In production the session cookie is `secure`, which browsers only allow over plain HTTP on `localhost`. If it still happens in Safari, use Chrome or Edge. |
| Windows: `python` opens the Microsoft Store | Install Python from python.org and turn off the "App execution aliases" for python in Windows settings. |
| Windows: SmartScreen warning | Click "More info" → "Run anyway". To avoid it, right-click the zip → Properties → Unblock before extracting. |

## Limitations

- The computer still needs internet for the Supabase database.
- Live video only plays in a browser on the same computer, because `CameraFeed` loads `http://localhost:8002`.
- Code changes need a rebuild (run setup again) before the launcher picks them up.
- Desktop shortcuts are Windows and macOS only; on Linux, run `node scripts/falldetect.mjs start` directly.
