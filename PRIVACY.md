# StoragePK Privacy Policy

Effective date: July 27, 2026

StoragePK is a local-first file workspace. This policy describes what the open-source application processes, where data is stored, and what happens when a user connects an external storage provider.

## Data Storage

The Windows desktop application stores the local vault selected by the user and an application metadata index on that Windows device. New installations place the default vault under the application's Local AppData directory instead of Documents to reduce accidental OneDrive Known Folder backup.

StoragePK does not operate a hosted production service as part of the `0.3.0` release. The web, API, database, and worker packages in this repository are a self-hosted platform foundation. Operators of a hosted deployment are responsible for publishing their own policy and complying with applicable law.

## Provider Data

### Google Drive

When a user connects Google Drive, StoragePK requests `https://www.googleapis.com/auth/drive.file`. This permission allows StoragePK to create and manage files created by StoragePK; it does not grant access to every existing file in the user's Drive.

Google OAuth refresh tokens, optional developer OAuth values, and resumable upload session URLs are stored in Windows Credential Manager. The local metadata index stores account display information, quota snapshots, StoragePK-created Drive object IDs, checksums, and sync state.

### Telegram

When a user connects Telegram, StoragePK sends selected files and captions to the bot destination identified by the supplied Chat ID. The bot token is stored in Windows Credential Manager. The metadata index stores the bot username, Chat ID, Telegram file/message identifiers, checksums, and sync state.

The `0.3.0` application uses Telegram's public Bot API and keeps each supported upload as one document. It does not silently split a file into multiple messages.

## Processing and Sharing

StoragePK processes file bytes only to import, classify, checksum, display, and upload files through destinations explicitly configured by the user. Provider uploads share selected bytes with Google or Telegram under those providers' terms and privacy policies.

The desktop application does not include advertising SDKs, behavioral analytics, or sale of personal data. It does not send application telemetry to the StoragePK repository owner.

## Retention and Deletion

- Deleting a local StoragePK item removes the local vault copy and its local metadata entry.
- Disconnecting a provider removes its credential from Windows Credential Manager before removing the account from application state.
- Disconnecting an account does not delete files already stored in Google Drive or Telegram.
- Users delete remote files through the applicable provider or through a future StoragePK remote-delete feature where supported.

## Security

Provider secrets are kept out of the React UI and are not intentionally written to logs or the metadata JSON. Persisted provider errors are reduced to safe error codes/messages. Release workflows scan source files for common credential and personal-path patterns.

No software can guarantee absolute security. Report suspected vulnerabilities privately through [GitHub Security Advisories](https://github.com/TrisMinh/StoragePK/security/advisories/new); do not publish active secrets in a public issue.

## User Control

Users choose which local files to import, which provider accounts to connect, whether automatic sync is enabled, and where the local vault is located. Provider permissions can be revoked from the relevant Google or Telegram account controls.

## Changes

Material changes to this policy will be recorded in Git history and release notes. The effective date will be updated when this policy changes.

## Contact

Use the repository's [security policy](SECURITY.md) for security matters and [GitHub Issues](https://github.com/TrisMinh/StoragePK/issues) for non-sensitive privacy questions.
