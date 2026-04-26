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
