# Backend - Repositories

## Purpose

Define database access patterns and repository responsibilities.

## Scope

This document covers repositories for users, workspaces, resources, upload sessions, providers, classification, search metadata, audit, and AI.

## Responsibilities

- Encapsulate SQL and ORM details.
- Provide transaction-safe methods.
- Prevent direct database access from controllers.

## Assumptions

- Repository methods are typed.
- Transactions are explicit and passed through service orchestration.
- Queries enforce workspace scoping unless intentionally global admin queries.

## Dependencies

- [../database/schema.md](../database/schema.md)
- [../database/indexes.md](../database/indexes.md)
- [services.md](services.md)

## Detailed Explanation

Repository map:

| Repository | Key Methods |
| --- | --- |
| `UserRepository` | find by email, find by ID, update profile, soft delete. |
| `WorkspaceRepository` | create, list memberships, check role, update settings. |
| `ProviderAccountRepository` | create connection, update health, rotate credentials, revoke. |
| `UploadSessionRepository` | create session, add items, mark uploaded, commit, expire. |
| `ResourceRepository` | create resource, list resources, update metadata, soft delete, restore. |
| `FolderRepository` | create folder, move folder, path cache update, soft delete. |
| `TagRepository` | upsert tags, attach/detach tags, list tags. |
| `ClassificationRepository` | create suggestions, update review state, find pending. |
| `AuditRepository` | append events, query timeline, export. |
| `AIRepository` | create conversation, append message, store citations. |

Query rules:

- Always filter by `workspace_id` for workspace-owned data.
- Exclude `deleted_at` rows by default.
- Use cursor pagination for large lists.
- Select only required columns for table views.
- Use `FOR UPDATE SKIP LOCKED` only for worker-safe job selection when needed.

## Edge Cases

- Path cache updates for nested folders require transaction and locking strategy.
- Resource rename conflicts should be checked against active siblings.
- Soft-deleted records can conflict with unique names; partial unique indexes are required.
- Audit queries may include records for deleted resources.

## Future Considerations

- Add read replicas for heavy list/search workloads.
- Add data loader pattern for GraphQL only if API style changes.
- Add repository-level query performance tests.

