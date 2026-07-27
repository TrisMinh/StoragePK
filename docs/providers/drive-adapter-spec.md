# Providers - Google Drive Adapter Spec

## Purpose

Define exact Google Drive adapter behavior for OAuth identity, quota, resumable upload, verification, download, deletion, folder mirroring, and error mapping.

## Scope

This document covers request inputs, adapter outputs, provider metadata, app properties, timeout recovery, and MVP limitations.

## Responsibilities

- Make Drive implementation deterministic.
- Keep Drive-specific behavior behind the provider contract.
- Avoid broad scopes unless explicitly approved.

## Assumptions

- MVP uses `drive.file` where possible.
- StoragePK stores Drive file IDs as provider object IDs.
- Large files use resumable uploads.
- Folder mirroring is optional and not canonical taxonomy.

## Dependencies

- [google-drive.md](google-drive.md)
- [linking-flows.md](linking-flows.md)
- [idempotency-and-reconciliation.md](idempotency-and-reconciliation.md)
- [provider-error-catalog.md](provider-error-catalog.md)

## Detailed Explanation

### Identity Probe

Adapter method:

```text
getDriveIdentity(credentials) -> DriveIdentity
```

Output:

```json
{
  "googleSubject": "sub-or-stable-account-id",
  "email": "drive-main@example.com",
  "displayName": "Demo User",
  "grantedScopes": ["https://www.googleapis.com/auth/drive.file"]
}
```

Rules:

- Identity mismatch on reconnect blocks credential replacement.
- Email is display metadata; stable subject/account ID is identity authority.

### Quota Probe

Adapter method:

```text
getQuotaStatus(providerAccountId) -> QuotaStatus
```

Output:

```json
{
  "totalBytes": 16106127360,
  "usedBytes": 4294967296,
  "usableBytes": 11744051200,
  "source": "drive_about_storageQuota",
  "checkedAt": "2026-07-27T10:00:00Z"
}
```

### Resumable Upload

Input:

```json
{
  "fileVersionId": "uuid",
  "providerAccountId": "uuid",
  "filename": "invoice.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 340000,
  "stagedFileRef": "staging-ref",
  "idempotencyKey": "workspace:...",
  "appProperties": {
    "storagepkResourceId": "uuid",
    "storagepkFileVersionId": "uuid",
    "storagepkWorkspaceId": "uuid"
  }
}
```

Output:

```json
{
  "provider": "drive",
  "providerObjectId": "drive-file-id",
  "name": "invoice.pdf",
  "sizeBytes": 340000,
  "mimeType": "application/pdf",
  "checksum": "provider-checksum-if-available",
  "webViewLink": "provider-link-if-allowed"
}
```

Rules:

- Persist resumable session URI in upload attempt record if provider allows safe storage.
- Use chunk size compatible with Drive guidance and memory limits.
- On interruption, query session status or verify object before retry.
- Store StoragePK IDs in app metadata when scope and API support allow.

### Folder Mirroring

Folder mirroring is optional:

- StoragePK folder path remains canonical.
- Drive folder IDs can be stored as provider mirror metadata.
- If Drive folder is moved/renamed externally, StoragePK taxonomy does not change automatically.

### Error Mapping

| Drive Condition | StoragePK Error |
| --- | --- |
| Missing scope | `DRIVE_SCOPE_MISSING` |
| Token refresh failed | `DRIVE_TOKEN_EXPIRED` |
| Quota exceeded | `PROVIDER_QUOTA_EXCEEDED` |
| Rate limit | `PROVIDER_RATE_LIMITED` |
| Resumable session expired | `DRIVE_RESUMABLE_SESSION_EXPIRED` |
| File not found during verify | `PROVIDER_OBJECT_MISSING` |

## Edge Cases

- Account email changes but identity subject stays same; reconnect allowed with updated email.
- User manually deletes Drive file; storage object becomes `drift_detected`.
- Drive API reports quota unavailable; route with conservative policy or mark `quota_unknown`.
- App property search may not work under all scopes; never rely on it as only reconciliation method.
- Large file upload can outlive access token; refresh token must be usable mid-job.

## Future Considerations

- Add shared drive support.
- Add Google Picker import.
- Add Drive change notifications.
- Add optional Drive labels mirror.
