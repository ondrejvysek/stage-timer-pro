# Product vision

CuePi v2.0 is a professional timing appliance for live events, conference stages, control rooms, and confidence monitors.

The product must stay simple for operators. The system may become technically advanced internally, but the show workflow should remain direct.

## Core promise

The timer must keep working even when the network fails, the browser reloads, or the operator tablet disconnects.

## Main users

1. Stage manager. Starts, pauses, resets, and advances the timer.
2. Technical director. Configures displays, keying, tally, network behavior, and integrations.
3. Speaker or presenter. Sees a clean timer, message, or confidence view.
4. Event operator. Loads rundowns, exports profiles, and collects actuals after the show.

## Product pillars

### Appliance first

The Raspberry Pi boots directly into the presenter output. The audience should never see Linux boot text, desktop clutter, browser chrome, or error pages during normal operation.

### Local first

A single Pi must operate independently. Mesh features, dashboard features, and automation are enhancements, not requirements for a working timer.

### Broadcast aware

The presenter view must support clean HDMI output, solid backgrounds for keying, safe positioning, scaling, tally, and optional network video output.

### Recoverable

The system must recover its last known event intent after restart. Recovery should use timestamp based state, not only saved remaining seconds.

### Operator safe

Dangerous actions such as update, reset, restart, network reconfiguration, and import must be protected by authorization and confirmation.

## v2 feature groups

1. State foundation and persistence.
2. Rundown engine and actuals logging.
3. Broadcast display modes.
4. Import, export, and reset.
5. Mesh discovery and dashboard.
6. Leader and follower sync.
7. MIDI and tally integrations.
8. Optional NDI output.
9. Experimental NDI input.

## Success definition

Version 2 is successful when a Pi can be prepared before an event, boot automatically at the venue, run a full timed rundown, survive a process restart, display correctly on stage, and export actuals after the show.
