# Frontend - Routing

## Purpose

Define the web and desktop route hierarchy used by StoragePK clients.

## Scope

This document covers authenticated routes, settings routes, modal routes, desktop-specific surfaces, URL state, and navigation rules.

## Responsibilities

- Keep navigation predictable.
- Make deep links stable for files, folders, searches, and settings.
- Ensure desktop and web share route concepts where possible.

## Assumptions

- Web uses Next.js App Router.
- Desktop uses the same route tree inside a Tauri webview, with additional native tray and drop-zone surfaces.
- Authenticated routes require a selected workspace.

## Dependencies

- [pages.md](pages.md)
- [layouts.md](layouts.md)
- [../api/resources.md](../api/resources.md)

## Detailed Explanation

Primary route map:

| Route | Purpose | Key State |
| --- | --- | --- |
| `/login` | Authentication entry. | Return URL, client type. |
| `/onboarding` | Provider and taxonomy setup. | Setup step, selected providers. |
| `/dashboard` | Operational home. | Queue summary, recent files, provider health. |
| `/files` | Full file library. | Filters, sort, view mode, selection. |
| `/files/{resourceId}` | File detail. | Preview tab, metadata, activity. |
| `/folders` | Folder tree and detail. | Selected folder. |
| `/folders/{folderId}` | Folder detail. | Filters, children, sort. |
| `/search` | Advanced search. | Query, filters, mode, saved search. |
| `/uploads` | Upload queue and failures. | Status filters, session ID. |
| `/assistant` | AI assistant. | Conversation ID, selected context. |
| `/activity` | Audit and activity timeline. | Filters and date range. |
| `/settings/providers` | Drive and Telegram setup. | Provider account ID. |
| `/settings/rules` | Classification and routing rules. | Rule selection. |
| `/settings/taxonomy` | Folder/tag presets. | Tree edit mode. |
| `/settings/security` | Sessions, devices, tokens. | Device ID. |

URL state rules:

- Filters, sort, search query, page cursor, and view mode should be encoded in query params.
- Modal states can use intercepting routes or query params, but direct resource URLs must remain shareable.
- Desktop native surfaces should deep-link into the same route where practical.

## Edge Cases

- If workspace access is revoked, redirect to workspace picker or onboarding.
- If a deep-linked resource is soft-deleted, show deleted state with restore action if allowed.
- If provider setup is incomplete, routes remain visible but upload actions show setup requirement.
- If user opens a stale saved search URL, invalid filters are ignored with a visible notice.

## Future Considerations

- Add `/shared/{shareId}` for public or private share links.
- Add `/workspaces/{workspaceSlug}` path prefix when multiple workspaces become common.
- Add mobile route adaptations for compact navigation.

