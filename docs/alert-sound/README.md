<!-- location: docs/alert-sound/README.md -->
# Module: Looping fall alarm + frontend cleanup

Two parts:

1. **Alert sound.** A sound file from `frontend/public` loops while any fall on **any floor** is
   still unacknowledged. It stops when a nurse acknowledges, resolves or flags every active fall.
2. **Cleanup.** Buttons, labels and text that looked real but did nothing (or showed fake data)
   were removed or corrected, so every control in the UI works.

The only server change is one line in `GET /api/me`: it now also returns `role`, so the Live
Monitor can show an **Administration** link to admins. Nothing in `backend/` changes.

## Using your own alarm sound

The default is `frontend/public/sounds/fall-alert.mp3` (an original two-tone alarm generated
for this project, 1.6 s). To use your own:

- **Option A:** replace `public/sounds/fall-alert.mp3` with your file, same name.
- **Option B:** put your file anywhere under `public/` (e.g. `public/sounds/siren.wav`) and set
  `NEXT_PUBLIC_ALERT_SOUND_URL=/sounds/siren.wav` in `frontend/.env`, then restart the app
  (`NEXT_PUBLIC_*` values are read at build/start time).

mp3, wav and ogg work in Chrome and Edge. A short clip (1–3 s) loops most smoothly. If the file
is missing or can't be played, the app falls back to a built-in double beep, so the alarm never
goes silent. Only use sounds you have the right to use.

## How the alarm behaves

| Situation | What happens |
|---|---|
| A fall is detected on any floor | Alarm starts looping, pop-up opens, red banner appears |
| Nurse clicks **Hide** on the pop-up | Pop-up closes; **alarm keeps ringing** |
| Nurse clicks **Silence 30 s** (top bar) | Alarm pauses; button counts down; rings again after 30 s if still unacknowledged |
| A **new** fall arrives while silenced | Rings immediately (the silence only covered the earlier falls) |
| Nurse acknowledges (pop-up, tile, inspector, or key **A**) | That fall stops counting. When no fall is Active, the alarm stops |
| Fall is resolved or flagged false alarm | Same as acknowledged |
| Page was refreshed (browser blocks sound) | Amber bar "Enable alert sound"; any click on the page turns sound on |

"Acknowledged" falls do not ring: the nurse has taken responsibility. They stay visible in amber.

## Alerts from every floor

Before this module the Live Monitor only loaded the floor on screen, so a fall on Floor 3 was
silent while a nurse watched Floor 2. Now:

- every floor is polled every 3 s (one `GET /api/monitor?floor=` per floor — existing API);
- the pop-up, banner and alarm cover all floors; the banner says **"Go to Floor 3 →"** when the
  fall is on another floor;
- the floor picker shows e.g. "Floor 3 — 1 active fall";
- pinned residents from every floor appear in the sidebar and on the camera wall;
- the floor list refreshes every 30 s, so floors added in Admin appear without a reload.

## Removed or corrected (frontend)

| Where | Before | Now |
|---|---|---|
| Live Monitor top bar | Mute toggle (could silence alerts forever) | **Silence 30 s** button |
| Live Monitor top bar | Notifications bell (did nothing) | Removed |
| Live Monitor sidebar | Clicking other items showed "This handoff covers Live Monitor only" | Live Monitor + **Administration** (admins only) |
| Room tiles, inspector | Risk badge (not settable in Admin; almost always "Low risk") | Removed; tile shows sensor status |
| Room tiles, inspector | "Zone A" on every room | Removed |
| Inspector | "Assign nurse" button (did nothing) | Removed |
| Inspector | "Recent incidents" list (only ever showed the current alert) + `mock-data.ts` | Removed |
| Inspector sensor row | Fake "Last seen 48m ago", "Calibration due" | "No heartbeat" / "Unstable" / "Live" |
| Toolbar | "Evening shift" (hard-coded) | Removed |
| Right panel guide | "Acknowledge within 10 s", "Mark resolved with an outcome" | Accurate steps |
| Camera window note | "Encrypted end-to-end, every view access-logged" (not true) | Accurate description of token-protected video |
| Search box | "Search residents, rooms, or incidents" | "Search residents or rooms" (what it does) |
| Pop-up | Its own one-off chime; buttons Dismiss / View alert | No sound of its own; **Hide / View room / Acknowledge** |
| Admin top bar | "?" Help button (did nothing), "Sunrise Wing" breadcrumb | Removed; shows current page |
| Admin sidebar | Settings "SOON", hidden Incidents item | Removed |
| Login page | Commented SSO button; "HIPAA-compliant, encrypted end-to-end", "Sub-second alerts" | Removed; accurate feature lines |
| Profile menu | Commented Profile/Settings | Shows name + email, Log out |
| Browser tab | "Create Next App" | "FallDetect" |
| `public/` | Next.js sample images | Removed; `public/sounds/` added |
| `useLiveMonitor` | Demo options `startWithActiveFall`, `muteSound` | Removed |
| API calls | Live Monitor + floors used `fetch` | axios `apiClient`, like Admin/Auth |

`proxy.ts` now lets `/sounds/*` and audio files load without the session check, so the alarm
file is always reachable (it contains no private data).

## Files

```text
frontend/
├── public/sounds/fall-alert.mp3                 default alarm (replaceable)
├── lib/alert-sound/
│   ├── constants.ts       ALERT_SOUND_URL (env), SNOOZE_MS, copy
│   ├── fallback-beep.ts   Web Audio beep when the file can't play
│   └── useAlertSound.ts   loop / silence / autoplay-block logic
├── components/alert-sound/
│   ├── EnableSoundBar.tsx "Enable alert sound" bar
│   └── SilenceButton.tsx  "Silence 30 s" with countdown
├── lib/live-monitor/      queries (useAllRoomsQuery), useLiveMonitor, api (axios), types, utils, constants
├── components/live-monitor/  LiveMonitor, TopBar, Sidebar, Toolbar, FallAlertModal, ActiveAlertBanner,
│                             AlertTile, InspectorRoomDetail, InspectorSummary, CameraFeed
├── components/admin/      AdminSidebar, AdminTopBar
├── components/ui/profile-dropdown.tsx
├── components/auth/LoginForm.tsx, lib/auth/{api,constants,useAuthForm}.ts
├── lib/floor/{api,queries}.ts, lib/admin/constants.ts
├── app/api/me/route.ts    + role
├── app/layout.tsx, proxy.ts, .env.example
```

## Known limitations

- Browsers never allow sound before the first click/key press on a freshly loaded page. The amber
  bar makes this visible; there is no way around it in a web app. Keep the Live Monitor tab open
  and click it once at the start of the shift.
- Sound plays only in a browser tab that has the Live Monitor open. A minimized window still plays;
  a closed tab or a sleeping laptop does not.
- Polling cost grows with floors (one request per floor every 3 s). Fine for a few floors.
- Tested here: TypeScript, ESLint, the pages compile and load, `/api/me` returns `role`, the sound
  file is served. The sound and pop-up behavior needs a real browser: run `ALERT_SOUND_E2E_TESTS.md`.
