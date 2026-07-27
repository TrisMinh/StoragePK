# StoragePK 0.3.0

StoragePK `0.3.0` is the first installable Windows pre-release of the local-first file workspace.

## Highlights

- Modern SaaS desktop dashboard with light and dark themes.
- Drag-and-drop local vault with classification, search, filters, rescan, open, Explorer reveal, and deletion.
- One-click Google Drive authorization in the system browser.
- Fixed least-privilege `drive.file` permission with PKCE `S256` and a loopback callback.
- Multiple Google Drive accounts with account-scoped quota and upload state.
- Drive resumable uploads using 8 MiB chunks, retry recovery, and duplicate reconciliation.
- Telegram public Bot API connection for intact files below the conservative 49,000,000-byte boundary.
- No silent file splitting; larger Telegram files remain available in the local vault and can be routed to Drive.

## Release Assets

- `StoragePK_0.3.0_x64-setup.exe` — standard Windows installer.
- `StoragePK_0.3.0_x64_en-US.msi` — MSI package for managed deployment.
- `SHA256SUMS.txt` — SHA-256 verification manifest.
- `storagepk-node-sbom.cdx.json` — CycloneDX Node dependency inventory.

## Important Pre-Release Notes

- The Windows binaries are currently unsigned, so Windows SmartScreen can display an unknown-publisher warning.
- Broad Google OAuth distribution requires the publisher's consent project to be **In production** and to complete the applicable verification for `drive.file`.
- Telegram Local Bot API supervision is documented but not implemented in `0.3.0`; the supported Telegram path is the public Bot API.
- StoragePK does not combine multiple Drive accounts into one quota or bypass provider policies.

See the full [product review](../docs/reviews/release-0.3.0.md), [desktop guide](../apps/desktop/README.md), [privacy policy](../PRIVACY.md), and [security policy](../SECURITY.md).
