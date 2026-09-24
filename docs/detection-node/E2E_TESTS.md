<!-- location: docs/detection-node/E2E_TESTS.md -->
# End-to-end tests: Remote Detection Node

Run these after `LAN_SETUP.md` and `PATCHES.md`. Each test lists steps and the expected
result. Record Pass/Fail and notes in the results log at the end. The table is ready to
copy into the testing chapter of the paper.

## Environments

| ID | Setup |
|---|---|
| **ENV-A** | Single machine: web app and `demo_stream.py` on one laptop (`FRONTEND_BASE_URL=http://localhost:3000`) |
| **ENV-B** | Two laptops on the same Wi-Fi, as in `LAN_SETUP.md` |

Most tests run in either environment. Tests marked **B** need two laptops.

## Preconditions

- Base seed loaded (`npx prisma db seed`). Accounts: `admin@fall.example` (ADMIN) and
  `kel@bash.example` (NURSE), password `password123`.
- `npm run seed:nodes -- --reset` run so no demo nodes remain, unless a test says otherwise.
- Supabase bucket created with `supabase/storage-setup.sql`.
- Tools:
  - Simulator (from `frontend/`): `npm run simulate:node -- <command>`.
  - Browser console calls are made while logged in on `http://localhost:3000` (DevTools → Console).
  - Commands written as `NAME=value npm run …` are bash syntax. In PowerShell, set the
    variable first: `$env:NAME="value"; npm run …` (and `Remove-Item Env:NAME` afterwards).

---

## A. Network and setup

| ID | Test | Steps | Expected |
|---|---|---|---|
| S-01 **B** | Laptop 2 reaches laptop 1 | Laptop 2: `Test-NetConnection <laptop1-ip> -Port 3000` | `TcpTestSucceeded : True` |
| S-02 **B** | Laptop 1 reaches laptop 2 | Run `demo_stream.py` on laptop 2. On laptop 1 open `http://<laptop2-ip>:8002/health` | JSON `{"status":"ok","node":…,"streaming":["CAM-201","CAM-202"]}` |
| S-03 | Pre-flight | Laptop 2: `python check_node.py --upload-test` | All lines OK; a `CHECK/…jpg` object appears in the bucket (delete it afterwards) |
| S-04 | Migrations | Laptop 1: `npx prisma migrate status` | All migrations applied, including `detection_nodes` and `one_open_incident_per_room` |

## B. Heartbeat and node status

| ID | Test | Steps | Expected |
|---|---|---|---|
| H-01 | Bad secret rejected, no debug info | `npm run simulate:node -- bad-secret` | `401 {"error":"Unauthorized"}`, no `debug` field |
| H-02 | Node registers | Start `python demo_stream.py`. Open **Admin → Camera laptops** | Within 30 s: the laptop is *Online*, video address `http://<laptop2-ip>:8002`, CAM-201 and CAM-202 *Online* |
| H-03 | Unknown cameras | Set `CAMERA_ID_MAP=0:CAM-999` on laptop 2 and restart the demo | Laptop 2 log: `heartbeat rejected (404)`; no node appears |
| H-04 | Goes offline | With H-02 running, stop the demo (Ctrl+C). Wait 90–100 s | Node and cameras show *Offline* (page refreshes every 10 s); Live Monitor shows those sensors offline (PATCHES §8) |
| H-05 | Back online | Start the demo again | Node *Online* within 30 s; Live Monitor activity feed: "Camera CAM-201 in Room … is back online" |
| H-06 **B** | IP change followed | Laptop 2: reconnect Wi-Fi or switch to another network with the same laptop 1 reachability, so its IP changes | After the next heartbeat, *Video address* shows the new IP and the video preview still works |
| H-07 | Remove node (mutation) | Admin → Camera laptops → *Remove node* → confirm, while the demo is stopped | Card disappears; sensors stay assigned to rooms; starting the demo re-registers it |
| H-08 | Invalid stream address | `SIM_STREAM_BASE_URL=http://8.8.8.8:8002 npm run simulate:node -- heartbeat` | `400` "streamBaseUrl must be a LAN address…" |

## C. Live video

