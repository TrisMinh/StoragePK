# Frontend - Accessibility

## Purpose

Define accessibility requirements for StoragePK web and desktop clients.

## Scope

This document covers keyboard navigation, screen readers, focus management, status communication, contrast, reduced motion, and file-upload alternatives.

## Responsibilities

- Target WCAG 2.2 AA.
- Make all core workflows usable without drag-and-drop.
- Ensure upload and search states are perceivable and operable.

## Assumptions

- Users may rely on keyboard, screen reader, high contrast, or reduced motion.
- Drag-and-drop must never be the only input path.

## Dependencies

- [components.md](components.md)
- [design-system.md](design-system.md)
- [responsive.md](responsive.md)

## Detailed Explanation

Requirements:

| Area | Requirement |
| --- | --- |
| Keyboard | All navigation, upload, filters, table actions, dialogs, and assistant actions must be reachable. |
| Focus | Visible focus state and logical focus return after dialogs/drawers. |
| Screen reader | Semantic headings, landmarks, table headers, and status announcements. |
| Upload | File picker button equivalent to drag-and-drop. |
| Progress | Progress bars expose `aria-valuenow`, label, filename, and state. |
| Errors | Error messages connect to invalid fields with `aria-describedby`. |
| Color | Status is represented by icon/text plus color. |
| Motion | Reduced motion preference is respected. |

Table accessibility:

- Sortable headers expose sort direction.
- Row actions are reachable without hover.
- Bulk selection announces selected count.
- Preview drawer title matches selected file.

## Edge Cases

- Long upload queues need keyboard shortcuts or efficient navigation.
- Virtualized tables must preserve screen-reader usability.
- Toasts must not be the only place important errors appear.
- AI chat citations must be accessible as links to source files.

## Future Considerations

- Add automated accessibility tests with axe.
- Add manual screen-reader test scripts.
- Add localization checks for text expansion.

