# API - Providers and Storage Pools

## Purpose

Define API endpoints for linking Google Drive accounts, linking Telegram destinations, managing storage pools, testing routing, reconnecting providers, and revoking providers.

## Scope

This document covers provider connection lifecycle, capability snapshots, pool CRUD, route simulation, and provider health APIs.

## Responsibilities

- Turn provider linking and storage pool design into implementation-ready API contracts.
- Ensure all provider operations are authenticated, authorized, audited, and safe.
- Provide clients enough information to explain routing decisions.

## Assumptions

- All endpoints are prefixed with `/v1`.
- Provider credentials are encrypted server-side and never returned after save.
- Storage pools can contain many Drive accounts and Telegram destinations.
- Provider policy and routing logic are defined in `docs/providers/`.

## Dependencies

- [../providers/linking-flows.md](../providers/linking-flows.md)
- [../providers/routing-algorithm.md](../providers/routing-algorithm.md)
- [../providers/policy-and-feasibility.md](../providers/policy-and-feasibility.md)
- [../providers/desktop-connector-protocol.md](../providers/desktop-connector-protocol.md)
- [../providers/provider-error-catalog.md](../providers/provider-error-catalog.md)
- [error-handling.md](error-handling.md)
- [rate-limit.md](rate-limit.md)

## Detailed Explanation

### POST `/v1/providers/drive/link-intents`

Purpose: create a Google Drive OAuth link intent and return authorization URL.

Authentication: required.

Authorization: `provider:manage`.

Request:

```json
{
  "workspaceId": "uuid",
  "requestedScopes": ["https://www.googleapis.com/auth/drive.file"],
  "label": "Drive Main"
}
```

Response:

```json
{
  "linkIntentId": "uuid",
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "expiresAt": "2026-07-27T12:00:00Z"
}
```

Possible errors: `PROVIDER_SCOPE_NOT_ALLOWED`, `OAUTH_CONFIG_MISSING`, `RATE_LIMITED`.

### GET `/v1/providers/drive/callback`

Purpose: receive Google OAuth callback, exchange code, verify identity/scopes, encrypt credentials, and save provider account.

Authentication: OAuth state validates the pending intent.

Response: redirects to provider settings with result status.

Possible errors: `OAUTH_STATE_INVALID`, `PROVIDER_SCOPE_MISSING`, `PROVIDER_ACCOUNT_DUPLICATE`, `CREDENTIAL_ENCRYPTION_FAILED`.

### POST `/v1/providers/telegram`

Purpose: link a Telegram bot and destination.

Authentication: required.

Authorization: `provider:manage`.

Request:

```json
{
  "workspaceId": "uuid",
  "label": "Telegram Archive",
  "botToken": "redacted",
  "destinationChatId": "-100123456789",
  "mode": "public_bot_api",
  "acknowledgedPrivacyModel": true
}
```

Response:

```json
{
  "providerAccountId": "uuid",
  "provider": "telegram",
  "label": "Telegram Archive",
  "healthState": "healthy",
  "capabilities": {
    "upload": true,
    "download": true,
    "maxUploadBytes": 52428800,
    "mode": "public_bot_api"
  }
}
```

Possible errors: `TELEGRAM_TOKEN_INVALID`, `TELEGRAM_DESTINATION_INVALID`, `TELEGRAM_SEND_PERMISSION_DENIED`, `TELEGRAM_PRIVACY_ACK_REQUIRED`.

### GET `/v1/providers`

Purpose: list connected provider accounts and capability snapshots.

Authentication: required.

Authorization: `provider:read`.

Response includes masked account identity, health, quota, scopes, capabilities, pool membership, and last check time.

### GET `/v1/providers/{providerAccountId}`

Purpose: return provider account detail, capability history summary, pool membership, and warnings.

Authorization: `provider:read`.

Response:

```json
{
  "providerAccountId": "uuid",
  "provider": "drive",
  "label": "Drive Main",
  "identity": {
    "email": "drive-main@example.com",
    "subject": "google-sub"
  },
  "healthState": "healthy",
  "capabilities": {
    "upload": true,
    "download": true,
    "resumableUpload": true
  },
  "warnings": []
}
```

### GET `/v1/providers/{providerAccountId}/capability-history`

Purpose: list capability snapshots for debugging and audit.

Authorization: `provider:read`.

Query: `limit`, `cursor`.

### POST `/v1/providers/{providerAccountId}/health-check`

Purpose: run provider health and capability check.

Authorization: `provider:read`.

Rules:

- Must not return raw credentials.
- Must update `provider_capability_snapshots`.
- Must emit audit event when health changes.

### POST `/v1/providers/{providerAccountId}/reconnect`

Purpose: reconnect expired or revoked provider account.

Authorization: `provider:manage`.

Rules:

- Drive reconnect must match original provider subject unless user chooses connect-as-new.
- Telegram reconnect must verify bot identity and destination permission.

### DELETE `/v1/providers/{providerAccountId}`

Purpose: revoke provider account inside StoragePK.

Authorization: `provider:manage`.

Request:

```json
{
  "deleteProviderObjects": false,
  "reason": "User removed old archive account"
}
```