| ID | Test | Steps | Expected |
|---|---|---|---|
| V-01 | Preview on admin page | Demo running → Admin → Camera laptops → *Show video* on CAM-201 | Moving demo frame with timestamp; label "CAM-201, live" |
| V-02 **B** | Live Monitor camera wall | Log in as a nurse → Live Monitor → camera wall | Laptop 2's video plays for each camera |
| V-03 | Token required | Open `http://<laptop2-ip>:8002/stream/CAM-201` directly | `401 {"error":"Missing stream token"}` |
| V-04 | Token bound to camera | Console: `(await (await fetch('/api/stream-token?deviceId=CAM-201')).json()).streamUrl`. Replace `/CAM-201?` with `/CAM-202?` and open it | `401 "Token is for a different camera"` |
| V-05 | Token expires | Copy a `streamUrl` from V-04, wait 6 minutes, open it in a new tab | `401 "Stream token expired"` |
| V-06 | Signed out | Log out, then open `http://localhost:3000/api/stream-token?deviceId=CAM-201` | `401 {"error":"Not signed in"}` as JSON, not a redirect |
| V-07 | Offline message | Stop the demo, wait 90 s, look at the preview/camera wall | "The camera laptop is offline. Last heard from …" and a *Try again* button |
| V-08 | Recovery | Start the demo again without refreshing the page | Video returns on its own within about 15–30 s |

## D. Fall alerts and screenshots

| ID | Test | Steps | Expected |
|---|---|---|---|
| F-01 | Full alert with screenshot | Resolve any open incident on CAM-201's room. Run `python demo_stream.py --alert CAM-201` | Within about 3 s: `FallAlertModal` opens with the demo screenshot; activity: "Possible fall in Room … (88% confidence)" |
| F-02 | Screenshot is private | In F-01, right-click the screenshot → copy image address | URL contains `/storage/v1/object/sign/` and `?token=` |
| F-03 | Unsigned URL blocked | Take the F-02 URL, change `/object/sign/` to `/object/public/` and remove `?token=…` | Error (bucket not public), no image |
| F-04 | No duplicate incidents | With F-01's incident still open, run `python demo_stream.py --alert CAM-201` again | Laptop 2 log shows `already_open`; still exactly one ACTIVE incident for the room |
| F-05 | Race | Resolve the incident. `npm run simulate:node -- race CAM-201` | One reply `201`, two replies `200 {"status":"already_open"}`; exactly one new incident |
| F-06 | Wrong screenshot path | `npm run simulate:node -- bad-path CAM-201` | `400` "screenshotPath must look like CAM-201/<name>.jpg" |
| F-07 | No internet for screenshots | Laptop 2: set `SUPABASE_URL=https://invalid.example.com`, restart, trigger an alert | Alert still arrives within about 5 s, with no screenshot; log: `[screenshot] upload failed` |
| F-08 | Laptop 1 down → queued | Stop the web app on laptop 1. Trigger an alert on laptop 2 | Log: `[alert] queued CAM-201 (1 waiting)`; `pending_alerts.json` has 1 entry |
| F-09 | Queue survives restart | During F-08, stop and restart the demo on laptop 2 | Log: `1 queued alert(s) from a previous run` |
| F-10 | Queue delivered | Start the web app on laptop 1 | Within about 10 s the alert appears; `pending_alerts.json` is `[]` |
| F-11 | Only first alert uploads (real model) | With `main.py`, step out of bed for about 45 s (4 alerts) | One incident; exactly one new object in the bucket for this episode |

## E. Fixes #10 – #12 and access control

