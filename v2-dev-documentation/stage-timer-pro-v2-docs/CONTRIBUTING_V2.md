# Contributing to Stage Timer Pro v2.0

## Development approach

Work in small changes. Keep the timer usable after each merged change.

## Before coding

1. Read `DOCS_INDEX.md`.
2. Read `IMPLEMENTATION_PLAN.md`.
3. Check `docs/03-state-model.md` and `docs/04-api-contract.md` before changing backend behavior.
4. Check `docs/07-security-model.md` before adding routes or system commands.

## Pull request rules

Each pull request should include.

```text
what changed
why it changed
manual test steps
risk level
rollback notes
```

## Compatibility rule

Do not break current moderator, presenter, or Companion workflows unless the pull request includes the migration and documentation update.

## Code rules

1. Keep timer calculation in `timer-engine.js`.
2. Keep file writes in `state-store.js`.
3. Keep route handlers thin.
4. Validate all external input.
5. Do not use raw shell strings with user input.
6. Do not write to SD card every second.
7. Do not make NDI required for core timer operation.

## Manual test checklist

Run this before merging core behavior changes.

```text
npm install
npm start
open moderator UI
open presenter UI
start countdown
pause countdown
resume countdown
reset countdown
switch display mode
show and hide message
restart service while paused
restart service while running
check logs for errors
```

## Commit style

Use concise commits.

Examples.

```text
Add v2 state store
Refactor timer engine
Add rundown persistence
Protect admin routes
Document API contract
```
