# AI - Memory

## Purpose

Define what StoragePK AI can remember, how memory is stored, and how users control it.

## Scope

This document covers user preferences, workspace taxonomy, file-derived metadata, conversation history, and privacy boundaries.

## Responsibilities

- Separate useful product memory from unsafe personal data retention.
- Make AI behavior consistent across sessions.
- Allow users to inspect and delete memory where applicable.

## Assumptions

- File metadata and taxonomy are product data, not hidden AI memory.
- AI conversation memory is optional and workspace-scoped.
- Sensitive extracted content is not stored in AI memory by default.

## Dependencies

- [prompts.md](prompts.md)
- [rag.md](rag.md)
- [../security/encryption.md](../security/encryption.md)

## Detailed Explanation

Memory categories:

| Category | Stored | User Control |
| --- | --- | --- |
| Taxonomy memory | Folder/tag preferences, accepted classifications. | Editable in taxonomy/rules settings. |
| Provider preferences | Default provider and routing rules. | Editable in provider settings. |
| Conversation history | AI chat messages and citations. | Delete conversation. |
| Search behavior | Saved searches and filters. | Edit/delete saved searches. |
| Sensitive content | Not stored as memory by default. | Workspace policy required. |

Rules:

- Do not store secrets, tokens, or raw credentials in AI memory.
- Do not use one user's file-derived memory for another workspace.
- Accepted classification decisions can improve future suggestions in the same workspace.
- Memory changes must be auditable when they affect file organization.

## Edge Cases

- User deletes a file cited in old AI conversation; citation must show deleted/unavailable state.
- User disables AI memory; future suggestions use rules and current metadata only.
- Workspace transfer should not leak personal conversation memory to new owner without policy.
- Exported data must include AI memory if it affects product behavior.

## Future Considerations

- Add memory review UI.
- Add per-folder AI memory disable switch.
- Add organization-level AI retention policy.

