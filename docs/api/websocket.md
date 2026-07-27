# API - WebSocket Events

## Purpose

Define realtime events for upload progress, classification, provider sync, repair, and notifications.

## Scope

This document covers WebSocket or Server-Sent Events contracts used by web and desktop clients.

## Responsibilities

- Keep clients responsive during long-running jobs.
- Define event authorization and replay behavior.
- Avoid polling as the only status mechanism.

## Assumptions

- WebSocket is preferred for authenticated apps.
- Server-Sent Events can be used as a fallback.
- Clients must tolerate disconnects and resume with polling.

## Dependencies

- [resources.md](resources.md)
- [../backend/queues.md](../backend/queues.md)
- [../frontend/pages.md](../frontend/pages.md)

## Detailed Explanation

Connection:

```text
GET /v1/realtime?workspaceId={workspaceId}
Authorization: Bearer <token>
```

Event envelope:

```json
{
  "eventId": "uuid",
  "type": "upload.item.progress",
  "workspaceId": "uuid",
  "resourceId": "uuid",
  "occurredAt": "2026-07-27T10:35:00Z",
  "payload": {}
}
```

Event types:

| Type | Payload | Usage |
| --- | --- | --- |
| `upload.session.created` | session summary | Initialize queue view. |
| `upload.item.progress` | item ID, bytes sent, total, speed | Progress bars. |
| `upload.item.failed` | item ID, error code, retryable | Error state. |
| `classification.completed` | resource ID, suggestions | Review drawer. |
| `provider.upload.completed` | resource ID, provider, object ID | Synced badge. |
| `search.indexed` | resource ID | Search readiness. |
| `repair.completed` | resource ID, action | Repair center. |
| `provider.health.changed` | provider account, state | Settings and dashboard. |

## Edge Cases

- Events can arrive out of order; clients must use `occurredAt` and current resource fetch for truth.
- Missed events after disconnect require polling `/v1/jobs/{jobId}` or resource details.
- Multiple tabs should avoid duplicate notifications.
- Workspace authorization must be checked on connection and during event fanout.

## Future Considerations

- Add event replay with cursor.
- Add desktop local notification preferences.
- Add collaborative presence for shared folders.

