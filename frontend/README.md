# FallDetect (React + TypeScript + Tailwind)

Production-shaped port of screens from the Claude Design handoff (project
`FallDetect UI/UX specification`), built for a Next.js **App Router**
project using **Tailwind CSS**, **lucide-react** icons, and a **TanStack
Query + axios** data layer (mock-backed for now).

Five screens are implemented:

- **Live Monitor** (`FallDetect Live Monitor.dc.html`, iterated in
  `chats/chat1.md`) — the nurse-station landing screen: a live grid of every
  monitored room (or, toggled, a "Camera wall" of pinned rooms' live CCTV
  feeds), a right-hand inspector, and the full fall-response lifecycle —
  Acknowledge → Mark resolved, or Flag false alarm with a required reason.
- **Auth** (`FallDetect Auth.dc.html`) — a split-panel sign-in / create-account
  screen with a dark brand panel, tabbed forms, password-strength meter, and
  a success confirmation state.
- **Admin · Floor Management, Room Management, Patient Management**
  (`FallDetect Admin.dc.html`) — three separate CRUD screens (not tabs
  within one screen) sharing one nav shell: a floor list with a read-only
  per-floor room summary; a full rooms table (room ⇄ floor ⇄ patient) with
  add/edit/remove; and a patients table (name, room assignment, care notes,
  active/discharged) with add/edit/remove.

## 1. Install dependencies

```bash
npm install lucide-react @tanstack/react-query axios
```

(`react` / `react-dom` / `tailwindcss` / `next` are assumed already present
in a Next.js app.)

## 2. Copy the files in

Copy everything under `` into your app's `` directory (or merge the
paths manually if you don't use a `` root — just keep `components/`,
`lib/`, and `app/` as siblings, or adjust the `@/*` import alias below to
match).

