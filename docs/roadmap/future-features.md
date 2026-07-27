# Roadmap - Future Features

## Purpose

Describe long-term feature directions beyond MVP and near-term backlog.

## Scope

This document covers collaboration, automation, AI, storage expansion, compliance, mobile, and ecosystem features.

## Responsibilities

- Provide strategic direction.
- Keep future architecture decisions compatible with likely expansion.
- Avoid premature implementation.

## Assumptions

- StoragePK can evolve from personal file OS to small-team knowledge vault.
- Provider abstraction remains central.
- User trust depends on reversibility and auditability.

## Dependencies

- [milestones.md](milestones.md)
- [backlog.md](backlog.md)
- [../architecture/system-overview.md](../architecture/system-overview.md)

## Detailed Explanation

Future feature themes:

| Theme | Features |
| --- | --- |
| Collaboration | Shared workspaces, comments, approvals, mentions, permissions. |
| Automation | Rules engine, scheduled cleanup, provider migration, watch folders. |
| AI | Multi-file synthesis, policy suggestions, semantic dedupe, natural-language commands. |
| Storage | S3-compatible providers, local encrypted vault, cold archive. |
| Compliance | Retention policies, legal hold, export logs, audit reports. |
| Mobile | Capture, scan, quick search, notifications. |
| Ecosystem | Browser extension, CLI, webhook integrations. |

## Edge Cases

- Natural-language commands can be dangerous; require dry-run and confirmation.
- Shared workspaces need robust ACL inheritance.
- Compliance features can conflict with user deletion expectations.
- More providers increase repair and reconciliation complexity.

## Future Considerations

- Add plugin provider SDK.
- Add marketplace for classification templates.
- Add enterprise deployment guide.

