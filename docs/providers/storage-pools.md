# Providers - Storage Destinations

## Purpose

Define policy-safe placement and redundancy across user-authorized provider accounts without presenting separate accounts as one provider quota.

## Core Rule

Every Google Drive account and Telegram destination is a separate storage destination:

- it has its own identity, permission grant, limits, health, and quota;
- every remote object records the exact destination;
- the UI shows per-destination state;
- StoragePK does not advertise aggregate accounts as unlimited storage;
- StoragePK does not shard or clone content to circumvent provider storage limits.

The term `StoragePool` remains an internal routing abstraction for the hosted-platform foundation. In the desktop `0.3.0` UI, the user sees **Storage pools** as a list of transparent destinations, not one Google-provided virtual disk.

## Supported Modes

| Mode | Behavior | Policy Boundary |
| --- | --- | --- |
| `manual` | User selects an exact destination. | Always show destination identity and limits. |
| `balanced` | Choose one healthy authorized account with enough known quota. | Placement convenience only; never claim quota evasion. |
| `rule_based` | Route by type, tag, size, or category. | Rules remain visible and auditable. |
| `failover` | Use a fallback after a primary technical failure. | Reconcile ambiguous prior uploads before fallback. |
| `replicated` | Create explicit backup copies. | Must be user-requested; not used to bypass a limit. |
| `archive` | Send eligible copies to Telegram. | Respect Telegram size/privacy/restore constraints. |

`fill_first` behavior that fills one account and automatically advances solely to bypass its storage limit is excluded from the desktop release.

## Routing Contract

Before upload:

1. Filter to connected, enabled destinations with the required scope/capability.
2. Check the file's provider size limit.
3. Check fresh provider quota when available.
4. Apply an explicit user override or the configured visible rule.
5. Persist the selected destination before creating a provider session.
6. Keep retry/resume pinned to that destination.

Fallback to another destination is permitted only after the first attempt is reconciled and the route change is recorded.

## Data Requirements

Every remote object stores:

- local item/version ID;
- provider;
- provider account/destination ID;
- provider object ID;
- checksum;
- sync state;
- timestamps and last error.

The current desktop Drive implementation stores the account ID, Drive file ID, Drive sync state, and last error separately from legacy Telegram metadata.

## UI Requirements

- Show connected Drive accounts as separate rows with email and quota.
- Show Telegram as a destination with a per-file limit, not a numeric capacity.
- Show the actual destination for each uploaded item.
- Explain automatic selection before it is enabled.
- Never display a sum of account quotas as if Google supplied one combined plan.
- Warn that disconnecting a destination does not delete remote objects.

## Failure Rules

- Quota exhausted: stop or choose a separately authorized destination only under the visible routing rule.
- Token revoked: mark that destination disconnected; do not silently switch during an interrupted upload.
- Ambiguous completion: query provider metadata before creating another object.
- Partial replication: keep the successful copy and show the failed copy as degraded.
- Destination removed: keep historical object metadata so files remain locatable.

## References

- [google-drive.md](google-drive.md)
- [routing-algorithm.md](routing-algorithm.md)
- [policy-and-feasibility.md](policy-and-feasibility.md)
- [idempotency-and-reconciliation.md](idempotency-and-reconciliation.md)
