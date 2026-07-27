# Providers - Drive and Telegram Risk Register

## Purpose

Document core risks, failure modes, and concrete mitigations for using Google Drive and Telegram as StoragePK storage providers.

## Scope

This document covers product, technical, policy, security, reliability, quota, privacy, and recovery risks.

## Responsibilities

- Make provider problems explicit before implementation.
- Define mitigations that engineering must build.
- Prevent "build later and discover it cannot work" failure.

## Assumptions

- Google Drive and Telegram are external systems and can change behavior.
- StoragePK can reduce but not eliminate provider risk.
- Users must understand provider trade-offs.

## Dependencies

- [policy-and-feasibility.md](policy-and-feasibility.md)
- [capacity-planning.md](capacity-planning.md)
- [routing-algorithm.md](routing-algorithm.md)
- [storage-pools.md](storage-pools.md)
- [../security/threats.md](../security/threats.md)
- [../deployment/monitoring.md](../deployment/monitoring.md)

## Detailed Explanation

| Risk | Provider | Severity | Failure Mode | Concrete Mitigation |
| --- | --- | --- | --- | --- |
| Restricted OAuth scope blocks launch | Drive | High | App requests broad `drive` scope and fails verification. | MVP uses `drive.file`; broad import is future with verification plan. |
| Testing-mode token expiry reaches users | Drive | High | Publisher distributes while consent project is in **Testing**, so refresh tokens expire after seven days. | Require **In production** status and applicable basic verification for non-sensitive `drive.file` before broad release. |
| Desktop Client Secret leaks beyond binary packaging | Drive | High | The installed-app secret must be embedded for token exchange/refresh and is additionally committed, logged, or copied into release metadata. | Inject it only through protected build configuration, scan tracked files/logs, acknowledge binary recoverability, and keep PKCE mandatory. |
| Token expires or is revoked | Drive | High | Upload jobs fail. | Refresh-token rotation, provider health, reconnect flow, paused jobs. |
| Wrong account reconnect | Drive | High | Files go to unintended Drive. | Store Google subject/email and block identity mismatch. |
| Quota exhausted | Drive | Medium | Upload fails mid-flow. | Quota cache, worker revalidation, pool fallback, repair state. |
| API quota/rate limit | Drive | Medium | Provider calls return 429/403-like quota errors. | Exponential backoff, queue throttling, per-account concurrency limits. |
| Manual Drive deletion | Drive | Medium | StoragePK points to missing object. | Reconciliation, drift state, repair center. |
| Public Bot API file limit | Telegram | High | Files above 50 MB cannot upload as documents. | Validate before queue, route to Drive, or require local Bot API mode. |
| Public Bot API download limit | Telegram | High | `getFile` cannot retrieve files above public limit. | Store retrieval mode; local Bot API for large files; warn archive limitations. |
| Local Bot API server exposed publicly | Telegram | High | Bot tokens and file operations can be abused. | Private network, firewall, secret redaction, health monitoring. |
| Telegram channel privacy mismatch | Telegram | High | Channel admins/members see files outside StoragePK. | Private destinations, warning, policy labels, do not market as private vault by default. |
| StoragePK revocation does not revoke Telegram access | Telegram | High | User loses app permission but remains in Telegram channel. | Show separate Telegram membership warning and provide destination audit checklist. |
| Bot removed from channel | Telegram | Medium | Uploads fail. | Health checks and repair/reconnect instructions. |
| Message deleted in Telegram | Telegram | Medium | Stored object unavailable. | Drift detection and repair state. |
| Silent file chunking loses restore path | Telegram | High | User cannot reconstruct file reliably. | No silent chunking in MVP. |
| Pool route not explainable | All | Medium | User cannot trust where files went. | Store route decision trace and show provider account in UI. |
| Replication partial failure | All | Medium | User thinks backup exists but it failed. | Primary vs replica sync states, repair queue. |
| Provider policy changes | All | High | Current behavior becomes non-compliant. | Configurable limits, provider policy review cadence, feature flags. |

### Required Engineering Controls

- Provider account identity snapshot.
- Provider capability snapshot.
- Storage pool route decision table.
- Worker route revalidation.
- Provider-aware rate limiter.
- Repair center.
- Audit events for every provider decision.
- User-visible provider location.
- Configurable Telegram limits.
- OAuth scope registry and launch checklist.

### Required UX Controls

- Show exact Drive account or Telegram destination before upload.
- Warn when Telegram is selected for privacy-sensitive files.
- Warn when file exceeds Telegram public mode limit.
- Show why a provider was skipped.
- Show fallback route when primary provider fails.
- Show "backup degraded" when replica fails.

## Edge Cases

- User intentionally wants Telegram despite privacy warning; require explicit confirmation and store acknowledgement.
- Drive quota check reports enough space but upload fails due to concurrent external usage; worker fallback handles it.
- Google account email changes but subject ID stays same; identity match uses provider subject, email is display.
- Telegram `file_id` can vary; StoragePK stores message/chat reference plus file metadata.
- Provider health can be stale; never skip worker revalidation.

## Future Considerations

- Add automated provider canary tests.
- Add user-facing provider risk score.
- Add storage-pool simulator before applying rules.
- Add provider policy diff tracking.
