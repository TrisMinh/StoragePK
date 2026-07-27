# Testing - E2E Tests

## Purpose

Define end-to-end tests that represent real user workflows.

## Scope

This document covers browser E2E, desktop E2E, provider smoke tests, accessibility checks, and acceptance scenarios.

## Responsibilities

- Validate that StoragePK works as users experience it.
- Cover critical file lifecycle workflows.
- Ensure UI states match backend state.

## Assumptions

- Web E2E uses Playwright or equivalent.
- Desktop E2E uses Tauri-compatible automation where possible.
- Provider smoke tests use isolated staging accounts.

## Dependencies

- [strategy.md](strategy.md)
- [../frontend/pages.md](../frontend/pages.md)
- [../api/websocket.md](../api/websocket.md)

## Detailed Explanation

MVP E2E scenarios:

| Scenario | Steps | Expected Result |
| --- | --- | --- |
| First-run setup | Login, connect Drive, connect Telegram, choose taxonomy. | Dashboard ready with provider health. |
| Drag upload | Drop files, review suggestions, commit. | Files uploaded, indexed, visible in library. |
| Duplicate handling | Upload same file twice. | Duplicate decision UI appears. |
| Provider failure | Simulate token expiry during upload. | Failed state with reconnect action. |
| Search retrieval | Search by filename, tag, and extracted text. | Correct result appears with provider status. |
| AI question | Ask about uploaded file. | Answer cites authorized file. |
| Repair | Retry failed upload after reconnect. | Resource becomes synced. |
| Desktop offline | Queue files offline, restart app, reconnect. | Upload resumes without duplicate resource. |

Accessibility checks:

- Keyboard-only upload and search.
- Screen-reader labels for upload progress.
- Reduced motion setting.
- Contrast in light and dark themes.

## Edge Cases

- Browser refresh during upload.
- WebSocket disconnect during classification.
- Folder dropped into desktop with nested files.
- AI unavailable while normal search still works.

## Future Considerations

- Add visual regression coverage.
- Add large library performance E2E.
- Add team workspace sharing workflows.

