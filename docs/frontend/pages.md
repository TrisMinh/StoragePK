# Frontend - Pages

## Purpose

Define each user-facing page, its purpose, key components, states, and required behavior.

## Scope

This document covers web pages and shared desktop views for MVP.

## Responsibilities

- Give implementers a page-by-page blueprint.
- Define loading, empty, error, and permission states.
- Link UI requirements to API contracts.

## Assumptions

- First screen after setup is `/dashboard`.
- Users can upload from multiple pages.
- Every page supports light, dark, and system theme.

## Dependencies

- [routing.md](routing.md)
- [components.md](components.md)
- [../api/resources.md](../api/resources.md)

## Detailed Explanation

| Page | Purpose | Required Components | Empty State | Error State |
| --- | --- | --- | --- | --- |
| Dashboard | Operational overview. | Drop zone, recent files, queue summary, provider health, suggestions. | Setup checklist and drop target. | Provider disconnected or queue degraded. |
| Files | Complete library. | Table/grid, filters, preview drawer, bulk toolbar. | Upload prompt and provider status. | Search/list failure with retry. |
| Folders | Taxonomy browsing. | Folder tree, folder content, create/edit actions. | Taxonomy preset picker. | Folder conflict or permission denied. |
| Search | Advanced retrieval. | Query input, filter panel, result list, saved searches. | Query suggestions and AI search handoff. | Search index unavailable fallback. |
| Uploads | Queue management. | Active/pending/failed/completed tabs, per-file actions. | No uploads yet with drop target. | Retryable provider errors. |
| Assistant | File-aware AI. | Chat, source citations, context picker, action confirmation. | Starter prompts. | AI unavailable or permission block. |
| Activity | Audit timeline. | Filters, event list, resource links. | No events yet. | Audit query failure. |
| Settings | Configuration. | Provider forms, rules editor, taxonomy editor, security panels. | Missing provider callouts. | Invalid credentials or token expiry. |

Page-level requirements:

- All destructive actions require confirmation.
- All provider-impacting actions show target provider.
- Classification suggestions must show confidence and reason.
- File detail must show current storage state and last verified provider timestamp.
- Telegram local Bot API settings must show whether large-file mode runs from this desktop, Docker, or server/VPS.
- Telegram provider settings must show that channel/chat members can download files outside StoragePK.

## Edge Cases

- If a file has no preview, show metadata and download/open actions.
- If upload continues after navigation, global queue status remains visible.
- If AI answer references deleted or unauthorized files, citations are removed before rendering.
- If provider health changes, pages update without full refresh.

## Future Considerations

- Add comments page or file discussion pane.
- Add version history tab.
- Add workspace analytics dashboard.