```

  app/
    live-monitor/
      page.tsx              — route entry: wraps <LiveMonitor /> in <QueryProvider>
    login/
      page.tsx               — route entry (server component, exports metadata)
    admin/
      layout.tsx               — ONE <QueryProvider> shared by all 3 admin routes below
      page.tsx                  — /admin — Floor Management
      rooms/
        page.tsx                  — /admin/rooms — Room Management
      patients/
        page.tsx                   — /admin/patients — Patient Management
  components/
    providers/
      QueryProvider.tsx      — app-wide TanStack QueryClientProvider
    icons/
      Icon.tsx                — shared name → lucide-react icon registry (used by every screen)
    live-monitor/
      LiveMonitor.tsx          — top-level client component (composes everything)
      TopBar.tsx                — brand, breadcrumb, search, simulate/mute/health
      ActiveAlertBanner.tsx     — sticky red banner shown while any fall is active
      Sidebar.tsx                — nav + pinned residents
      Toolbar.tsx                — title, floor select, Grid/Camera-wall toggle
      RoomGrid.tsx                — grid view (+ empty state)
      CameraWall.tsx              — camera-wall view (+ empty state)
      AlertTile.tsx                — signature per-room card (idle→active→...)
      CameraCard.tsx                — camera-wall tile
      CameraFeed.tsx                 — shared CCTV feed surface + AI box
      Inspector.tsx                   — right sidebar, switches on selection
      InspectorSummary.tsx             — idle state: shift stats + guide + feed
      InspectorRoomDetail.tsx          — selected-room state: actions + sensor
      FalseAlarmDialog.tsx              — required-reason confirmation modal
      CameraModal.tsx                    — full-screen live feed modal
      ToastStack.tsx                      — bottom-right confirmations
      StatusBadge.tsx                      — icon+text+color status pill
    auth/
      AuthScreen.tsx            — top-level client component (composes everything)
      LoginPageClient.tsx        — client wrapper (router + QueryProvider) used by app/login/page.tsx
      BrandPanel.tsx              — left dark panel (logo, headline, features, copyright)
      AuthTabs.tsx                  — Sign in / Create account segmented control
      LoginForm.tsx                  — sign-in form + SSO button
      RegisterForm.tsx                — create-account form + strength meter + terms
      AuthSuccess.tsx                   — post sign-in/register confirmation state
      fields/
        TextField.tsx                    — labeled text/email input
        PasswordField.tsx                 — labeled password input, optional show/hide toggle
        SelectField.tsx                    — labeled select, generic over its option union
        Checkbox.tsx                        — labeled checkbox (remember me / terms)
        SubmitButton.tsx                     — primary button with busy-state spinner
        PasswordStrengthMeter.tsx             — 4-bar strength indicator + label
    admin/
      AdminTopBar.tsx              — brand, "Admin" badge, breadcrumb (label from the current route)
      AdminSidebar.tsx              — Monitoring (Live Monitor links out) + the 3 admin routes + SOON items
      AdminToolbar.tsx               — generic title + subtitle + "Add ___" action, shared by all 3 screens
      FloorManagementScreen.tsx       — /admin: floor list + selected floor's read-only room table
      FloorList.tsx / FloorCard.tsx    — left pane: selectable floor cards (name, wing, counts, status dot)
      FloorRoomsTable.tsx               — read-only Room/Resident/Sensor ID/Status table
      RoomManagementScreen.tsx           — /admin/rooms: full room CRUD
      RoomManagementTable.tsx             — Room/Floor/Assigned patient/Sensor ID/Actions table
      RoomManagementRow.tsx                — one row + edit/remove
      PatientManagementScreen.tsx           — /admin/patients: full patient CRUD
      PatientTable.tsx                       — Patient/Room/Notes/Status/Actions table
      PatientRow.tsx                          — one row + edit/remove
      SensorStatusPill.tsx                     — plain colored status pill (Online/Warning/Offline)
      PatientStatusPill.tsx                     — plain colored status pill (Active/Discharged)
      ModalShell.tsx                             — shared overlay/panel/animation for all 3 modals
      AddFloorModal.tsx                           — floor name + wing form
      AddEditRoomModal.tsx                         — room number/sensor id/floor form
      AddEditPatientModal.tsx                       — name/room assignment/notes/discharged form
      fields/
        ModalTextField.tsx                           — labeled text input sized for these modals
        ModalSelectField.tsx                           — labeled select sized for these modals
        ModalTextareaField.tsx                          — labeled textarea (patient notes)
        ModalCheckboxField.tsx                           — labeled checkbox ("Mark as discharged")
  lib/
    api/
      client.ts              — shared axios instance
    live-monitor/
      types.ts                — Room / ActivityItem / Toast / badge & view-mode types
      constants.ts             — copy strings, badge/risk/sensor metadata, nav items
      utils.ts                  — formatElapsed, effState, detectBox, etc. (pure fns)
      mock-data.ts                — seed rooms + demo incident history
      api.ts                       — endpoint functions (mock-backed, see below)
      queries.ts                    — TanStack Query hooks wrapping api.ts
      useLiveMonitor.ts               — all state + actions for the screen (the "brain")
    auth/
      types.ts                — AuthMode / LoginFormValues / RegisterFormValues, etc.
      constants.ts              — copy strings, facility options, password-strength meta
      utils.ts                    — passwordStrengthScore
      api.ts                        — login()/register() (mock-backed, see below)
      queries.ts                     — useLoginMutation / useRegisterMutation
      useAuthForm.ts                   — all state + actions for the screen (the "brain")
    admin/
      types.ts                — Floor / Room / Patient / form-value types (reuses Live Monitor's SensorStatus)
      constants.ts              — copy strings per screen, status pill metadata, nav/route config
      utils.ts                    — roomsForFloor, activePatientForRoom, roomOptionLabel, etc.
      mock-data.ts                  — seed floors + rooms + patients (normalized, not nested)
      api.ts                          — floor/room/patient CRUD (mock-backed, see below)
      queries.ts                       — useFloorsQuery/useRoomsQuery/usePatientsQuery + mutations
      useFloorManagement.ts             — brain hook for /admin
      useRoomManagement.ts               — brain hook for /admin/rooms
      usePatientManagement.ts             — brain hook for /admin/patients
```

## 3. Wire up Tailwind

Merge `tailwind.config.additions.ts` (at the root of this bundle) into your
`tailwind.config.{ts,js}` under `theme.extend` — it defines the
`animate-fd-*` keyframes the components reference (alert pulse, blinking REC
dot, toast entrance, banner flash, Auth's submit-button spinner, and Admin's
modal entrance) and the `Inter` / `IBM Plex Sans` / `IBM Plex Mono` font
stacks. Everything else is plain Tailwind utilities: the brief's palette
(slate neutrals, teal accent, red/amber/green semantic colors) maps exactly
onto Tailwind's default color scale, so no custom theme colors were needed.

