# Discovery and sync

## Discovery goal

Multiple Stage Timer Pro nodes should find each other without manual IP entry.

Each node has a stable UUID. Room name can change, IP address can change, UUID remains the same.

## Important correction

Bonjour or mDNS discovery must run in the Node.js backend, not directly in `dashboard.html`.

The dashboard should read discovered nodes from the backend.

## mDNS advertisement

Service.

```text
_stagetimer._tcp
```

TXT record.

```json
{
  "uuid": "2f196f81-1a99-43c6-8a95-000000000000",
  "roomName": "Ballroom A",
  "version": "2.0.0",
  "role": "standalone"
}
```

## Discovery API

```http
GET /api/discovery/nodes
```

Response.

```json
{
  "ok": true,
  "data": {
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
}
```

## Sync principle

The leader does not send remaining seconds as the authority. The leader sends absolute timing intent.

```json
{
  "targetTimestamp": 1770000000000,
  "serverTime": 1769999999000,
  "mode": "countdown",
  "status": "running"
}
```

Followers calculate display time locally using target timestamp and clock offset.

## Offset handshake

Use a ping and pong exchange.

```text
Follower sends t0
Leader receives at t1
Leader replies at t2
Follower receives at t3

roundTrip = t3 - t0 - (t2 - t1)
offset = ((t1 - t0) + (t2 - t3)) / 2
```

Keep a rolling average. Ignore outliers with high round trip time.

## Sync quality

Suggested quality levels.

```text
local       no leader
excellent   jitter below 10 ms
good        jitter below 50 ms
fair        jitter below 150 ms
poor        jitter above 150 ms
lost        no sync response for 10 seconds
```

## Follower behavior on leader loss

If a follower loses the leader while a timer is running, it should continue rendering from the last known target timestamp.

Do not blank the display immediately.

## Dashboard behavior

The dashboard should show.

```text
room name
IP address
role
connection state
sync quality
current mode
current timer label
```
