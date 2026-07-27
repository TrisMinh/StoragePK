# StoragePK UI Preview

## Purpose

This folder contains the first visual review surface for StoragePK: a single-page desktop-first workspace dashboard.

## Scope

The preview covers the overview experience only: navigation, storage usage, drag-and-drop upload, connected storage pools, recent activity, search filtering, and light or dark mode.

## Responsibilities

- `index.html` defines the semantic page structure and preview content.
- `styles.css` owns the responsive visual system and light or dark theme tokens.
- `app.js` provides theme persistence, upload feedback, drag-and-drop states, and activity search filtering.

## Assumptions

- The preview is intentionally framework-free so it can be opened immediately.
- Provider data is representative UI data, not a live connection to Google Drive or Telegram.
- The visual direction is Fluent-inspired, not an official Fluent UI implementation.

## Dependencies

- A modern browser with CSS Grid and `color-mix()` support.
- Phosphor Icons loaded from the public CDN in `index.html`.

## Detailed Explanation

The page uses a fixed workspace rail, a responsive content canvas, and a single cobalt accent shared by controls and status emphasis. The upload area exposes the first important interaction without pretending that provider APIs are connected. Theme preference is stored under `storagepk-theme` in local storage.

## Edge Cases

- If the icon CDN is unavailable, the page remains usable because all icon elements are decorative and controls have text labels or accessible names.
- An empty search result shows an explicit activity empty state.
- Reduced-motion users receive shortened transitions and no smooth scrolling.
- Mobile layouts collapse the activity table into two-column file rows and reduce the navigation rail to icons.

## Future Considerations

- Replace representative values with the provider capability and storage-pool APIs defined under `docs/providers/`.
- Move tokens into the production design system after this visual direction is approved.
- Add real upload progress, provider routing decisions, authentication states, and connector health details in the next iteration.

## Open the Preview

Open `ui-preview/index.html` directly in a browser. No build step is required for this review version.
