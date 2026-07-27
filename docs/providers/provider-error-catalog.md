# Providers - Error Catalog

## Purpose

Define provider-specific error codes, causes, HTTP mappings, retry behavior, and user recovery actions.

## Scope

This document covers Google Drive, Telegram public Bot API, Telegram local Bot API server, storage pools, route decisions, and desktop connector errors.

## Responsibilities

- Make provider failures actionable.
- Keep API and UI errors consistent.
- Define retry versus repair behavior.

## Assumptions

- Provider SDK/raw API errors are mapped at adapter boundary.
- API responses use the standard error envelope.
- Workers store terminal error code on job and storage object.

## Dependencies

- [provider-state-machines.md](provider-state-machines.md)
- [risk-register.md](risk-register.md)
- [../api/error-handling.md](../api/error-handling.md)

## Detailed Explanation

| Code | Provider | HTTP | Retry | User Action |
| --- | --- | --- | --- | --- |
| `PROVIDER_ACCOUNT_REVOKED` | All | 409 | No | Choose another provider or reconnect. |
| `PROVIDER_HEALTH_DEGRADED` | All | 422 | Maybe | Inspect provider settings. |
| `PROVIDER_QUOTA_EXCEEDED` | Drive | 422 | No until quota changes | Add Drive account, free space, or reroute. |
| `DRIVE_SCOPE_MISSING` | Drive | 403 | No | Reconnect with required scope. |
| `DRIVE_TOKEN_EXPIRED` | Drive | 401 | Maybe | Auto-refresh or reconnect. |
| `DRIVE_IDENTITY_MISMATCH` | Drive | 409 | No | Reconnect correct Google account. |
| `DRIVE_RESUMABLE_SESSION_EXPIRED` | Drive | 503 | Yes | Restart resumable upload after idempotency check. |
| `TELEGRAM_TOKEN_INVALID` | Telegram | 401 | No | Enter valid bot token. |
| `TELEGRAM_DESTINATION_INVALID` | Telegram | 404 | No | Fix chat/channel ID. |
| `TELEGRAM_SEND_PERMISSION_DENIED` | Telegram | 403 | No | Add bot or grant send permission. |
| `TELEGRAM_PUBLIC_FILE_TOO_LARGE` | Telegram | 413 | No | Use Drive or local Bot API mode. |
| `TELEGRAM_LOCAL_SERVER_UNAVAILABLE` | Telegram local | 503 | Yes | Start desktop/server local Bot API. |
| `TELEGRAM_LOCAL_PORT_CONFLICT` | Telegram local | 409 | Yes after reconfigure | Choose another port or auto-port. |
| `TELEGRAM_LOCAL_FILE_PATH_UNREADABLE` | Telegram local | 422 | Maybe | Restage file or grant access. |
| `POOL_NO_HEALTHY_COMPATIBLE_ACCOUNT` | Pool | 422 | No until config changes | Add/reconnect provider. |
| `POOL_QUOTA_EXHAUSTED` | Pool | 422 | No until quota changes | Add account or free space. |
| `ROUTE_DECISION_STALE` | Pool | 409 | Yes | Re-simulate route. |
| `DESKTOP_CONNECTOR_OFFLINE` | Desktop | 202/409 | Yes | Open desktop app or reroute. |
| `DESKTOP_JOB_LEASE_EXPIRED` | Desktop | 409 | Yes | Lease again. |

User-facing messages must:

- Name the affected provider account or Telegram destination.
- Avoid exposing secrets.
- Explain whether retry, reconnect, reroute, or manual repair is required.
- Link to provider settings when appropriate.

## Edge Cases

- Provider timeout after successful upload maps to retryable verification, not blind re-upload.
- Telegram returns a generic failure for permission and destination issues; adapter must run targeted diagnostics.
- Drive quota errors can mean storage quota or API quota; classify them separately when possible.
- Desktop connector offline is not always an error if job is intentionally waiting for desktop.

## Future Considerations

- Add localized error messages.
- Add telemetry grouping by provider error code.
- Add automatic repair suggestions per error code.

