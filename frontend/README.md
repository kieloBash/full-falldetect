# FallDetect (React + TypeScript + Tailwind)

Production-shaped port of screens from the Claude Design handoff (project
`FallDetect UI/UX specification`), built for a Next.js **App Router**
project using **Tailwind CSS**, **lucide-react** icons, and a **TanStack
Query + axios** data layer (mock-backed for now).

Two screens are implemented:

- **Live Monitor** (`FallDetect Live Monitor.dc.html`, iterated in
  `chats/chat1.md`) — the nurse-station landing screen: a live grid of every
  monitored room (or, toggled, a "Camera wall" of pinned rooms' live CCTV
  feeds), a right-hand inspector, and the full fall-response lifecycle —
  Acknowledge → Mark resolved, or Flag false alarm with a required reason.
- **Auth** (`FallDetect Auth.dc.html`) — a split-panel sign-in / create-account
  screen with a dark brand panel, tabbed forms, password-strength meter, and
  a success confirmation state.

## 1. Install dependencies

```bash
npm install lucide-react @tanstack/react-query axios
```

(`react` / `react-dom` / `tailwindcss` are assumed already present in a
Next.js app.)

## 2. Copy the files in

Copy everything under `src/` into your app's `src/` directory (or merge the
paths manually if you don't use a `src/` root — just keep `components/`,
`lib/`, and `app/` as siblings, or adjust the `@/*` import alias below to
match).

```
src/
  app/
    live-monitor/
      page.tsx              — route entry: wraps <LiveMonitor /> in <QueryProvider>
    login/
      page.tsx               — route entry (server component, exports metadata)
  components/
    providers/
      QueryProvider.tsx      — app-wide TanStack QueryClientProvider
    icons/
      Icon.tsx                — shared name → lucide-react icon registry (used by both screens)
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
```

## 3. Wire up Tailwind

Merge `tailwind.config.additions.ts` (at the root of this bundle) into your
`tailwind.config.{ts,js}` under `theme.extend` — it defines the
`animate-fd-*` keyframes the components reference (alert pulse, blinking REC
dot, toast entrance, banner flash, and the Auth submit-button spinner) and
the `Inter` / `IBM Plex Sans` / `IBM Plex Mono` font stacks. Everything else
is plain Tailwind utilities: the brief's palette (slate neutrals, teal
accent, red/amber/green semantic colors) maps exactly onto Tailwind's
default color scale, so no custom theme colors were needed.

```ts
import type { Config } from "tailwindcss";
import { fallDetectThemeExtend } from "./tailwind.config.additions";

export default {
  content: ["./src/**/*.{ts,tsx}"],
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
    "paths": { "@/*": ["./src/*"] }
  }
}
```

## 5. Render it

Both screens ship their own route under `app/`, already wired to
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

`onAuthenticated` fires when the user clicks through from the post-login/
post-register success screen. Omit it and `<AuthScreen />` just resets back
to the sign-in tab, matching the original prototype's demo behavior.

Optional demo props for Live Monitor (all default to `false`):

```tsx
<LiveMonitor startWithActiveFall muteSound={false} reduceMotion={false} />
```

> **If your app already has (or will have) a root-level `QueryClientProvider`**
> — the usual TanStack Query setup — drop the per-page ones and rely on the
> shared one instead, so the cache persists across navigation. See the note
> at the top of `QueryProvider.tsx`.

## The data layer: TanStack Query + axios, mock-backed for now

Both screens fetch/mutate through **TanStack Query** and are ready for
**axios**, but nothing hits a real network yet — every request currently
resolves local mock data after a short delay. The pattern is the same in
both features:

- **`lib/api/client.ts`** — the shared axios instance
  (`baseURL` from `NEXT_PUBLIC_API_BASE_URL`). Not imported anywhere yet.
- **`lib/<feature>/api.ts`** — one async function per endpoint
  (Live Monitor: `fetchRooms`, `acknowledgeAlert`, `resolveAlert`,
  `flagFalseAlarm`, `reconnectSensor`; Auth: `login`, `register`), each
  resolving mock data today. Every function has a `// TODO(api)` comment
  with the exact `apiClient` call to swap in — that's the *only* file that
  needs to change once a backend exists.
- **`lib/<feature>/queries.ts`** — the TanStack Query layer built on top of
  `api.ts`: `useRoomsQuery` (seeded via `initialData` so there's no loading
  flash) and four mutations for Live Monitor; `useLoginMutation` /
  `useRegisterMutation` for Auth.
- **`lib/<feature>/use<Feature>Form.ts` / `useLiveMonitor.ts`** — the "brain"
  hook wiring local state to those query/mutation hooks. Response actions
  call `.mutate(...)` and apply the resulting local-state update (plus, for
  Live Monitor, the activity-feed entry and toast) in `onSuccess`. Swapping
  `api.ts` from mock to real `apiClient` calls won't require touching this
  wiring or any component.

**What stays plain React state** (no server concept to query/mutate): Live
Monitor's Simulate fall trigger, 1s clock tick, view/floor/search, pin list,
and toasts; Auth's current tab/mode and raw field values before submit.

**Not yet wired to a query**: `historyForRisk()` in `mock-data.ts` (the Live
Monitor inspector's "Recent incidents" list) is still a plain synchronous
helper — small enough that turning it into a query wasn't worth the
loading-state complexity yet, but `GET /residents/{id}/incidents` is the
obvious future endpoint for it.

## Icons

All icons go through `components/icons/Icon.tsx`, a `name -> lucide-react
component` map (e.g. `<Icon name="check" />`) shared by both screens. To use
a lucide icon that isn't in the map yet, import it in `Icon.tsx` and add it
to the `ICONS` object — every call site stays a plain semantic name.

## Scope note

Live Monitor and Auth are the two screens actually designed and prototyped
in the Claude Design session. Incidents has a written implementation-handoff
spec (`project/FallDetect Incidents - Handoff.dc.html`) but no built UI, and
Analytics/Settings were never scoped. Live Monitor's sidebar nav items for
those sections are present (matching the information architecture) but
inert — clicking them shows a toast rather than navigating, exactly like the
source prototype.
