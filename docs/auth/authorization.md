# Auth - Authorization

## Purpose

Define how StoragePK decides whether an authenticated actor can perform an action.

## Scope

This document covers RBAC, object permissions, workspace membership, provider actions, AI retrieval, and admin operations.

## Responsibilities

- Enforce permissions server-side.
- Keep search and AI responses permission-aware.
- Define authorization checks for resource lifecycle actions.

## Assumptions

- MVP uses workspace roles with owner/admin/editor/viewer.
- Future versions add object-level ACLs and share links.
- Provider accounts are scoped to a user or workspace.

## Dependencies

- [permissions.md](permissions.md)
- [../database/schema.md](../database/schema.md)
- [../security/threats.md](../security/threats.md)

## Detailed Explanation

Authorization model:

| Role | Capabilities |
| --- | --- |
| Owner | Full workspace control, provider management, delete workspace. |
| Admin | Manage taxonomy, providers, repair, audit, members. |
| Editor | Upload, edit metadata, move files, tag files. |
| Viewer | Read files and metadata only. |

Server-side enforcement points:

- Resource list and detail.
- Search result retrieval.
- AI context retrieval.
- Upload session creation.
- Provider upload/repair.
- Audit export.
- Share link creation.

Rules:

- UI hiding is not security.
- Search index must store permission metadata or be filtered by DB authorization before response.
- AI RAG must retrieve only authorized documents and cite only authorized files.
- Provider actions require both StoragePK permission and valid provider account scope.

## Edge Cases

- User can be workspace admin but not owner of a personal provider account.
- File shared into workspace may have provider access mismatch.
- Permission revoked while upload job runs; worker must re-check before provider commit.
- Soft-deleted files require restore permission.

## Future Considerations

- Add folder-level ACL inheritance.
- Add temporary access grants.
- Add policy engine for complex enterprise rules.

