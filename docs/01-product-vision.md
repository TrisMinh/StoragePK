# 01 - Product Vision

## Purpose

Define the long-term product direction for StoragePK.

## Scope

This document covers positioning, product principles, success metrics, and strategic boundaries.

## Responsibilities

- Keep product decisions consistent.
- Prevent feature drift into a generic cloud-drive clone.
- Anchor the MVP to a useful, buildable product.

## Assumptions

- The first customer is a power user who stores many mixed personal and work files.
- The user values retrieval speed more than provider purity.
- StoragePK can rely on the user's Google Drive account and Telegram bot/channel configuration.

## Dependencies

- [02-target-users.md](02-target-users.md)
- [05-feature-list.md](05-feature-list.md)
- [roadmap/mvp.md](roadmap/mvp.md)

## Detailed Explanation

StoragePK should feel like an intelligent file desk, not a blank folder tree. The app handles intake, naming, classification, provider routing, and recall. The user sees a clean logical library while the system manages provider quirks behind the scenes.

Product principles:

| Principle | Meaning | Product Impact |
| --- | --- | --- |
| Drop first | File intake must be faster than choosing folders manually. | Drag target is always accessible. |
| Metadata is memory | The app remembers why a file exists, not only where it is. | Notes, tags, source, checksum, and history are first-class. |
| Providers are adapters | Drive and Telegram are storage targets, not the product UX. | Provider failures are surfaced as repairable sync states. |
| Search beats nesting | Users should find files by meaning, time, type, person, and project. | Search and filters are primary navigation. |
| Recoverability is trust | No silent loss, overwrite, or hidden deletion. | Audit logs and provider reconciliation are mandatory. |

Success metrics:

- Median drag-to-indexed time under 15 seconds for files below 50 MB.
- Search result relevance accepted by user in the top 5 results for 80% of common queries.
- Zero unrecoverable file loss in provider failure simulations.
- First-run setup completed in under 7 minutes.

## Edge Cases

- Users may expect StoragePK to be a storage provider. Onboarding must explain that it orchestrates providers.
- Telegram should not be positioned as universal storage because bot limits and account policies vary.
- AI classification can be wrong; every automatic decision must be editable.

## Future Considerations

- Team workspaces with approval flows.
- AI-generated collection summaries.
- Mobile companion app for quick capture and retrieval.

