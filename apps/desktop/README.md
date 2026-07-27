# StoragePK Desktop

## What Works

StoragePK Desktop `0.3.0` is a standalone local-first Windows file workspace. It does not require the web API, PostgreSQL, Redis, Docker, or a StoragePK login.

- Polished overview dashboard based on the approved UI preview.
- Native file/folder drag-drop and file picker.
- Local vault at `Documents\StoragePK Vault`.
- Automatic categories and SHA-256 duplicate detection.
- Search, filters, open, Explorer reveal, rescan, and local deletion.
- One-click Google Drive connection through a packaged Desktop OAuth Client ID and Client Secret, mandatory PKCE `S256`, and an automatic loopback callback.
- Multiple independently authorized Google Drive accounts.
- Fixed least-privilege `drive.file` permission.
- App-owned Drive folders, quota-aware routing, resumable 8 MiB upload chunks, and retry recovery.
- Telegram public Bot API connection and clean one-document uploads below 49,000,000 bytes.
- Manual or automatic Drive/Telegram sync.
- Windows Credential Manager for all provider secrets and upload-session URLs.
- Responsive light/dark modes and complete loading/empty/error/busy states.

## First Run

1. Install StoragePK.
2. Drop files into the window; Local Vault is created automatically.
3. Open **Kết nối lưu trữ**.
4. For Drive, follow [Google Drive Desktop Setup](../../docs/providers/google-drive-desktop-setup.md).
5. For Telegram, create a bot with `@BotFather`, start the bot or add it to the destination chat, then enter the Bot Token and Chat ID.
6. Enable auto-sync only for providers that should receive every new eligible file.

Local Vault remains the source of truth. Disconnecting a provider or deleting a local item does not silently delete a remote copy.

## Google Drive Behavior

- Every Google account is an independent destination with its own identity and quota.
- StoragePK creates one `StoragePK` folder per account.
- Automatic routing chooses an enabled account with the required scope and enough known free quota, then pins retries to it.
- Uploads use Drive resumable sessions and private `appProperties` for reconciliation.
- Multi-account support is not unlimited storage and must not be used to bypass Google quotas or policies.

Production installers package `STORAGEPK_GOOGLE_CLIENT_ID` and `STORAGEPK_GOOGLE_CLIENT_SECRET`, so end users only approve access in the browser. They do not create a Google Cloud project or enter either value. Custom Desktop Client ID and Client Secret entry remains available only as a developer fallback.

## Telegram Behavior

The public Telegram Bot API accepts files up to 50 MB per request. StoragePK preserves each file as one document and uses a conservative 49,000,000-byte boundary. Larger files remain local. Telegram Local Bot API supervision is not included in `0.3.0`.

## Local Data

- Files: `Documents\StoragePK Vault`
- Metadata: Tauri app-data `vault-state.json`
- Previous state backup: `vault-state.backup.json`
- Telegram token: Credential Manager service `StoragePK.Telegram`
- Custom developer OAuth client only: `StoragePK.GoogleDrive.Client`
- Google refresh tokens: `StoragePK.GoogleDrive.RefreshToken`
- Drive resumable session URLs: `StoragePK.GoogleDrive.UploadSession`

No provider secret, access token, PKCE verifier, or resumable session URL is written to the metadata JSON.

## Development

Requirements:

- Node.js 20+
- Rust stable
- Visual Studio 2022 C++ Build Tools
- Windows SDK
- Tauri CLI 2

```powershell
npm install
npm run tauri:dev --workspace=@storagepk/desktop
npm run tauri:test --workspace=@storagepk/desktop
$env:STORAGEPK_GOOGLE_CLIENT_ID = "your-desktop-client-id.apps.googleusercontent.com"
$env:STORAGEPK_GOOGLE_CLIENT_SECRET = "your-desktop-client-secret"
npm run release:desktop
```

The packaged Client ID is public. The installed-app Client Secret is recoverable from the desktop binary and cannot be considered absolutely confidential, but its actual value must not be committed or logged. Supply both values through the release build environment. Manual client configuration is for developer fallback only.

## Release Artifacts

- NSIS: `src-tauri/target/release/bundle/nsis/StoragePK_0.3.0_x64-setup.exe`
- MSI: `src-tauri/target/release/bundle/msi/StoragePK_0.3.0_x64_en-US.msi`
- Portable executable: `src-tauri/target/release/storagepk-desktop.exe`

Local artifacts are unsigned. Public distribution requires a Windows code-signing certificate to reduce SmartScreen warnings.

Broad Google OAuth distribution separately requires the consent project to be **In production** and to complete the applicable basic verification for the non-sensitive `drive.file` scope. This README does not claim that verification has completed.