Rules:

- Default revokes only StoragePK connection.
- Provider object deletion requires explicit separate confirmation.
- Storage pools containing the provider must be recalculated.

### POST `/v1/storage-pools`

Purpose: create a storage pool from provider accounts.

Authorization: `provider:manage`.

Request:

```json
{
  "workspaceId": "uuid",
  "name": "Personal Vault",
  "mode": "fill_first",
  "accounts": [
    {
      "providerAccountId": "uuid-drive-main",
      "priority": 1,
      "role": "primary",
      "quotaThresholdPercent": 85
    },
    {
      "providerAccountId": "uuid-telegram-archive",
      "priority": 2,
      "role": "archive",
      "rules": {
        "maxSizeBytes": 52428800,
        "tags": ["archive"]
      }
    }
  ]
}
```

Response:

```json
{
  "storagePoolId": "uuid",
  "name": "Personal Vault",
  "mode": "fill_first",
  "healthState": "healthy"
}
```

### GET `/v1/storage-pools`

Purpose: list storage pools with health, usable Drive capacity, Telegram mode labels, and warnings.

Authorization: `provider:read`.

### GET `/v1/storage-pools/{storagePoolId}`

Purpose: return pool detail, accounts, rules, capacity summary, and recent route failures.

Authorization: `provider:read`.

### PATCH `/v1/storage-pools/{storagePoolId}`

Purpose: update pool name, mode, rules, fallback policy, and default status.

Authorization: `provider:manage`.

Rules:

- Rule JSON must validate against `pool-rule-schema.md`.
- Mode changes require route simulation warning if pending jobs exist.

### POST `/v1/storage-pools/{storagePoolId}/accounts`

Purpose: add a provider account to a pool.

Authorization: `provider:manage`.

### PATCH `/v1/storage-pools/{storagePoolId}/accounts/{providerAccountId}`

Purpose: update account priority, role, rules, and quota threshold.

Authorization: `provider:manage`.

### DELETE `/v1/storage-pools/{storagePoolId}/accounts/{providerAccountId}`

Purpose: remove provider account from pool.

Authorization: `provider:manage`.

Rules:

- Existing files remain where stored.
- Pending jobs targeting this account become stale and must reroute or repair.

### POST `/v1/storage-pools/{storagePoolId}/simulate-route`

Purpose: preview routing decision before upload or rule save.

Authorization: `provider:read`.

Request:

```json
{
  "filename": "invoice.pdf",
  "sizeBytes": 340000,
  "mimeType": "application/pdf",
  "tags": ["finance"],
  "folderPath": "/Finance/Receipts"
}
```

### GET `/v1/route-decisions/{routeDecisionId}`

Purpose: return selected provider, skipped candidates, rule matches, score trace, fallback status, and worker revalidation result.

Authorization: `provider:read` plus resource permission if attached to a resource.

### POST `/v1/desktop/capabilities/heartbeat`

Purpose: desktop connector reports local provider capability, including Telegram local Bot API server status.

Authentication: required device-bound desktop session.

Request:

```json
{
  "deviceId": "uuid",
  "workspaceId": "uuid",
  "capabilities": [
    {
      "type": "telegram_local_bot_api",
      "state": "running",
      "maxUploadBytes": 2097152000,
      "port": 49152
    }
  ]
}
```

### POST `/v1/desktop/jobs/lease`

Purpose: lease desktop-executable provider jobs.

Authentication: required device-bound desktop session.

Response follows [../providers/desktop-connector-protocol.md](../providers/desktop-connector-protocol.md).

### POST `/v1/desktop/jobs/{jobId}/progress`

Purpose: report desktop provider upload progress.

### POST `/v1/desktop/jobs/{jobId}/complete`

Purpose: complete leased desktop provider job with provider object metadata.

### POST `/v1/desktop/jobs/{jobId}/fail`

Purpose: fail leased desktop job with catalog error code and retry metadata.

Response:

```json
{
  "decision": "selected",
  "selectedProviderAccountId": "uuid-drive-main",
  "provider": "drive",
  "reason": "Matched priority account with enough quota.",
  "skipped": [
    {
      "providerAccountId": "uuid-telegram-archive",
      "reason": "Rule requires archive tag."
    }
  ]
}
```

## Edge Cases

- OAuth callback arrives after link intent expiry; return `LINK_INTENT_EXPIRED`.
- Drive reconnect identity mismatch; block and show connect-as-new option.
- Telegram mode changes from local to public; capability snapshot must lower limits and queued jobs may become invalid.
- Storage pool has no healthy accounts; uploads are blocked with `POOL_NO_HEALTHY_COMPATIBLE_ACCOUNT`.
- Simulated route can differ from worker route if quota/health changes; worker decision is authoritative and audited.
- Desktop heartbeat expires while a job is leased; lease expiry returns job to pending.
- Pool account removal while upload runs does not cancel already-uploading job unless user explicitly cancels.

## Future Considerations

- Add provider import endpoints for user-selected existing Drive files.
- Add storage pool rebalancing APIs.
- Add migration APIs between pools.
- Add provider policy version endpoint for UI warnings.
