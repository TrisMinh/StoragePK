# Deployment - Environments

## Purpose

Define StoragePK local, staging, production, and disaster-recovery environments.

## Scope

This document covers environment purpose, data isolation, credentials, provider accounts, observability, and release gates.

## Responsibilities

- Prevent environment confusion.
- Keep production credentials and data isolated.
- Define what must be validated before promotion.

## Assumptions

- Local development uses test providers and local containers.
- Staging mirrors production enough to run smoke tests.
- Production has managed data stores and monitoring.

## Dependencies

- [docker.md](docker.md)
- [ci-cd.md](ci-cd.md)
- [cloud.md](cloud.md)
- [monitoring.md](monitoring.md)

## Detailed Explanation

| Environment | Purpose | Data | Provider Credentials |
| --- | --- | --- | --- |
| Local | Developer implementation and tests. | Local disposable data. | Developer-owned test providers. |
| Staging | Pre-release validation. | Synthetic or sanitized data. | Staging-only Drive/Telegram targets. |
| Production | Real user workflows. | Real data with backups. | Production secrets only. |
| DR | Restore and continuity tests. | Restored snapshots. | Controlled emergency credentials. |

Environment rules:

- Never use production provider tokens in local or staging.
- Never point staging workers at production queues.
- All environments define explicit `APP_ENV`.
- Production migrations require backup and rollback plan.

## Edge Cases

- A developer can accidentally connect a personal Drive account; label local provider records clearly.
- Staging can hit provider quotas; use separate accounts and cleanup jobs.
- DR restore must test encryption key availability.
- Clock/timezone differences can affect audit display; store UTC and render local.

## Future Considerations

- Add preview environments per pull request.
- Add production shadow traffic for selected read endpoints.
- Add chaos testing environment.

