<!-- location: docs/admin/ADMIN_E2E_TESTS.md -->
# End-to-end tests: Administrator access (Floors, Rooms, Patients, Users)

Manual browser tests for the administrator flow. Each case lists preconditions, steps and the
expected result. Fill in **Actual** and **Pass/Fail** while testing, then copy the results log
at the end into the testing chapter of the paper.

## Environment

| Item | Value |
|---|---|
| App | `npm run dev` (or `npm run build && npm run start:lan`) on laptop 1, opened at `http://localhost:3000` |
| Database | Supabase, migrations applied (`npx prisma migrate deploy`) |
| `.env` | `NEXT_PUBLIC_SHOW_SIMULATE_FALL=true` for the end-to-end flow (section F) |
| Browser | Chrome or Edge. Use one normal window for the admin and one **Incognito** window for the nurse. |
| Camera laptop | Not needed. Section F uses Simulate Fall; test G-01 is optional with a real camera. |

## Starting state (run before section A)

```powershell
cd frontend
npx prisma db seed
```

Expected console output: `1 facility, 1 user, 0 floors, 0 rooms, 0 residents, 0 incidents`.
The only account is `admin@fall.example` / `password123`.

Run the sections **in order**: later cases use the data created by earlier ones.

---

## A. Sign-in and access control

