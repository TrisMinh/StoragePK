# Roadmap - MVP

## Purpose

Define the minimum useful StoragePK product.

## Scope

This document covers MVP features, exclusions, acceptance criteria, release risks, and build sequence.

## Responsibilities

- Keep first implementation focused.
- Define what must work before beta.
- Separate required from future scope.

## Assumptions

- MVP targets personal use with architecture-ready team concepts.
- Google Drive is primary provider.
- Telegram is supported with documented provider limits and fallback behavior.

## Dependencies

- [../05-feature-list.md](../05-feature-list.md)
- [milestones.md](milestones.md)
- [../testing/e2e.md](../testing/e2e.md)

## Detailed Explanation

MVP includes:

| Area | Requirement |
| --- | --- |
| Web | Dashboard, files, folders, uploads, search, settings. |
| Desktop | Basic Tauri window, drag-and-drop, local queue persistence, tray status. |
| Backend | Auth, upload sessions, resources, folders, tags, providers, queues. |
| Providers | Google Drive upload, Telegram upload, health checks, retry. |
| Storage Pools | Multiple Drive accounts and Telegram destinations can be grouped into one logical upload target. |
| Classification | Rule-based plus optional AI suggestions. |
| Search | Filename, metadata, tag, type, date, extracted text where available. |
| AI | File Q&A and summaries with citations for authorized files. |
| Security | Token encryption, RBAC, audit, rate limits, safe errors. |
| Ops | Docker local stack, CI gates, monitoring basics. |

MVP excludes:

- Mobile app.
- Public sharing.
- Enterprise SSO.
- Billing.
- Advanced legal retention.
- Full offline metadata editing.

Acceptance criteria:

- User can connect Drive and Telegram.
- User can drag at least 100 mixed files into StoragePK.
- User can review and edit classification suggestions.
- User can upload to selected provider and see status.
- User can search and open uploaded files.
- User can recover from a failed provider upload.
- User can run one command to build/push repository when implementation exists.

## Edge Cases

- Telegram may reject files above configured limit; MVP reroutes or shows clear error.
- Drive token expiry during upload must lead to reconnect and retry.
- Duplicate files must not silently overwrite.
- Search indexing delay must be visible.

## Future Considerations

- Add watch folders.
- Add version history.
- Add team permissions and share links.
- Add local encrypted vault.
