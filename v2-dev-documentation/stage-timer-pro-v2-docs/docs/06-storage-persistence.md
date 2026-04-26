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
