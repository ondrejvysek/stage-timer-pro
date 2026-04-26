# Stage Timer Pro v2.0 project documentation

This file combines the documentation pack into one handover document.


---

<!-- Source: README_V2.md -->

# Stage Timer Pro v2.0

Stage Timer Pro v2.0 is the planned next major version of Stage Timer Pro. It moves the project from a single room Raspberry Pi timer into a resilient live event timing appliance with rundown control, local persistence, broadcast display modes, optional mesh discovery, and optional automation integrations.

The current project is a compact Node.js and Socket.io application with a moderator UI, presenter kiosk, setup scripts, fallback access point behavior, and Companion integration. Version 2 keeps that direction, but introduces a cleaner architecture and a safer state model.

## Goals

1. Keep the timer reliable on a Raspberry Pi.
2. Preserve local operation if the network fails.
3. Make timing based on absolute timestamps, not a drifting one second decrement loop.
4. Add a proper rundown engine for planned segments and actuals.
5. Add broadcast friendly display modes such as chroma, luma, scale, and nine point positioning.
6. Add import, export, reset, and operational tooling for event reuse.
7. Keep advanced integrations such as MIDI, TSL tally, and NDI optional.

## Non goals for the first v2 milestone

1. NDI input is not part of the core milestone.
2. NDI output must not block normal timer operation.
3. Mesh sync should not be implemented until the local timestamp based timing engine is complete.
4. The current Companion module should not be broken during the first migration phase.

## Hardware target

Minimum practical target.

```text
Raspberry Pi 3 or newer
Raspberry Pi OS Lite 64 bit
Node.js latest LTS
Chromium kiosk output
HDMI display
```

Recommended target.

```text
Raspberry Pi 4 or 5
Reliable power supply
Quality MicroSD card or SSD
Wired Ethernet for production events
```

NDI input should be considered Raspberry Pi 5 only and experimental.

## Planned repository structure

```text
stage-timer-pro/
├── backend/
│   ├── lib/
│   │   ├── api-auth.js
│   │   ├── discovery.js
│   │   ├── hardware.js
│   │   ├── logger.js
│   │   ├── midi-controller.js
│   │   ├── ndi-manager.js
│   │   ├── ntp-sync.js
│   │   ├── queue-engine.js
│   │   ├── state-store.js
│   │   ├── tally-service.js
│   │   └── timer-engine.js
│   └── server.js
├── frontend/
│   ├── dashboard.html
│   ├── moderator.html
│   ├── presenter.html
│   ├── tally.html
│   └── loading.html
├── companion/
├── data/
├── logs/
├── scripts/
└── package.json
```

## Development principle

The backend owns state. Frontend screens render state. Integrations trigger commands. Storage preserves intent. Display views must be replaceable without changing timer logic.


---

<!-- Source: IMPLEMENTATION_PLAN.md -->

# Stage Timer Pro v2.0 implementation plan

This plan is written for incremental delivery. Do not attempt to implement every v2 feature in one change.

## Phase 0. Documentation and baselining

Goal. Create shared understanding before refactoring.

Tasks.

1. Add the v2 documentation pack.
2. Document current v1 API behavior used by frontend and Companion.
3. Add a basic smoke test checklist for start, pause, reset, mode change, quick messages, presenter view, and setup script.
4. Mark current public endpoints that perform system actions.

Done when.

1. Documentation is merged.
2. Existing behavior is documented.
3. No runtime code has changed.

## Phase 1. State foundation

Goal. Introduce the v2 state model while keeping existing UI behavior.

Tasks.

1. Create `backend/lib/timer-engine.js`.
2. Create `backend/lib/state-store.js`.
3. Move runtime timer state out of global `server.js` variables.
4. Store `targetTimestamp`, `startedAt`, `pausedRemainingSeconds`, and `durationSeconds`.
5. Add atomic JSON write support.
6. Create `/data/config.json`, `/data/state.json`, and `/data/display.json` defaults on boot.

Done when.

1. Countdown survives process restart.
2. Pause and resume preserve exact remaining time.
3. Time display is calculated from absolute timestamp while running.
4. Current frontend still works.

## Phase 2. API cleanup and security

Goal. Make sensitive operations safe before adding new admin functions.

Tasks.

1. Add admin token or pairing code.
2. Convert state changing GET routes to POST routes.
3. Keep legacy GET routes temporarily with deprecation warnings if needed for Companion.
4. Validate every request body.
5. Replace shell string interpolation with command allow lists.
6. Add CORS and LAN binding configuration.

Done when.

1. Restart, update, hostname, Wi-Fi, static IP, upload, reset, and admin actions require authorization.
2. Invalid payloads return structured 400 errors.
3. Unauthorized requests return 401 or 403.
4. Companion migration path is documented.

### Companion migration path for Phase 2

1. New writes should use POST endpoints with JSON bodies.
2. Legacy GET write endpoints remain temporarily available and include a deprecation `Warning` header.
3. Sensitive operations now require `x-stage-timer-token` (admin token) whether called via POST or legacy GET.
4. Companion module updates should prioritize `/api/start`, `/api/pause`, `/api/toggle_playback`, `/api/reset`, `/api/add`, and `/api/message/*` POST routes.

## Phase 3. Rundown and actuals

Goal. Add event flow management.

Tasks.

