# Roadmap - Milestones

## Purpose

Define phased delivery milestones for StoragePK from documentation to production.

## Scope

This document covers planning, MVP, beta, production, and future expansion.

## Responsibilities

- Give implementation agents a build order.
- Keep early work focused.
- Define milestone exit criteria.

## Assumptions

- Documentation is completed before application code starts.
- MVP focuses on single-user or small-team workflows.
- Production release requires security and provider reliability validation.

## Dependencies

- [mvp.md](mvp.md)
- [backlog.md](backlog.md)
- [future-features.md](future-features.md)

## Detailed Explanation

| Milestone | Goal | Exit Criteria |
| --- | --- | --- |
| M0 Docs | Complete architecture and product docs. | Required docs exist, links reviewed, Git push script present. |
| M1 Skeleton | Create monorepo, apps, shared config, CI. | Web/API/desktop shells run locally. |
| M2 Intake | Drag upload sessions and queue. | Files staged, hashed, committed, and listed. |
| M3 Providers | Drive and Telegram adapters. | Upload, retry, health, quota, repair. |
| M4 Classification/Search | Metadata classification and search. | Suggestions, manual edit, indexed search. |
| M5 AI Assistant | RAG and summaries. | Permission-safe answers with citations. |
| M6 Production Beta | Monitoring, security, packaging. | Staging smoke tests and desktop package. |
| M7 Public Release | Stable user release. | SLOs, docs, backup/restore, incident process. |

## Edge Cases

- Provider limits may force Telegram scope reduction before MVP.
- Desktop packaging can become a milestone risk; web and API should stay independently useful.
- AI assistant should not block core file upload release.

## Future Considerations

- Add mobile companion milestone.
- Add team collaboration milestone.
- Add enterprise compliance milestone.

