<!-- location: docs/alert-sound/ALERT_SOUND_E2E_TESTS.md -->
# End-to-end tests: Looping fall alarm + frontend cleanup

Run in Chrome or Edge with the speakers on. Record **Actual** and **Pass/Fail**, then copy the
results log into the paper.

## Setup

```powershell
cd frontend
# .env: NEXT_PUBLIC_SHOW_SIMULATE_FALL=true
npx prisma db seed
npm run seed:demo      # floors 2–3, rooms 201/202 (floor 2), 301 (floor 3), nurse@fall.example
npm run dev
```

- **Window A:** sign in as `nurse@fall.example` / `password123` → Live Monitor, Floor 2.
- **Window B (Incognito):** sign in as `admin@fall.example` / `password123`.

Before each test, make sure no alert is open (resolve or flag any left over).

## A. Alarm sound

| ID | Test | Steps | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| SND-01 | Sound file is served | Open `http://localhost:3000/sounds/fall-alert.mp3` | The alarm plays in the browser | | |
| SND-02 | Alarm starts | Window A → **Simulate fall** | Pop-up opens; alarm plays and **keeps looping** (listen ≥ 10 s) | | |
| SND-03 | Hiding doesn't stop it | Click **Hide** | Pop-up closes; alarm still loops; red banner stays | | |
| SND-04 | Silence 30 s | Top bar → **Silence 30 s** | Alarm stops; button shows "Silenced · 30s" counting down | | |
| SND-05 | Rings again | Wait for the countdown to reach 0 | Alarm resumes (fall still unacknowledged) | | |
| SND-06 | Acknowledge stops it | Select the room → **Acknowledge** (or press **A**) | Alarm stops; tile turns amber; Silence button greys out | | |
| SND-07 | Acknowledge from the pop-up | Resolve SND-06's room → **Simulate fall** → click **Acknowledge** in the pop-up | Alarm stops; pop-up closes | | |
| SND-08 | False alarm stops it | Resolve → **Simulate fall** → select room → **Flag false alarm** → choose reason → confirm | Alarm stops | | |
| SND-09 | New fall during silence | Floor 2, no open alerts → **Simulate fall** → **Silence 30 s** → within the 30 s click **Simulate fall** again (it picks the other room on Floor 2) | The second fall rings **immediately**, before the 30 s ends | | |
| SND-10 | Two falls, one acknowledged | With 201 and 202 active, acknowledge only 201 | Alarm keeps looping (202 still active); acknowledge 202 → stops | | |
| SND-11 | Autoplay block | With no open alert, press **F5** on Window A and don't click anything | Amber bar "Alert sound is off until you click…" appears | | |
| SND-12 | Enable sound | Click **Enable alert sound** (or anywhere on the page) | Amber bar disappears | | |
| SND-13 | Blocked + fall | F5 again, don't click. From Window B's console run `fetch('/api/alerts',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})`, then look at Window A | Pop-up and banner appear, amber bar visible, no sound yet; click once → alarm starts | | |
| SND-14 | Custom sound | Put `siren.wav` in `public/sounds/`, set `NEXT_PUBLIC_ALERT_SOUND_URL=/sounds/siren.wav`, restart `npm run dev`, simulate a fall | Your sound loops | | |
| SND-15 | Missing file fallback | Set `NEXT_PUBLIC_ALERT_SOUND_URL=/sounds/missing.mp3`, restart, simulate a fall | A repeating double beep plays instead of silence | | |

Reset `NEXT_PUBLIC_ALERT_SOUND_URL` after SND-14/15.

## B. Alerts from other floors

| ID | Test | Steps | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| FLR-01 | Fall on another floor rings | Window A on **Floor 2**. Window B: Live Monitor → Floor 3 → **Simulate fall** | Window A: alarm + pop-up "Floor 3 · Room 301 — Walter Kim" within ~3 s | | |
| FLR-02 | Banner names the floor | Hide the pop-up on Window A | Banner: "1 active fall — Floor 3, Room 301" with **Go to Floor 3 →** | | |
| FLR-03 | Floor picker count | Open the floor dropdown | "Floor 3 — 1 active fall" | | |
| FLR-04 | Jump | Click **Go to Floor 3 →** | Floor switches to 3; room 301 selected in the inspector | | |
| FLR-05 | Acknowledge stops alarm | **Acknowledge** | Alarm stops; banner disappears | | |
| FLR-06 | Pinned across floors | Pin room 301 (Floor 3), switch to Floor 2 | 301 still listed under Pinned residents; clicking it switches to Floor 3 | | |
| FLR-07 | New floor appears | Window B: Admin → add floor `4` | Window A's floor picker shows Floor 4 within ~30 s, no reload | | |

## C. Removed / corrected items (checklist)

| ID | Check | Expected | Pass/Fail |
|---|---|---|---|
| CL-01 | Live Monitor top bar | No bell icon; no Mute toggle; **Silence 30 s** present (grey when no alarm) | |
| CL-02 | Live Monitor sidebar as nurse | Only "Live Monitor" + Pinned residents; clicking never shows "handoff" toast | |
| CL-03 | Live Monitor sidebar as admin | Also **Administration** → opens `/admin` | |
| CL-04 | Room tile | No risk label, no "Zone A"; shows "Sensor online" | |
| CL-05 | Inspector (idle room) | No "Assign nurse" button; no "Recent incidents" list; no risk badge | |
| CL-06 | Inspector sensor row (offline room) | No "Last seen 48m ago" / "Calibration due" text | |
| CL-07 | Toolbar subtitle | "Floor 2 · 2 rooms monitored" (no "Evening shift") | |
| CL-08 | Right panel guide | No "within 10 s" or "with an outcome" | |
| CL-09 | Camera window (Live camera feed) | Note doesn't claim end-to-end encryption or access logs | |
| CL-10 | Admin top bar | No "?" button, no "Sunrise Wing" | |
| CL-11 | Admin sidebar | No "Settings SOON" | |
| CL-12 | Login page | No SSO button; brand panel doesn't mention HIPAA or "sub-second" | |
| CL-13 | Profile menu | Shows name and email, then Log out | |
| CL-14 | Browser tab title | "Live Monitor · FallDetect" / "Sign in · FallDetect" (never "Create Next App") | |
| CL-15 | Nurse `/api/me` | Console: `fetch('/api/me').then(r=>r.json())` → includes `"role":"NURSE"` | |

## Results log

| Section | Cases | Passed | Failed | Notes |
|---|---|---|---|---|
| A. Alarm sound | 15 | | | |
| B. Other floors | 7 | | | |
| C. Cleanup checklist | 15 | | | |
| **Total** | **37** | | | |

Tester: ______________ Date: ______________ Browser/version: ______________
