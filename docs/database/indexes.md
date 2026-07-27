# Database - Indexes

## Purpose

Define database indexes required for performance, uniqueness, and safe state transitions.

## Scope

This document covers primary indexes, unique indexes, partial indexes, full-text indexes, and operational index strategy.

## Responsibilities

- Keep common queries fast.
- Support deduplication and permission checks.
- Prevent duplicate active records where business rules require uniqueness.

## Assumptions

- PostgreSQL is the primary database.
- Search engine handles advanced full-text and semantic search, but PostgreSQL must support fallback metadata search.

## Dependencies

- [schema.md](schema.md)
- [../api/resources.md](../api/resources.md)
- [../backend/repositories.md](../backend/repositories.md)

## Detailed Explanation

| Table | Index | Type | Purpose |
| --- | --- | --- | --- |
| `users` | `users_email_unique` | unique btree on lower email/citext | Login lookup. |
| `workspaces` | `workspaces_owner_slug_unique` | unique btree | Workspace routing. |
| `workspace_members` | `workspace_members_user_workspace_unique` | unique btree | Membership checks. |
| `provider_accounts` | `provider_accounts_user_provider_idx` | btree | Provider listing. |
| `folders` | `folders_parent_name_active_unique` | partial unique | Active sibling folder names. |
| `resources` | `resources_workspace_folder_idx` | btree | Folder browsing. |
| `resources` | `resources_workspace_checksum_idx` | btree | Deduplication. |
| `resources` | `resources_workspace_updated_idx` | btree desc | Recent files. |
| `resources` | `resources_name_trgm_idx` | GIN trigram | Fuzzy filename search. |
| `file_versions` | `file_versions_resource_version_unique` | unique btree | Version ordering. |
| `storage_objects` | `storage_provider_object_unique` | unique btree | External object lookup. |
| `upload_session_items` | `upload_items_session_status_idx` | btree | Queue display. |
| `audit_events` | `audit_workspace_created_idx` | btree desc | Activity timeline. |
| `audit_events` | `audit_resource_created_idx` | btree desc | Resource history. |
| `classifications` | `classifications_resource_status_idx` | btree | Review queue. |
| `resource_tags` | `resource_tags_unique` | unique btree | Prevent duplicate tags. |

Recommended PostgreSQL extensions:

- `citext` for email.
- `pg_trgm` for fuzzy filename search.
- `uuid-ossp` only if UUID generation is database-side.

## Edge Cases

- Partial unique indexes must exclude soft-deleted rows.
- Large audit tables require partition-aware indexes.
- JSONB indexes should be added only after query patterns are proven.
- Search fallback indexes cannot replace the external search engine for content-heavy documents.

## Future Considerations

- Add BRIN indexes for time-series audit tables.
- Add vector indexes if embeddings are stored in PostgreSQL with pgvector.
- Add composite indexes for high-volume saved search filters.

