# AI - Agents

## Purpose

Define agentic AI behavior for classification, cleanup suggestions, repair assistance, and file-aware workflows.

## Scope

This document covers agent roles, tool boundaries, approval rules, memory, audit, and failure handling.

## Responsibilities

- Allow useful automation without unsafe autonomous file changes.
- Define when human confirmation is required.
- Keep agent actions transparent and reversible.

## Assumptions

- MVP agents suggest actions but do not execute destructive actions automatically.
- Agents operate under the current user's permissions.
- Every agent recommendation is auditable.

## Dependencies

- [prompts.md](prompts.md)
- [rag.md](rag.md)
- [../auth/permissions.md](../auth/permissions.md)
- [../backend/queues.md](../backend/queues.md)

## Detailed Explanation

Agent roles:

| Agent | Purpose | Allowed Automatic Actions | Requires Confirmation |
| --- | --- | --- | --- |
| Classification Agent | Suggest folder, tags, category, provider. | Create suggestion records. | Apply metadata changes when confidence below policy or bulk operation. |
| Cleanup Agent | Find duplicates, stale files, missing tags. | Create cleanup suggestions. | Delete, merge, archive, or move. |
| Repair Agent | Explain failed provider jobs and propose fix. | Run read-only diagnostics. | Retry, reroute, provider delete. |
| Assistant Agent | Answer questions and summarize files. | Read authorized context. | Rename, move, share, delete, export. |

Agent action envelope:

```json
{
  "agent": "classification",
  "proposedAction": "apply_tags",
  "targetResourceIds": ["uuid"],
  "confidence": 0.91,
  "reason": "Files match invoice template and detected purchase dates.",
  "requiresConfirmation": true
}
```

## Edge Cases

- Agent confidence can be high but wrong; user can undo metadata changes.
- Agent may propose provider route that becomes unavailable; worker validates again.
- Bulk suggestions need preview and rollback plan.
- Agent must not infer permissions from UI state.

## Future Considerations

- Add scheduled cleanup agent.
- Add natural-language command execution with dry-run.
- Add admin-controlled automation policies.

