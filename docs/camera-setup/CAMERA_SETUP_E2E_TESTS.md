<!-- location: docs/camera-setup/CAMERA_SETUP_E2E_TESTS.md -->
# End-to-end tests: Camera setup file

Record **Actual** and **Pass/Fail**, then copy the results log into the paper.

## Setup

- Laptop 1: `cd frontend` → `npx prisma db seed` (clean DB). Don't run `seed:demo`.
- Laptop 2: same project, `config/cameras.json` identical to laptop 1; **no** `CAMERA_ID_MAP` in `backend/.env`.
- Default file: camera 0 → CAM-201 → Floor 2 Room 201 → Eleanor Whitfield; camera 1 → CAM-202 → Room 202 → Harold Baptiste.

## A. Seed (laptop 1)

| ID | Test | Steps | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| CS-01 | Dry run | `npm run seed:cameras -- --dry-run` | Table lists create floor 2, rooms 201/202, sensors, patients; "Dry run only"; Admin shows no floors | | |
| CS-02 | Apply | `npm run seed:cameras` | Same table; "Done." | | |
| CS-03 | Rooms in Admin | Admin → Room Management | 201 · 2 · Eleanor Whitfield · CAM-201 and 202 · 2 · Harold Baptiste · CAM-202 | | |
| CS-04 | Patients in Admin | Admin → Patient Management | Both patients, Active, in rooms 201 and 202 | | |
| CS-05 | Re-run | `npm run seed:cameras` | Both rows "already up to date"; no duplicates in Admin | | |
| CS-06 | Change a Sensor ID | In the file set camera 1 `deviceId` to `CAM-212` → seed | "change sensor CAM-202 → CAM-212"; Room Management shows CAM-212. Change it back and seed again | | |
| CS-07 | Add a camera | Add `{ "cameraIndex": 2, "deviceId": "CAM-301", "floor": "3", "room": "301", "patient": "Walter Kim" }` → seed | Floor 3, room 301, sensor CAM-301 and patient Walter Kim created | | |
| CS-08 | Conflict: room has another patient | Set camera 0's patient to `Maria Cruz` → seed | "Room 201 already has Eleanor Whitfield…"; exit with error; **nothing changed** in Admin | | |
| CS-09 | Conflict: Sensor ID used elsewhere | Admin: set room 301's Sensor ID to `CAM-X`; file: camera 2 → `"room": "302"`, `deviceId` `CAM-X` → seed | "CAM-X is already the sensor of Floor 3 Room 301…"; nothing changed | | |
| CS-10 | Conflict: patient in another room | File: camera 2 patient `Eleanor Whitfield` → seed | "Eleanor Whitfield is assigned to Floor 2 Room 201…"; nothing changed | | |
| CS-11 | Invalid file | Give two cameras the same `cameraIndex` → seed | "camera #2: cameraIndex 0 is also used by CAM-201"; nothing changed | | |
| CS-12 | Room with no patient | Add a camera without `patient` → seed | Room created with sensor, patient "Unassigned" | | |

Restore the default file (and fix Admin changes from CS-09) before section B.

## B. Camera laptop start-up (laptop 2)

| ID | Test | Steps | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| CB-01 | Table from the file | `python check_node.py` | "Camera setup: …config\cameras.json" + table with rooms and patients | | |
| CB-02 | Invalid file stops start-up | Duplicate a `deviceId` in the file → `python check_node.py` | `[config] cameras.json camera #2: deviceId CAM-201 is listed twice`; exits | | |
| CB-03 | Missing file | Set `CAMERA_CONFIG_FILE=C:\nope.json` → `python check_node.py` | `[config] camera setup file not found: C:\nope.json`; exits. Remove the line after | | |
| CB-04 | `.env` override | Add `CAMERA_ID_MAP=0:CAM-201` → `python check_node.py` | Log says the `.env` value overrides the file; only CAM-201. Remove the line after | | |
| CB-05 | Unlinked camera warning | File on laptop 2 only: add camera 2 → CAM-203; start `python main.py` | Log: "CAM-203 is not linked to any room on laptop 1 — its alerts will be rejected…" (once) | | |
| CB-06 | Warning clears | Laptop 1: add the same entry → `npm run seed:cameras`; wait ≤ 30 s | Laptop 2 log: "all cameras are linked to rooms on laptop 1" | | |

## C. Real alert reaches the named patient

| ID | Test | Steps | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| CR-01 | Camera 0 | Laptop 2 `python main.py`; leave the bed in front of camera 0 for > 5 s | Live Monitor: fall alert **Room 201 — Eleanor Whitfield**, alarm loops | | |
| CR-02 | Camera 1 | Same in front of camera 1 | Alert **Room 202 — Harold Baptiste** | | |
| CR-03 | Without real cameras | Laptop 2: `python demo_stream.py --alert CAM-202` | Alert for Room 202 — Harold Baptiste | | |
| CR-04 | Live video matches | Live Monitor → Room 201 → Live camera feed | Shows camera 0's picture | | |

## Results log

| Section | Cases | Passed | Failed | Notes |
|---|---|---|---|---|
| A. Seed | 12 | | | |
| B. Camera laptop | 6 | | | |
| C. Real alert | 4 | | | |
| **Total** | **22** | | | |

Tester: ______________ Date: ______________
