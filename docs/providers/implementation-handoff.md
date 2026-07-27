# Providers - Implementation Handoff

## Purpose

Define the exact build checklist for the agent or engineer implementing StoragePK provider integrations.

## Scope

This document covers deliverables, required modules, database dependencies, API dependencies, UI dependencies, background jobs, validation, and done criteria.

## Responsibilities

- Turn provider documentation into implementation tasks.
- Define completion criteria before code begins.
- Prevent incomplete "happy path only" provider integration.

## Assumptions

- Future code uses the documented TypeScript-first monorepo.
- Provider integrations are implemented after auth, database, and queue foundations exist.
- Drive and Telegram are implemented behind the same provider contract.

## Dependencies

- [README.md](README.md)
- [provider-contract.md](provider-contract.md)
- [routing-algorithm.md](routing-algorithm.md)
- [provider-state-machines.md](provider-state-machines.md)
- [provider-error-catalog.md](provider-error-catalog.md)
- [../api/providers.md](../api/providers.md)

## Detailed Explanation

### Required Build Sequence

| Phase | Deliverable | Exit Criteria |
| --- | --- | --- |
| 1 | Database migrations | Provider accounts, storage pools, route decisions, capability snapshots exist. |
| 2 | Credential vault | Provider secrets encrypted, rotated, redacted, never returned. |
| 3 | Provider contract | Shared adapter interface and typed error model. |
| 4 | Google Drive adapter | OAuth link, health, quota, upload, verify, download, revoke. |
| 5 | Telegram public adapter | Bot token link, destination verify, upload, message metadata, limits. |
| 6 | Telegram local adapter | Local base URL mode, desktop/server execution, large-file validation. |
| 7 | Storage pool service | Multi-account pool CRUD, capacity summary, health summary. |
| 8 | Routing service | Simulation and final route decision with trace. |
| 9 | Desktop connector | Desktop capability registration and pull-based job execution. |
| 10 | Worker execution | Idempotent provider upload, fallback, replication, repair states. |
| 11 | UI integration | Provider settings, pool builder, local server status, route explanation. |
| 12 | Tests and runbooks | Provider matrix passes and operational docs match implementation. |

### Done Criteria

Implementation is not done until:

- A user can connect at least two Drive accounts and see separate quotas.
- A user can connect Telegram public Bot API destination and see 50 MB document-mode warning.
- Desktop can register local Telegram capability and process a desktop-local provider job.
- Storage pool route simulation explains selected and skipped accounts.
- Worker revalidates route before upload.
- Every provider failure maps to documented error catalog.
- Revoking a provider pauses or reroutes affected pool jobs.
- Search/file detail shows actual provider account used.
- Tests cover Drive token expiry, Telegram channel removal, route fallback, and desktop offline.

### Non-Goals For MVP

| Non-Goal | Reason |
| --- | --- |
| Silent file chunking across Telegram messages | Restore complexity and user surprise. |
| Full Google Drive account indexing with broad `drive` scope | Restricted scope and verification risk. |
| MTProto user-account storage | Higher security and policy complexity. |
| Claiming Telegram as unlimited storage | No reliable Drive-like quota model. |

## Edge Cases

- Desktop local server may be available for one user device but not another.
- A pool can be healthy for Drive uploads but unhealthy for Telegram archive rules.
- Route simulation can become stale before worker execution; worker decision is authoritative.
- Provider objects can be created but DB commit can fail; reconciliation must find orphan candidates.

## Future Considerations

- Add provider migration after MVP.
- Add rebalancing across Drive accounts.
- Add local encrypted provider.

