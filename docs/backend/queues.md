# Backend - Queues

## Purpose

Define background job queues, worker responsibilities, retry policies, idempotency, and dead-letter behavior.

## Scope

This document covers upload, provider sync, classification, extraction, indexing, repair, cleanup, and notification jobs.

## Responsibilities

- Move long-running work out of HTTP requests.
- Make upload and provider work reliable.
- Define safe retry behavior.

## Assumptions

- BullMQ or equivalent queue library runs on Redis.
- Job payloads are versioned.
- Workers are horizontally scalable and idempotent.

## Dependencies

- [services.md](services.md)
- [logging.md](logging.md)
- [../api/websocket.md](../api/websocket.md)

## Detailed Explanation

Queues:

| Queue | Jobs | Retry Policy |
| --- | --- | --- |
| `intake` | hash file, validate MIME, deduplicate | 3 retries, short backoff |
| `classification` | rule classify, AI classify, OCR classify | 2 retries, medium backoff |
| `provider-upload` | upload to Drive/Telegram, verify object | provider-aware exponential |
| `desktop-provider-upload` | jobs that must be pulled and executed by desktop local providers | pending until desktop online |
| `search-index` | index metadata, extracted text, embeddings | 5 retries |
| `repair` | reconcile provider drift, retry failed objects | manual or scheduled |
| `cleanup` | expire sessions, delete staged bytes, prune temp files | scheduled |
| `notifications` | desktop/web notifications | best effort |

Worker requirements:

- Load current DB state before acting.
- Check idempotency key before external writes.
- Emit progress events.
- Persist terminal state.
- Send failed jobs to dead-letter queue with reason and retry count.

### Provider Upload Job Payload

```json
{
  "jobVersion": 1,
  "jobId": "uuid",
  "workspaceId": "uuid",
  "fileVersionId": "uuid",
  "routeDecisionId": "uuid",
  "providerAccountId": "uuid",
  "provider": "drive",
  "executionLocation": "cloud_worker",
  "stagedFileRef": "staging-ref",
  "idempotencyKey": "workspace:...",
  "attempt": 1
}
```

### Desktop Provider Upload Job Payload

```json
{
  "jobVersion": 1,
  "jobId": "uuid",
  "workspaceId": "uuid",
  "fileVersionId": "uuid",
  "routeDecisionId": "uuid",
  "providerAccountId": "uuid",
  "provider": "telegram",
  "executionLocation": "desktop_connector",
  "requiredCapability": "telegram_local_bot_api",
  "stagedFileRef": "desktop-or-download-ref",
  "leaseExpiresAt": null,
  "idempotencyKey": "workspace:..."
}
```

### Retry And Backoff

| Error Class | Retry | Backoff |
| --- | --- | --- |
| Provider rate limit | Yes | Provider-specified or exponential. |
| Network timeout | Yes after verify | Exponential with jitter. |
| Token expired | Maybe | Refresh or reconnect. |
| Quota exceeded | No | User action or reroute. |
| Desktop offline | Yes | Wait for heartbeat or reroute policy. |
| Permission denied | No | User/admin action. |

### Concurrency Rules

- Drive uploads: default 2 concurrent uploads per provider account.
- Telegram public uploads: default 1-2 concurrent uploads per destination.
- Telegram local desktop uploads: default 1 active large upload per desktop device.
- Replicas should run after primary success unless policy says parallel replication.

### Dead Letter Schema

```json
{
  "jobId": "uuid",
  "queue": "provider-upload",
  "errorCode": "TELEGRAM_LOCAL_SERVER_UNAVAILABLE",
  "retryCount": 5,
  "lastAttemptAt": "2026-07-27T10:00:00Z",
  "repairAction": "open_desktop_or_reroute"
}
```

## Edge Cases

- A job can run after user deletes the resource; worker must respect lifecycle state.
- Desktop-local provider jobs cannot execute on cloud workers; they must wait for an authorized desktop connector.
- Provider upload may timeout after success; verify before retrying.
- Poison messages must not block the queue.
- Job payload schema changes require versioned handlers.

## Future Considerations

- Add priority queues for user-triggered repair.
- Add separate heavy OCR/AI workers.
- Add queue dashboard in admin UI.
