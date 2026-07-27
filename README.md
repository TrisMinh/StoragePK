# StoragePK

[![CI](https://github.com/TrisMinh/StoragePK/actions/workflows/ci.yml/badge.svg)](https://github.com/TrisMinh/StoragePK/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/TrisMinh/StoragePK)](https://github.com/TrisMinh/StoragePK/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D4)](apps/desktop/README.md)

StoragePK is a local-first Windows file workspace. Drop files into the app, search and classify them locally, then back them up to one or more Google Drive accounts or a private Telegram destination.

[Download the latest Windows release](https://github.com/TrisMinh/StoragePK/releases/latest)

![StoragePK dashboard](docs/assets/screenshots/dashboard-overview.png)

| Storage connections | Google Drive sign-in |
| --- | --- |
| ![Storage connections](docs/assets/screenshots/storage-connections.png) | ![Google Drive onboarding](docs/assets/screenshots/google-drive-onboarding.png) |

Screenshots contain generated demo data only.

## Features

- Native file and folder drag-and-drop.
- Local vault with SHA-256 duplicate detection, categories, search, filters, open, reveal, rescan, and deletion.
- One-click Google Drive OAuth using the least-privilege `drive.file` scope.
- Multiple independent Drive accounts with account-scoped quota and upload state.
- Resumable Drive uploads with retries and remote checksum metadata.
- Telegram public Bot API uploads as one intact document below `49,000,000` bytes.
- Windows Credential Manager storage for provider credentials.
- Responsive light and dark desktop interface.

## Use

1. Install the latest EXE or MSI from [GitHub Releases](https://github.com/TrisMinh/StoragePK/releases/latest).
2. Drop files or folders into StoragePK.
3. Open **Kết nối lưu trữ** to connect Google Drive or Telegram.
4. Upload manually or enable automatic sync for a selected provider.

The local vault remains the source of truth. Disconnecting a provider or deleting a local item does not silently delete its remote copy.

## Development

Requirements: Node.js 22+, npm, Rust stable, Visual Studio C++ Build Tools, Windows SDK, and WebView2.

```powershell
npm ci
npm run dev
npm run build
npm run tauri:dev --workspace=@storagepk/desktop
```

Run the complete checks with:

```powershell
npm run release
npm run tauri:test --workspace=@storagepk/desktop
```

Desktop packaging additionally needs publisher-owned Google Desktop OAuth values supplied through environment variables:

```powershell
$env:STORAGEPK_GOOGLE_CLIENT_ID = "your-client-id.apps.googleusercontent.com"
$env:STORAGEPK_GOOGLE_CLIENT_SECRET = "your-client-secret"
npm run release:desktop
```

Never commit or log OAuth values, provider tokens, or personal file metadata.

## Repository

- `apps/desktop`: supported Tauri Windows product.
- `apps/web`, `apps/api`, `apps/worker`: hosted-platform foundation.
- `packages`: shared contracts, database, and provider adapters.
- `docs`: concise architecture, provider, runtime, and release documentation.
- `.github/workflows`: CI and explicit tag-based Windows release automation.

## Documentation

- [Documentation index](docs/README.md)
- [Google Drive setup](docs/providers/google-drive-desktop-setup.md)
- [Telegram setup and limits](docs/providers/telegram.md)
- [Runtime status](docs/implementation/runtime-status.md)
- [Privacy](PRIVACY.md)
- [Security](SECURITY.md)

## Current Limits

- Windows installers are not code-signed and may trigger SmartScreen.
- Google OAuth broad public use depends on the publisher consent project being in production.
- Telegram Local Bot API process management is not implemented.
- The web/API/worker packages are a buildable foundation, not a hosted service operated by this repository.

StoragePK is released under the [MIT License](LICENSE).
