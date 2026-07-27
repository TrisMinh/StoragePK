# Providers - Routing Algorithm

## Purpose

Define the exact algorithm StoragePK uses to choose where a file should be stored when many Drive accounts and Telegram destinations are connected.

## Scope

This document covers route input, provider scoring, pool modes, quota thresholds, failover, replication, deterministic audit, idempotency, and pseudocode.

## Responsibilities

- Make storage routing predictable and implementation-ready.
- Avoid upload-time surprises caused by provider quota, limits, or permissions.
- Ensure every decision can be explained to the user and audited.

## Assumptions

- The route decision runs once during upload review and again inside the worker before provider upload.
- Provider capability snapshots are cached but revalidated for risky cases.
- File splitting across providers is not allowed in MVP.
- Replication is allowed only when explicitly configured by pool policy.

## Dependencies

- [storage-pools.md](storage-pools.md)
- [capacity-planning.md](capacity-planning.md)
- [linking-flows.md](linking-flows.md)
- [provider-contract.md](provider-contract.md)
- [risk-register.md](risk-register.md)
- [../database/schema.md](../database/schema.md)

## Detailed Explanation

### Route Inputs

| Input | Source | Purpose |
| --- | --- | --- |
| Workspace ID | Auth context | Tenant boundary. |
| Actor ID | Auth context | Permission and audit. |
| File size | Client and server validation | Provider limit and quota check. |
| MIME type | Server sniffing | Rule and provider compatibility. |
| Checksum | Intake worker | Deduplication and idempotency. |
| Folder/tags/category | User or classifier | Rule-based routing. |
| Pool ID | User selection or default | Candidate account set. |
| Provider health | Provider service | Skip disconnected accounts. |
| Quota snapshot | Provider service | Avoid full accounts. |
| Execution location | Client/API/desktop worker | Decide whether a local Telegram server can be used. |
| User override | Upload review UI | Highest priority if valid. |

### Candidate Filter

A provider account is eligible only if all conditions pass:

| Condition | Required |
| --- | --- |
| Account is not revoked. | Yes |
| Health state is `healthy` or policy allows `degraded`. | Yes |
| Required scopes/capabilities exist. | Yes |
| Required execution location is available. | Yes for desktop-managed local Telegram. |
| File size is within configured provider mode limit. | Yes |
| Quota remaining is above file size plus safety buffer. | Yes when quota available |
| Pool rules allow this MIME/category/folder/tag. | Yes |
| Actor has permission to use the pool. | Yes |

### Scoring

Each eligible account receives a score. Higher score wins.

| Factor | Example Weight | Meaning |
| --- | --- | --- |
| User override | +10000 | Explicit user choice wins if valid. |
| Rule match | +500 | Folder/type/tag/category route. |
| Priority | +300 to +1 | Lower priority number gets higher score. |
| Remaining quota ratio | +0 to +200 | Prefer accounts with more space in balanced mode. |
| Provider health | +100 healthy, -500 degraded | Prefer healthy providers. |
| Recent error penalty | -0 to -300 | Avoid accounts with recent failures. |
| Telegram risk penalty | -200 default | Avoid Telegram unless rule/archive/manual says yes. |
| Same-resource affinity | +100 | Keep new versions near previous version when valid. |

### Pool Mode Behavior

| Mode | Algorithm |
| --- | --- |
| `fill_first` | Sort by priority; choose first eligible account below quota threshold. |
| `balanced` | Score by remaining quota and health; choose highest score. |
| `rule_based` | Apply explicit rules first, then fallback mode. |
| `failover` | Choose primary; if upload fails retryable, route to next eligible account. |
| `replicated` | Choose primary plus replica accounts; commit primary even if replica is repair-pending. |
| `archive` | Prefer archive-role accounts for matching cold/archive rules. |

### Pseudocode

```text
routeFile(file, pool, actor):
  assert actor can resource:create in workspace
  accounts = loadPoolAccounts(pool)
  capabilities = loadCapabilitySnapshots(accounts)
  candidates = []

  for account in accounts:
    if account.revoked: continue
    if not capabilityAllows(account, file): continue
    if not poolRulesAllow(account, file): continue
    if not quotaAllows(account, file): continue
    if not healthAllows(account): continue
    candidates.add(score(account, file, pool.mode))

  if candidates is empty:
    return route_failure("POOL_NO_HEALTHY_COMPATIBLE_ACCOUNT")

  if pool.mode == "replicated":
    primary = choosePrimary(candidates)
    replicas = chooseReplicas(candidates - primary, pool.replicaPolicy)
    return route(primary, replicas)

  return route(maxScore(candidates))
```

### Worker Revalidation

Before upload, the worker must:

1. Load the route decision.
2. Recheck provider account health, token, scope, quota, and file limit.
3. If still valid, upload with idempotency key.
4. If invalid and pool allows fallback, compute fallback route and audit the change.
5. If invalid and fallback is not allowed, mark item `repair_pending`.

### Idempotency

Route decision identity:

```text
workspaceId + uploadSessionItemId + fileVersionId + routeAttemptNumber
```

Provider upload idempotency:

- Check existing `storage_objects` for the same `file_version_id` and provider account before upload.
- Use provider metadata where possible to store StoragePK resource/version IDs.
- On timeout, verify provider object existence before retry.

## Edge Cases

- Two accounts tie in score; choose lower priority, then older account, then stable UUID order.
- Quota is unavailable for a provider; use conservative policy and mark route reason as `quota_unknown`.
- User override selects Telegram but file exceeds Telegram mode limit; block with explanation, do not fallback silently.
- Route selects desktop-managed local Telegram but desktop worker is offline; hold job or reroute according to pool policy.
- `fill_first` account reaches threshold during concurrent uploads; worker revalidates and can route to next account.
- Replication primary succeeds and replica fails; file is active but shows backup degraded.
- All authorized Drive destinations are full; return `POOL_QUOTA_EXHAUSTED` and ask the user to free space or select another provider plan.

## Future Considerations

- Add predictive quota reservation during upload review.
- Add rebalancing worker to move files from nearly full accounts.
- Add cost-aware routing when paid storage providers are added.
- Add user-readable route explanation generated from decision trace.
