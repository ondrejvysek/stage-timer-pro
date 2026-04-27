# Operations and deployment

## Supported deployment model

CuePi is intended to run as a local service on Raspberry Pi OS Lite.

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
