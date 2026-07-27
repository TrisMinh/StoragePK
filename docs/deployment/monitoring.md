# Deployment - Monitoring

## Purpose

Define monitoring, alerting, dashboards, logs, traces, and operational readiness for StoragePK.

## Scope

This document covers API, workers, providers, queues, database, search, AI, desktop update telemetry, and user-impacting alerts.

## Responsibilities

- Detect failures before users lose trust.
- Make upload and provider issues diagnosable.
- Define production readiness signals.

## Assumptions

- Production emits metrics, logs, and traces.
- Alerts are routed to the responsible operator.
- Audit logs are separate from operational logs.

## Dependencies

- [../backend/logging.md](../backend/logging.md)
- [../security/threats.md](../security/threats.md)
- [ci-cd.md](ci-cd.md)

## Detailed Explanation

Key metrics:

| Area | Metrics |
| --- | --- |
| API | request rate, latency, error rate, auth failures. |
| Upload | bytes uploaded, success rate, failure code distribution. |
| Provider | Drive latency, Telegram latency, token expiry, quota warnings. |
| Queue | depth, processing time, retries, dead-letter count. |
| Database | connections, slow queries, lock waits, storage. |
| Search | latency, indexing lag, error rate. |
| AI | request count, latency, refusal count, retrieval-denial count. |
| Security | refresh-token reuse, suspicious bulk actions, admin operations. |

Alerts:

- Upload failure rate above threshold.
- Provider token refresh failures spike.
- Queue dead-letter count grows.
- Search indexing lag exceeds SLA.
- Database backups fail.
- Secret decrypt failures occur.
- Unauthorized access attempts spike.

## Edge Cases

- Provider outage can produce many alerts; group by provider and environment.
- User-caused failures should be visible but not page operators unless systemic.
- Logs can contain sensitive filenames; apply privacy policy before export.
- Metrics should not expose raw user content.

## Future Considerations

- Add SLO dashboards.
- Add synthetic upload tests for Drive and Telegram.
- Add incident response runbooks.

