<!-- location: docs/admin/README.md -->
# Module: Administration (Floors, Rooms, Patients, Users) + fixes

This module finishes the administrator side of WatchCare:

- **User Management** (new): administrators create every staff account. Self-registration is removed.
- **Floor Management**: rename and delete were added.
- **Room and Patient Management**: errors now show in the forms, deletes ask for confirmation,
  and records with incident history are protected.
- **Clean seed**: a fresh database has only the facility and `admin@fall.example`.
- **Fixes from the code review**: bugs 1–6 (see "Fixes" below).

Nothing in `backend/` changes.

## Documents

| File | Read it when |
|---|---|
| `CHANGES.md` (zip root) | Applying this zip: files to copy, files to delete, commands to run |
| `docs/admin/ADMIN_E2E_TESTS.md` | Testing the admin flow and recording results for the paper |
| `frontend/.env.example` | Filling in `frontend/.env` (Supabase, secrets, Simulate Fall flag) |
| `supabase/storage-setup.sql` | Creating the private screenshot bucket (run once in Supabase) |

## Pages

| URL | Who | What |
|---|---|---|
| `/` | Everyone | Sign in only. No "Create account" tab. Admins go to `/admin`, nurses to `/live-monitor`. |
| `/admin` | ADMIN | Floor Management: add, rename, delete (empty floors only) |
| `/admin/rooms` | ADMIN | Room Management: add, edit, move, delete. Sensor ID is required. |
| `/admin/patients` | ADMIN | Patient Management: add, assign/move room, discharge, delete |
| `/admin/users` | ADMIN | **User Management**: add account, edit, reset password, deactivate/reactivate |
| `/admin/detection-nodes` | ADMIN | Camera Laptops (existing page, now in the sidebar) |

Nurses who open any `/admin` URL are redirected to `/live-monitor`; their `/api/admin/*` calls get 403.

## API

All routes use the `fd_session` cookie and return errors as `{ "error": "message" }`.
Every `/api/admin/*` route is checked twice: by `proxy.ts` (role in the JWT) and inside the
route by `requireAdminSession()` (role, plus the account must still be active in the database).

| Method | Path | Request | Success | Errors |
|---|---|---|---|---|
| GET | `/api/admin/floors` | — | 200 `Floor[]` | 401, 403 |
| POST | `/api/admin/floors` | `{ name }` | 201 `Floor` | 400, 409 duplicate |
| PATCH | `/api/admin/floors/{floorId}` | `{ name }` | 200 `Floor` | 400, 404, 409 duplicate |
| DELETE | `/api/admin/floors/{floorId}` | — | 200 `{ ok: true }` | 404, 409 floor has rooms |
| GET | `/api/admin/rooms` | — | 200 `Room[]` | 401, 403 |
| POST | `/api/admin/rooms` | `{ room, sensorId, floorId }` | 201 `Room` | 400, 404 floor, 409 room number or sensor ID taken |
| PATCH | `/api/admin/rooms/{roomId}` | `{ room, sensorId, floorId }` | 200 `Room` | 400, 404, 409 |
| DELETE | `/api/admin/rooms/{roomId}` | — | 200 `{ ok: true }` | 404, 409 room has incidents |
| GET/POST | `/api/admin/patients` | `{ name, roomId, notes }` | 200 / 201 | 400, 404, 409 room occupied |
| PATCH | `/api/admin/patients/{id}` | `{ name, roomId, notes, discharged }` | 200 | 404, 409 room occupied |
| DELETE | `/api/admin/patients/{id}` | — | 200 | 404, 409 patient has incidents |
| GET | `/api/admin/users` | — | 200 `StaffUser[]` | 401, 403 |
| POST | `/api/admin/users` | `{ firstName, lastName, email, role, password }` | 201 `StaffUser` | 400, 409 email taken |
| PATCH | `/api/admin/users/{userId}` | any of `{ firstName, lastName, email, role, isActive }` | 200 `StaffUser` | 400, 404, 409 (see rules) |
| POST | `/api/admin/users/{userId}/reset-password` | `{ password }` | 200 `{ ok: true }` | 400, 404 |
| POST | `/api/alerts` (Simulate Fall) | `{ roomId?, floor? }` (`floor` = floor **id**) | 201 `{ roomId, incidentId }` | 404, 409 none eligible / already open |

Removed: `POST /api/auth/register`, `GET /api/facilities`, `POST /api/alertTest`, and the legacy
`/api/admin/floors/{floorId}/rooms/**` routes.

