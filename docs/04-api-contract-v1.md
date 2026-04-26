# Stage Timer Pro v1 API Contract (Legacy)

This document describes the API behavior of the v1 system, as implemented in the original `server.js`.
This baseline is needed to ensure compatibility while migrating to v2.

## Global State
The system maintained a global state broadcasted via Socket.io `stateUpdate`.
```json
{
  "timeLeft": 600,
  "initialTime": 600,
  "isRunning": false,
  "message": "",
  "showMessage": false,
  "mode": "countdown", // countdown, countup, timeofday, logo
  "ip": "127.0.0.1",
  "netmask": "255.0.0.0",
  "logoData": "",
  "blink_state": false
}
```

## Socket.io
- Emits `stateUpdate` continuously (every second while running, or 500ms when blinking).
- Emits `messagesUpdate` with array of quick messages.

## REST API (All GET)

### Read
- `GET /api/state` - Returns global state JSON.
- `GET /api/messages` - Returns array of quick messages.
- `GET /api/companion` - Returns formatted data for the Companion module.

### Timer Control (State Changing)
- `GET /api/start`
- `GET /api/pause`
- `GET /api/toggle_playback`
- `GET /api/reset?sec=<seconds>`
- `GET /api/add?sec=<seconds>`
- `GET /api/mode?set=<countdown|countup|timeofday|logo>`

### Messaging (State Changing)
- `GET /api/message/toggle`
- `GET /api/message/set?text=<text>`
- `GET /api/message/trigger?index=<index>`
- `GET /api/messages/add?text=<text>`
- `GET /api/messages/remove?index=<index>`

### System (High Risk)
- `POST /api/system/logo/upload` - Upload logo base64.
- `GET /api/system/logo/clear`
- `GET /api/system/restart` - `sudo systemctl restart stage-timer`
- `GET /api/system/update` - `git pull && npm install && sudo apt update ...`
- `GET /api/system/hostname?name=<name>` - `sudo hostnamectl set-hostname ...`
- `GET /api/system/ap?action=<on|off>`
- `GET /api/system/ap/status`
- `GET /api/system/wifi/scan`
- `GET /api/system/wifi/connect?ssid=<ssid>&password=<password>`
- `GET /api/system/wifi/static?ssid=<ssid>&ip=<ip>&gateway=<gateway>`
