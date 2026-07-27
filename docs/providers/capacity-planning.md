# Providers - Capacity Planning

## Purpose

Define honest capacity reporting for Local Vault, separate Google Drive accounts, and Telegram destinations.

## Capacity Model

### Local Vault

Local capacity is the free space of the disk containing `Documents\StoragePK Vault`. The current desktop release reports StoragePK-managed bytes, not total disk capacity.

### Google Drive

Each connected account has independent values:

```text
accountFreeBytes =
  max(0, providerReportedQuotaBytes - providerReportedUsageBytes)
```

Google storage can be shared with Gmail and Google Photos. StoragePK therefore uses provider-reported values and never assumes every account has 5 GB, 15 GB, or another fixed amount.

The UI must not sum separate account quotas and present the result as one Google storage plan. It shows:

- account email/display name;
- provider-reported used and total quota when available;
- last quota refresh;
- actual account used by each StoragePK file.

Automatic placement may choose one independently authorized account with enough known free quota. This is destination selection, not a mechanism to circumvent a provider limit.

### Telegram

Telegram does not expose a Drive-like total quota suitable for a storage-capacity promise. Show mode and per-file constraints instead:

| Mode | StoragePK Rule |
| --- | --- |
| Public Bot API | One original document below the conservative 49,000,000-byte boundary. |
| Local Bot API | Future connector; official local mode supports uploads up to 2000 MB per file. |

Never label Telegram as unlimited storage.

## Dashboard Metrics

The desktop overview uses:

- StoragePK-managed local bytes;
- local file count;
- number of files copied to Drive;
- number of files copied to Telegram;
- percentage of local items that have at least one remote copy;
- number of independently connected Drive destinations.

The dashboard does not use fake preview numbers or an aggregate Drive quota ring.

## Staleness and Errors

- Quota is refreshed after account connection and on explicit refresh.
- Unknown quota is labeled as unknown rather than zero or unlimited.
- Routing treats unknown-quota accounts as fallback candidates.
- Provider quota is rechecked before starting an upload.
- A full account remains visible and is skipped for files that do not fit.

## References

- Google Drive API limits: <https://developers.google.com/workspace/drive/api/guides/limits>
- Google Drive `about` resource: <https://developers.google.com/workspace/drive/api/reference/rest/v3/about>
- Telegram Bot API: <https://core.telegram.org/bots/api>
