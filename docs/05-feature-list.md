# 05 - Feature List

## Purpose

Define every major product capability and its implementation expectations.

## Scope

This document covers MVP, near-term, and future features.

## Responsibilities

- Centralize feature boundaries.
- Link each feature to business rules, APIs, and tests.
- Prevent accidental scope creep.

## Assumptions

- MVP prioritizes intake, classification, provider upload, search, and repair.
- Team collaboration is future scope.

## Dependencies

- [06-functional-requirements.md](06-functional-requirements.md)
- [roadmap/mvp.md](roadmap/mvp.md)
- [testing/e2e.md](testing/e2e.md)

## Detailed Explanation

| Feature | Description | User Flow | Business Rules | Validation | Errors | Security | Performance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Drag Intake | User drops files into web or desktop. | Drop files, review queue, confirm. | Every file gets checksum before provider upload. | Reject folders on web unless browser supports traversal. | `FILE_UNREADABLE`, `INTAKE_INTERRUPTED`. | Never trust client MIME. | 100 files per session MVP. |
| Classification | System suggests type, tags, folder, provider. | Analyze, show suggestions, allow edits. | AI suggestions are pending until accepted. | Confidence must be recorded. | `CLASSIFICATION_FAILED`. | Do not send secret files to AI without policy. | Classify in background under queue limits. |
| Provider Upload | Store bytes in Drive or Telegram. | Select routing, upload, confirm sync. | One canonical provider object per resource version. | Provider capacity and file size checked first. | `PROVIDER_LIMIT`, `TOKEN_EXPIRED`. | OAuth and bot tokens encrypted. | Resumable Drive upload for large files. |
| Storage Pools | Stack many Drive accounts and Telegram destinations into one logical storage target. | Connect providers, create pool, choose routing mode, upload into pool. | Every file records exact provider account; pool can fill, balance, failover, or replicate; routing follows `docs/providers/routing-algorithm.md`. | Pool needs at least one healthy account; quotas checked before upload and rechecked in worker. | `POOL_NO_HEALTHY_ACCOUNT`, `POOL_QUOTA_EXHAUSTED`. | Pool management requires provider permissions. | Route decision under 200 ms using cached quota. |
| Search | Find files by metadata, content, and meaning. | Query, filter, preview, open. | Deleted files hidden by default. | Query length and filters validated. | `SEARCH_TIMEOUT`. | Permission filter before results. | P95 under 800 ms for metadata search. |
| Repair Center | Resolve failed or drifted files. | Open issue, retry, reroute, reconcile. | Repairs are audited. | Only valid state transitions allowed. | `REPAIR_CONFLICT`. | Admin-only destructive repair. | Batch repair capped. |
| Audit Timeline | Show resource history. | Open file, view timeline. | All writes create audit events. | Event schema immutable. | `AUDIT_UNAVAILABLE`. | No secret values in audit payload. | Timeline paginated. |

## Edge Cases

- A resource can be classified successfully but fail upload.
- A provider can accept upload but later remove or rename the file.
- A user may intentionally store duplicate files for separate projects.
- Search index may lag DB state; UI must show indexing status.

## Future Considerations

- Provider marketplace.
- Advanced workflow rules.
- Local encrypted offline vault.
- Cross-provider migration wizard.
