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

