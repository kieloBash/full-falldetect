<!-- location: backend/MAIN_PY_INTEGRATION.md -->
# Wiring the new modules into `backend/main.py`

`main.py` wasn't in the files I had, so these are targeted edits, not a full replacement.
YOLO inference, the alert timing (5 s delay, 10 s repeats, up to 4) and the frame overlays
stay as they are. Three things change:
- where frames go,
- how alerts are sent,
- how the video server starts.

Before touching `main.py`, run `python demo_stream.py --alert CAM-201`. It tests the whole
chain (video, heartbeat, Supabase upload, alert) with fake frames.

## 1. Install the extra packages

```powershell
pip install -r requirements-node.txt
# requirements.txt is UTF-16 because Windows PowerShell's ">" writes UTF-16. Re-save as UTF-8:
pip freeze | Out-File -Encoding utf8 requirements.txt
```

## 2. Imports (top of main.py)

```python
import logging

import config
from node_client import Heartbeat, send_fall_alert
from stream_server import frame_store, start_stream_server
from stream_utils import encode_stream_jpeg

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%H:%M:%S")
```

Remove `from flask import ...`. Flask now lives only in `stream_server.py`.

## 3. Replace the hard-coded constants (TDS §7.3)

```python
WEIGHTS_PATH = config.WEIGHTS_PATH            # was D:\Projects\...\best_v2.pt
CAMERA_ID_MAP = config.CAMERA_ID_MAP          # was {0: "CAM-201", 1: "CAM-202"}
SCREENSHOT_FOLDER = config.SCREENSHOT_FOLDER  # was ../frontend/public/screenshots (other laptop now)
STREAM_PORT = config.STREAM_PORT
```

Keep `CONF`, `INFER_SKIP`, `INITIAL_ALERT_DELAY_SEC`, `REPEAT_ALERT_INTERVAL` and
`MAX_REPEAT_ALERTS`.

## 4. Publish frames to the frame store

In `_yolo_inference`, find where the annotated frame is JPEG-encoded and stored in the
MJPEG buffer. Replace that encode-and-store with:

```python
frame_store.publish(self.camera_id, encode_stream_jpeg(annotated))
```

Use your own variable names for the camera ID and the annotated frame.

## 5. Send alerts through `send_fall_alert`

In `fire_alert`, keep saving the screenshot JPG locally. Replace the `requests.post(...)`
call with:

```python
send_fall_alert(
    camera_id,
    confidence,                                            # same 0–100 value as today
    screenshot_path if alert_number == 1 else None,        # upload only on the first alert
)
```

`alert_number` stands for however your code counts repeats within one "patient missing"
episode (1 for the first alert, then 2, 3, 4). Repeats reach laptop 1 as `already_open`,
so uploading their screenshots would just fill the bucket.

What `send_fall_alert` does:
- Uploads the JPG to Supabase with a 5-second limit. If that fails, the alert goes out
  without a picture.
- Posts the alert to laptop 1.
- If laptop 1 is unreachable, saves the alert to `pending_alerts.json` and retries every
  10 s until it gets through (alerts older than 60 min are dropped).
- Never raises an exception.

## 6. Remove the old Flask server

Delete from `main.py`:
- `app = Flask(__name__)`,
- the `/stream/<camera_id>` and `/health` routes,
- the old MJPEG buffer and generator,
- the thread that calls `app.run(host="0.0.0.0", port=8002, ...)`.

`stream_server.py` replaces all of this, with token checks added.

## 7. Start the video server and heartbeat

After the console camera selection (TDS §7.1 step 4), replace old step 5 with:

```python
selected_ids = [CAMERA_ID_MAP[i] for i in selected_indexes]   # your list of chosen indexes
start_stream_server(selected_ids)
```

After the `CameraMonitor` threads start (step 6), give them a few seconds to produce frames,
then start the heartbeat. Otherwise the first heartbeat reports every camera offline and the
activity feed logs a needless offline/online pair.

```python
time.sleep(5)
Heartbeat(lambda: frame_store.statuses(selected_ids)).start()
```

The heartbeat sends this laptop's current Wi-Fi IP every 30 s. If the router assigns a new IP,
the dashboard follows automatically.

## 8. Check it

1. `python check_node.py` — every line should say OK.
2. `python main.py`
3. Within 30 s the laptop appears under **Admin → Camera laptops** on laptop 1.
