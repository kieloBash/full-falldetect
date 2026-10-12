<!-- Location: full-falldetect/docs/launcher/MAIN_PY_CHANGES.md -->

# Required edits to existing files

The launcher module adds new files, but four existing files need small, manual edits. The start command checks edits 1 and 2 and stops with a clear message if they are missing. They are described here instead of shipped as full files, because the launcher package does not include the current `main.py`, `projection.ts` or the alert modal.

## 1. `backend/main.py` — add the `--all` flag (required)

Without this, `main.py` stops at the "which cameras?" console question and the launcher waits until it times out.

Add near the other imports at the top:

```python
# full-falldetect/backend/main.py  (top of file)
from launcher_args import parse_launcher_args

LAUNCH_ARGS = parse_launcher_args()
```

Then wrap the existing camera-selection prompt (startup step 4: "Ask on the console which cameras to monitor"). Keep your own variable names; `available` and `selected` below are placeholders:

```python
# full-falldetect/backend/main.py  (camera selection step)
if LAUNCH_ARGS.all:
    selected = available
    print(f"[launcher] --all set, monitoring: {[CAMERA_ID_MAP[i] for i in selected]}")
else:
    # ... existing prompt code, unchanged ...
```

Running `python main.py` by hand without `--all` still shows the prompt as before.

## 2. `backend/main.py` — make the weights path portable (required)

`WEIGHTS_PATH` is an absolute Windows path (`D:\Projects\full-falldetect\...`). On a Mac it can never exist, and on another Windows laptop it only works if the project is in exactly the same folder. Replace it with a path relative to `main.py`:

```python
# full-falldetect/backend/main.py  (constants)
from pathlib import Path

WEIGHTS_PATH = str(Path(__file__).resolve().parent / "model" / "best_v2.pt")
```

Leave `SCREENSHOT_FOLDER` as it is. The ingest route trims the path after `public/`, which expects forward slashes, and the launcher already runs `main.py` from `backend\`.

### macOS camera check

`main.py` already uses OpenCV's default camera backend on macOS. Two things to confirm on the Mac:

- On a MacBook, index 0 is usually the built-in camera, so `CAMERA_ID_MAP` `0 → CAM-201` points at it. A USB camera is usually index 1. An iPhone near the Mac can also appear as a camera (Continuity Camera) and shift the numbers, so turn it off if the wrong camera shows up.
- The first time the detection service opens a camera, macOS asks whether **Terminal** may use the camera. If you clicked "Don't Allow", turn it on in System Settings → Privacy & Security → Camera, then restart FallDetect.

Optional: on Apple Silicon, YOLO can use the GPU by passing `device="mps"` to the model's predict call. CPU also works, just slower.

## 3. `frontend/lib/live-monitor-server/projection.ts` — send the screenshot URL (required)

In `projectRoom()`, wrap the screenshot field with the new helper:

```ts
// frontend/lib/live-monitor-server/projection.ts
import { toScreenshotUrl } from "@/lib/live-monitor/screenshot-url";

// inside projectRoom(), where the open incident is mapped:
screenshotPath: toScreenshotUrl(openIncident?.screenshotPath),
```

The database value stays `screenshots/<file>.jpg`, so existing incidents keep working and the ingest route does not change.

## 4. `FallAlertModal` (and anywhere else that renders `screenshotPath`) (required)

Search the `components/live-monitor/` folder for `screenshotPath`. If the image source adds a leading slash or a prefix, for example:

```tsx
<img src={`/${room.screenshotPath}`} ... />
```

change it to use the value as-is, since it is now a full URL:

```tsx
// frontend/components/live-monitor/FallAlertModal.tsx
<img src={room.screenshotPath} ... />
```

After these edits, run setup again (`setup-falldetect.bat` on Windows, `setup-falldetect.command` on macOS), or run `npm run build` in `frontend/`, so the production build includes them.
