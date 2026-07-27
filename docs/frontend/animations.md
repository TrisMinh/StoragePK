# Frontend - Animations

## Purpose

Define motion principles and animation requirements for StoragePK.

## Scope

This document covers transitions, upload progress, drag-and-drop feedback, drawers, dialogs, list updates, and reduced motion.

## Responsibilities

- Use motion to clarify state changes.
- Avoid distracting or decorative animation.
- Ensure accessibility for reduced-motion users.

## Assumptions

- StoragePK is a productivity application.
- Motion should be subtle, fast, and reversible.
- Upload progress is functional, not decorative.

## Dependencies

- [design-system.md](design-system.md)
- [accessibility.md](accessibility.md)
- [components.md](components.md)

## Detailed Explanation

Animation rules:

| Interaction | Motion |
| --- | --- |
| Drag enters drop zone | Border and background transition within 120 ms. |
| Queue item added | Short slide/fade that does not shift table layout unexpectedly. |
| Progress update | Smooth width transition capped to avoid lag behind actual progress. |
| Drawer open | 160-220 ms transform and opacity. |
| Dialog open | 120-160 ms fade/scale. |
| Error state | No shaking; show clear status and action. |
| Bulk update | Preserve scroll and selection context. |

Reduced motion:

- Disable non-essential transforms.
- Keep progress updates and status changes visible.
- Replace animated skeleton shimmer with static placeholders.

## Edge Cases

- Rapid progress updates should be throttled to avoid rendering overhead.
- Upload item completion should not reorder the list while user is interacting.
- Realtime events can arrive in bursts; UI should batch updates.
- Desktop background upload notifications should respect OS preferences.

## Future Considerations

- Add subtle command palette transitions.
- Add visual regression checks for motion-sensitive layout shifts.
- Add optional celebratory microcopy for completed onboarding only.

