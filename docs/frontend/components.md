# Frontend - Components

## Purpose

Define reusable UI components required for StoragePK.

## Scope

This document covers navigation, file browsing, upload, classification, provider, search, assistant, and admin components.

## Responsibilities

- Establish component boundaries.
- Prevent one-off UI duplication.
- Define expected states for reusable controls.

## Assumptions

- Components are implemented in TypeScript and shared between web and desktop where possible.
- Icons use a standard icon library such as lucide-react when available.
- Every interactive component has accessible name, focus state, disabled state, and loading state.

## Dependencies

- [design-system.md](design-system.md)
- [accessibility.md](accessibility.md)
- [../api/websocket.md](../api/websocket.md)

## Detailed Explanation

Core components:

| Component | Responsibility | States |
| --- | --- | --- |
| `AppShell` | Sidebar, top bar, content, queue strip. | Loading user, disconnected, normal. |
| `UploadDropZone` | Drag target and file picker fallback. | Idle, drag active, validating, rejected. |
| `UploadQueueItem` | Per-file progress and actions. | Pending, uploading, paused, failed, completed. |
| `FileTable` | Dense file browsing. | Loading, empty, error, selected, sorted. |
| `FileGrid` | Visual media browsing. | Loading, empty, preview unavailable. |
| `PreviewDrawer` | File preview, metadata, activity. | Open, loading, unsupported, permission denied. |
| `ClassificationReview` | Suggested folder/tags/provider. | Pending, accepted, edited, rejected. |
| `ProviderStatusBadge` | Drive/Telegram health. | Healthy, degraded, disconnected, quota warning. |
| `LocalProviderRuntimeStatus` | Shows desktop-managed Telegram local server state. | Stopped, starting, running, failed, port conflict. |
| `SearchFilterPanel` | Search filters and saved queries. | Expanded, compact, invalid filters. |
| `AssistantChat` | AI Q&A with sources. | Empty, thinking, answering, error, action pending. |
| `AuditTimeline` | Resource or workspace events. | Loading, empty, filtered. |
| `ConfirmDialog` | Destructive or provider-impacting confirmations. | Open, submitting, error. |

Component event rules:

- Components emit domain actions, not raw API calls, when business orchestration is needed.
- Long-running actions show progress and do not block unrelated navigation.
- Bulk actions must show count, scope, and irreversible consequences.

## Edge Cases

- Dragging unsupported folders in browser must show a clear fallback.
- Upload queue item can receive terminal event after user navigates away.
- Classification review can conflict with a folder deleted by another session.
- Provider badge can be stale; tooltip should show last checked time.

## Future Considerations

- Add virtualized file table for large libraries.
- Add command palette component.
- Add file comparison component for duplicates.