1. Add `backend/lib/queue-engine.js`.
2. Add `/data/rundown.json`.
3. Add rundown CRUD endpoints.
4. Add current index to global state.
5. Add Next and Previous segment commands.
6. Add CSV actuals logging with escaping.
7. Add export for actuals.

Done when.

1. Operator can load a rundown.
2. Next logs actual duration and starts the next segment.
3. Reboot restores current segment and timer intent.
4. CSV output opens correctly in Excel and similar tools.

## Phase 4. Display and broadcast modes

Goal. Make presenter output suitable for switchers and confidence monitors.

Tasks.

1. Add display config to `/data/display.json`.
2. Add key modes `none`, `chroma`, and `luma`.
3. Add nine point positioning.
4. Add scale and margin controls.
5. Add presenter CSS grid layout.
6. Add preview controls in moderator UI.

Done when.

1. Presenter view can render timer in all nine positions.
2. Chroma mode uses solid green background.
3. Luma mode uses solid black background.
4. Scaling does not cause layout jitter.

## Phase 5. Import, export, and reset

Goal. Make event profiles portable.

Tasks.

1. Export config, state, display, rundown, MIDI mapping, and tally config.
2. Validate imports before writing anything.
3. Write imports atomically.
4. Add factory reset with confirmation and backup.
5. Restart service cleanly after reset.

Done when.

1. Exported profile imports on another Pi.
2. Invalid import does not corrupt existing data.
3. Reset creates backup before clearing data.

## Phase 6. Discovery and dashboard

Goal. Add zero configuration discovery without browser side mDNS assumptions.

Tasks.

1. Add backend mDNS advertiser using `bonjour-service`.
2. Add backend mDNS browser using `bonjour-service`.
3. Expose discovered nodes through `/api/discovery/nodes`.
4. Emit discovery updates through Socket.io.
5. Create `dashboard.html` as mesh controller.

Done when.

1. Multiple Pis appear in the dashboard by room name.
2. UUID remains stable when IP address changes.
3. Discovery can be disabled in config.

## Phase 7. Sync

Goal. Add multi display timing based on clock offset and target timestamps.

Tasks.

1. Implement ping/pong offset measurement.
2. Keep rolling average and jitter estimate per follower.
3. Send absolute `targetTimestamp` rather than remaining seconds.
4. Add follower status and sync quality display.

Done when.

1. Two displays remain visually aligned during a running countdown.
2. Network jitter does not cause visible jumps.
3. Loss of leader does not stop local display immediately.

## Phase 8. Automation and tally

Goal. Add event control integrations.

Tasks.

1. Add MIDI input module.
2. Add mapping validation.
3. Add Web Tally route.
4. Add TSL output module.
5. Add integration status endpoint.

Done when.

1. MIDI note or CC can trigger mapped timer commands.
2. Tally reflects timer state.
3. Integration failures do not crash the timer.

## Phase 9. Optional NDI modules

Goal. Add advanced broadcast integrations without weakening appliance reliability.

Tasks.

1. Detect FFmpeg and NDI support.
2. Add NDI output as disabled by default.
3. Run NDI as a supervised child process.
4. Add health status and restart control.
5. Treat NDI input as experimental.

Done when.

1. Timer works normally when NDI is unavailable.
2. NDI process failure is visible but non fatal.
3. NDI input is hidden behind experimental config.

---

<!-- Source: CONTRIBUTING_V2.md -->

# Contributing to Stage Timer Pro v2.0

## Development approach

Work in small changes. Keep the timer usable after each merged change.

## Before coding

1. Read `DOCS_INDEX.md`.
2. Read `IMPLEMENTATION_PLAN.md`.
3. Check `docs/03-state-model.md` and `docs/04-api-contract.md` before changing backend behavior.
4. Check `docs/07-security-model.md` before adding routes or system commands.

## Pull request rules

Each pull request should include.

```text
what changed
why it changed
manual test steps
risk level
rollback notes
```

## Compatibility rule

Do not break current moderator, presenter, or Companion workflows unless the pull request includes the migration and documentation update.

## Code rules

1. Keep timer calculation in `timer-engine.js`.
2. Keep file writes in `state-store.js`.
3. Keep route handlers thin.
4. Validate all external input.
5. Do not use raw shell strings with user input.
6. Do not write to SD card every second.
7. Do not make NDI required for core timer operation.

## Manual test checklist

Run this before merging core behavior changes.

```text
npm install
npm start
open moderator UI
open presenter UI
start countdown
pause countdown
resume countdown
reset countdown
switch display mode
show and hide message
restart service while paused
restart service while running
check logs for errors
```

## Commit style

Use concise commits.

Examples.

```text
Add v2 state store
Refactor timer engine
Add rundown persistence
Protect admin routes
Document API contract
```

---

<!-- Source: docs/01-product-vision.md -->

# Product vision

Stage Timer Pro v2.0 is a professional timing appliance for live events, conference stages, control rooms, and confidence monitors.

The product must stay simple for operators. The system may become technically advanced internally, but the show workflow should remain direct.

## Core promise

The timer must keep working even when the network fails, the browser reloads, or the operator tablet disconnects.

## Main users

1. Stage manager. Starts, pauses, resets, and advances the timer.
2. Technical director. Configures displays, keying, tally, network behavior, and integrations.
3. Speaker or presenter. Sees a clean timer, message, or confidence view.
4. Event operator. Loads rundowns, exports profiles, and collects actuals after the show.

