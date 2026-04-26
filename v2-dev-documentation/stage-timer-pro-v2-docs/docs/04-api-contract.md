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
