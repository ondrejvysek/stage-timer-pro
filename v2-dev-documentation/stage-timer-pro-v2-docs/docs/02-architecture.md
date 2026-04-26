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
