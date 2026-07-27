# Frontend - Responsive Behavior

## Purpose

Define how StoragePK adapts across desktop monitors, laptop screens, tablets, and narrow web views.

## Scope

This document covers breakpoints, layout adaptations, tables, drawers, upload surfaces, and desktop window constraints.

## Responsibilities

- Preserve usability at every supported viewport.
- Prevent content overlap and layout shifts.
- Keep upload and search accessible on small screens.

## Assumptions

- Primary usage is desktop and laptop.
- Web should remain usable on tablet and mobile-width browser windows.
- Desktop Tauri window has a minimum supported size.

## Dependencies

- [layouts.md](layouts.md)
- [components.md](components.md)
- [design-system.md](design-system.md)

## Detailed Explanation

Breakpoint behavior:

| Width | Behavior |
| --- | --- |
| 1280+ | Full sidebar, table, right drawer can coexist. |
| 1024-1279 | Sidebar remains; drawer overlays or resizes. |
| 768-1023 | Sidebar collapses to rail; filters move into panel. |
| <768 | Mobile web layout with bottom nav or menu; tables become stacked list only where necessary. |

Component rules:

- File table columns can be hidden by priority, never squeezed into unreadable widths.
- Search filters collapse into a drawer on narrow screens.
- Upload queue remains reachable through top bar or bottom sheet.
- Dialogs must fit viewport with scrollable content.
- Long filenames use truncation with tooltip or detail expansion.

Desktop minimum:

- Main window minimum: 1024 x 680.
- Compact drop window minimum: 420 x 320.

## Edge Cases

- Browser zoom at 200% must remain usable.
- Split-screen desktop can be narrower than expected.
- Virtual keyboard can cover bottom actions on mobile web.
- Provider reconnect popups may resize or return focus unexpectedly.

## Future Considerations

- Add mobile app-specific navigation.
- Add user-controlled table columns.
- Add responsive screenshot test matrix.

