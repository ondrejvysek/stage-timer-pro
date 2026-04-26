# Stage Timer Pro v2.0 implementation plan

This plan is written for incremental delivery. Do not attempt to implement every v2 feature in one change.

## Phase 0. Documentation and baselining

Goal. Create shared understanding before refactoring.

Tasks.

1. Add the v2 documentation pack.
2. Document current v1 API behavior used by frontend and Companion.
3. Add a basic smoke test checklist for start, pause, reset, mode change, quick messages, presenter view, and setup script.
4. Mark current public endpoints that perform system actions.

Done when.

1. Documentation is merged.
2. Existing behavior is documented.
3. No runtime code has changed.

## Phase 1. State foundation

Goal. Introduce the v2 state model while keeping existing UI behavior.

Tasks.

1. Create `backend/lib/timer-engine.js`.
2. Create `backend/lib/state-store.js`.
3. Move runtime timer state out of global `server.js` variables.
4. Store `targetTimestamp`, `startedAt`, `pausedRemainingSeconds`, and `durationSeconds`.
5. Add atomic JSON write support.
6. Create `/data/config.json`, `/data/state.json`, and `/data/display.json` defaults on boot.

Done when.

1. Countdown survives process restart.
2. Pause and resume preserve exact remaining time.
3. Time display is calculated from absolute timestamp while running.
4. Current frontend still works.

## Phase 2. API cleanup and security

Goal. Make sensitive operations safe before adding new admin functions.

Tasks.

1. Add admin token or pairing code.
2. Convert state changing GET routes to POST routes.
3. Keep legacy GET routes temporarily with deprecation warnings if needed for Companion.
4. Validate every request body.
5. Replace shell string interpolation with command allow lists.
6. Add CORS and LAN binding configuration.

Done when.

1. Restart, update, hostname, Wi-Fi, static IP, upload, reset, and admin actions require authorization.
2. Invalid payloads return structured 400 errors.
3. Unauthorized requests return 401 or 403.
4. Companion migration path is documented.

## Phase 3. Rundown and actuals

Goal. Add event flow management.

Tasks.

1. Add `backend/lib/queue-engine.js`.
2. Add `/data/rundown.json`.
3. Add rundown CRUD endpoints.
4. Add current index to global state.
5. Add Next and Previous segment commands.
6. Add CSV actuals logging with escaping.
7. Add export for actuals.

Done when.

1. Operator can load a rundown.
2. Next logs actual duration and starts the next segment.
3. Reboot restores current segment and timer intent.
4. CSV output opens correctly in Excel and similar tools.

## Phase 4. Display and broadcast modes

Goal. Make presenter output suitable for switchers and confidence monitors.

Tasks.

1. Add display config to `/data/display.json`.
2. Add key modes `none`, `chroma`, and `luma`.
3. Add nine point positioning.
4. Add scale and margin controls.
5. Add presenter CSS grid layout.
6. Add preview controls in moderator UI.

Done when.

1. Presenter view can render timer in all nine positions.
2. Chroma mode uses solid green background.
3. Luma mode uses solid black background.
4. Scaling does not cause layout jitter.

## Phase 5. Import, export, and reset

Goal. Make event profiles portable.

Tasks.

1. Export config, state, display, rundown, MIDI mapping, and tally config.
2. Validate imports before writing anything.
3. Write imports atomically.
4. Add factory reset with confirmation and backup.
5. Restart service cleanly after reset.

Done when.

1. Exported profile imports on another Pi.
2. Invalid import does not corrupt existing data.
3. Reset creates backup before clearing data.

## Phase 6. Discovery and dashboard

Goal. Add zero configuration discovery without browser side mDNS assumptions.

Tasks.

1. Add backend mDNS advertiser using `bonjour-service`.
2. Add backend mDNS browser using `bonjour-service`.
3. Expose discovered nodes through `/api/discovery/nodes`.
4. Emit discovery updates through Socket.io.
5. Create `dashboard.html` as mesh controller.

Done when.

1. Multiple Pis appear in the dashboard by room name.
2. UUID remains stable when IP address changes.
3. Discovery can be disabled in config.

## Phase 7. Sync

Goal. Add multi display timing based on clock offset and target timestamps.

Tasks.

1. Implement ping/pong offset measurement.
2. Keep rolling average and jitter estimate per follower.
3. Send absolute `targetTimestamp` rather than remaining seconds.
4. Add follower status and sync quality display.

Done when.

1. Two displays remain visually aligned during a running countdown.
2. Network jitter does not cause visible jumps.
3. Loss of leader does not stop local display immediately.

## Phase 8. Automation and tally

Goal. Add event control integrations.

Tasks.

1. Add MIDI input module.
2. Add mapping validation.
3. Add Web Tally route.
4. Add TSL output module.
5. Add integration status endpoint.

Done when.

1. MIDI note or CC can trigger mapped timer commands.
2. Tally reflects timer state.
3. Integration failures do not crash the timer.

## Phase 9. Optional NDI modules

Goal. Add advanced broadcast integrations without weakening appliance reliability.

Tasks.

1. Detect FFmpeg and NDI support.
2. Add NDI output as disabled by default.
3. Run NDI as a supervised child process.
4. Add health status and restart control.
5. Treat NDI input as experimental.

Done when.

1. Timer works normally when NDI is unavailable.
2. NDI process failure is visible but non fatal.
3. NDI input is hidden behind experimental config.