## Product pillars

### Appliance first

The Raspberry Pi boots directly into the presenter output. The audience should never see Linux boot text, desktop clutter, browser chrome, or error pages during normal operation.

### Local first

A single Pi must operate independently. Mesh features, dashboard features, and automation are enhancements, not requirements for a working timer.

### Broadcast aware

The presenter view must support clean HDMI output, solid backgrounds for keying, safe positioning, scaling, tally, and optional network video output.

### Recoverable

The system must recover its last known event intent after restart. Recovery should use timestamp based state, not only saved remaining seconds.

### Operator safe

Dangerous actions such as update, reset, restart, network reconfiguration, and import must be protected by authorization and confirmation.

## v2 feature groups

1. State foundation and persistence.
2. Rundown engine and actuals logging.
3. Broadcast display modes.
4. Import, export, and reset.
5. Mesh discovery and dashboard.
6. Leader and follower sync.
7. MIDI and tally integrations.
8. Optional NDI output.
9. Experimental NDI input.

## Success definition

Version 2 is successful when a Pi can be prepared before an event, boot automatically at the venue, run a full timed rundown, survive a process restart, display correctly on stage, and export actuals after the show.

---

<!-- Source: docs/02-architecture.md -->

# Technical architecture

## Architecture rule

The backend owns state. Frontend views render state. Integrations send commands. Storage persists intent.

## Runtime components

```text
Moderator UI       Presenter UI       Dashboard UI       Tally UI
     |                  |                  |               |
     |                  |                  |               |
     +------------------+------------------+---------------+
                            Socket.io
                               |
                           Express API
                               |
                         Backend modules
                               |
                    Flat files in /data and /logs
```

## Backend modules

### `server.js`

Application entry point. It wires Express, Socket.io, static files, routes, and module lifecycle.

It should not contain timer business logic after the v2 refactor.

### `timer-engine.js`

Calculates current timer output from state. Uses absolute timestamps while running.

Responsibilities.

1. Start timer.
2. Pause timer.
3. Resume timer.
4. Reset timer.
5. Change mode.
6. Calculate display value.
7. Handle overtime behavior.

### `state-store.js`

Persists and loads JSON state.

Responsibilities.

1. Create default data files.
2. Validate JSON files on boot.
3. Use atomic writes.
4. Keep backups.
5. Debounce non critical writes.
6. Flush immediately on important commands.

### `queue-engine.js`

Manages rundown items and current segment transitions.

Responsibilities.

1. Load and save rundown.
2. Validate item schema.
3. Start selected item.
4. Move next or previous.
5. Capture actuals.

### `logger.js`

Writes actuals and operational logs.

Responsibilities.

1. Append escaped CSV rows.
2. Rotate or archive logs if needed.
3. Expose actuals export.

### `discovery.js`

Handles mDNS advertisement and discovery in Node.js.

Browser code must not perform Bonjour discovery directly.

### `ntp-sync.js`

Measures clock offset between leader and followers.

Responsibilities.

1. Ping and pong time exchange.
2. Estimate offset.
3. Track jitter.
4. Mark sync quality.

### `tally-service.js`

Sends status to web tally and optional TSL targets.

### `midi-controller.js`

Receives USB MIDI or RTP MIDI events and maps them to internal commands.

### `ndi-manager.js`

Starts, monitors, and stops optional NDI related FFmpeg processes.

NDI must never be required for normal timer operation.

## Frontend views

### `moderator.html`

Primary operator interface for a single room.

### `presenter.html`

HDMI output view. It should be render only and should not own timer logic.

### `dashboard.html`

Mesh controller. Shows discovered nodes and lets the operator switch or control rooms.

### `tally.html`

Simple full screen web tally.

### `loading.html`

Boot page shown before the backend is ready.

## Data flow

1. UI or integration sends a command.
2. Backend validates authorization and payload.
3. Backend updates state through the relevant module.
4. State is persisted if needed.
5. Socket.io broadcasts the new canonical state.
6. Views render from the broadcast state.

## Error handling rule

