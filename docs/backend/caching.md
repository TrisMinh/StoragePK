# Backend - Caching

## Purpose

Define caching strategy for metadata, provider status, search, rate limits, and AI responses.

## Scope

This document covers Redis caches, invalidation, TTLs, cache keys, and stale-data behavior.

## Responsibilities

- Improve performance without weakening correctness.
- Prevent stale permission or provider state from causing unsafe behavior.
- Define cache invalidation rules.

## Assumptions

- Redis is available in all deployed environments.
- Cache is an optimization, never the source of truth.
- Permission decisions may use cached membership only with short TTL and revocation invalidation.

## Dependencies

- [services.md](services.md)
- [../api/rate-limit.md](../api/rate-limit.md)
- [../security/threats.md](../security/threats.md)

## Detailed Explanation

Cache categories:

| Cache | TTL | Invalidation |
| --- | --- | --- |
| User session | Token/session expiry | Logout, revoke, refresh reuse. |
| Workspace membership | 1-5 minutes | Membership change. |
| Provider health | 30-120 seconds | Health check event. |
| Provider quota | 5-15 minutes | Upload completion or provider error. |
| File list pages | 30 seconds | Resource write in workspace. |
| Search suggestions | 5 minutes | Tag/folder changes. |
| Rate limits | Policy window | Expiry. |

Cache key format:

```text
storagepk:{env}:{domain}:{workspaceId}:{identifier}
```

Rules:

- Never cache raw provider tokens outside the encrypted credential vault.
- Never cache AI answers without permission context and source version IDs.
- Permission-sensitive caches include user ID and workspace ID.
- Cache misses must not change behavior.

## Edge Cases

- Revoked user could retain cached permissions; revocation must actively delete relevant keys.
- Provider quota cache can be stale; upload worker must handle provider rejection.
- File list cache can show stale status; resource detail fetch is authoritative.
- Redis outage should degrade performance but not corrupt metadata.

## Future Considerations

- Add CDN caching for static assets only.
- Add materialized views for heavy analytics instead of long-lived API caches.
- Add cache metrics and hit-rate alerts.

