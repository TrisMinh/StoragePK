# StoragePK Desktop

StoragePK Desktop `0.3.0` is the supported local-first Windows application. It runs without the web API, PostgreSQL, Redis, Docker, or a StoragePK account.

## First Run

1. Install StoragePK from [GitHub Releases](https://github.com/TrisMinh/StoragePK/releases/latest).
2. Drop files or folders into the window.
3. Open **Kết nối lưu trữ**.
4. Sign in to [Google Drive](../../docs/providers/google-drive-desktop-setup.md) or configure [Telegram](../../docs/providers/telegram.md).
5. Upload manually or enable automatic sync.

## Provider Behavior

- Each Google account remains an independent destination with its own identity, quota, and remote object IDs.
- Drive uses `drive.file`, app-owned folders, resumable uploads, and account-pinned retries.
- Telegram keeps each supported file as one document and rejects files at or above `49,000,000` bytes.
- Larger Telegram files remain local instead of being silently split.
- Deleting a local file does not automatically delete an uploaded provider copy.

## Local Data

- Vault: the Tauri application local-data directory under `Vault`.
- Metadata: the Tauri application data directory under `vault-state.json`.
- Previous metadata backup: `vault-state.backup.json`.
- Provider credentials and resumable session URLs: Windows Credential Manager.

Provider tokens, PKCE values, and Drive session URLs are not written to the metadata JSON.

## Development

```powershell
npm ci
npm run tauri:dev --workspace=@storagepk/desktop
npm run tauri:test --workspace=@storagepk/desktop
```

Build verified Windows installers with:

```powershell
$env:STORAGEPK_GOOGLE_CLIENT_ID = "your-client-id.apps.googleusercontent.com"
$env:STORAGEPK_GOOGLE_CLIENT_SECRET = "your-client-secret"
npm run release:desktop
```

Generated installers are under `src-tauri/target/release/bundle`. They are currently unsigned.