`StaffUser` = `{ id, firstName, lastName, name, email, role: "ADMIN" | "NURSE", isActive, lastLoginAt, createdAt }`.
The password hash is never returned.

### User Management rules

- Emails are stored lowercase and must be unique. Login is case-insensitive.
- Passwords: at least 8 characters. The admin types or generates a temporary password and gives
  it to the user privately.
- There is **no delete**. Deactivating blocks sign-in; open sessions are rejected on their next
  request. Incidents keep their responder, so the audit trail stays complete.
- An admin can't change their own account type or deactivate themselves.
- The facility always keeps at least one active administrator.

## Fixes included

| # | Problem | Fix |
|---|---|---|
| 1 | Admin rooms saved the sensor ID to `deviceLabel`, so rooms made in Admin never got alerts | Saved to `Sensor.deviceId` (also mirrored to `deviceLabel`); duplicates rejected |
| 2 | `GET /api/monitor` crashed (500) when the facility had no floors | Returns `[]` |
| 3 | Simulate Fall: floor id vs label mismatch, could pick an empty room, facility filter commented out, button hard-coded a room id | All fixed; button shows when `NEXT_PUBLIC_SHOW_SIMULATE_FALL=true` |
| 4 | One-open-incident index was only a `.sql` file | Real migration `20260926090000_one_open_incident_per_room` |
| 5 | `COOKIE_SECURE` patch missing, so LAN login failed under `npm start` | Applied in `lib/auth/cookies.ts` |
| 6 | `package.json` scripts from the detection-node docs were missing | Added `dev:lan`, `start:lan`, `seed:demo`, `seed:nodes`, `simulate:node` |
| — | Deleting a room/patient with incidents crashed (500) | 409 with a clear message |
| — | Admin form errors (duplicates etc.) were silent | Shown in the modal; deletes use a confirmation dialog |

## Database changes

- Migration `20260926090100_user_is_active`: `users.isActive BOOLEAN NOT NULL DEFAULT true`.
- Migration `20260926090000_one_open_incident_per_room`: partial unique index on open incidents.
  If a room already has two open incidents, the migration fails; the SQL comment shows the query
  to find them. Resolve one, then rerun.

## Seeds

| Command | What it does |
|---|---|
| `npx prisma db seed` | **Wipes everything**, then creates "Fall Detect Clinic" and `admin@fall.example` / `password123` (override with `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`) |
| `npm run seed:demo` | Optional, additive: floors 2–3, rooms 201 (CAM-201), 202 (CAM-202), 301 (CAM-301), three patients, `nurse@fall.example` / `password123`. Safe to run twice. |
| `npm run seed:nodes` | Optional: demo camera laptops for CAM-201/202/301 (needs `seed:demo` or rooms made in Admin) |

The facility timezone in the clean seed is `Asia/Manila`.

## Design decisions

- **Sensor ID is required and matched exactly.** Ingest looks up `Sensor.deviceId`, so the ID typed
  in Room Management must match the `deviceId` in `config/cameras.json` (read by the camera laptop) character for character
  (e.g. `CAM-201`). Leading/trailing spaces are trimmed; case is kept.
- **Incidents are never deleted.** Rooms and patients with incidents can't be deleted. Discharge
  the patient instead; a room can keep existing without a patient.
- **Only empty floors can be deleted**, matching `Room.floor onDelete: Restrict`.
- **Deactivated sessions end immediately.** `requireSession()` checks `users.isActive` on every
  API call (one primary-key lookup). Pages still render until the next API call, which returns 401.
- **UI uses the existing admin look.** New pieces use installed shadcn components (`Table`, `Badge`,
  `Button`, `AlertDialog`, `Alert`); forms reuse `ModalShell` and the `Modal*Field` inputs so all
  admin screens match. All client API calls in admin, auth and users now use the axios `apiClient`.

## Known limitations

- The Live Monitor's own API calls (`lib/live-monitor/api.ts`) still use `fetch`.
- A deactivated user's browser tab keeps showing the last loaded page until it makes a request.
- Users can't change their own password yet (planned for the Settings module); an admin resets it.
- Tested here: TypeScript (`tsc --noEmit`), ESLint on changed folders, all migrations applied to
  Postgres 16, both seeds, every API case in `ADMIN_E2E_TESTS.md` via HTTP, and that every admin
  page compiles and returns 200. Clicking through the UI in a browser was not possible in my
  environment — run the UI cases in the test document.
