# Providers - Configuration

## Purpose

Define configuration required for Google Drive, Telegram public Bot API, Telegram local Bot API server, desktop connector, storage pools, and provider safety controls.

## Scope

This document covers environment variables, user-configured provider settings, workspace settings, desktop local settings, validation, secret handling, and defaults.

## Responsibilities

- Make provider setup reproducible.
- Separate deploy-time config from user provider config.
- Prevent hardcoded limits and unsafe defaults.

## Assumptions

- Secrets are loaded from secret manager in production.
- User provider credentials are encrypted in the database.
- Desktop local process settings are stored locally and reported as capability snapshots.

## Dependencies

- [linking-flows.md](linking-flows.md)
- [telegram-local-bot-api-server.md](telegram-local-bot-api-server.md)
- [capacity-planning.md](capacity-planning.md)
- [../security/secrets.md](../security/secrets.md)

## Detailed Explanation

### Desktop Production Build Configuration

| Variable | Required | Secret | Purpose |
| --- | --- | --- | --- |
| `STORAGEPK_GOOGLE_CLIENT_ID` | Production desktop installer | No | Public Desktop OAuth Client ID compiled into the installer for one-click Drive connection. |
| `STORAGEPK_GOOGLE_CLIENT_SECRET` | Production desktop installer | Build-sensitive | Matching installed-app Client Secret compiled into the installer for token exchange and refresh. |

The `0.3.0` desktop release uses PKCE `S256` and an automatic `127.0.0.1` loopback callback. Live token and refresh tests require the matching Client Secret, so production builds package both values. End users do not create a Google Cloud project or enter OAuth credentials. Manual custom Client ID and Client Secret configuration is reserved for developer fallback.

The installed-app Client Secret is recoverable from a distributed desktop binary and therefore cannot be considered absolutely confidential. Its actual value must still never be committed or logged; provide it through the protected release environment:

```powershell
$env:STORAGEPK_GOOGLE_CLIENT_ID = "your-desktop-client-id.apps.googleusercontent.com"
$env:STORAGEPK_GOOGLE_CLIENT_SECRET = "your-desktop-client-secret"
npm run release:desktop
```

### Hosted Deployment Environment Variables

| Variable | Required | Secret | Purpose |
| --- | --- | --- | --- |
| `GOOGLE_OAUTH_CLIENT_ID` | Drive enabled | No | OAuth client ID. |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Drive enabled | Yes | OAuth client secret. |
| `GOOGLE_OAUTH_REDIRECT_URI` | Drive enabled | No | API callback URL. |
| `GOOGLE_DRIVE_DEFAULT_SCOPES` | Drive enabled | No | Default should prefer `drive.file`. |
| `TELEGRAM_PUBLIC_BOT_API_BASE_URL` | Telegram enabled | No | Defaults to `https://api.telegram.org`. |
| `TELEGRAM_LOCAL_API_ENABLED` | Local mode enabled | No | Enables local server modes. |
| `TELEGRAM_LOCAL_MAX_UPLOAD_BYTES` | Local mode enabled | No | Default 2000 MB unless policy changes. |
| `PROVIDER_SECRET_ENCRYPTION_KEY_ID` | Always | No | KMS or vault key identifier. |
| `PROVIDER_ROUTE_QUOTA_CACHE_TTL_SECONDS` | Always | No | Quota snapshot freshness. |
| `DESKTOP_CONNECTOR_ENABLED` | Desktop jobs enabled | No | Enables pull-based desktop provider jobs. |

The hosted `GOOGLE_OAUTH_*` variables describe the server-side platform callback and are separate from the native `0.3.0` desktop flow. A hosted Client Secret stays in a server secret manager; it is never distributed to desktop users.

### User Provider Settings

| Setting | Provider | Storage |
| --- | --- | --- |
| Account label | Drive/Telegram | Plain metadata. |
| Google subject ID | Drive | Plain provider identity metadata. |
| Google refresh token | Drive | Encrypted credential payload. |
| Telegram bot token | Telegram | Encrypted credential payload. |
| Telegram destination chat ID | Telegram | Sensitive metadata, not secret token. |
| Telegram mode | Telegram | Capability metadata. |
| Privacy acknowledgement | Telegram | Audit and provider metadata. |

### Desktop Local Settings

| Setting | Default | Rule |
| --- | --- | --- |
| Bind host | `127.0.0.1` | Never default to public bind. |
| Port | auto | Detect conflicts and report chosen port. |
| Auto-start | disabled until user enables | Requires explicit advanced mode opt-in. |
| Background uploads | user choice | If disabled, jobs pause when app exits. |
| Staging folder access | StoragePK staging only | Do not mount whole disk into Docker/server. |
| Server binary path | managed by app | Verify checksum/version before launch. |

### Provider Limits Must Be Runtime Data

Do not hardcode provider capacity in route logic. Store limits in `provider_capability_snapshots`:

```json
{
  "provider": "telegram",
  "mode": "desktop_managed_local_bot_api",
  "limits": {
    "maxUploadBytes": 2097152000,
    "maxPublicGetFileBytes": null
  },
  "checkedAt": "2026-07-27T10:00:00Z"
}
```

## Edge Cases

- Google OAuth redirect URI differs between local, staging, and production.
- The native desktop flow does not pre-register a fixed callback URL; it selects a random loopback port for each authorization attempt.
- A consent project in **Testing** issues refresh tokens that expire after seven days. Broad distribution requires **In production** publication and applicable basic verification for the non-sensitive `drive.file` scope.
- Desktop local server port changes after restart; backend should store capability, not fixed URL for cloud use.
- Telegram local mode is enabled globally but user has not configured API ID/hash; show setup incomplete.
- Provider policy changes lower limits; existing jobs must be revalidated.
- User exports config; secrets must remain excluded or masked.

## Future Considerations

- Add config schema validation.
- Add provider configuration diagnostics page.
- Add encrypted desktop local settings storage.
