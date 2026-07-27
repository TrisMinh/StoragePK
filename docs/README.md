# StoragePK Documentation Map

## Purpose

This directory is the single source of truth for the implemented desktop product and the hosted-platform foundation.

## Scope

It covers product direction, user flows, architecture, data design, APIs, frontend, backend, auth, AI, security, deployment, testing, roadmap, and coding rules.

## Responsibilities

- Product docs define what the system must do and why.
- Architecture docs define how services, clients, providers, and data stores connect.
- Delivery docs define how the system is built, tested, operated, and released.

## Assumptions

- StoragePK is now a TypeScript monorepo with implementation under `apps/` and `packages/`; documentation remains the binding product and architecture source of truth.
- The stack is TypeScript-first: Next.js for web, Tauri for desktop, NestJS for API, PostgreSQL for metadata, Redis/BullMQ for queues.
- Google Drive is the primary storage provider; Telegram is a secondary provider for lightweight archive and sharing workflows.

## Dependencies

- [00-overview.md](00-overview.md)
- [01-product-vision.md](01-product-vision.md)
- [architecture/system-overview.md](architecture/system-overview.md)
- [roadmap/mvp.md](roadmap/mvp.md)

## Detailed Explanation

Read documents in this order:

1. Product: `00-overview.md` through `07-non-functional-requirements.md`.
2. Architecture and data: `architecture/` and `database/`.
3. Provider contracts and storage pools: `providers/`.
   - Start the desktop Drive connector with `providers/google-drive-desktop-setup.md`.
4. Runtime contracts: `api/`, `backend/`, `auth/`, and `ai/`. Provider API endpoints are defined in `api/providers.md`.
5. Desktop local execution: `desktop/`.
6. Client experience: `frontend/`.
7. Delivery: `security/`, `deployment/`, `testing/`, `roadmap/`, and `coding/`.

The documentation favors explicit implementation rules over vague intent. Changes to runtime behavior must update the relevant docs in the same pull request.

## Edge Cases

- If two documents conflict, the more specific document wins.
- If product and architecture docs conflict, update both in the same change.
- If a provider changes limits or policy, update architecture, API, security, and roadmap together.

## Future Considerations

- Add ADR files when implementation begins.
- Add generated OpenAPI docs after endpoint implementation.
- Add screenshots and workflow recordings after UI prototypes exist.
