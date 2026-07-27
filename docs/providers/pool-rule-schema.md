# Providers - Storage Pool Rule Schema

## Purpose

Define the exact JSON schema and evaluation order for storage pool routing rules.

## Scope

This document covers rule fields, operators, priority, fallback, provider constraints, replication rules, validation, route trace output, and examples.

## Responsibilities

- Make routing rules deterministic.
- Let the UI build a rules editor safely.
- Let backend and worker evaluate the same rule shape.

## Assumptions

- Rules are stored as JSONB in `storage_pool_accounts.rules` or pool-level settings.
- Rules are evaluated before scoring when `mode=rule_based`.
- User overrides can win only when validation passes.

## Dependencies

- [routing-algorithm.md](routing-algorithm.md)
- [storage-pools.md](storage-pools.md)
- [configuration.md](configuration.md)
- [provider-error-catalog.md](provider-error-catalog.md)

## Detailed Explanation

### Rule Object

```json
{
  "id": "rule_archive_small_pdfs",
  "enabled": true,
  "priority": 100,
  "name": "Archive small PDFs to Telegram",
  "when": {
    "all": [
      { "field": "mimeType", "op": "in", "value": ["application/pdf"] },
      { "field": "sizeBytes", "op": "lte", "value": 52428800 },
      { "field": "tags", "op": "containsAny", "value": ["archive", "receipt"] }
    ]
  },
  "then": {
    "role": "archive",
    "provider": "telegram",
    "providerAccountId": "uuid",
    "replication": "none",
    "fallback": "drive"
  }
}
```

### Supported Fields

| Field | Type | Notes |
| --- | --- | --- |
| `mimeType` | string | Server-detected MIME type. |
| `extension` | string | Lowercase without dot. |
| `sizeBytes` | integer | Server-validated size. |
| `folderPath` | string | StoragePK logical path. |
| `tags` | string array | User or classification tags. |
| `category` | string | Classification category. |
| `source` | string | web, desktop, watch_folder, import. |
| `sensitivity` | string | normal, private, secret, unknown. |
| `createdByDeviceId` | uuid | Useful for desktop-local routes. |

### Operators

| Operator | Works With | Meaning |
| --- | --- | --- |
| `eq` | scalar | Equal. |
| `neq` | scalar | Not equal. |
| `in` | scalar against array | Value is in list. |
| `containsAny` | array | At least one item matches. |
| `containsAll` | array | All items match. |
| `lte` | number | Less than or equal. |
| `gte` | number | Greater than or equal. |
| `startsWith` | string | Prefix match. |
| `matches` | string | Safe regex subset; disabled by default in UI. |

### Evaluation Order

1. Validate rule schema.
2. Remove disabled rules.
3. Sort by descending `priority`, then stable rule ID.
4. Evaluate `when`.
5. Validate `then` target provider account.
6. Apply provider capability and quota filters.
7. Produce route trace.
8. If no rule matches, apply pool fallback mode.

### Route Trace Schema

```json
{
  "routeDecisionId": "uuid",
  "matchedRuleIds": ["rule_archive_small_pdfs"],
  "selected": {
    "providerAccountId": "uuid",
    "provider": "telegram",
    "role": "archive",
    "score": 870
  },
  "skipped": [
    {
      "providerAccountId": "uuid-drive-full",
      "reason": "quota_threshold_exceeded"
    }
  ],
  "fallbackPolicy": "drive",
  "warnings": ["telegram_membership_access"]
}
```

## Edge Cases

- A rule points to a revoked provider account; reject save or mark rule invalid.
- Two rules match the same file; higher priority wins unless replication rule explicitly allows both.
- Regex rules can become unsafe or slow; keep disabled by default.
- Desktop-local rule cannot execute when no compatible desktop connector is online.
- Sensitivity unknown should never route automatically to Telegram unless user opts in.

## Future Considerations

- Add visual rule simulator.
- Add rule dry-run over existing library.
- Add generated JSON Schema and TypeScript types.

