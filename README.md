# StoragePK

[![CI](https://github.com/TrisMinh/StoragePK/actions/workflows/ci.yml/badge.svg)](https://github.com/TrisMinh/StoragePK/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/TrisMinh/StoragePK)](https://github.com/TrisMinh/StoragePK/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D4)](apps/desktop/README.md)

StoragePK is a local-first file workspace that classifies dropped files and can keep account-scoped copies in Google Drive and Telegram. The polished Windows desktop dashboard works standalone; the repository also contains the web/API/worker foundation for a future hosted multi-provider platform.

The repository now contains the implementation foundation for web, API, worker, shared provider contracts, Prisma metadata, and the Tauri desktop connector.

## Product Tour

![StoragePK overview dashboard](docs/assets/screenshots/dashboard-overview.png)

| Storage connections | One-click Google Drive |
| --- | --- |
| ![StoragePK storage connections](docs/assets/screenshots/storage-connections.png) | ![StoragePK Google Drive onboarding](docs/assets/screenshots/google-drive-onboarding.png) |

Screenshots use generated demo metadata and contain no real account identifiers, tokens, Chat IDs, or personal file paths.

## Start Here

- Read [docs/README.md](docs/README.md) for the product and architecture map.
- Read [docs/reviews/release-0.3.0.md](docs/reviews/release-0.3.0.md) for the verified product review, screenshots, security posture, and known release constraints.
- Read [PRIVACY.md](PRIVACY.md) for local metadata and provider-data handling.
- Read [docs/providers/implementation-handoff.md](docs/providers/implementation-handoff.md) for provider delivery rules.
- Read [docs/providers/google-drive-desktop-setup.md](docs/providers/google-drive-desktop-setup.md) before connecting Google Drive.
- Open [ui-preview/index.html](ui-preview/index.html) to compare the original static design with the implemented dashboard.
- Run `npm run dev` for the web and API development processes.
- Run `npm run build` for the production web, API, worker, and shared-package build.

## Local Stack

1. Copy `.env.example` to `.env` and set a random `SESSION_SECRET`.
2. Start PostgreSQL and Redis with `docker compose up -d postgres redis`.
3. Apply the Prisma schema with `npm run db:push`.
4. Start the app with `npm run dev`.

The API uses a clearly marked in-memory fallback for local UI development when `DATABASE_URL` is absent. Production startup refuses to run without a database URL.

## Desktop

The installable Tauri app is in `apps/desktop`. It works without the API or database: drop files into the app, search the classified local vault, connect multiple Google Drive accounts through native OAuth, and optionally connect a Telegram bot.

Starting with `0.3.0`, production installers package `STORAGEPK_GOOGLE_CLIENT_ID` and `STORAGEPK_GOOGLE_CLIENT_SECRET` for the publisher-owned Google OAuth client whose application type is **Desktop app**. End users select **Kết nối Google Drive**, approve the fixed `drive.file` permission in their browser, and return through an automatic `127.0.0.1` loopback callback protected by PKCE `S256`. They do not need to create a Google Cloud project or enter either OAuth value.

Desktop packaging requires Rust, Cargo, Visual Studio C++ Build Tools, and the Windows SDK:

```powershell
npm run tauri:dev --workspace=@storagepk/desktop
$env:STORAGEPK_GOOGLE_CLIENT_ID = "your-desktop-client-id.apps.googleusercontent.com"
$env:STORAGEPK_GOOGLE_CLIENT_SECRET = "your-desktop-client-secret"
npm run release:desktop
```

`STORAGEPK_GOOGLE_CLIENT_ID` is a public identifier. A Desktop installed-app Client Secret is embedded in the binary and therefore cannot be treated as an absolute confidential secret, but its actual value must still never be committed or logged. Supply both values through the release build environment. Entering a custom Desktop Client ID and Client Secret is retained only as a developer fallback; see [docs/providers/google-drive-desktop-setup.md](docs/providers/google-drive-desktop-setup.md).

See [apps/desktop/README.md](apps/desktop/README.md) for setup, data locations, provider limits, and release artifacts.

## Release

Run `npm run release` to execute lint/type checks, tests, production builds, and release preflight checks. Review [docs/deployment/release-gates.md](docs/deployment/release-gates.md) before publishing provider features.

On Windows, run `npm run release:desktop` after the root release to build and verify release candidates under `apps/desktop/src-tauri/target/release/bundle`. The explicit GitHub release workflow builds from an immutable tag and publishes the NSIS installer, MSI package, CycloneDX Node dependency SBOM, and SHA-256 checksum manifest.

The `0.3.0` installers are distributed as a pre-release while Windows code signing and Google OAuth production publication remain external launch gates. The publisher must move the consent project from **Testing** to **In production** and complete the applicable basic verification for the non-sensitive `drive.file` scope before broad distribution. These are release gates, not claims that verification has already completed.

## One-Click Git Push

Run `push-all.cmd` from this folder when you are ready to validate, build, commit, push, tag the package version, and explicitly trigger the unsigned pre-release workflow. It never overwrites an existing version tag or release; bump the package version before publishing a different commit.

## License

StoragePK is released under the MIT License. See [LICENSE](LICENSE).
