# Backend - Services

## Purpose

Define backend service responsibilities and business boundaries.

## Scope

This document covers core domain services, provider services, AI services, search services, audit services, and admin services.

## Responsibilities

- Keep business logic centralized.
- Prevent controllers and workers from duplicating rules.
- Define service contracts for future implementation.

## Assumptions

- Services are implemented as dependency-injected classes or modules.
- Services communicate through typed commands, queries, and events.
- Long-running work is delegated to queues.

## Dependencies

- [../architecture/backend-architecture.md](../architecture/backend-architecture.md)
- [repositories.md](repositories.md)
- [queues.md](queues.md)
- [../database/schema.md](../database/schema.md)

## Detailed Explanation

| Service | Responsibilities |
| --- | --- |
| `AuthService` | Login, refresh, revocation, device trust, MFA hooks. |
| `WorkspaceService` | Workspace creation, membership, default workspace. |
| `ProviderAccountService` | Connect, rotate, revoke, health check, quota cache. |
| `StoragePoolService` | Manage transparent Drive/Telegram destinations, route simulation, and pool health. |
| `UploadSessionService` | Intake session creation, validation, commit, expiration. |
| `ResourceService` | Files, folders, tags, versions, soft delete, restore. |
| `ClassificationService` | Rule and AI classification suggestions, review decisions. |
| `ProviderRouterService` | Choose provider based on user rules, file size, type, quota, and health. |
| `SearchService` | Query parsing, indexing, permissions-aware retrieval. |
| `AIService` | Summaries, file Q&A, prompt policy, citation generation. |
| `AuditService` | Append-only events and query APIs. |
| `RepairService` | Retry, reroute, reconcile, orphan detection. |
| `AdminService` | Health, diagnostics, dead-letter operations. |

Service contract rules:

- Every mutating service method accepts actor context.
- Every write emits audit event within the same transaction or reliable outbox.
- Services validate workspace ownership before repository access where possible.
- Provider service never returns raw secrets to callers.

## Edge Cases

- Multiple service calls in one request must share a transaction when state must be atomic.
- Provider route decisions can become stale between validation and worker execution.
- AI service must fail closed when permission context is missing.
- Repair service must avoid duplicate provider upload by checking existing storage objects.

## Future Considerations

- Add policy engine service.
- Add billing/plan service.
- Add notification service.
