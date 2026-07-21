## Roadmap / TODOs

### 1. Floor Selection Dropdown (Staff View) [DONE]
Configure a dropdown so staff can filter the room view by floor.

**Components**
- `FloorSelector` — controlled `<select>` or combobox; emits selected floor
- Wire selection into `RoomGrid` filtering (client-side filter or `?floor=` refetch)

**API endpoints**
- `GET /api/floors/assigned` — list available floors (public to authenticated staff; read-only here)

**Notes**
- Creating/editing floors lives on the admin side (see #5). This is the read-only consumer of that data.

### 2. Incidents Page
A log of alert events (falls, false alarms, resolutions) tied to rooms and responders.

**Components**
- `IncidentList` — table/timeline of incidents
- `IncidentRow` — one incident using the `formatHistoryMessage` formatter (state, responder, reason, timestamp)
- `IncidentFilters` — filter by state, floor, date range, responder
- `IncidentDetail` — full history of a single incident

**API endpoints**
- `GET /api/incidents` — list incidents (support `?state=`, `?floor=`, `?from=`, `?to=`)
- `GET /api/incidents/:id` — single incident with full state history
- `PATCH /api/incidents/:id` — update state (acknowledge / resolve / mark false alarm)

### 3. Analytics Page
Aggregate views over incidents for facility oversight.

**Components**
- `StatCard` — headline metrics (total incidents, avg response time, false-alarm rate)
- `IncidentsOverTimeChart` — incidents per day/week
- `ResponseTimeChart` — time from `active` → `acknowledged` → `resolved`
- `FloorBreakdownChart` — incidents grouped by floor
- `FalseAlarmRateCard` — ratio of `falsealarm` to total

**API endpoints**
- `GET /api/analytics/summary` — headline counts and rates
- `GET /api/analytics/incidents-over-time?interval=day|week`
- `GET /api/analytics/response-times`
- `GET /api/analytics/by-floor`

**Notes**
- These endpoints should return pre-aggregated data; don't ship raw incident rows to the client and aggregate in the browser.

### 4. Real-time Dashboard (Staff View)
Live grid of rooms and their current state, consumed by on-shift nurses.

**Components**
- `RoomCard` — displays room, assigned patient, current `EffectiveState`
- `RoomGrid` — grid of `RoomCard`s, filterable by floor (via `FloorSelector`) and state

**API endpoints**
- `GET /api/rooms` — list rooms with current state (support `?floor=` query)
- `GET /api/rooms/stream` — SSE/WebSocket for live state updates (see #6)

### 5. Admin Page
Restricted, admin-only area for facility setup and account management. Every route and page here must verify `session.role === "admin"` server-side.

#### 5a. Nurse Account Management
**Components**
- `NurseTable` — list of accounts with role and status
- `AddNurseDialog` — register a new nurse (name, email, temp password / invite)
- `EditNurseDialog` — update role, deactivate account
- `RoleGuard` — wrapper that only renders for `admin` role

**API endpoints**
- `POST   /api/admin/nurses` — register a nurse account
- `GET    /api/admin/nurses` — list accounts
- `PATCH  /api/admin/nurses/:id` — update role / deactivate
- `DELETE /api/admin/nurses/:id` — remove account

#### 5b. Floor Management [DONE]
**Components**
- `FloorTable` — list existing floors with room counts
- `AddFloorDialog` — form for floor name/number, optional wing/label
- `EditFloorDialog` — rename or archive a floor

**API endpoints**
- `POST   /api/admin/floors` — create a floor
- `GET    /api/admin/floors` — list floors (admin view, includes archived)
- `PATCH  /api/admin/floors/:id` — rename / archive
- `DELETE /api/admin/floors/:id` — remove (guard against deleting a floor that still has rooms)

#### 5c. Room Management [DONE]
**Components**
- `RoomTable` — list rooms with floor, assigned patient, sensor mapping
- `AddRoomDialog` — form for room number, floor (populated from floors), sensor/device id
- `EditRoomDialog` — reassign floor, update sensor mapping

**API endpoints**
- `POST   /api/admin/rooms` — create a room
- `GET    /api/admin/rooms` — list rooms (admin view)
- `PATCH  /api/admin/rooms/:id` — update floor / sensor mapping
- `DELETE /api/admin/rooms/:id` — remove a room

#### 5d. Patient Management [DONE]
**Components**
- `PatientTable` — list patients with current room assignment
- `AddPatientDialog` — form for patient name, room assignment, notes
- `EditPatientDialog` — reassign room, edit details, discharge

**API endpoints**
- `POST   /api/admin/patients` — register a patient
- `GET    /api/admin/patients` — list patients
- `PATCH  /api/admin/patients/:id` — update / reassign room
- `DELETE /api/admin/patients/:id` — discharge / remove

**Admin notes**
- All `/api/admin/*` routes must check `session.role === "admin"` server-side. Hiding the UI is not sufficient.
- There's a natural creation order: **floor → room → patient**. A room needs a floor to belong to; a patient needs a room to be assigned to. Reflect this in the UI (e.g. disable "Add Room" until at least one floor exists) and enforce it with foreign keys in the schema.
- Consider soft-deletes (archive flags) over hard deletes for floors, rooms, and patients, so historical incidents keep valid references.

### 6. Model → Server → Frontend Integration
Connect the fall-detection model output to the backend and push live updates to the UI.

**Pipeline**
- **Model → Server**: model/sensor posts detections to an ingest endpoint
- **Server → DB**: persist as incidents, compute `EffectiveState` (including `offline` for idle rooms with a down sensor)
- **Server → Frontend**: push live state to dashboards

**API endpoints**
- `POST /api/ingest/detection` — receives model output (room/sensor id, detection type, confidence, timestamp); secured with a device/service token, not a user session
- `GET  /api/rooms/stream` — SSE or WebSocket endpoint for live room-state updates
- `GET  /api/sensors/health` — sensor heartbeat status (drives the `offline` state)

**Notes**
- For real-time updates, choose one transport: SSE (simplest for one-way server→client) or WebSockets (if you need bidirectional). SSE is likely enough here.
- Authenticate the ingest endpoint with a separate service token — the model isn't a logged-in user, so it shouldn't use the session cookie flow.
- Define the detection payload contract early (a shared TypeScript type) so the model side and server agree on the shape.