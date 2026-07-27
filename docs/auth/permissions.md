# Auth - Permissions

## Purpose

Define StoragePK permission names, actions, and validation behavior.

## Scope

This document covers permission taxonomy for users, workspaces, resources, providers, AI, audit, and admin actions.

## Responsibilities

- Provide stable permission identifiers.
- Support consistent API authorization.
- Enable future team and enterprise expansion.

## Assumptions

- Permissions are checked at service layer and, when practical, repository query layer.
- MVP maps roles to fixed permission sets.

## Dependencies

- [authorization.md](authorization.md)
- [../api/admin.md](../api/admin.md)
- [../api/resources.md](../api/resources.md)

## Detailed Explanation

Permission catalog:

| Permission | Description |
| --- | --- |
| `workspace:read` | View workspace metadata. |
| `workspace:manage` | Edit workspace settings and taxonomy. |
| `member:manage` | Invite, remove, or change members. |
| `resource:read` | View files and metadata. |
| `resource:create` | Upload or create resources. |
| `resource:update` | Rename, move, tag, classify. |
| `resource:delete` | Soft-delete resources. |
| `resource:restore` | Restore soft-deleted resources. |
| `provider:read` | View provider status. |
| `provider:manage` | Connect, revoke, rotate providers. |
| `provider:repair` | Run provider reconciliation or reroute. |
| `search:use` | Query search index. |
| `ai:use` | Use assistant over authorized files. |
| `audit:read` | View activity and audit history. |
| `admin:read` | View system diagnostics. |
| `admin:operate` | Retry jobs and operate repair tools. |

Role mapping:

| Role | Permissions |
| --- | --- |
| Owner | All permissions. |
| Admin | All except workspace deletion and billing owner transfer. |
| Editor | Resource create/update/delete/restore, search, AI, provider read. |
| Viewer | Workspace read, resource read, search use, limited AI use. |

## Edge Cases

- AI actions that mutate files require underlying resource permission and explicit confirmation.
- Provider repair can affect many files and requires stronger permission than normal upload.
- Audit events can reveal filenames; `audit:read` is separate from `resource:read`.
- Permission cache must invalidate immediately on role changes.

## Future Considerations

- Add custom roles.
- Add folder ACL inheritance.
- Add external share permissions.

