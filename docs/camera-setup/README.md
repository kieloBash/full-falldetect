<!-- location: docs/camera-setup/README.md -->
# Module: Camera setup file (camera → sensor → room → patient)

One file, `config/cameras.json`, now connects each physical camera to its Sensor ID, room and
patient. Both laptops read it:

| Laptop | Reads it with | Uses it for |
|---|---|---|
| Laptop 1 (web app) | `npm run seed:cameras` | Creates/updates the floor, room, `Sensor.deviceId` and patient in the database |
| Laptop 2 (cameras) | `backend/config.py` (on start) | Which OpenCV camera sends which Sensor ID |

Because both sides read the same IDs, an alert from camera 0 always lands on the right room and
the right patient's name.

## The file

```json
{
  "facility": "Fall Detect Clinic",
  "cameras": [
    { "cameraIndex": 0, "deviceId": "CAM-201", "floor": "2", "room": "201", "patient": "Eleanor Whitfield" },
    { "cameraIndex": 1, "deviceId": "CAM-202", "floor": "2", "room": "202", "patient": "Harold Baptiste" }
  ]
}
```

| Field | Meaning |
|---|---|
| `facility` | Facility name in the database (the clean seed creates "Fall Detect Clinic") |
| `cameraIndex` | OpenCV camera number on laptop 2: 0 = first webcam, 1 = second, … |
| `deviceId` | Sensor ID sent with every alert and heartbeat. Must be unique. Case matters. |
| `floor`, `room` | Floor and room labels as shown in Admin |
| `patient` | Full name. First word = first name, the rest = last name (same as Patient Management). Leave out or `""` for a room with no patient. |

Rules checked on both laptops: each `cameraIndex`, `deviceId`, floor+room and patient appears once.
A mistake stops the seed or `main.py` with a message naming the camera entry.

## Laptop 1: seed the database

```powershell
cd frontend
npx prisma db seed                    # first time only: clean DB + admin@fall.example
npm run seed:cameras -- --dry-run     # optional: preview, writes nothing
npm run seed:cameras                  # apply
```

Output:

```text
  Camera  Sensor ID    Floor  Room   Patient               Changes
  0       CAM-201      2      201    Eleanor Whitfield     create floor 2, create room 201, set sensor CAM-201, create patient …
  1       CAM-202      2      202    Harold Baptiste       already up to date
```

- **Safe to run again** after editing the file: existing rows are reused, only differences are applied.
  Changing a room's `deviceId` in the file updates that room's sensor.
- **Never overwrites admin work.** If a Sensor ID belongs to another room, the room already has a
  different patient, or the patient is in another room, it lists every problem and **writes nothing**.
  Fix it in Admin (or in the file) and run it again.
- A discharged patient with the same name is re-admitted instead of duplicated.
- Name matching ignores upper/lower case and extra spaces.
- Other file location: `CAMERA_CONFIG_FILE=C:\path\cameras.json` in `frontend/.env`.

`npm run seed:demo` is unchanged and separate (floors 2–3, rooms CAM-201/202/301, a nurse).
Use one or the other for the same rooms — `seed:cameras` will report conflicts if `seed:demo`
already put different patients there.

## Laptop 2: the camera laptop

1. Keep the project's `config/` folder next to `backend/` (same copy as laptop 1), or set
   `CAMERA_CONFIG_FILE` in `backend/.env` to the file's full path.
2. **Remove `CAMERA_ID_MAP` from `backend/.env`.** If it is set, it overrides the file (the log
   says so) and patients' rooms are not checked.
3. `python check_node.py` prints the camera table:

   ```text
     Camera setup:       C:\FallDetect\config\cameras.json
     Camera  Sensor ID    Floor  Room   Patient
     0       CAM-201      2      201    Eleanor Whitfield
     1       CAM-202      2      202    Harold Baptiste
   ```

4. `python main.py`. On each heartbeat, laptop 1 answers which IDs it has no room for; laptop 2
   now logs them once:

   ```text
   [heartbeat] CAM-203 is not linked to any room on laptop 1 — its alerts will be rejected. Run
   `npm run seed:cameras` on laptop 1 (same config/cameras.json) or set the Sensor ID in Admin → Room Management.
   ```

## Adding a camera

1. Plug it into laptop 2. Its index is its OpenCV number (0 = first webcam, 1 = second, …);
   `main.py` lists the cameras it finds when it starts.
2. Add an entry to `config/cameras.json` on **both** laptops.
3. Laptop 1: `npm run seed:cameras`. Laptop 2: restart `main.py`.

## Files

| File | Change |
|---|---|
| `config/cameras.json` | **New.** The shared setup (rooms 201/202 by default) |
| `backend/camera_setup.py` | **New.** Loads and validates the file |
| `backend/config.py` | `CAMERA_ID_MAP` built from the file; `CAMERA_CONFIG_FILE`; `.env` override kept |
| `backend/check_node.py` | Prints the camera table |
| `backend/node_client.py` | Logs camera IDs laptop 1 ignored (from the heartbeat response) |
| `backend/.env.example` | `CAMERA_ID_MAP` commented out; `CAMERA_CONFIG_FILE` documented |
| `frontend/prisma/camera-setup.ts` | **New.** Same loader/rules in TypeScript |
| `frontend/prisma/seed-cameras.ts` | **New.** The seed |
| `frontend/package.json` | `seed:cameras` script |
| `docs/…` | References to `CAMERA_ID_MAP` updated |

No database migration, no API change.

## Tested

On Postgres 16 with the running app: dry run, apply, re-run (no changes), changing a room's
Sensor ID, a new floor/room/patient, case-insensitive names, a room with no patient, invalid file,
and all three conflict types (nothing written). Then real API calls: alerts for CAM-201 and CAM-202
created incidents for Eleanor Whitfield (201) and Harold Baptiste (202); CAM-999 was rejected (404);
a heartbeat with CAM-203 returned it as `ignored`. Backend: the file loads, duplicates and a missing
file stop start-up with a clear message, the `.env` override works, and the unlinked-camera warning
logs once. Real webcams were not available here — run section C of the test document.
