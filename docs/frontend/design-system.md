# Frontend - Design System

## Purpose

Define visual design rules, tokens, typography, colors, density, icons, and theme behavior.

## Scope

This document covers the MVP design system for web and desktop clients.

## Responsibilities

- Make StoragePK feel modern, trustworthy, and operational.
- Keep visual language consistent across pages.
- Support accessibility and theme requirements.

## Assumptions

- The product should feel like a focused workspace, not a landing page.
- UI should prioritize clarity, status, and repeated workflows.
- Cards use modest radius and are not nested inside other cards.

## Dependencies

- [layouts.md](layouts.md)
- [components.md](components.md)
- [accessibility.md](accessibility.md)

## Detailed Explanation

Design direction:

- Calm, dense, utility-first interface.
- Clear status color system for upload and provider health.
- Neutral base with restrained accent colors, avoiding a one-hue interface.
- Strong table readability and compact controls for power users.

Token categories:

| Token | Examples | Rule |
| --- | --- | --- |
| Color | background, surface, border, text, muted, accent, danger, warning, success | Must pass WCAG AA for text. |
| Spacing | 4, 8, 12, 16, 24, 32 | Use consistent spacing scale. |
| Radius | 4, 6, 8 | Max 8px for cards unless component needs circle. |
| Typography | body, label, table, heading | No viewport-based font scaling. |
| Shadow | none, subtle, overlay | Avoid decorative heavy shadows. |
| Motion | fast, standard, slow | Respect reduced motion. |

Semantic colors:

| State | Color Use |
| --- | --- |
| Success | Uploaded, synced, healthy provider. |
| Warning | Quota near limit, classification uncertain, index delayed. |
| Danger | Failed upload, token revoked, destructive action. |
| Info | Processing, queued, analyzing. |

## Edge Cases

- Long translated strings must fit buttons and table cells.
- Color cannot be the only indicator of status.
- Dark theme must not flatten provider state contrast.
- Compact desktop window must preserve upload controls.

## Future Considerations

- Add branded illustrations only for onboarding and empty states.
- Add theme token export for native desktop shell.
- Add visual regression tests for key screens.

