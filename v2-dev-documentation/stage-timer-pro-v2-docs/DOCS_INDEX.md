# Stage Timer Pro v2.0 documentation pack

This pack converts the v2 idea blueprint into implementation ready project documentation.

Use it as a repo ready `docs` folder plus a replacement or companion README for the next development phase.

## Recommended placement

```text
stage-timer-pro/
├── README_V2.md
├── IMPLEMENTATION_PLAN.md
├── CONTRIBUTING_V2.md
├── docs/
│   ├── 01-product-vision.md
│   ├── 02-architecture.md
│   ├── 03-state-model.md
│   ├── 04-api-contract.md
│   ├── 05-socket-events.md
│   ├── 06-storage-persistence.md
│   ├── 07-security-model.md
│   ├── 08-discovery-sync.md
│   ├── 09-rundown-analytics.md
│   ├── 10-broadcast-integrations.md
│   ├── 11-operations-deployment.md
│   ├── 12-developer-handover.md
│   └── 13-acceptance-criteria.md
└── .github/
    └── ISSUE_TEMPLATE/
        ├── feature.md
        └── bug.md
```

## What changed from the original blueprint

The original blueprint is kept as product direction, but several technical points were corrected for implementation quality.

1. Browser based Bonjour discovery was replaced by backend mDNS discovery exposed through API and Socket.io.
2. Timer state now uses absolute timestamps instead of a one second decrement loop as the source of truth.
3. Persistence uses atomic writes and validated recovery instead of plain JSON overwrite only.
4. Sensitive admin actions require authentication, POST methods, input validation, and command allow lists.
5. NDI input and output are treated as optional modules, not core timer dependencies.
6. The migration plan preserves current v1 API behavior until Companion and frontend integrations are updated.

## Suggested first pull request

Create only documentation first.

```text
Add v2 documentation pack

Adds technical docs for Stage Timer Pro v2.0 including architecture, state model, API contract, Socket.io events, persistence, security, discovery, sync, rundown, broadcast integrations, operations, handover, and acceptance criteria.
```
