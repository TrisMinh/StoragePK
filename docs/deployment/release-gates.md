# Release Gates

A public version is created only from an immutable tag matching `package.json`.

## Required Checks

- Exact dependency installation with `npm ci`.
- Production dependency audit and repository secret/PII scan.
- Type checks, workspace tests, production builds, Rust tests, and Clippy with warnings denied.
- Desktop OAuth configuration validation.
- Exactly one NSIS EXE and one MSI package.
- SHA-256 manifest and CycloneDX Node dependency SBOM.
- Release assets must not overwrite an existing version.

## Provider Checks

- Google scope remains fixed to `drive.file`.
- OAuth credentials are supplied only through release secrets.
- Telegram public uploads remain below the configured intact-file boundary.
- Provider errors and persisted metadata contain no credentials or private upload URLs.

## Unsigned Windows Builds

The workflow detects Authenticode status. Publishing an unsigned build requires an explicit manual workflow input and the release notes must disclose the SmartScreen risk. Code signing remains recommended for broad distribution.

## Commands

```powershell
npm ci
npm audit --audit-level=high
npm run release
npm run release:desktop
```
