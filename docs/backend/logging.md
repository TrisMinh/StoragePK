# Backend - Logging

## Purpose

Define logging, tracing, metrics, audit separation, and redaction rules.

## Scope

This document covers API logs, worker logs, provider logs, security events, audit events, and correlation IDs.

## Responsibilities

- Make production issues diagnosable.
- Prevent sensitive data leakage.
- Distinguish operational logs from business audit events.

## Assumptions

- Logs are structured JSON in production.
- Every request, job, and provider call has a correlation ID.
- Audit events are stored separately from application logs.

## Dependencies

- [../deployment/monitoring.md](../deployment/monitoring.md)
- [../security/secrets.md](../security/secrets.md)
- [../api/error-handling.md](../api/error-handling.md)

## Detailed Explanation

Required log fields:

| Field | Purpose |
| --- | --- |
| `timestamp` | Event time. |
| `level` | debug/info/warn/error. |
| `service` | api, worker, desktop-updater, etc. |
| `requestId` | HTTP correlation. |
| `jobId` | Queue correlation. |
| `workspaceId` | Tenant context when safe. |
| `userId` | Actor context when safe. |
| `action` | Operation name. |
| `errorCode` | Domain error code. |
| `durationMs` | Performance. |

Redaction rules:

- Never log provider tokens, refresh tokens, session tokens, passwords, or encryption keys.
- Avoid logging full filenames for highly sensitive workspaces if privacy mode is enabled.
- Redact document text and AI prompts by default.
- Provider error payloads must be sanitized before logging.

Metrics:

- Upload success/failure count.
- Provider latency and error rate.
- Queue depth and dead-letter count.
- Search latency.
- AI request latency and denial count.
- Auth failure and token reuse events.

## Edge Cases

- Exceptions thrown before auth still need request ID.
- Worker logs must include job payload version.
- Provider errors may include request URLs with tokens; sanitize.
- Audit logs must remain even if normal log pipeline is down.

## Future Considerations

- Add OpenTelemetry traces.
- Add privacy mode per workspace.
- Add incident export package for support.