| ID | Test | Steps | Expected |
|---|---|---|---|
| X-01 | Nurse blocked from admin pages | Log in as `kel@bash.example`, open `/admin` | Redirected to `/live-monitor` |
| X-02 | Nurse blocked from admin API | As the nurse, in the console: `(await fetch('/api/admin/rooms')).status` | `403` |
| X-03 | Admin-created room receives alerts (#10) | As admin: create a room with Sensor ID `CAM-209` and assign a patient. Run `SIM_DEVICE_IDS=CAM-209 npm run simulate:node -- heartbeat`, then `npm run simulate:node -- ingest CAM-209` | Heartbeat `accepted:["CAM-209"]`; ingest `201`; alert shows in the Live Monitor |
| X-04 | Duplicate Sensor ID | Create another room with Sensor ID `CAM-209` | `409` "That room label or Sensor ID is already in use" |
| X-05 | Backfill script | For a sensor with only `deviceLabel` set (e.g. edit in Prisma Studio), run `npx tsx prisma/scripts/backfill-device-ids.ts` | "Backfilled 1 of 1 sensor(s)"; `deviceId` now filled |
| X-06 | Facility filter on Simulate fall (#12) | In Prisma Studio, create a second facility with a floor, a room and a resident; copy the room id. As admin of facility 1: `await (await fetch('/api/alerts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId:'<id>'})})).json()` | `404`; no incident created in the other facility |
| X-07 | DB-level guard | In `psql`, insert a second ACTIVE incident for a room that already has one | `ERROR: duplicate key value violates unique constraint "incidents_one_open_per_room"` |

## F. Seed data (UI check)

| ID | Test | Steps | Expected |
|---|---|---|---|
| D-01 | Demo nodes | `npm run seed:nodes`, then open Admin → Camera laptops within 90 s | "Floor 2 camera laptop (demo)" *Online* with CAM-201/202; "Floor 3 … (offline)" *Offline* |
| D-02 | Demo goes stale | Wait 2 minutes, then check again | Both demo nodes *Offline* |
| D-03 | Reset | `npm run seed:nodes -- --reset` | "Removed 2 demo node(s)"; cards gone |

---

## Results log

| Test ID | Env | Date | Tester | Result | Notes |
|---|---|---|---|---|---|
| S-01 | B | | | ☐ Pass ☐ Fail | |
| S-02 | B | | | ☐ Pass ☐ Fail | |
| S-03 | | | | ☐ Pass ☐ Fail | |
| S-04 | | | | ☐ Pass ☐ Fail | |
| H-01 | | | | ☐ Pass ☐ Fail | |
| H-02 | | | | ☐ Pass ☐ Fail | |
| H-03 | | | | ☐ Pass ☐ Fail | |
| H-04 | | | | ☐ Pass ☐ Fail | |
| H-05 | | | | ☐ Pass ☐ Fail | |
| H-06 | B | | | ☐ Pass ☐ Fail | |
| H-07 | | | | ☐ Pass ☐ Fail | |
| H-08 | | | | ☐ Pass ☐ Fail | |
| V-01 | | | | ☐ Pass ☐ Fail | |
| V-02 | B | | | ☐ Pass ☐ Fail | |
| V-03 | | | | ☐ Pass ☐ Fail | |
| V-04 | | | | ☐ Pass ☐ Fail | |
| V-05 | | | | ☐ Pass ☐ Fail | |
| V-06 | | | | ☐ Pass ☐ Fail | |
| V-07 | | | | ☐ Pass ☐ Fail | |
| V-08 | | | | ☐ Pass ☐ Fail | |
| F-01 | | | | ☐ Pass ☐ Fail | |
| F-02 | | | | ☐ Pass ☐ Fail | |
| F-03 | | | | ☐ Pass ☐ Fail | |
| F-04 | | | | ☐ Pass ☐ Fail | |
| F-05 | | | | ☐ Pass ☐ Fail | |
| F-06 | | | | ☐ Pass ☐ Fail | |
| F-07 | | | | ☐ Pass ☐ Fail | |
| F-08 | | | | ☐ Pass ☐ Fail | |
| F-09 | | | | ☐ Pass ☐ Fail | |
| F-10 | | | | ☐ Pass ☐ Fail | |
| F-11 | B | | | ☐ Pass ☐ Fail | |
| X-01 | | | | ☐ Pass ☐ Fail | |
| X-02 | | | | ☐ Pass ☐ Fail | |
| X-03 | | | | ☐ Pass ☐ Fail | |
| X-04 | | | | ☐ Pass ☐ Fail | |
| X-05 | | | | ☐ Pass ☐ Fail | |
| X-06 | | | | ☐ Pass ☐ Fail | |
| X-07 | | | | ☐ Pass ☐ Fail | |
| D-01 | | | | ☐ Pass ☐ Fail | |
| D-02 | | | | ☐ Pass ☐ Fail | |
| D-03 | | | | ☐ Pass ☐ Fail | |
