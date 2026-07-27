# 04 - User Stories

## Purpose

Translate product intent into implementation-ready user stories.

## Scope

This document covers MVP stories and post-MVP stories for web, desktop, backend, AI, and provider integrations.

## Responsibilities

- Provide acceptance criteria for engineering.
- Connect workflows to feature and API docs.
- Support QA test planning.

## Assumptions

- Stories use one primary actor: authenticated user.
- Admin stories apply to local app administration and future team workspaces.

## Dependencies

- [05-feature-list.md](05-feature-list.md)
- [api/resources.md](api/resources.md)
- [testing/strategy.md](testing/strategy.md)

## Detailed Explanation

| ID | Story | Acceptance Criteria |
| --- | --- | --- |
| US-001 | As a user, I can drag files into StoragePK so they enter an intake queue. | Files show progress, checksum, detected type, and retry state. |
| US-002 | As a user, I can choose Drive or Telegram routing so files land in the right provider. | Provider rules can be automatic or manually overridden. |
| US-003 | As a user, I can review AI classifications before commit. | Suggested category, tags, folder, confidence, and reason are visible. |
| US-004 | As a user, I can search by filename, tag, content, date, provider, and semantic meaning. | Results show source, matched fields, preview, and provider health. |
| US-005 | As a user, I can recover from failed uploads. | Failed resources show actionable retry, reroute, or delete-staged-file actions. |
| US-006 | As a user, I can inspect audit history. | Resource timeline includes intake, metadata changes, provider upload, and deletion. |
| US-007 | As an admin, I can manage provider credentials. | Secrets are never displayed after creation and can be rotated. |

## Edge Cases

- Same file dropped twice in different sessions.
- File renamed while desktop upload is running.
- Provider token expires mid-upload.
- AI suggests a restricted folder without permission.
- User deletes a file in Drive outside StoragePK.

## Future Considerations

- Shared approval workflow for team libraries.
- Watch-folder automation on desktop.
- Natural-language batch commands such as "archive all invoices from June".