```ts
import type { Config } from "tailwindcss";
import { fallDetectThemeExtend } from "./tailwind.config.additions";

export default {
  content: ["./**/*.{ts,tsx}"],
  theme: { extend: { ...fallDetectThemeExtend } },
} satisfies Config;
```

Load the fonts however your app normally does — e.g. `next/font/google`:

```tsx
// app/layout.tsx
import { Inter, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
```

or a `<link>` to Google Fonts for Inter, IBM Plex Sans (weights 400–700) and
IBM Plex Mono (used only for the camera-feed timestamp overlay).

## 4. Confirm the `@/*` import alias

Every file imports via `@/components/...` and `@/lib/...`. If your
`tsconfig.json` doesn't already have this (the default `create-next-app`
setup does), add:

```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./*"] }
  }
}
```

## 5. Render it

Live Monitor and Auth each ship one route wired to their own
`QueryProvider`:

```tsx
// app/live-monitor/page.tsx (already included)
import { LiveMonitor } from "@/components/live-monitor/LiveMonitor";
import { QueryProvider } from "@/components/providers/QueryProvider";

export default function LiveMonitorPage() {
  return (
    <QueryProvider>
      <LiveMonitor />
    </QueryProvider>
  );
}
```

```tsx
// app/login/page.tsx (already included) renders LoginPageClient, which does:
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { QueryProvider } from "@/components/providers/QueryProvider";

function LoginPageClient() {
  const router = useRouter();
  return (
    <QueryProvider>
      <AuthScreen onAuthenticated={() => router.push("/live-monitor")} />
    </QueryProvider>
  );
}
```

Admin is **three separate routes** — `/admin`, `/admin/rooms`,
`/admin/patients` — that share one dataset (floors/rooms/patients), so the
`QueryProvider` lives once in `app/admin/layout.tsx` instead of per-page:

```tsx
// app/admin/layout.tsx (already included)
import { QueryProvider } from "@/components/providers/QueryProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
```

```tsx
// app/admin/page.tsx / app/admin/rooms/page.tsx / app/admin/patients/page.tsx (already included)
import { FloorManagementScreen } from "@/components/admin/FloorManagementScreen";

export default function AdminFloorsPage() {
  return <FloorManagementScreen />;
}
```

> **Why a layout, not per-page providers**: each admin page having its own
> `QueryClient` would mean navigating between them re-seeds every query's
> `initialData` fresh, masking mutations made on a different admin page
> until the default staleTime lapses. One shared `QueryClient` at the
> layout level keeps the cache consistent across all three routes.

`onAuthenticated` fires when the user clicks through from the post-login/
post-register success screen. Omit it and `<AuthScreen />` just resets back
to the sign-in tab, matching the original prototype's demo behavior.

Optional demo props for Live Monitor (all default to `false`):

```tsx
<LiveMonitor startWithActiveFall muteSound={false} reduceMotion={false} />
```

> **If your app already has (or will have) a root-level `QueryClientProvider`**
> — the usual TanStack Query setup — drop `QueryProvider` from `app/live-monitor/page.tsx`,
> `LoginPageClient.tsx`, and `app/admin/layout.tsx`, and rely on the shared
> one instead, so the cache persists across your whole app, not just within
> each feature. See the note at the top of `QueryProvider.tsx`.

> **Access control**: Admin has no route-level role gating yet — there's no
> real session/auth wiring to gate on until the Auth screen's mock
> `login()`/`register()` become real endpoints. Once they do, redirect
> non-admins out of `/admin/*` in middleware.

## The data layer: TanStack Query + axios, mock-backed for now

All screens fetch/mutate through **TanStack Query** and are ready for
**axios**, but nothing hits a real network yet — every request currently
resolves local mock data after a short delay. The pattern is the same
across features:

- **`lib/api/client.ts`** — the shared axios instance
  (`baseURL` from `NEXT_PUBLIC_API_BASE_URL`). Not imported anywhere yet.
