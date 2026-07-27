# API - Rate Limits

## Purpose

Define API rate limits, upload limits, provider-aware throttling, and abuse protections.

## Scope

This document covers public auth endpoints, authenticated API requests, upload sessions, search, AI, admin actions, and provider calls.

## Responsibilities

- Protect backend resources and provider quotas.
- Provide predictable client errors.
- Support safe retry behavior.

## Assumptions

- Redis stores rate-limit counters.
- Rate limits can be configured per environment.
- Provider adapters also enforce provider-specific limits.

## Dependencies

- [error-handling.md](error-handling.md)
- [resources.md](resources.md)
- [../security/threats.md](../security/threats.md)

## Detailed Explanation

| Category | Default Policy | Key |
| --- | --- | --- |
| Login | 5 attempts per 15 minutes | IP + email |
| Refresh | 30 per hour | session family |
| General API | 600 requests per 5 minutes | user + workspace |
| Upload session create | 30 per hour | user + workspace |
| Upload bytes | Configurable bandwidth and concurrent file limit | user + workspace |
| Search | 120 per minute | user + workspace |
| AI assistant | 30 messages per hour MVP | user + workspace |
| Admin retry | 20 actions per hour | admin + workspace |

Rate-limit response:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again after 60 seconds.",
    "requestId": "req_123",
    "retryAfterSeconds": 60
  }
}
```

Headers:

- `Retry-After`
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## Edge Cases

- Provider throttling must translate to job retry delays, not immediate user lockout.
- AI rate limits should fail gracefully and keep normal file browsing available.
- Upload retries should not punish users for server-side transient failures.
- Distributed deployments require atomic Redis counters or equivalent.

## Future Considerations

- Add adaptive throttling by workspace plan.
- Add anomaly detection for ransomware-like bulk changes.
- Add abuse scoring for public share links.