Commands must return structured errors.

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "durationSeconds must be a positive integer"
  }
}
```

---

<!-- Source: docs/03-state-model.md -->

# State model

## Principle

Do not use a decrementing `timeLeft` loop as the source of truth while the timer is running.

A running countdown is defined by start time, duration, and target timestamp. The displayed value is calculated from the current clock.

## Canonical state

```json
{
  "version": 2,
  "node": {
    "uuid": "2f196f81-1a99-43c6-8a95-000000000000",
    "roomName": "Ballroom A",
    "role": "standalone",
    "discoveryEnabled": true
  },
  "timer": {
    "mode": "countdown",
    "status": "paused",
    "durationSeconds": 600,
    "startedAt": null,
    "targetTimestamp": null,
    "pausedRemainingSeconds": 600,
    "targetISO": null,
    "overtimeBehavior": "countUp",
    "message": "",
    "messageVisible": false
  },
  "rundown": {
    "currentIndex": 0,
    "activeItemId": null
  },
  "display": {
    "keyMode": "none",
    "position": 8,
    "scale": 1,
    "margin": 32,
    "theme": "default"
  },
  "sync": {
    "leaderUuid": null,
    "offsetMs": 0,
    "jitterMs": null,
    "quality": "local"
  },
  "updatedAt": "2026-04-26T00:00:00.000Z"
}
```

## Timer modes

```text
countdown
countup
timeOfDay
idle
targetTime
```

## Timer statuses

```text
stopped
running
paused
completed
overtime
```

## Countdown behavior

When countdown starts.

```text
startedAt = now
pausedRemainingSeconds = null
targetTimestamp = now + durationSeconds * 1000
status = running
```

When countdown pauses.

```text
pausedRemainingSeconds = max(0, floor((targetTimestamp - now) / 1000))
targetTimestamp = null
status = paused
```

When countdown resumes.

```text
targetTimestamp = now + pausedRemainingSeconds * 1000
pausedRemainingSeconds = null
status = running
```

## Target time behavior

`targetTime` mode stores `targetISO`. The display value is calculated as the difference between `targetISO` and now.

If the target is reached, behavior is controlled by `overtimeBehavior`.

```text
stop
countUp
holdZero
```

## Derived display state

Presenter views receive canonical state, but can derive display only values.

```json
{
  "displaySeconds": 421,
  "isNegative": false,
  "label": "07:01",
  "severity": "normal"
}
```

## Severity levels

```text
normal
warning
critical
overtime
idle
```

Recommended defaults.

```text
warning below 120 seconds
critical below 60 seconds
overtime below 0 seconds
```

---

<!-- Source: docs/04-api-contract.md -->

# API contract

## API rules

1. Use `GET` only for reads.
2. Use `POST`, `PUT`, `PATCH`, or `DELETE` for changes.
3. All state changing requests require authorization.
4. All request bodies must be validated.
5. All responses use a consistent shape.

## Success response

```json
{
  "ok": true,
  "data": {}
}
```

## Error response

```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Admin token is missing or invalid"
  }
}
```

## Health

### `GET /api/health`

Returns basic service status.

```json
{
  "ok": true,
  "data": {
    "service": "stage-timer-pro",
    "version": "2.0.0",
    "uptimeSeconds": 1234
  }
}
```

### `GET /api/status`

Returns operational status.

```json
{
  "ok": true,
  "data": {
    "node": {},
    "timer": {},
    "integrations": {},
    "storage": {}
  }
}
```

## State

### `GET /api/state`

Returns the canonical state.

### `POST /api/state/restore`

Admin only. Restores state from a validated payload.

## Timer

### `POST /api/timer/start`

Starts or resumes the active timer.

Body.

```json
{
  "durationSeconds": 600
}
```

`durationSeconds` is optional when resuming a paused timer.

### `POST /api/timer/pause`

Pauses the active timer.

### `POST /api/timer/reset`

Resets the timer.

Body.

```json
{
  "durationSeconds": 600
}
```

### `POST /api/timer/mode`

Changes display mode.

Body.

```json
{
  "mode": "countdown"
}
```

Allowed values.

```text
countdown
countup
timeOfDay
idle
targetTime
```

### `POST /api/timer/adjust`

Adds or removes time.

Body.

```json
{
  "deltaSeconds": 60
}
```

### `POST /api/timer/target-time`

Sets target time mode.

Body.

```json
{
  "targetISO": "2026-04-26T13:00:00+02:00",
  "overtimeBehavior": "countUp"
}
```

## Messages

### `GET /api/messages`

Returns saved quick messages and current message state.

### `POST /api/messages/current`

Sets current message.

Body.

```json
{
  "message": "Please wrap up",
  "visible": true
}
```

### `POST /api/messages/quick`

Updates quick messages.

Body.

```json
{
  "messages": ["Wrap up", "Thank you", "Question time", "Break"]
}
```

## Rundown

### `GET /api/rundown`

Returns the current rundown.

### `PUT /api/rundown`

Replaces the rundown after validation.

Body.

```json
{
  "items": [
    {
      "id": "seg-001",
      "title": "Opening keynote",
      "speaker": "Speaker name",
      "durationSeconds": 1200,
      "mode": "countdown",
      "notes": ""
    }
  ]
}
```

### `POST /api/rundown/select`

Selects an item by id.

Body.

```json
{
  "id": "seg-001",
  "startImmediately": false
}
```

### `POST /api/rundown/next`

Captures actuals for the current item and loads the next item.

### `POST /api/rundown/previous`

Loads the previous item.

## Display

### `GET /api/display`

Returns display configuration.

### `PATCH /api/display`

Updates display configuration.

Body.

```json
{
  "keyMode": "chroma",
  "position": 8,
  "scale": 1.2,
  "margin": 32
}
```

Allowed `keyMode` values.

```text
none
chroma
luma
```

`position` is integer 0 through 8.

## Discovery

### `GET /api/discovery/nodes`

Returns nodes discovered by the backend mDNS browser.

### `POST /api/discovery/rescan`

Admin only. Clears discovery cache and scans again.

## Import and export

### `GET /api/admin/export`

Admin only. Exports a JSON profile.

### `POST /api/admin/import`

Admin only. Validates and imports a profile.

### `POST /api/admin/init`

Admin only. Factory reset. Must require explicit confirmation.

Body.

```json
{
  "confirm": "RESET"
}
```

## System actions

System actions are high risk. They must be authenticated and must not accept unsanitized shell arguments.

```text
POST /api/system/restart-service
POST /api/system/reboot-device
POST /api/system/update
POST /api/system/network/hostname
POST /api/system/network/wifi
POST /api/system/network/static-ip
```

---

<!-- Source: docs/05-socket-events.md -->

# Socket.io events

## Direction rules

1. Clients may request commands, but only the backend mutates canonical state.
2. Backend broadcasts canonical state after accepted commands.
3. Presenter and tally views should be able to reconnect and fully recover from `state:full`.

## Client to server events

### `timer:start`

Payload.

```json
{
  "durationSeconds": 600
}
```

### `timer:pause`

Payload.

```json
{}
```

### `timer:reset`

Payload.

```json
{
  "durationSeconds": 600
}
```

### `timer:adjust`

Payload.

```json
{
  "deltaSeconds": 60
}
```

### `timer:mode`

Payload.

```json
{
  "mode": "countdown"
}
```

### `message:set`

Payload.

```json
{
  "message": "Please wrap up",
  "visible": true
}
```

### `rundown:next`

Payload.

```json
{}
```

### `display:update`

Payload.

```json
{
  "keyMode": "luma",
  "position": 8,
  "scale": 1
}
```

## Server to client events

### `state:full`

Sent after connection and after any full reload.

Payload is the canonical state object.

### `state:patch`

Optional optimization. Sent when only a small part of state changes.

Payload.

```json
{
  "path": "timer.status",
  "value": "running",
  "updatedAt": "2026-04-26T00:00:00.000Z"
}
```

### `timer:tick`

Optional derived display tick. Presenter can also calculate this locally.

Payload.

```json
{
  "displaySeconds": 421,
  "label": "07:01",
  "severity": "normal",
  "serverTime": 1770000000000
}
```

### `discovery:nodes`

Broadcast when discovered nodes change.

Payload.

```json
{
  "nodes": [
    {
      "uuid": "2f196f81-1a99-43c6-8a95-000000000000",
      "roomName": "Ballroom A",
      "host": "stagetimer.local",
      "addresses": ["192.168.1.20"],
      "port": 3000,
      "lastSeenAt": "2026-04-26T00:00:00.000Z"
    }
  ]
}
```

### `sync:status`

Payload.

```json
{
  "leaderUuid": "2f196f81-1a99-43c6-8a95-000000000000",
  "offsetMs": 4,
  "jitterMs": 12,
  "quality": "good"
}
```

### `integration:status`

Payload.

```json
{
  "midi": "disabled",
  "ndiOutput": "unavailable",
  "tally": "enabled"
}
```

## Acknowledgements

Client command events should use acknowledgements.

Success.

```json
{
  "ok": true,
  "data": {
    "stateVersion": 42
  }
}
```

Error.

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "Unknown timer mode"
  }
}
```

