<!-- location: docs/detection-node/PATCHES.md -->
# Changes to existing files

The module's new files are drop-in. This page covers edits to files that already exist in
the codebase. I didn't have those files, only the TDS, so each patch shows the change to
make rather than a whole replacement file. `proxy.ts` is the exception: it's a full
replacement written from the TDS §9.2 flow, so diff it against yours before overwriting.

## 1. `frontend/package.json`

```powershell
npm i @supabase/supabase-js
npm i server-only        # skip if already installed (lib/auth/jwt.ts uses it)
```

Add or adjust these scripts:

```json
"scripts": {
  "dev": "next dev",
  "dev:lan": "next dev -H 0.0.0.0 -p 3000",
  "build": "prisma generate && next build",
  "start": "next start",
  "start:lan": "next start -H 0.0.0.0 -p 3000",
  "seed:nodes": "tsx prisma/seed-detection-node.ts",
  "simulate:node": "node --env-file=.env scripts/simulate-node.mjs"
}
```

`-H 0.0.0.0` makes the app listen on the Wi-Fi, not just `localhost`, so laptop 2 can reach it.

## 2. shadcn/ui components

```powershell
npx shadcn@latest add badge card alert table alert-dialog skeleton
```

The module uses only `open` / `onOpenChange` on `AlertDialog` and plain `Button`s in the
footer, so it works with the `base-vega` (Base UI) style without `asChild` / `render` props.

## 3. Prisma schema and migrations

1. Merge the blocks in `prisma/schema.detection-node.prisma` into `prisma/schema.prisma`:
   - the `DetectionNode` model,
   - `nodeId` / `node` / `@@index([nodeId])` on `Sensor`,
   - `detectionNodes` on `Facility`.
2. Create and apply the first migration:
   ```powershell
   npx prisma migrate dev --name detection_nodes
   ```
3. Create the migration for the partial unique index (one open incident per room):
   ```powershell
   npx prisma migrate dev --create-only --name one_open_incident_per_room
   ```
   Paste `prisma/sql/one_open_incident_per_room.sql` into the generated `migration.sql`, then
   run `npx prisma migrate dev`.
4. Prisma doesn't know about partial indexes. If a later `migrate dev` generates
   `DROP INDEX "incidents_one_open_per_room"`, delete that line from the new migration
   before applying it.

## 4. Session cookie over plain http — `lib/auth/cookies.ts`

Find the `secure:` option where `fd_session` is set (TDS §9.1: "secure in production"):

```ts
// before
secure: process.env.NODE_ENV === "production",
// after
secure: process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === "true"
  : process.env.NODE_ENV === "production",
```

With `COOKIE_SECURE=false`, logging in works both on `http://localhost:3000` and from another
device at `http://<laptop-1-IP>:3000`.

## 5. `frontend/proxy.ts` — full replacement (fix #11 + heartbeat)

Use the provided `proxy.ts`. Changes from the TDS §9.2 flow:
- `/api/monitor/heartbeat` joins the public list (it uses the bearer secret, no cookie);
- signed-out `/api/*` calls get **401 JSON** instead of a 307 redirect;
- `/admin`, `/api/admin/*` and `/api/detection-nodes/*` require role `ADMIN`. Nurses are
  redirected to `/live-monitor` (pages) or get 403 (API);
- `?next=` accepts only same-site paths.

New routes use `requireUser()` / `requireAdmin()` from `lib/auth/guards.ts` as a second layer.
You can also swap them into existing admin routes.

## 6. Signed screenshot URLs — `app/api/monitor/route.ts`

The DB now stores a Supabase object path. Convert it to a signed URL before returning rooms:

```ts
import { withSignedScreenshots } from "@/lib/detection-node-server/supabase-storage";

// before
return NextResponse.json(rows.map(projectRoom));
// after
return NextResponse.json(await withSignedScreenshots(rows.map(projectRoom)));
```

