# Rundown and analytics

## Rundown goal

The rundown turns the app from a simple timer into an event timing tool.

Operators should be able to preload segments, select the active segment, start it, advance to the next segment, and export actual timing after the event.

## Rundown file

`/data/rundown.json`

```json
{
  "version": 2,
  "items": [
    {
      "id": "seg-001",
      "title": "Opening keynote",
      "speaker": "Speaker name",
      "durationSeconds": 1200,
      "mode": "countdown",
      "notes": "Walk on after intro video",
      "scheduledStart": "2026-04-26T09:00:00+02:00"
    }
  ]
}
```

## Item fields

Required.

```text
id
title
durationSeconds
mode
```

Optional.

```text
speaker
notes
scheduledStart
scheduledEnd
color
metadata
```

## Transition behavior

When `next` is triggered.

```text
1. Capture actuals for current segment if it has started.
2. Append actuals row.
3. Increment current index.
4. Load next segment duration and mode into timer state.
5. Set status to paused unless autoStartNext is enabled.
6. Broadcast state.
7. Persist state and rundown pointer immediately.
```

## Actuals row

Recommended CSV columns.

```csv
eventId,segmentId,startedAt,endedAt,speaker,title,plannedSeconds,actualSeconds,deltaSeconds,mode
```

Example.

```csv
event-2026-04-26,seg-001,2026-04-26T09:00:00.000Z,2026-04-26T09:19:33.000Z,"Speaker name","Opening keynote",1200,1173,-27,countdown
```

## Analytics rules

1. Planned seconds come from the rundown item.
2. Actual seconds are measured from real start and end timestamps.
3. Delta equals actual minus planned.
4. CSV values must be escaped.
5. Manual skips should be logged as skipped if the segment never started.

## Moderator UI requirements

The v2 moderator should support.

```text
create item
edit item
delete item
reorder item
select item
start selected item
next item
previous item
export actuals
```

Drag and drop is useful, but not required for the first implementation. Keyboard and button based ordering is acceptable for the first working version.
