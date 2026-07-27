# Implementation - Runtime Status

## Desktop Product

### Implemented and Build-Validated

- Standalone Tauri Windows application; no local server, database, Redis, Docker, or StoragePK login is required.
- Polished Modern SaaS dashboard based on the approved preview, backed only by real local/provider state.
- Native picker and operating-system drag/drop for files and directories.
- Local vault under `Documents\StoragePK Vault` with category folders.
- SHA-256 duplicate detection, collision-safe names, search, filters, open, Explorer reveal, rescan, and local deletion.
- Schema-versioned metadata migration, backup recovery, and Windows write-through replacement.
- Real Telegram public Bot API validation and clean one-document uploads under the conservative 49,000,000-byte boundary.
- Native one-click Google Drive Desktop OAuth for `0.3.0` with a packaged Client ID and Client Secret, automatic loopback callback, mandatory PKCE `S256`, fixed `drive.file`, and Credential Manager refresh tokens.
- Multiple independently authorized Drive accounts with visible identities and quotas.
- App-created Drive root folders, account-aware routing, resumable 8 MiB chunks, retries, session recovery, and duplicate reconciliation.
- Manual and sequential automatic sync for Drive and Telegram.
- Responsive light/dark UI with loading, empty, error, busy, confirmation, and drag states.
- Rust tests, Clippy, TypeScript checks, production frontend build, Windows installers, and npm audit in the release workflow.

### Validation Boundary

Automated code/build tests do not sign into a real Google account and do not prove Google consent-screen publication or verification. A production build requires the release owner to supply `STORAGEPK_GOOGLE_CLIENT_ID` and `STORAGEPK_GOOGLE_CLIENT_SECRET`; the resulting installer packages both values, and the end user only approves access in the browser. The installed-app secret is not absolutely confidential because it is embedded in the binary, but its actual value must not be committed or logged. Manual OAuth client entry is a developer fallback. Follow [../providers/google-drive-desktop-setup.md](../providers/google-drive-desktop-setup.md).

### Explicit Limits

- Telegram public Bot API: StoragePK keeps files intact and accepts only files below 49,000,000 bytes. Larger files remain local.
- Telegram Local Bot API supervision is not included in `0.3.0`; it requires user-owned Telegram `api_id` and `api_hash`.
- Google accounts keep separate quotas and identities. Multi-account routing is not unlimited storage or a quota-bypass feature.
- `drive.file` intentionally does not provide a full Drive browser.
- A Google OAuth project in **Testing** produces refresh tokens that expire after seven days. Broad distribution requires **In production** publication and applicable basic verification for the non-sensitive `drive.file` scope; current build validation does not assert that this gate is complete.
- Windows artifacts are unsigned and can trigger SmartScreen warnings.
- Local deletion does not delete already-uploaded Drive or Telegram copies.

## Hosted Platform Foundation

The repository also contains a Next.js web app, NestJS API, BullMQ worker, Prisma schema, shared provider contracts, provider adapters, and explainable routing foundations. They build as part of the root release but are not required by the desktop product.

Production hosting still requires PostgreSQL, Redis, TLS, deployment secrets, monitoring, provider staging accounts, signed installers, and updater metadata.

## Verification

```powershell
npm run typecheck --workspace=@storagepk/desktop
npm run tauri:test --workspace=@storagepk/desktop
npm run release:desktop
npm run release
```

Windows artifacts are generated under `apps/desktop/src-tauri/target/release/bundle`.