Signed URLs last 1 hour and are cached in memory, so the 3-second polling doesn't call
Supabase each time. If anything else shows screenshots (for example a future Incidents
page), run its rows through `withSignedScreenshots` or `resolveScreenshotUrl` too.

## 7. Screenshot `<img>` — `FallAlertModal` (and the inspector, if it shows one)

```tsx
import { resolveScreenshotSrc } from "@/lib/detection-node/utils";

const src = resolveScreenshotSrc(room.screenshotPath);
{src && <img src={src} alt={`Fall screenshot, Room ${room.label}`} />}
```

This replaces code like `` `/${room.screenshotPath}` ``. If you use `next/image` there,
add this to `next.config.ts`:

```ts
images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
```

## 8. Sensor status from heartbeats — `lib/live-monitor-server/projection.ts`

```ts
import { effectiveSensorStatus } from "@/lib/detection-node-server/status";

// in projectRoom(), replace the lower-casing of sensor.status:
sensorStatus: effectiveSensorStatus(room.sensor),
```

If the room query selects specific sensor fields, add `nodeId: true, lastSeenAt: true`.
Sensors not managed by any camera laptop (for example seed data) keep their stored status.
Note that the Live Monitor's "Reconnect" button (`POST /api/sensors/{roomId}/reconnect`) is
overridden by the next heartbeat for laptop-managed sensors.

## 9. Live video — `components/live-monitor/CameraFeed.tsx`

```tsx
import { RemoteCameraFeed } from "@/components/detection-node/RemoteCameraFeed";

// before
<img src={`http://localhost:8002/stream/${deviceId}`} ... />
// after
<RemoteCameraFeed deviceId={room.deviceId} className="h-full" />
```

The `CameraFeed` component and anything inside the Live Monitor are already under a
`QueryProvider` (TDS §8.1).

## 10. Fix #10 — admin rooms write `Sensor.deviceId`

In `app/api/admin/rooms/route.ts` (POST) and `app/api/admin/rooms/[roomId]/route.ts` (PATCH),
wherever `sensorId` from the form is written:

```ts
// before
deviceLabel: sensorId,
// after
deviceId: sensorId,
deviceLabel: sensorId,
```

Wrap the create/update in a unique-violation check, because two rooms can't share a Sensor ID:

```ts
import { isUniqueViolation, jsonError } from "@/lib/api/errors";

try {
  /* existing prisma.room.create / update */
} catch (err) {
  if (isUniqueViolation(err)) return jsonError(409, "That room label or Sensor ID is already in use");
  throw err;
}
```

In `lib/admin/server-projection.ts` → `projectRoom`, read it back from the same field:

```ts
sensorId: room.sensor?.deviceId ?? room.sensor?.deviceLabel ?? "",
```

Then repair rooms created before the fix:

```powershell
npx tsx prisma/scripts/backfill-device-ids.ts
```

## 11. Fix #12 — `app/api/alerts/route.ts` (Simulate fall)

Restore the commented-out facility filter:

```ts
const room = await prisma.room.findFirst({
  where: { id: roomId, floor: { facilityId: session.facilityId } },  // ← restore
  // ...existing include
});
```

Also catch the race that the new index now turns into an error:

```ts
try {
  /* existing incident create */
} catch (err) {
  if (isUniqueViolation(err)) return jsonError(409, "This room already has an open alert");
  throw err;
}
```

## 12. Admin navigation

Add a link to `/admin/detection-nodes` labelled **Camera laptops** wherever the admin
section links to Floors / Rooms / Patients.

## 13. Remove legacy code (TDS §4.2, §6.5)

These are no longer used, and some bypass the fixes above:
- `app/api/alertTest/route.ts`
- `app/api/admin/floors/[floorId]/rooms/**` (still writes `deviceLabel` only)
- `components/admin/AdminScreen.tsx` and its unused helpers
- `lib/api/client.ts` is **replaced** by the module's version (it was unused)