---

<!-- Source: docs/06-storage-persistence.md -->

# Storage and persistence

## Storage principle

Flat files are acceptable for this project because the appliance has small local state and must stay easy to backup, inspect, and recover.

Do not write timer ticks to disk every second.

## Directory layout

```text
/data/
├── config.json
├── state.json
├── display.json
├── rundown.json
├── midi.json
├── tally.json
└── profile.schema.json

/logs/
├── actuals.csv
└── service.log
```

## `config.json`

```json
{
  "version": 2,
  "uuid": "2f196f81-1a99-43c6-8a95-000000000000",
  "roomName": "Ballroom A",
  "discoveryEnabled": true,
  "adminTokenHash": null,
  "bindHost": "0.0.0.0",
  "port": 3000
}
```

## `state.json`

Stores timer, rundown pointer, message state, and sync state.

## `display.json`

```json
{
  "version": 2,
  "keyMode": "none",
  "position": 8,
  "scale": 1,
  "margin": 32,
  "theme": "default"
}
```

## `rundown.json`

```json
{
  "version": 2,
  "items": []
}
```

## Atomic write process

Every JSON write should use this sequence.

```text
1. Validate object.
2. Serialize with stable formatting.
3. Write to filename.tmp.
4. Flush if supported.
5. Rename current file to filename.bak when appropriate.
6. Rename filename.tmp to filename.
7. Emit state update.
```

## Boot recovery process

```text
1. Ensure /data and /logs exist.
2. Load config.
3. Generate uuid if missing.
4. Load state.
5. Validate schema.
6. If state is corrupt, try .bak.
7. If both fail, start with defaults and log recovery event.
8. Start timer engine.
9. Start Socket.io emission.
```

## Write timing

Immediate write required.

```text
start
pause
reset
mode change
rundown next
rundown select
import
factory reset
admin settings change
```

Debounced write allowed.

```text
message text editing
UI display preferences
integration status cache
non critical discovery cache
```

## Actuals CSV

CSV must escape commas, quotes, and line breaks.

Recommended columns.

```csv
eventId,segmentId,startedAt,endedAt,speaker,title,plannedSeconds,actualSeconds,deltaSeconds,mode
```

## Import validation

Import must be validate first, write second.

```text
1. Parse payload.
2. Validate version.
3. Validate all included files.
4. Create backup.
5. Write imported files atomically.
6. Restart or reload modules.
```

---

<!-- Source: docs/07-security-model.md -->

# Security model

## Security goal

Stage Timer Pro usually runs on local event networks. Local does not mean trusted. Any device on the same network may be able to reach the Pi.

The system must protect actions that can interrupt a show, change the device, or execute system commands.

## Access levels

### Viewer

Can open presenter and tally views.

