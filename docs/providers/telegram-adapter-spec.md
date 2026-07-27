# Providers - Telegram Adapter Spec

## Purpose

Define exact Telegram adapter behavior for public Bot API, local Bot API server, sendDocument, getFile, deleteMessage, metadata, error mapping, and access model.

## Scope

This document covers provider object IDs, request/response contracts, file ID reuse, local server behavior, limits, verification, deletion, and MVP exclusions.

## Responsibilities

- Make Telegram behavior buildable and testable.
- Preserve Telegram-specific access risks in UI and storage metadata.
- Avoid unsafe assumptions about Telegram as unlimited private storage.

## Assumptions

- MVP uses bot-backed destinations.
- Public Bot API and local Bot API modes share adapter interface but differ in limits and execution location.
- Telegram messages are the durable provider reference.

## Dependencies

- [telegram.md](telegram.md)
- [telegram-local-bot-api-server.md](telegram-local-bot-api-server.md)
- [idempotency-and-reconciliation.md](idempotency-and-reconciliation.md)
- [provider-error-catalog.md](provider-error-catalog.md)

## Detailed Explanation

### Provider Object ID Format

Canonical format:

```text
telegram:{chat_id}:{message_id}
```

Example:

```text
telegram:-100123456789:4567
```

Stored metadata:

```json
{
  "chatId": "-100123456789",
  "messageId": 4567,
  "fileId": "telegram-file-id",
  "fileUniqueId": "telegram-file-unique-id",
  "botId": 123456789,
  "mode": "desktop_managed_local_bot_api",
  "captionStoragePkMarker": "resource/version marker if used"
}
```

### sendDocument Input

```json
{
  "providerAccountId": "uuid",
  "destinationChatId": "-100123456789",
  "filename": "archive.zip",
  "mimeType": "application/zip",
  "sizeBytes": 104857600,
  "stagedFileRef": "local-path-or-stream-ref",
  "mode": "desktop_managed_local_bot_api",
  "disableContentTypeDetection": false,
  "protectContent": false,
  "caption": "StoragePK resource marker"
}
```

Rules:

- Public mode rejects documents above configured public upload limit.
- Desktop local mode requires compatible desktop connector and local server state.
- `protectContent` is disabled by default when download/share by Telegram members is intended.
- Caption markers must not leak sensitive metadata.

### getFile Behavior

Public Bot API:

- Use only within public `getFile` download limit.
- Large files stored through local mode may not be retrievable through public mode.

Local Bot API:

- Prefer local mode for large retrieval.
- Requires local/server process online.

### deleteMessage Behavior

Deletion:

- Requires explicit destructive confirmation.
- Deleting StoragePK metadata does not delete Telegram message by default.
- If deletion succeeds, storage object state becomes `deleted_external`.
- If deletion fails because message is gone, mark drift and resolve as already deleted.

### Error Mapping

| Telegram Condition | StoragePK Error |
| --- | --- |
| Invalid bot token | `TELEGRAM_TOKEN_INVALID` |
| Bot lacks destination access | `TELEGRAM_DESTINATION_INVALID` |
| Bot cannot send documents | `TELEGRAM_SEND_PERMISSION_DENIED` |
| File exceeds public limit | `TELEGRAM_PUBLIC_FILE_TOO_LARGE` |
| Local server not running | `TELEGRAM_LOCAL_SERVER_UNAVAILABLE` |
| Local server port conflict | `TELEGRAM_LOCAL_PORT_CONFLICT` |
| Message deleted | `PROVIDER_OBJECT_MISSING` |
| Rate limited | `PROVIDER_RATE_LIMITED` |

## Edge Cases

- Telegram returns a `file_id` that changes over time; provider object identity remains chat/message ID.
- Another channel member downloads file outside StoragePK; app cannot audit that Telegram-side action.
- Bot token is rotated; existing messages remain in Telegram but new API calls require new token.
- Local server succeeds but desktop completion fails; local attempt cache must preserve message metadata.
- Message IDs are unique only inside chat/channel; include chat ID in object ID.

## Future Considerations

- Add topic/thread routing.
- Add local Bot API Docker setup wizard.
- Add optional chunking only after formal restore design.
- Add MTProto research doc if user-account mode is explored.

