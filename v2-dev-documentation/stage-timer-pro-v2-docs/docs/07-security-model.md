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
