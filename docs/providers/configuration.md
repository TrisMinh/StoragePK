# Providers - Typed Configuration

## Purpose

Define typed configuration schemas for provider integrations so implementation agents can build settings, validation, and runtime behavior without guessing.

## Scope

This document covers deployment environment variables, workspace provider settings, storage pool settings, Telegram local server settings, desktop connector settings, provider limits, and validation errors.

## Responsibilities

- Provide canonical config field names, types, defaults, and validation rules.
- Separate secrets from non-secret settings.
- Ensure provider limits are runtime data, not hardcoded behavior.

## Assumptions

- Production secrets are stored in a secret manager or encrypted vault.
- User provider credentials are encrypted in the database.
- Desktop local settings are stored on the device and reported as capabilities.
- [provider-configuration.md](provider-configuration.md) is the high-level configuration overview; this file is the typed schema reference.

## Dependencies

- [provider-configuration.md](provider-configuration.md)
- [capacity-planning.md](capacity-planning.md)
- [telegram-local-bot-api-server.md](telegram-local-bot-api-server.md)
- [../security/secrets.md](../security/secrets.md)

## Detailed Explanation

### Desktop Production Build Schema

```json
{
  "STORAGEPK_GOOGLE_CLIENT_ID": "public-desktop-oauth-client-id.apps.googleusercontent.com",
  "STORAGEPK_GOOGLE_CLIENT_SECRET": "build-sensitive-installed-app-secret"
}
```

| Field | Type | Default | Validation |
| --- | --- | --- | --- |
| `STORAGEPK_GOOGLE_CLIENT_ID` | public string | none | Required by the production desktop release preflight; must be a Desktop OAuth Client ID ending in `.apps.googleusercontent.com`. |
| `STORAGEPK_GOOGLE_CLIENT_SECRET` | build-sensitive string | none | Required by the production desktop release preflight; must match the packaged Desktop Client ID. |

Both values are consumed at desktop build time and packaged into the `0.3.0` installer. The Client ID is public. Because a Desktop installed-app Client Secret is embedded in the binary, it cannot be treated as absolutely confidential; however, its actual value must not be committed, logged, printed by release tooling, or stored in tracked configuration. Supply it through a protected local or CI build environment.

The desktop still requires PKCE `S256`, state validation, and an automatic loopback callback. The packaged secret does not replace PKCE. Manual custom Desktop Client ID and Client Secret entry is a developer fallback only. End users of the production installer do not configure Google Cloud or OAuth credentials.

### Hosted API Environment Schema

```json
{
  "GOOGLE_OAUTH_CLIENT_ID": "string",
  "GOOGLE_OAUTH_CLIENT_SECRET": "secret:string",
  "GOOGLE_OAUTH_REDIRECT_URI": "url",
  "GOOGLE_DRIVE_DEFAULT_SCOPES": ["https://www.googleapis.com/auth/drive.file"],
  "TELEGRAM_PUBLIC_BOT_API_BASE_URL": "https://api.telegram.org",
  "TELEGRAM_LOCAL_API_ENABLED": true,
  "TELEGRAM_LOCAL_MAX_UPLOAD_BYTES": 2097152000,
  "PROVIDER_ROUTE_QUOTA_CACHE_TTL_SECONDS": 300,
  "PROVIDER_ROUTE_HEALTH_CACHE_TTL_SECONDS": 60,
  "PROVIDER_UPLOAD_MAX_CONCURRENCY_PER_ACCOUNT": 2,
  "DESKTOP_CONNECTOR_ENABLED": true,
  "PROVIDER_SECRET_ENCRYPTION_KEY_ID": "kms-key-id"
}
```

| Field | Type | Default | Validation |
| --- | --- | --- | --- |
| `GOOGLE_OAUTH_CLIENT_ID` | string | none | Required when Drive enabled. |
| `GOOGLE_OAUTH_CLIENT_SECRET` | secret string | none | Required when Drive enabled; never logged. |
| `GOOGLE_OAUTH_REDIRECT_URI` | URL | none | Must match OAuth console. |
| `GOOGLE_DRIVE_DEFAULT_SCOPES` | string array | `drive.file` | Full `drive` requires policy gate. |
| `TELEGRAM_PUBLIC_BOT_API_BASE_URL` | URL | `https://api.telegram.org` | Must use HTTPS for public API. |
| `TELEGRAM_LOCAL_API_ENABLED` | boolean | false | Enables local modes. |
| `TELEGRAM_LOCAL_MAX_UPLOAD_BYTES` | integer | `2097152000` | Must be positive and policy-approved. |
| `PROVIDER_ROUTE_QUOTA_CACHE_TTL_SECONDS` | integer | 300 | 30-1800 seconds. |
| `PROVIDER_UPLOAD_MAX_CONCURRENCY_PER_ACCOUNT` | integer | 2 | 1-10 for MVP. |

The `GOOGLE_OAUTH_*` fields above belong to the hosted API architecture and are not the `0.3.0` desktop end-user flow. Hosted confidential-client secrets remain server-side secret-manager material and must never be copied into a desktop installer or repository.

### Provider Account Config

```json
{
  "provider": "telegram",
  "label": "Archive Channel",
  "workspaceId": "uuid",
  "identity": {
    "kind": "telegram_bot",
    "botId": 123456789,
    "botUsername": "storagepk_bot",
    "destinationChatId": "-100123456789"
  },
  "credentialsRef": "vault:provider_accounts/uuid",
  "mode": "desktop_managed_local_bot_api",
  "capabilityPolicy": {
    "maxUploadBytes": 2097152000,
    "allowsDelete": true,
    "allowsDownload": true,
    "requiresDesktopConnector": true
  }
}
```

Drive identity schema:

```json
{
  "kind": "google_drive",
  "googleSubject": "google-oauth-sub",
  "email": "drive-main@example.com",
  "grantedScopes": ["https://www.googleapis.com/auth/drive.file"]
}
```

### Storage Pool Rule Config

Storage pool config must use [pool-rule-schema.md](pool-rule-schema.md). Invalid rule JSON must be rejected before saving.

### Desktop Local Server Config

```json
{
  "mode": "desktop_managed_local_bot_api",
  "bindHost": "127.0.0.1",
  "portStrategy": "auto",
  "fixedPort": null,
  "autoStart": true,
  "backgroundUploads": true,
  "serverBinaryVersion": "pinned-version",
  "stagingRoot": "app-managed-staging-directory",
  "logLevel": "info",
  "tempCleanupPolicy": {
    "deleteCompletedAfterMinutes": 60,
    "deleteFailedAfterDays": 7
  }
}
```

Validation:

- `bindHost` defaults to `127.0.0.1`; public bind requires explicit advanced confirmation.
- `fixedPort` must be 1024-65535.
- `stagingRoot` must be app-managed, not arbitrary disk root.
- `serverBinaryVersion` must match a trusted manifest.

## Edge Cases

- A provider account can be valid but ineligible for a pool because its mode requires desktop execution.
- Changing Telegram mode can invalidate queued jobs.
- Changing Drive scopes requires reconnect and capability refresh.
- Config import/export must exclude encrypted credential payloads.
- Quota TTL can make route simulation stale; worker revalidation remains mandatory.

## Future Considerations

- Generate JSON Schema from this document.
- Add config migration strategy.
- Add policy-as-code checks for risky provider config.
