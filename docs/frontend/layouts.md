# Frontend - Layouts

## Purpose

Define the structural layouts for StoragePK web and desktop interfaces.

## Scope

This document covers app shell, navigation, content regions, drawers, dialogs, panels, and desktop surfaces.

## Responsibilities

- Ensure consistent information density.
- Keep upload and sync status visible.
- Prevent duplicated layout patterns.

## Assumptions

- StoragePK is an operational productivity tool.
- Users perform repeated file actions and need dense, scannable screens.
- Cards are reserved for repeated items, summaries, and modal surfaces, not nested page sections.

## Dependencies

- [design-system.md](design-system.md)
- [components.md](components.md)
- [responsive.md](responsive.md)

## Detailed Explanation

Primary app shell:

| Region | Desktop/Web Behavior |
| --- | --- |
| Sidebar | Primary navigation, workspace switcher, provider health indicator. |
| Top bar | Search, upload button, command menu, user menu. |
| Main content | Route-specific table, grid, dashboard, or assistant view. |
| Right drawer | File preview, metadata, activity, classification review. |
| Bottom queue strip | Optional compact upload progress for active sessions. |

Layout rules:

- Use tables for dense file browsing.
- Use grid view for visual media inspection.
- Use drawers for contextual detail without losing list position.
- Use modal dialogs for destructive confirmation and provider auth steps.
- Keep upload entry points visible on dashboard, files, folders, and desktop tray.

Desktop-specific layouts:

- Main window: same shell as web, optimized for native drag-and-drop.
- Tray menu: provider health, active uploads, pause/resume, open app.
- Compact drop window: minimal drop zone, route selection, queue status.

## Edge Cases

- Very long filenames must truncate in tables but be fully readable in detail drawer.
- Small screens collapse sidebar into rail or menu while preserving upload access.
- Detail drawer should not cover destructive confirmation dialogs.
- Upload strip must not overlap table pagination or primary actions.

## Future Considerations

- Add configurable density.
- Add split-pane file comparison.
- Add saved workspace layouts per persona.

