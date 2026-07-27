# Providers - Threat Controls Matrix

## Purpose

Map provider threats to controls, tests, logs, metrics, owners, and release blockers.

## Scope

This document covers Drive, Telegram, storage pools, desktop local Bot API server, connector jobs, credential handling, and AI/search leakage around provider-backed files.

## Responsibilities

- Provide traceability from risk to implementation controls.
- Ensure provider security is testable and monitorable.
- Define which failures block release.

## Assumptions

- Threats are maintained with [risk-register.md](risk-register.md).
- Tests are maintained with [provider-testing-matrix.md](provider-testing-matrix.md).
- Release gates are maintained with [provider-release-checklist.md](provider-release-checklist.md).

## Dependencies

- [risk-register.md](risk-register.md)
- [provider-testing-matrix.md](provider-testing-matrix.md)
- [provider-release-checklist.md](provider-release-checklist.md)
- [../security/threats.md](../security/threats.md)

## Detailed Explanation

| Threat | Control | Test | Log/Metric | Owner | Release Blocker |
| --- | --- | --- | --- | --- | --- |
| Drive broad scope misuse | Scope allowlist and policy gate. | OAuth scope unit/integration tests. | `drive.scope.denied` | Security | Yes |
| Drive token theft | Encrypted vault and redaction. | Secret redaction tests. | credential decrypt audit | Security | Yes |
| Drive quota exhaustion | Quota cache and worker revalidation. | Quota failure integration. | `provider.quota.exceeded` | Backend | No if repair works |
| Telegram channel access leakage | UI disclosure and acknowledgement. | Linking E2E disclosure test. | `telegram.privacy.ack` | Product/Security | Yes |
| Local server exposed publicly | Bind localhost by default and firewall warning. | Desktop security test. | `local_server.bind_public` | Desktop/Security | Yes |
| Desktop job hijack | Device-bound auth and leases. | Lease auth integration test. | `desktop.job.lease.denied` | Backend/Desktop | Yes |
| Queue duplicate upload | Idempotency constraints and reconciliation. | Retry/timeout tests. | duplicate attempt metric | Backend | Yes |
| Provider drift | Scheduled verification and repair center. | Drift simulation. | `provider.drift.detected` | Backend/Ops | No |
| AI/search leakage | Permission filter before retrieval. | Authorization tests. | `ai.retrieval.denied` | AI/Security | Yes |

## Edge Cases

- Public bind may be necessary for advanced LAN mode later; it must remain feature-flagged and blocked in MVP.
- Telegram privacy acknowledgement can become stale if destination changes; require re-acknowledgement.
- Scope allowlist can differ by environment; production policy must be stricter.
- Logs must provide enough signal without filenames in privacy mode.

## Future Considerations

- Add formal STRIDE worksheet per provider.
- Add automated control coverage report.
- Add attack simulation runbook.

