# StoragePK 0.3.0 Product Review

## Review Decision

StoragePK `0.3.0` is ready for a transparent Windows pre-release. The desktop application is usable as a local-first file vault and supports one-click, multi-account Google Drive backup plus Telegram public Bot API backup for whole files below the documented provider boundary.

Broad production distribution remains blocked by two external release gates:

1. The publisher-owned Google OAuth consent project must be moved from **Testing** to **In production** and complete the applicable Google verification for `drive.file`.
2. The Windows installer and application executable must be signed with a trusted code-signing certificate to avoid an unsigned-publisher warning.

Neither constraint causes local data loss, but both materially affect trust and long-term provider authorization for public users. The GitHub release is therefore marked as a pre-release.

## Product Experience

### Dashboard

![StoragePK dashboard overview](../assets/screenshots/dashboard-overview.png)

The dashboard restores the approved Modern SaaS, Soft Minimalism, Fluent-inspired direction. It presents local capacity, provider health, recent activity, file categories, and storage pools without requiring the API or database stack.

### Provider Connections

![StoragePK storage connections](../assets/screenshots/storage-connections.png)

Provider cards expose the active mode and relevant limits rather than implying that Drive or Telegram capacity is unlimited. Multiple Drive accounts remain separate destinations with account-scoped file identifiers and upload state.

### One-Click Google Drive

![StoragePK Google Drive onboarding](../assets/screenshots/google-drive-onboarding.png)

The packaged application presents one primary action: **Đăng nhập với Google Drive**. It opens the system browser, requests only `drive.file`, receives the authorization through a PKCE-protected loopback callback, and stores credentials outside the React layer.

All screenshots use generated demo metadata. They contain no real account identifiers, tokens, Chat IDs, OAuth values, or personal file paths.

## Functional Scope

| Capability | 0.3.0 status | Review |
| --- | --- | --- |
| Local file import | Implemented | Drag/drop and file selection copy files into the selected local vault. |
| Classification | Implemented | Common document, image, video, audio, archive, and other file types are categorized. |
| Search and filters | Implemented | Search, category filtering, rescan, Explorer reveal, open, and local deletion are available. |
| Light/dark mode | Implemented | Theme switching is exposed in the desktop UI. |
| Google OAuth | Implemented | One-click browser flow, PKCE `S256`, loopback callback, fixed `drive.file` scope. |
| Multiple Drive accounts | Implemented | Accounts, quota snapshots, file IDs, and upload states remain account-scoped. |
| Drive large-file upload | Implemented | Resumable sessions use 8 MiB chunks, retries, offset probing, and reconciliation metadata. |
| Telegram public Bot API | Implemented | Sends each file as one document below the conservative 49,000,000-byte boundary. |
| Silent Telegram splitting | Not used | Larger files stay safe in the local vault instead of being split into surprising fragments. |
| Telegram Local Bot API | Not implemented | Architecture and hardening docs exist; desktop supervision is outside `0.3.0`. |
| Hosted web platform | Foundation only | Web/API/worker packages build, but the desktop app is the supported end-user product in this release. |

## Architecture Review

- **Local-first:** the Windows desktop app can import, classify, search, and manage local files without a hosted backend.
- **Provider isolation:** provider account identity and remote object IDs are recorded per destination instead of combining multiple accounts into one misleading quota.
- **Least privilege:** Google access is fixed to `https://www.googleapis.com/auth/drive.file`; StoragePK does not request full Drive access.
- **Resumability:** Drive sessions are persisted outside the metadata JSON and reconciled before retrying ambiguous uploads.
- **No silent chunking:** one local file maps to one remote document/object in the supported Telegram mode.
- **Forward-compatible platform:** contracts, database, API, worker, and web workspaces define the hosted expansion path without making them mandatory for desktop use.

## Security and Privacy Review

- OAuth authorization codes, access tokens, refresh tokens, PKCE verifiers, provider secrets, and resumable session URLs never enter the React UI.
- Windows Credential Manager stores Google refresh tokens, optional developer OAuth values, Telegram bot tokens, and resumable session URLs.
- The repository and screenshots are scanned before publication for known account identifiers, local user paths, bot tokens, and Google OAuth values.
- The repository publishes an explicit [privacy policy](../../PRIVACY.md) for local metadata and provider processing.
- The OAuth callback binds to `127.0.0.1`, validates state, and uses PKCE `S256`.
- Provider logs and metadata are designed to avoid secret material.
- `.env` files, dependency directories, temporary state, generated builds, Tauri targets, and installers are excluded from Git.
- The release workflow receives OAuth build values only through encrypted GitHub Actions secrets.

## Provider Reality Check

### Google Drive

StoragePK can connect more than one Google account, but it does not merge accounts into a single Google quota or bypass provider rules. Routing and capacity remain explicit per account. With `drive.file`, the app can manage files it creates; it cannot browse every pre-existing Drive file.

### Telegram

The public Bot API path keeps each uploaded file intact and supports files below 50 MB. The application uses a conservative 49,000,000-byte boundary. Larger files remain local and can be routed to Drive.

Running Telegram's Local Bot API server could raise the documented upload ceiling to 2000 MB, but that mode requires API ID/API hash credentials, a managed local process, firewall and lifecycle controls, and additional restore testing. It is documented but deliberately not advertised as implemented in `0.3.0`.

## Release Verification

The release candidate must pass these gates from a clean dependency install:

```powershell
npm ci
npm audit --audit-level=high
npm run release
npm run release:desktop
```

`npm run release` performs shared-package preparation, linting, type checks, workspace tests, production builds, and artifact preflight. `npm run release:desktop` validates packaged OAuth configuration, runs Rust tests, builds NSIS/MSI packages, and checks their expected paths.

The final local candidate passed 12 Node behavior tests, Prisma schema validation, 15 Rust unit/integrity tests, Rust clippy with warnings denied, the full production build, secret/PII scanning, and an actual Windows GUI smoke launch. `npm audit --audit-level=high` reported zero vulnerabilities.

GitHub Actions repeats the application build on Linux and the desktop tests/build on Windows. An explicit, auditable workflow dispatch against an immutable tag publishes:

- Windows NSIS installer
- Windows MSI package
- `SHA256SUMS.txt`
- CycloneDX Node dependency SBOM

## Known Constraints

- Windows binaries are unsigned until a publisher certificate is configured.
- Google OAuth broad distribution is not represented as complete while the consent project remains in Testing or lacks required verification.
- Telegram Local Bot API supervision is not present in this version.
- The web/API/worker packages are production-buildable foundations, not a hosted StoragePK service operated by this repository.
- Provider availability, user quotas, account policy, and network speed remain external dependencies.

## Recommendation

Publish `v0.3.0` as a GitHub pre-release for controlled installation and real-device feedback. Promote a later signed release only after OAuth production publication, applicable Google verification, Windows code signing, and another clean release-gate run.
