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
