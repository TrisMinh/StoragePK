# Testing - Integration Tests

## Purpose

Define integration test coverage for database, queues, API modules, search, providers, and auth flows.

## Scope

This document covers tests using real infrastructure dependencies or realistic test containers.

## Responsibilities

- Verify modules work together.
- Catch transaction, queue, and provider boundary issues.
- Validate migrations and indexes.

## Assumptions

- Integration tests run against disposable PostgreSQL and Redis.
- External providers are mocked by contract servers except smoke tests.
- Search runs locally or through a test container.

## Dependencies

- [strategy.md](strategy.md)
- [../database/migrations.md](../database/migrations.md)
- [../backend/queues.md](../backend/queues.md)

## Detailed Explanation

Required integration suites:

| Suite | Coverage |
| --- | --- |
| Auth flow | Login, refresh rotation, logout, device revoke. |
| Upload session | Create, upload content, commit, enqueue jobs. |
| Database | Migrations, constraints, indexes, soft delete behavior. |
| Queue worker | Job retries, idempotency, terminal states, DLQ. |
| Provider adapters | Drive/Telegram response mapping and retry decisions. |
| Search | Index write, permission filter, fallback behavior. |
| Audit | Writes in transaction and query filters. |

## Edge Cases

- Simulate DB commit failure after provider mock upload success.
- Simulate provider timeout after success and verify idempotent repair.
- Simulate Redis outage and verify API degradation.
- Simulate permission revocation between upload commit and worker execution.

## Future Considerations

- Add real Drive and Telegram nightly smoke tests.
- Add chaos tests for provider throttling.
- Add migration compatibility tests across previous app version.

