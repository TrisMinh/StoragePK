# API - Admin

## Purpose

Define administrative APIs for health, repair, audit, provider diagnostics, and operational controls.

## Scope

This document covers admin-only endpoints for MVP and near-term production operations.

## Responsibilities

- Expose safe operational visibility.
- Prevent admin APIs from becoming undocumented backdoors.
- Define authorization and audit requirements.

## Assumptions

- MVP admin may be a single owner role in a personal workspace.
- Future team mode includes workspace admins and system admins.

## Dependencies

- [error-handling.md](error-handling.md)
- [../auth/permissions.md](../auth/permissions.md)
- [../deployment/monitoring.md](../deployment/monitoring.md)

## Detailed Explanation

### GET `/v1/admin/health`

Purpose: return service, database, Redis, search, provider, and worker health.

Authentication: required.

Authorization: `admin:read`.

### GET `/v1/admin/audit-events`

Purpose: query audit history.

Filters: actor, action, target type, target ID, date range, workspace, correlation ID.

### GET `/v1/admin/jobs`

Purpose: inspect job queues and dead-letter items.

### POST `/v1/admin/jobs/{jobId}/retry`

Purpose: retry failed job after policy validation.

### GET `/v1/admin/providers/{providerAccountId}/diagnostics`

Purpose: inspect quota, token health, rate-limit state, and last provider error.

### POST `/v1/admin/providers/{providerAccountId}/reconcile`

Purpose: enqueue provider reconciliation for selected scope.

Request:

```json
{
  "scope": "workspace",
  "dryRun": true
}
```

## Edge Cases

- Admin endpoints must never return raw provider tokens or secrets.
- Retrying a non-idempotent job can duplicate provider objects unless the worker checks existing state.
- Audit export can contain sensitive filenames; exports require explicit permission.
- Health endpoint for unauthenticated load balancers must be separate and minimal.

## Future Considerations

- Add admin event streaming.
- Add incident mode to pause uploads globally.
- Add workspace-level policy management endpoints.