Allowed.

```text
GET presenter page
GET tally page
receive state updates
```

### Operator

Can control the timer and messages.

Allowed.

```text
start
pause
reset
adjust time
change mode
show or hide message
advance rundown
```

### Admin

Can change device and system settings.

Allowed.

```text
import
export
factory reset
network settings
hostname
software update
service restart
device reboot
integration settings
```

## Authentication

Use a local admin token or pairing code.

Recommended model for v2.

1. On first boot, generate a setup code and show it on HDMI output or in logs.
2. Admin creates or stores a local token.
3. Browser sends token in an `Authorization` header.
4. Backend stores only a hash of the token.

Example header.

```http
Authorization: Bearer local-token-value
```

## Method safety

Do not use GET for actions that change state.

Bad.

```http
GET /api/restart
GET /api/update
```

Good.

```http
POST /api/system/restart-service
POST /api/system/update
```

## Input validation

Every endpoint must validate type, range, and allowed values.

Examples.

```text
durationSeconds must be integer 0 through 86400
position must be integer 0 through 8
scale must be number 0.25 through 4
keyMode must be none, chroma, or luma
hostname must match safe hostname pattern
Wi-Fi SSID length must be limited
```

## Shell command safety

Avoid shell interpolation.

Bad.

```js
exec(`hostnamectl set-hostname ${req.query.name}`)
```

Good.

```js
spawn('hostnamectl', ['set-hostname', validatedHostname])
```

Use allow lists for command selection. Never pass raw user input into a shell string.

## File upload safety

Logo upload.

```text
allow PNG, JPEG, SVG only if SVG is sanitized
limit file size
store outside executable paths
normalize filename
never trust original filename
```

Import upload.

```text
accept JSON only
validate schema before writing
limit file size
create backup before import
```

## Network exposure

Default should remain convenient but configurable.

Recommended options.

```json
{
  "bindHost": "0.0.0.0",
  "allowLanOnly": true,
  "adminRequired": true
}
```

For production, recommend wired Ethernet and an isolated production VLAN where possible.

## Audit events

Log admin actions.

```text
time
remote address
action
result
```

Do not log tokens or Wi-Fi passwords.

---

<!-- Source: docs/08-discovery-sync.md -->

# Discovery and sync

## Discovery goal

Multiple Stage Timer Pro nodes should find each other without manual IP entry.

Each node has a stable UUID. Room name can change, IP address can change, UUID remains the same.

## Important correction

Bonjour or mDNS discovery must run in the Node.js backend, not directly in `dashboard.html`.

The dashboard should read discovered nodes from the backend.

## mDNS advertisement

Service.

```text
_stagetimer._tcp
```

TXT record.

```json
{
  "uuid": "2f196f81-1a99-43c6-8a95-000000000000",
  "roomName": "Ballroom A",
  "version": "2.0.0",
  "role": "standalone"
}
```

## Discovery API

```http
GET /api/discovery/nodes
```

Response.

```json
{
  "ok": true,
  "data": {
    "nodes": [
      {
        "uuid": "2f196f81-1a99-43c6-8a95-000000000000",
        "roomName": "Ballroom A",
        "host": "stagetimer.local",
        "addresses": ["192.168.1.20"],
        "port": 3000,
        "lastSeenAt": "2026-04-26T00:00:00.000Z"
      }
    ]
  }
}
```

## Sync principle

The leader does not send remaining seconds as the authority. The leader sends absolute timing intent.

```json
{
  "targetTimestamp": 1770000000000,
  "serverTime": 1769999999000,
  "mode": "countdown",
  "status": "running"
}
```

Followers calculate display time locally using target timestamp and clock offset.

## Offset handshake

Use a ping and pong exchange.

```text
Follower sends t0
Leader receives at t1
Leader replies at t2
Follower receives at t3

roundTrip = t3 - t0 - (t2 - t1)
offset = ((t1 - t0) + (t2 - t3)) / 2
```

Keep a rolling average. Ignore outliers with high round trip time.

## Sync quality

Suggested quality levels.

```text
local       no leader
excellent   jitter below 10 ms
good        jitter below 50 ms
fair        jitter below 150 ms
poor        jitter above 150 ms
lost        no sync response for 10 seconds
```

## Follower behavior on leader loss

If a follower loses the leader while a timer is running, it should continue rendering from the last known target timestamp.

Do not blank the display immediately.

## Dashboard behavior

The dashboard should show.

```text
room name
IP address
role
connection state
sync quality
current mode
current timer label
```

---

<!-- Source: docs/09-rundown-analytics.md -->

# Rundown and analytics

## Rundown goal

The rundown turns the app from a simple timer into an event timing tool.

Operators should be able to preload segments, select the active segment, start it, advance to the next segment, and export actual timing after the event.

## Rundown file

`/data/rundown.json`

```json
{
  "version": 2,
  "items": [
    {
      "id": "seg-001",
      "title": "Opening keynote",
      "speaker": "Speaker name",
      "durationSeconds": 1200,
      "mode": "countdown",
      "notes": "Walk on after intro video",
      "scheduledStart": "2026-04-26T09:00:00+02:00"
    }
  ]
}
```

## Item fields

Required.

```text
id
title
durationSeconds
mode
```

Optional.

```text
speaker
notes
scheduledStart
scheduledEnd
color
metadata
```

## Transition behavior