| ID | Test | Steps | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| AC-01 | No self-registration | Open `http://localhost:3000` signed out | Only the sign-in form. No "Create account" tab or link; text says to ask the administrator for an account | | |
| AC-02 | Forgot password hint | Hover "Forgot password?" | Tooltip: ask your facility administrator to reset your password | | |
| AC-03 | Wrong password | Email `admin@fall.example`, password `wrong`, **Sign in** | "Incorrect email or password." Stays on the sign-in page | | |
| AC-04 | Unknown email | Email `nobody@fall.example`, any password | Same message as AC-03 (doesn't reveal which emails exist) | | |
| AC-05 | Admin sign-in | `ADMIN@fall.example` (uppercase) / `password123` | Redirected to `/admin` (Floor Management). Email case doesn't matter | | |
| AC-06 | Empty facility | Look at Floor Management | "0 floors across your facility" and a message to click "Add floor" | | |
| AC-07 | Empty Live Monitor | Sidebar → **Live Monitor** | Page loads with no rooms and no error (was a 500 before) | | |
| AC-08 | Signed-out redirect | In an Incognito window open `http://localhost:3000/admin/users` | Redirected to `/?next=/admin/users` (sign-in page) | | |
| AC-09 | Register API removed | Incognito: DevTools Console → `fetch('/api/auth/register',{method:'POST'}).then(r=>r.status)` | `404` | | |

## B. Floor Management (`/admin`)

| ID | Test | Steps | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| FL-01 | Add floor | **Add floor** → Floor name `2` → **Add floor** | Modal closes; card "2 — Fall Detect Clinic" appears and is selected; "1 floor" | | |
| FL-02 | Blank name | **Add floor** → leave name empty → **Add floor** | Red message "Floor name is required."; modal stays open | | |
| FL-03 | Duplicate name | **Add floor** → `2` → **Add floor** | "A floor with that name already exists."; no second card | | |
| FL-04 | Add second floor | **Add floor** → `9` → **Add floor** | Card "9" added and selected | | |
| FL-05 | Rename | With floor 9 selected → **Rename** → `3` → **Save changes** | Card now reads "3" | | |
| FL-06 | Rename to existing | Floor 3 selected → **Rename** → `2` → **Save changes** | "A floor with that name already exists."; name stays 3 | | |
| FL-07 | Delete empty floor | **Add floor** `4` → select it → **Delete floor** → confirm **Delete floor** | Confirmation dialog appears first; after confirming, floor 4 is gone | | |
| FL-08 | Cancel delete | Select floor 3 → **Delete floor** → **Cancel** | Dialog closes; floor 3 still listed | | |

Floors after section B: **2** and **3**.

## C. Room Management (`/admin/rooms`)

| ID | Test | Steps | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| RM-01 | Sensor ID required | **Add room** → Room number `201`, Sensor ID empty, Floor `2` → **Add room** | "Sensor / device ID is required (e.g. CAM-201)." | | |
| RM-02 | Add room | Room `201`, Sensor ID `CAM-201`, Floor `2` → **Add room** | Row: 201 · 2 · Unassigned · CAM-201 | | |
| RM-03 | Duplicate room number | **Add room** → `201`, `CAM-299`, Floor `2` | "A room with that number already exists on this floor." | | |
| RM-04 | Duplicate sensor ID | **Add room** → `202`, `CAM-201`, Floor `2` | "Sensor ID CAM-201 is already assigned to another room." | | |
| RM-05 | Second room | `202`, `CAM-202`, Floor `2` → **Add room** | Row 202 added | | |
| RM-06 | Third room, other floor | `301`, `CAM-301`, Floor `3` → **Add room** | Row 301 · 3 added | | |
| RM-07 | Edit and move | Pencil on 202 → Room `302`, Sensor `CAM-302`, Floor `3` → **Save changes** | Row reads 302 · 3 · CAM-302 | | |
| RM-08 | Floor with rooms can't be deleted | `/admin` → select floor 3 → **Delete floor** → confirm | Dialog shows "Floor 3 still has 2 rooms. Move or delete them in Room Management first."; floor stays | | |
| RM-09 | Delete room (no incidents) | Trash on 302 → confirm **Delete room** | Row 302 removed | | |
| RM-10 | Floor view shows rooms | `/admin` → select floor 2 | Table lists room 201 with its sensor | | |
| RM-11 | Sensor ID stored for alerts | Supabase → Table Editor → `sensors` | Row for room 201 has `deviceId` = `CAM-201` (not only `deviceLabel`) | | |

Rooms after section C: **201** (CAM-201, floor 2) and **301** (CAM-301, floor 3).

## D. Patient Management (`/admin/patients`)

| ID | Test | Steps | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| PT-01 | Name required | **Add patient** → leave name empty → **Add patient** | "Patient name is required." | | |
| PT-02 | Add with room | Patient name `Eleanor Whitfield`, Room assignment `201 (2)`, Notes `High fall risk` → **Add patient** | Row: Eleanor Whitfield · 201 (2) · Active | | |
| PT-03 | Occupied room | **Add patient** → `Harold Baptiste`, Room `201 (2)` | "That room is already occupied."; not added | | |
| PT-04 | Add unassigned | `Harold Baptiste`, Room **Unassigned** → **Add patient** | Row with "Unassigned" | | |
| PT-05 | Assign room | Edit Harold → Room `301 (3)` → **Save changes** | Harold shows 301 (3); `/admin/rooms` shows Harold in room 301 | | |
| PT-06 | Discharge | Edit Harold → tick **Mark as discharged** → **Save changes** | Status "Discharged"; active count drops by one | | |
| PT-07 | Delete patient (no incidents) | Delete Harold → confirm **Delete patient** | Row removed; room 301 becomes Unassigned in Room Management | | |
| PT-08 | Re-add for flow | Add `Walter Kim` → Room `301 (3)` | Row added | | |

## E. User Management (`/admin/users`)

| ID | Test | Steps | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| US-01 | List | Sidebar → **User Management** | One row: Facility Admin (You) · Administrator · Active. No Deactivate button on your own row | | |
| US-02 | Short password | **Add user** → First `Nora`, Last `Santos`, Email `nurse@fall.example`, Account type Nurse, password `short` → **Create account** | "Password must be at least 8 characters." | | |
| US-03 | Bad email | Same, email `nurse@` and password `TempPass123` | "Enter a valid email address." | | |
| US-04 | Create nurse | Email `Nurse@Fall.example`, password **Generate** (note it) or `TempPass123` → **Create account** | Row: Nora Santos · `nurse@fall.example` (lowercase) · Nurse · Active · Last sign-in "Never" | | |
| US-05 | Duplicate email | **Add user** → any names, email `nurse@fall.example` | "An account with that email already exists." | | |
| US-06 | Nurse signs in | Incognito → sign in as `nurse@fall.example` with the temp password | Success screen → **Continue** → Live Monitor | | |
| US-07 | Nurse blocked from admin | Incognito → open `http://localhost:3000/admin/users` | Redirected to `/live-monitor` | | |
| US-08 | Nurse blocked from admin API | Incognito Console → `fetch('/api/admin/users').then(r=>r.status)` | `403` | | |
| US-09 | Last sign-in updates | Admin window → refresh User Management | Nora's "Last sign-in" shows today's time | | |
| US-10 | Edit user | **Edit** on Nora → Last name `Santos-Reyes` → **Save changes** | Name updated in the table | | |
| US-11 | Reset password | **Reset password** on Nora → **Generate** → note it → **Set new password** | Green message "Password updated for Nora Santos-Reyes" | | |
| US-12 | Old password rejected | Incognito → sign out → sign in with the old temp password | "Incorrect email or password." | | |
| US-13 | New password works | Sign in with the password from US-11 | Signed in | | |
| US-14 | Deactivate | Admin → **Deactivate** on Nora → confirm **Deactivate** | Status "Deactivated"; row greyed; button changes to **Reactivate** | | |
| US-15 | Deactivated session ends | Incognito (still on Live Monitor) → DevTools → Network → wait 3 s | The next `/api/monitor` poll returns **401**; rooms stop updating | | |
| US-16 | Deactivated sign-in | Incognito → sign in as Nora | "This account has been deactivated. Contact your administrator." | | |
| US-17 | Reactivate | Admin → **Reactivate** on Nora | Status Active; Nora can sign in again | | |
| US-18 | Can't lock yourself out | Admin → **Edit** on your own row | Account type is not editable ("You can't change your own account type.") | | |
| US-19 | Last admin protected | Console (admin window): `fetch('/api/admin/users/<your id>',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({isActive:false})}).then(r=>r.json())` (your id is in `/api/me`) | `{ error: "You can't deactivate your own account." }` | | |

## F. Full flow: clean database → nurse responds to a fall

Uses the data from sections B–E. `NEXT_PUBLIC_SHOW_SIMULATE_FALL=true` must be set.

| ID | Test | Steps | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| F-01 | Nurse sees the rooms | Incognito → sign in as Nora → Live Monitor → floor 2 | Room 201 tile: Eleanor Whitfield, sensor Online, idle | | |
| F-02 | Simulate fall | **Simulate fall** | Alarm sound; Fall Alert window for Room 201; activity feed "Fall detected in Room 201 (simulated)" | | |
| F-03 | No eligible room | **Simulate fall** again on floor 2 | Toast: "No eligible room to simulate…" (201 already has an open alert) | | |
| F-04 | Acknowledge + resolve | Open Room 201 in the inspector → **Acknowledge** → **Mark resolved** | Tile shows Nora as responder, then returns to idle; feed logs both | | |
| F-05 | Room with history can't be deleted | Admin → Room Management → delete 201 → confirm | Dialog: "Room 201 has 1 incident record and can't be deleted…"; room stays | | |
| F-06 | Patient with history can't be deleted | Admin → Patient Management → delete Eleanor → confirm | "…can't be deleted. Mark them as discharged instead."; patient stays | | |
| F-07 | Responder kept after deactivation | Deactivate Nora (US-14), then check Supabase `incidents` | The incident's `responderId` still points to Nora | | |

## G. Optional: real camera

| ID | Test | Steps | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| G-01 | Alert reaches an Admin-created room | Laptop 2: `CAMERA_ID_MAP` includes `CAM-301`; run `python demo_stream.py --alert CAM-301` (or `main.py` and leave the bed) | Fall alert for Room 301 (Walter Kim) appears on the Live Monitor. Proves fix #10 | | |

---

## Results log

| Section | Cases | Passed | Failed | Notes |
|---|---|---|---|---|
| A. Sign-in and access | 9 | | | |
| B. Floors | 8 | | | |
| C. Rooms | 11 | | | |
| D. Patients | 8 | | | |
| E. Users | 19 | | | |
| F. Full flow | 7 | | | |
| G. Real camera (optional) | 1 | | | |
| **Total** | **63** | | | |

Tester: ______________ Date: ______________ Build/commit: ______________
