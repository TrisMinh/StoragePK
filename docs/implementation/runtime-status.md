# Runtime Status

## Implemented in `0.3.0`

- Standalone Windows desktop application.
- File/folder drag-and-drop and native picker.
- Local categorization, SHA-256 duplicate detection, search, filters, open, reveal, rescan, and deletion.
- Light and dark dashboard.
- One-click Google Drive Desktop OAuth with PKCE, loopback callback, and `drive.file`.
- Multiple independent Drive accounts, quota-aware routing, resumable uploads, retries, and reconciliation.
- Telegram public Bot API connection and one-document uploads below `49,000,000` bytes.
- Manual and sequential automatic provider sync.
- Credential storage through Windows Credential Manager.
- Buildable web, API, worker, database, contract, and provider packages.

## Not Implemented

- Telegram Local Bot API process supervision.
- A hosted StoragePK production service.
- Automatic deletion of remote copies when a local item is deleted.
- Full browsing of pre-existing Google Drive content.
- Windows code signing and automatic desktop updates.

## External Requirements

- Google OAuth public availability depends on the publisher consent project status.
- Provider quotas, rate limits, availability, and account policies remain external.
- Unsigned installers can trigger Windows SmartScreen.
