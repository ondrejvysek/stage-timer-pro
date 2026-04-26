# State model

## Principle

Do not use a decrementing `timeLeft` loop as the source of truth while the timer is running.

A running countdown is defined by start time, duration, and target timestamp. The displayed value is calculated from the current clock.

## Canonical state

```json
{
  "version": 2,
  "node": {
    "uuid": "2f196f81-1a99-43c6-8a95-000000000000",
    "roomName": "Ballroom A",
    "role": "standalone",
    "discoveryEnabled": true
  },
  "timer": {
    "mode": "countdown",
    "status": "paused",
    "durationSeconds": 600,
    "startedAt": null,
    "targetTimestamp": null,
    "pausedRemainingSeconds": 600,
    "targetISO": null,
    "overtimeBehavior": "countUp",
    "message": "",
    "messageVisible": false
  },
  "rundown": {
    "currentIndex": 0,
    "activeItemId": null
  },
  "display": {
    "keyMode": "none",
    "position": 8,
    "scale": 1,
    "margin": 32,
    "theme": "default"
  },
  "sync": {
    "leaderUuid": null,
    "offsetMs": 0,
    "jitterMs": null,
    "quality": "local"
  },
  "updatedAt": "2026-04-26T00:00:00.000Z"
}
```

## Timer modes

```text
countdown
countup
timeOfDay
idle
targetTime
```

## Timer statuses

```text
stopped
running
paused
completed
overtime
```

## Countdown behavior

When countdown starts.

```text
startedAt = now
pausedRemainingSeconds = null
targetTimestamp = now + durationSeconds * 1000
status = running
```

When countdown pauses.

```text
pausedRemainingSeconds = max(0, floor((targetTimestamp - now) / 1000))
targetTimestamp = null
status = paused
```

When countdown resumes.

```text
targetTimestamp = now + pausedRemainingSeconds * 1000
pausedRemainingSeconds = null
status = running
```

## Target time behavior

`targetTime` mode stores `targetISO`. The display value is calculated as the difference between `targetISO` and now.

If the target is reached, behavior is controlled by `overtimeBehavior`.

```text
stop
countUp
holdZero
```

## Derived display state

Presenter views receive canonical state, but can derive display only values.

```json
{
  "displaySeconds": 421,
  "isNegative": false,
  "label": "07:01",
  "severity": "normal"
}
```

## Severity levels

```text
normal
warning
critical
overtime
idle
```

Recommended defaults.

```text
warning below 120 seconds
critical below 60 seconds
overtime below 0 seconds
```
