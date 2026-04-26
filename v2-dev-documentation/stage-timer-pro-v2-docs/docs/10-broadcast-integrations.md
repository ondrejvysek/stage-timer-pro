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
