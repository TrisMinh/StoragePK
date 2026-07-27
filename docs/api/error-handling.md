# API - Error Handling

## Purpose

Define standard error response shape, error codes, validation behavior, retry semantics, and logging requirements.

## Scope

This document covers all HTTP and realtime API errors.

## Responsibilities

- Make errors predictable for web and desktop clients.
- Avoid leaking secrets or provider internals.
- Preserve enough detail for debugging with request IDs.

## Assumptions

- All API responses are JSON except file byte streams.
- Every request receives a correlation ID.
- Provider errors are mapped to StoragePK domain errors.

## Dependencies

- [rate-limit.md](rate-limit.md)
- [resources.md](resources.md)
- [../backend/logging.md](../backend/logging.md)

## Detailed Explanation

Standard error response:

```json
{
  "error": {
    "code": "PROVIDER_TOKEN_EXPIRED",
    "message": "Google Drive connection expired. Reconnect the provider to continue uploads.",
    "requestId": "req_01H...",
    "details": {
      "provider": "drive",
      "retryable": false
    }
  }
}
```

Error classes:

| HTTP | Code Examples | Retry |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED`, `CHECKSUM_MISMATCH` | No unless user changes input. |
| 401 | `UNAUTHENTICATED`, `TOKEN_EXPIRED` | Refresh possible. |
| 403 | `FORBIDDEN`, `WORKSPACE_ACCESS_REVOKED` | No. |
| 404 | `RESOURCE_NOT_FOUND` | No. |
| 409 | `DUPLICATE_RESOURCE`, `STATE_CONFLICT` | User decision required. |
| 413 | `FILE_TOO_LARGE` | Reroute or split policy. |
| 422 | `PROVIDER_LIMIT`, `UNSUPPORTED_MEDIA_TYPE` | Depends. |
| 429 | `RATE_LIMITED` | Yes after delay. |
| 500 | `INTERNAL_ERROR` | Maybe. |
| 503 | `PROVIDER_UNAVAILABLE`, `SEARCH_UNAVAILABLE` | Yes. |

Validation errors:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed.",
    "requestId": "req_123",
    "fields": [
      {
        "path": "items[0].filename",
        "message": "Filename contains unsupported characters."
      }
    ]
  }
}
```

## Edge Cases

- Do not expose raw OAuth errors, bot tokens, provider headers, or stack traces.
- Provider 404 may mean deleted externally, permission loss, or wrong account; map to repairable sync state.
- Timeout does not always mean failure; workers should check idempotency before retry.
- Realtime errors must include enough context for clients to refresh affected resources.

## Future Considerations

- Publish machine-readable error catalog.
- Add localized user-facing messages.
- Add client telemetry for repeated error loops.

