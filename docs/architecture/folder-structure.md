# Architecture - Folder Structure

## Purpose

Define the active repository layout for implementation while keeping docs, runtime apps, and shared packages explicit.

## Scope

This document covers the intended monorepo structure for apps, packages, infrastructure, scripts, and docs.

## Responsibilities

- Guide current and future implementation.
- Prevent ad hoc file placement.
- Keep documentation, app code, and operational code clearly separated.

## Assumptions

- Implementation uses a TypeScript monorepo with a Tauri native shell.
- Shared types and UI components are reused across web, desktop, and backend.
- The structure is active. New code must stay inside these boundaries unless an ADR records an exception.

## Dependencies

- [frontend-architecture.md](frontend-architecture.md)
- [backend-architecture.md](backend-architecture.md)
- [../coding/naming.md](../coding/naming.md)

## Detailed Explanation

Current monorepo layout:

```text
StoragePK/
  apps/
    web/
    desktop/
    api/
    worker/
  packages/
    ui/
    config/
    contracts/
    database/
    providers/
    test-utils/
  infra/
    docker/
    terraform/
    scripts/
  docs/
  tools/
```

| Path | Responsibility |
| --- | --- |
| `apps/web` | Next.js web app. |
| `apps/desktop` | Tauri desktop app. |
| `apps/api` | HTTP and WebSocket API. |
| `apps/worker` | Background job processors. |
| `packages/ui` | Shared components, icons, tokens, themes. |
| `packages/contracts` | Shared DTOs, OpenAPI schemas, event types. |
| `packages/database` | Prisma or migration layer, database types. |
| `packages/providers` | Drive, Telegram, and future provider adapters. |
| `infra` | Docker, cloud, deployment, and IaC assets. |

## Edge Cases

- Provider code must not be duplicated between API and worker.
- Shared contracts must not import UI or runtime-specific modules.
- Desktop native commands must stay inside desktop app boundaries.
- Documentation must remain valid even when implementation paths evolve.

## Future Considerations

- Add ADR folder under `docs/adr/`.
- Add generated API reference under `docs/generated/`.
- Add package ownership files when team size grows.
