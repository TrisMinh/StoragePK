# Testing - Unit Tests

## Purpose

Define unit test coverage for core StoragePK logic.

## Scope

This document covers services, validators, provider routing, state machines, permissions, classification rules, and utility logic.

## Responsibilities

- Catch logic errors quickly.
- Keep tests deterministic and fast.
- Avoid external provider dependencies.

## Assumptions

- Unit tests mock database, providers, queues, and AI providers.
- Business rules are implemented in services or pure helpers, not controllers.

## Dependencies

- [strategy.md](strategy.md)
- [../backend/services.md](../backend/services.md)
- [../auth/permissions.md](../auth/permissions.md)

## Detailed Explanation

Required unit test areas:

| Area | Tests |
| --- | --- |
| Upload validation | File size, MIME, checksum mismatch, duplicate candidates. |
| Provider routing | Drive vs Telegram selection, quota warnings, file limit rejection. |
| Resource state machine | Valid and invalid transitions. |
| Permissions | Role-to-permission mapping and denied actions. |
| Classification | Confidence thresholds and manual override behavior. |
| Error mapping | Domain errors to API error shape. |
| Token rotation | Refresh reuse detection and revocation. |
| AI policy | Unauthorized context rejection and mutation confirmation. |

Unit test rules:

- Each test asserts one behavior.
- Tests use stable fixtures.
- Avoid snapshots for complex domain behavior unless schema stability is the target.
- Mock time for audit and session expiry tests.

## Edge Cases

- Duplicate detection should handle same checksum in same batch.
- Provider route changes after classification should invalidate outdated suggestions.
- Permission cache edge cases need explicit invalidation tests.
- Error messages should not include secrets.

## Future Considerations

- Add mutation testing for security-critical authorization code.
- Add property-based tests for filename normalization.
- Add contract tests for provider adapter interface.