- **`lib/<feature>/api.ts`** — one async function per endpoint
  (Live Monitor: `fetchRooms`, `acknowledgeAlert`, `resolveAlert`,
  `flagFalseAlarm`, `reconnectSensor`; Auth: `login`, `register`; Admin:
  `fetchFloors`/`createFloor`, `fetchRooms`/`createRoom`/`updateRoom`/
  `deleteRoom`, `fetchPatients`/`createPatient`/`updatePatient`/
  `deletePatient`), each resolving mock data today. Every function has a
  `// TODO(api)` comment with the exact `apiClient` call to swap in —
  that's the *only* file that needs to change once a backend exists.
- **`lib/<feature>/queries.ts`** — the TanStack Query layer built on top of
  `api.ts`. Two different, both-valid patterns are demonstrated here:
  - Live Monitor keeps a local optimistic copy of the room roster and
    patches it directly in each mutation's `onSuccess` — right for a screen
    where sub-second UI feedback matters.
  - Admin's mutations just call `queryClient.invalidateQueries()` on
    success and let the relevant query refetch — simpler, and the right
    call for CRUD screens where a few hundred ms of round-trip latency is
    fine. Deleting a room invalidates *both* the rooms and patients
    queries, since it can unassign a patient. Its `api.ts` keeps
    module-level in-memory stores so creates/edits/deletes actually
    persist for the session instead of resetting on every refetch.
- **`lib/<feature>/use<Feature>.ts`** — the "brain" hook wiring local state
  to those query/mutation hooks: `useLiveMonitor`, `useAuthForm`, and
  (since Admin is 3 routes, not 1 screen) `useFloorManagement` /
  `useRoomManagement` / `usePatientManagement`. Swapping any feature's
  `api.ts` from mock to real `apiClient` calls won't require touching this
  wiring or any component.

**What stays plain React state** (no server concept to query/mutate): Live
Monitor's Simulate fall trigger, 1s clock tick, view/floor/search, pin list,
and toasts; Auth's current tab/mode and raw field values before submit;
each Admin screen's own modal open/closed + form state.

**Not yet wired to a query**: `historyForRisk()` in Live Monitor's
`mock-data.ts` (the inspector's "Recent incidents" list) is still a plain
synchronous helper — small enough that turning it into a query wasn't worth
the loading-state complexity yet, but `GET /residents/{id}/incidents` is the
obvious future endpoint for it.

## Icons

All icons go through `components/icons/Icon.tsx`, a `name -> lucide-react
component` map (e.g. `<Icon name="check" />`) shared by every screen. To use
a lucide icon that isn't in the map yet, import it in `Icon.tsx` and add it
to the `ICONS` object — every call site stays a plain semantic name.

## A modeling note: sensor status has one enum, not two

The Live Monitor and Admin design files were built in separate sessions and
ended up with slightly different vocabulary for the same three-state sensor
health concept: Live Monitor calls the middle tier "degraded" ("Signal
degraded"), Admin's mock data called it "warning". Rather than ship two
overlapping status enums, `lib/admin/types.ts` re-exports Live Monitor's
`SensorStatus` ("online" | "degraded" | "offline") and Admin's own
`SENSOR_STATUS_META` (in `lib/admin/constants.ts`) just displays "Warning"
as the label for "degraded" — one source of truth, two presentations (Live
Monitor's icon+text `StatusBadge` vs. Admin's plain colored
`SensorStatusPill`).

## A design-fidelity note: two slightly different input heights

Auth's text/password/select inputs are 44px tall; Admin's modal inputs are
42px. Both are exactly what their respective source designs specified, so
rather than force one to match the other (and drift from a handoff), each
feature keeps its own small field components (`components/auth/fields/` vs
`components/admin/fields/`). Worth unifying into a shared `components/ui/`
kit later if you want one canonical input size across the app.

## Scope note

Live Monitor, Auth, and the three Admin screens are what's actually
designed and prototyped in the Claude Design session. Incidents has a
written implementation-handoff spec
(`project/FallDetect Incidents - Handoff.dc.html`) but no built UI, and
Analytics/Settings/Users were never scoped — Admin's sidebar shows
Users/Settings as "SOON"-badged and disabled (not hidden, per the brief's
"disabled with a tooltip, never hidden silently" rule), and Live Monitor's
Incidents/Analytics/Settings nav items show a toast rather than navigating,
exactly like the source prototypes. Admin's "Live Monitor" nav item is a
real link, since that route exists.
