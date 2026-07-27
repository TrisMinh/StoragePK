# API - Resources

## Purpose

Define APIs for files, folders, tags, upload sessions, classification review, provider upload status, search, and repair workflows.

## Scope

This document covers the core resource APIs required for MVP implementation.

## Responsibilities

- Make file workflow contracts explicit.
- Define provider-independent resource behavior.
- Support web and desktop clients.

## Assumptions

- All endpoints are prefixed with `/v1`.
- All mutating requests require authentication, authorization, validation, and audit.
- Large file bytes may use direct upload sessions or backend streaming depending on implementation.

## Dependencies

- [error-handling.md](error-handling.md)
- [websocket.md](websocket.md)
- [providers.md](providers.md)
- [../database/schema.md](../database/schema.md)
- [../backend/services.md](../backend/services.md)

## Detailed Explanation

### POST `/v1/upload-sessions`

| Field | Value |
| --- | --- |
| Purpose | Create a drag-and-drop batch intake session. |
| Authentication | Required. |
| Authorization | `resource:create` in workspace. |
| Rate Limit | Upload-session policy. |

Request:

```json
{
  "workspaceId": "uuid",
  "source": "desktop",
  "items": [
    {
      "clientItemId": "local-1",
      "filename": "invoice-may.pdf",
      "sizeBytes": 184820,
      "lastModifiedAt": "2026-07-27T10:30:00Z",
      "relativePath": "Receipts/invoice-may.pdf",
      "preferredProvider": "drive",
      "storagePoolId": "uuid"
    }
  ]
}
```

Response:

```json
{
  "sessionId": "uuid",
  "expiresAt": "2026-07-27T12:30:00Z",
  "items": [
    {
      "itemId": "uuid",
      "clientItemId": "local-1",
      "uploadUrl": "/v1/upload-sessions/uuid/items/uuid/content",
      "status": "awaiting_upload"
    }
  ]
}
```

### PUT `/v1/upload-sessions/{sessionId}/items/{itemId}/content`

Purpose: upload file bytes or chunk stream to backend staging.

Headers:

- `Content-Type: application/octet-stream`
- `Content-Length`
- `X-Checksum-Sha256` when available.

Possible errors: `UPLOAD_SESSION_EXPIRED`, `CHECKSUM_MISMATCH`, `FILE_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`.

### POST `/v1/upload-sessions/{sessionId}/commit`

Purpose: validate completed items, create resources, enqueue classification and provider upload jobs.

Response includes resource IDs, route decision IDs, selected provider accounts, and job IDs.

### GET `/v1/resources`

Purpose: list files with filters.

Query filters:

- `workspaceId`
- `folderId`
- `tag`
- `mimeType`
- `provider`
- `status`
- `createdFrom`
- `createdTo`
- `q`
- `limit`
- `cursor`

### GET `/v1/resources/{resourceId}`

Purpose: get full resource metadata, latest version, tags, provider status, and audit summary.

### PATCH `/v1/resources/{resourceId}`

Purpose: update name, folder, tags, notes, lifecycle state, or classification decision.

Validation:

- Filename cannot include control characters or path traversal.
- Folder must belong to same workspace.
- Tags must exist or be created according to permissions.

### DELETE `/v1/resources/{resourceId}`

Purpose: soft-delete resource.

Rules:

- Default is soft delete in StoragePK metadata.
- Provider delete is a separate optional action requiring explicit confirmation.

### POST `/v1/resources/{resourceId}/restore`

Purpose: restore soft-deleted resource.

### POST `/v1/resources/{resourceId}/repair`

Purpose: retry, reroute, reconcile, or mark provider object as orphaned.

Request:

```json
{
  "action": "retry_upload",
  "targetProviderAccountId": "uuid"
}
```

### POST `/v1/search`

Purpose: perform metadata/content/semantic search.

Request:

```json
{
  "workspaceId": "uuid",
  "query": "invoice camera lens May",
  "filters": {
    "mimeTypes": ["application/pdf"],
    "providers": ["drive"]
  },
  "mode": "hybrid",
  "limit": 25
}
```

Response:

```json
{
  "results": [
    {
      "resourceId": "uuid",
      "name": "invoice-may.pdf",
      "score": 0.92,
      "matchedFields": ["filename", "extractedText", "tags"],
      "provider": "drive"
    }
  ],
  "nextCursor": null
}
```

## Edge Cases

- If duplicate is detected, commit returns duplicate candidates and waits for user decision.
- If a provider route is invalid, classification can still finish and resource enters `repair_pending`.
- Search results must always be permission-filtered before return.
- Folder upload on web may include missing relative paths depending on browser API support.

## Future Considerations

- Add resumable client-to-backend chunk protocol.
- Add provider direct-upload signed URLs for selected providers.
- Add version history endpoints.
- Add share-link endpoints.