When `next` is triggered.

```text
1. Capture actuals for current segment if it has started.
2. Append actuals row.
3. Increment current index.
4. Load next segment duration and mode into timer state.
5. Set status to paused unless autoStartNext is enabled.
6. Broadcast state.
7. Persist state and rundown pointer immediately.
```

## Actuals row

Recommended CSV columns.

```csv
eventId,segmentId,startedAt,endedAt,speaker,title,plannedSeconds,actualSeconds,deltaSeconds,mode
```

Example.

```csv
event-2026-04-26,seg-001,2026-04-26T09:00:00.000Z,2026-04-26T09:19:33.000Z,"Speaker name","Opening keynote",1200,1173,-27,countdown
```

## Analytics rules

1. Planned seconds come from the rundown item.
2. Actual seconds are measured from real start and end timestamps.
3. Delta equals actual minus planned.
4. CSV values must be escaped.
5. Manual skips should be logged as skipped if the segment never started.

## Moderator UI requirements

The v2 moderator should support.

```text
create item
edit item
delete item
reorder item
select item
start selected item
next item
previous item
export actuals
```

Drag and drop is useful, but not required for the first implementation. Keyboard and button based ordering is acceptable for the first working version.

---

<!-- Source: docs/10-broadcast-integrations.md -->

# Broadcast and integrations

## Broadcast display modes

The presenter view must support clean output for HDMI and video switchers.

## CG mode

Presenter view uses a full viewport wrapper.

```css
.stage-frame {
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template: repeat(3, 1fr) / repeat(3, 1fr);
}
```

Position maps to grid cells.

```text
0 top left
1 top center
2 top right
3 middle left
4 middle center
5 middle right
6 bottom left
7 bottom center
8 bottom right
```

Key modes.

```text
none      normal background
green     chroma green background
black     luma black background
```

Use transform scaling on the timer wrapper.

```css
.timer-wrap {
  transform: scale(var(--timer-scale));
  transform-origin: center;
}
```

## Tally

### Web tally

Route.

```http
GET /tally.html
```

The tally view connects to Socket.io and renders a full screen color state.

Suggested mapping.

```text
idle       black
normal     green
warning    yellow
critical   red
overtime   flashing red
```

### TSL tally

TSL output is optional and disabled by default.

Config.

```json
{
  "enabled": false,
  "protocol": "tsl-5.0",
  "targetIp": "192.168.1.100",
  "targetPort": 1971,
  "screenId": 1
}
```

## MIDI

MIDI is optional and disabled by default.

Config.

```json
{
  "enabled": false,
  "usbDeviceName": null,
  "rtpEnabled": false,
  "mappings": {
    "note:60": "timer.start",
    "note:61": "timer.pause",
    "note:62": "rundown.next"
  }
}
```

Mapping values must point to known internal commands. Unknown commands must be rejected at config save time.

## NDI output

NDI output is optional. It must not be required for normal timer operation.

Requirements.

```text
FFmpeg available
FFmpeg has NDI support
sufficient CPU capacity
X11 or capture compatible output
```

Config.

```json
{
  "enabled": false,
  "sourceName": "STAGE_TIMER",
  "resolution": "1920x1080",
  "frameRate": 30
}
```

Failure behavior.

```text
show status as unavailable or failed
keep timer running
allow restart attempt
log error
```

## NDI input

NDI input is experimental and should be hidden behind an advanced setting.

Do not include it in the first core implementation. It is CPU intensive and should be treated as Raspberry Pi 5 only unless real testing proves otherwise.

---

<!-- Source: docs/11-operations-deployment.md -->

# Operations and deployment

## Supported deployment model

Stage Timer Pro is intended to run as a local service on Raspberry Pi OS Lite.

Recommended runtime.

```text
Node.js latest LTS
systemd service
Chromium kiosk for presenter output
wired Ethernet for production
fallback Wi-Fi access point when needed
```

## Service behavior

The timer backend should run as a systemd service.

Expected behavior.

```text
start on boot
restart on crash
write logs
serve API on configured port
serve frontend files
start presenter kiosk separately or through startup script
```

## Boot flow

```text
1. Pi powers on.
2. Plymouth or boot splash hides OS text where supported.
3. Backend service starts.
4. Backend loads and validates data files.
5. Presenter kiosk opens loading page.
6. Loading page polls backend health.
7. Presenter switches to live view when backend is ready.
```

## Backup

Before import, reset, or update, create a backup.

Recommended backup path.

```text
/data/backups/YYYY-MM-DDTHH-mm-ss-profile.json
```

Backup should include.

```text
config.json
state.json
display.json
rundown.json
midi.json
tally.json
```

Logs may be exported separately.

## Update

The current project supports pulling updates from Git. For v2, update must be an authenticated admin action.

Safe update sequence.

```text
1. Check current git status.
2. Create data backup.
3. Pull code.
4. Run npm install if package changed.
5. Restart service.
6. Keep previous data files.
```

## Factory reset

Factory reset must require explicit confirmation.

Reset should clear.

```text
state.json
rundown.json
display.json
midi.json
tally.json
logs if selected
```

Reset should preserve unless explicitly requested.

```text
uuid
roomName
admin token
network configuration
```

## Production checklist

Before event.

```text
power supply tested
HDMI output tested
network tested
moderator device connected
presenter view loaded
clock mode tested
rundown loaded
backup exported
admin token stored
fallback access verified if required
```

