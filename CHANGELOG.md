# Changelog

All notable changes to StoragePK are documented here.

## Unreleased

## 0.3.0 - 2026-07-27

- Added one-click Google Drive connection for production Windows installers by packaging `STORAGEPK_GOOGLE_CLIENT_ID` and `STORAGEPK_GOOGLE_CLIENT_SECRET` at build time.
- Kept the native authorization flow on mandatory PKCE `S256` with an automatically selected `127.0.0.1` loopback callback and the fixed non-sensitive `drive.file` scope.
- Removed end-user Google Cloud setup from the production path: users no longer create a Cloud project or enter either OAuth value.
- Retained custom Desktop Client ID and Client Secret entry only as a developer fallback.
- Documented that an installed-app Client Secret embedded in a desktop binary is not absolutely confidential, while its actual value must still never be committed or logged.
- Documented that OAuth projects left in **Testing** issue refresh tokens that expire after seven days, and that broad distribution requires **In production** publishing plus applicable basic verification without implying that verification is already complete.

## 0.2.0 - 2026-07-27

- Restored the polished Modern SaaS dashboard from the approved UI preview with real local/provider data, responsive layouts, and light/dark modes.
- Added native Google Drive OAuth for Desktop with loopback redirect, PKCE, fixed `drive.file` scope, and multi-account connection management.
- Added per-account quota checks, transparent account selection, app-owned `StoragePK` folders, and resumable 8 MiB uploads.
- Added upload-session recovery and idempotency reconciliation while keeping resumable session URLs and refresh tokens in Windows Credential Manager.
- Added schema-versioned legacy-state migration, backup recovery, and write-through state replacement.
- Preserved all local vault and clean single-file Telegram behavior.

## 0.1.2 - 2026-07-27

- Restored clean single-document Telegram uploads.
- Preserved original file names and removed checksum captions from Telegram messages.
- Removed automatic chunking; oversized files now remain local with a clear Local Bot API requirement.
- Kept the hidden Windows GUI subsystem fix from 0.1.1.

## 0.1.1 - 2026-07-27

- Added resumable Telegram uploads using 19 MiB parts.
- Added up to three parallel part uploads with flood-limit and network retries.
- Removed the 50 MB logical file block while preserving Telegram's per-request limits.
- Hid the Windows console window in production desktop builds.

## 0.1.0 - 2026-07-27

- Added TypeScript monorepo foundations for web, API, worker, shared contracts, provider adapters, Prisma schema, and Tauri desktop.
- Added Google Drive resumable upload and Telegram public or local Bot API adapter boundaries.
- Added storage-pool routing simulation with quota, health, size, and rule traces.
- Added release, license, security, and local-stack scaffolding.