During event.

```text
operator uses moderator UI
presenter view stays full screen
avoid software update
avoid network reconfiguration
use local controls if dashboard fails
```

After event.

```text
export actuals
export profile if reusable
archive logs
reset rundown if device moves to another event
```

---

<!-- Source: docs/12-developer-handover.md -->

# Developer handover

## Current baseline

The current repository is a working v1 style app. It has a compact structure with a root `server.js`, public frontend files, setup scripts, message storage, logo storage, and a Companion module.

Version 2 should be implemented incrementally. Do not start by deleting the current behavior.

## Main refactor target

Move business logic out of `server.js` into backend modules while preserving existing routes until replacements are ready.

## First technical decisions

1. Use JavaScript unless the project is intentionally migrated to TypeScript.
2. Keep Vanilla JS frontend unless a separate decision is made to adopt a framework.
3. Keep flat file storage.
4. Add schema validation before adding import/export.
5. Use absolute timestamp timing as the core model.

## Suggested module creation order

```text
state-store.js
timer-engine.js
api-auth.js
queue-engine.js
logger.js
discovery.js
ntp-sync.js
tally-service.js
midi-controller.js
ndi-manager.js
```

## Backward compatibility

The Companion integration and current frontend may depend on existing endpoints.

During migration.

```text
keep old endpoints where needed
log deprecation warnings
map old routes to new internal commands
update Companion only after new API is stable
```

## Testing priorities

Manual smoke tests first.

```text
boot presenter
open moderator
start countdown
pause countdown
resume countdown
reset countdown
switch to count up
switch to time of day
show message
hide message
restart backend during paused timer
restart backend during running timer
```

Automated tests should focus on pure modules.

```text
timer-engine calculation
state-store atomic write and recovery
queue-engine next transition
CSV escaping
input validation
sync offset math
```

## Known implementation traps

### Browser Bonjour

Do not run Bonjour discovery from the browser. Use backend discovery and expose results through API.

### Remaining seconds drift

Do not use `timeLeft--` as the source of truth while running. Calculate from timestamps.

### Unsafe admin routes

Do not add new unauthenticated admin routes. Existing sensitive routes should be moved behind auth.

### Plain JSON overwrite

Do not overwrite JSON files directly without backup or atomic rename.

### NDI scope creep

Do not let NDI delay the core v2 timer. Treat it as optional.

## Definition of done for core v2

Core v2 is done when.

```text
state model is implemented
data survives restart
rundown can advance segments
actuals are logged
display supports CG positioning
API requires auth for dangerous actions
current basic timer workflow still works
Companion path is preserved or migrated
```

---

<!-- Source: docs/13-acceptance-criteria.md -->

# Acceptance criteria

## State persistence

Given a countdown is running
When the backend service restarts
Then the timer resumes from the correct absolute target time
And the presenter view displays the correct remaining time after reconnect.

Given the timer is paused
When the backend service restarts
Then the paused remaining seconds are preserved
And the timer does not start automatically.

Given a JSON state file is corrupt
When the backend starts
Then it attempts to recover from backup
And if backup fails it starts with defaults
And it logs the recovery event.

## Timer commands

Given the operator starts a 10 minute countdown
When the command succeeds
Then all connected clients receive running state
And the displayed value is calculated from target timestamp.

Given the operator adjusts the timer by plus 60 seconds
When the timer is running
Then target timestamp is moved by 60 seconds
And clients receive updated state.

## Rundown

Given a rundown has three items
When the operator selects item two
Then timer mode and duration are loaded from item two.

Given the active item is running
When the operator presses Next
Then actuals are written for the active item
And current index increments
And the next item is loaded.

Given the active item never started
When the operator presses Next
Then the item is marked skipped or no actual duration is written
And the next item is loaded.

## Display

Given key mode is chroma
When presenter view renders
Then the background is solid green
And timer content is visible.

Given position is 8
When presenter view renders
Then the timer appears in the bottom right grid cell.

Given scale changes
When presenter view renders
Then timer size changes without layout jump.

## Discovery

Given two Pis are on the same network
When discovery is enabled
Then each node advertises `_stagetimer._tcp`
And the dashboard lists each node by room name and UUID.

Given a node changes IP address
When discovery refreshes
Then the same UUID maps to the new address.

## Sync

Given a follower is connected to a leader
When the leader starts a countdown
Then the follower renders using the leader target timestamp and measured offset.

Given network latency changes
When round trip time becomes high
Then the sync quality indicator changes
And the display does not jump aggressively.

## Security

Given a request changes system settings
When the request has no valid token
Then the API returns unauthorized
And no change is applied.

Given a request contains invalid payload
When the endpoint validates it
Then the API returns a structured validation error
And no state is written.

Given a hostname change is requested
When the hostname contains unsafe characters
Then the request is rejected.

## Import and export

Given an event profile is exported
When it is imported on another Pi
Then config, display, rundown, and timer defaults load correctly
And the receiving Pi keeps its own UUID unless import explicitly includes identity replacement.

Given an import file is invalid
When import is attempted
Then existing files remain unchanged.

## NDI

Given NDI is disabled
When the timer starts
Then no NDI process is started.

Given NDI is enabled but FFmpeg lacks NDI support
When the service starts
Then timer operation continues
And NDI status is shown as unavailable.
