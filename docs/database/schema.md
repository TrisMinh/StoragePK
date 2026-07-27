# Database - Schema

## Purpose

Define implementation-ready tables, columns, constraints, relationships, cascade rules, soft delete policy, audit policy, and scaling notes.

## Scope

This document covers the MVP relational schema for StoragePK metadata.

## Responsibilities

- Make table ownership explicit.
- Provide enough detail for migrations.
- Prevent provider state from becoming the canonical taxonomy.

## Assumptions

- Database is PostgreSQL 16 or later.
- IDs are UUIDv7 or random UUIDs if UUIDv7 is unavailable.
- Timestamps are stored as `timestamptz`.
- Soft delete uses `deleted_at` and `deleted_by_user_id` where applicable.

## Dependencies

- [er-diagram.md](er-diagram.md)
- [indexes.md](indexes.md)
- [../auth/permissions.md](../auth/permissions.md)
- [../backend/repositories.md](../backend/repositories.md)

## Detailed Explanation

### users

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Internal user identity. |
| `email` | `citext` | unique, not null | Login and notifications. |
| `display_name` | `text` | not null | UI display. |
| `status` | `text` | check active/suspended/deleted | Access control. |
| `created_at` | `timestamptz` | not null | Audit. |
| `updated_at` | `timestamptz` | not null | Audit. |
| `deleted_at` | `timestamptz` | nullable | Soft delete. |

Relationships: one user has many sessions, devices, provider accounts, workspace memberships, audit events, and AI conversations.

Cascade rules: never hard-delete users with audit events. Anonymize according to privacy policy if required.

### workspaces

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Workspace identity. |
| `name` | `text` | not null | User-facing name. |
| `slug` | `text` | unique per owner | URL-friendly identifier. |
| `owner_user_id` | `uuid` | FK users | Billing and admin owner. |
| `default_provider_account_id` | `uuid` | nullable FK | Default upload target. |
| `created_at` | `timestamptz` | not null | Audit. |
| `deleted_at` | `timestamptz` | nullable | Soft delete. |

### workspace_members

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `workspace_id` | `uuid` | FK, composite unique | Workspace. |
| `user_id` | `uuid` | FK, composite unique | Member. |
| `role` | `text` | owner/admin/editor/viewer | RBAC baseline. |
| `created_at` | `timestamptz` | not null | Audit. |

### devices

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Registered client device. |
| `user_id` | `uuid` | FK users | Owner. |
| `device_name` | `text` | not null | Display. |
| `device_type` | `text` | desktop/web/mobile | Session policy. |
| `last_seen_at` | `timestamptz` | nullable | Security. |
| `revoked_at` | `timestamptz` | nullable | Session invalidation. |

### provider_accounts

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Provider connection. |
| `user_id` | `uuid` | FK users | Credential owner. |
| `workspace_id` | `uuid` | nullable FK | Workspace scope. |
| `provider` | `text` | drive/telegram | Adapter type. |
| `display_name` | `text` | not null | UI label. |
| `encrypted_credentials` | `bytea` | not null | Token vault payload. |
| `scopes` | `jsonb` | not null default `[]` | Granted scopes. |
| `quota_status` | `jsonb` | nullable | Provider quota cache. |
| `health_state` | `text` | healthy/degraded/disconnected | Sync health. |
| `created_at` | `timestamptz` | not null | Audit. |
| `revoked_at` | `timestamptz` | nullable | Disable provider. |

Provider accounts are multi-account by design. A workspace may connect 10 Google Drive accounts, several Telegram bot/channel destinations, or future providers. The exact provider account used for each file version is stored through `storage_objects.provider_account_id`.

### storage_pools

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Logical group of transparent storage destinations. |
| `workspace_id` | `uuid` | FK workspaces | Pool owner. |
| `name` | `text` | not null | User-facing pool name. |
| `mode` | `text` | fill_first/balanced/rule_based/failover/replicated/archive | Routing behavior. |
| `is_default` | `boolean` | not null default false | Default upload target. |
| `settings` | `jsonb` | not null default `{}` | Quota thresholds and routing options. |
| `created_at` | `timestamptz` | not null | Audit. |
| `deleted_at` | `timestamptz` | nullable | Soft delete. |

### storage_pool_accounts

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `storage_pool_id` | `uuid` | FK storage_pools | Pool. |
| `provider_account_id` | `uuid` | FK provider_accounts | Drive/Telegram account or destination. |
| `priority` | `integer` | not null | Routing order. |
| `role` | `text` | primary/overflow/archive/replica/manual | Account role inside pool. |
| `rules` | `jsonb` | not null default `{}` | File type, size, folder, tag, or classification rules. |
| `quota_threshold_percent` | `integer` | nullable | Skip account above threshold. |
| `created_at` | `timestamptz` | not null | Audit. |

Constraint: unique `(storage_pool_id, provider_account_id)` and unique priority inside each pool.

### storage_pool_route_decisions

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Route decision identity. |
| `workspace_id` | `uuid` | FK workspaces | Tenant scope. |
| `upload_session_item_id` | `uuid` | nullable FK upload_session_items | Intake item. |
| `file_version_id` | `uuid` | nullable FK file_versions | Version being routed. |
| `storage_pool_id` | `uuid` | FK storage_pools | Pool used. |
| `selected_provider_account_id` | `uuid` | FK provider_accounts | Primary chosen account. |
| `replica_provider_account_ids` | `uuid[]` | nullable | Replica accounts if configured. |
| `mode` | `text` | not null | Pool mode at decision time. |
| `decision_trace` | `jsonb` | not null | Candidate scores and skip reasons. |
| `status` | `text` | selected/fallback/rejected/superseded | Decision state. |
| `created_at` | `timestamptz` | not null | Audit. |

Purpose: make every multi-account routing decision explainable, replayable, and auditable.

### provider_capability_snapshots

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Snapshot identity. |
| `provider_account_id` | `uuid` | FK provider_accounts | Account measured. |
| `provider` | `text` | drive/telegram | Provider type. |
| `mode` | `text` | public/local/oauth/etc. | Provider operating mode. |
| `capabilities` | `jsonb` | not null | Upload/download/delete/verify capabilities. |
| `limits` | `jsonb` | not null | File size, rate, quota, and mode limits. |
| `scopes` | `jsonb` | not null default `[]` | Granted OAuth scopes if applicable. |
| `checked_at` | `timestamptz` | not null | Snapshot time. |
| `expires_at` | `timestamptz` | nullable | Cache expiry. |

Purpose: prevent hardcoded provider assumptions and preserve what the app believed when routing a file.

### provider_upload_attempts

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Upload attempt identity. |
| `workspace_id` | `uuid` | FK workspaces | Tenant scope. |
| `file_version_id` | `uuid` | FK file_versions | Version being uploaded. |
| `provider_account_id` | `uuid` | FK provider_accounts | Target account. |
| `route_decision_id` | `uuid` | FK storage_pool_route_decisions | Route trace. |
| `attempt_number` | `integer` | not null | Attempt order. |
| `idempotency_key` | `text` | unique | Retry safety. |
| `execution_location` | `text` | cloud_worker/desktop_connector | Where upload runs. |
| `state` | `text` | queued/uploading/verifying/synced/failed_retryable/failed_permanent | Attempt state. |
| `provider_request_id` | `text` | nullable | Provider request marker. |
| `provider_object_id` | `text` | nullable | External object when known. |
| `error_code` | `text` | nullable | Last catalog error. |
| `started_at` | `timestamptz` | nullable | Start time. |
| `completed_at` | `timestamptz` | nullable | Completion time. |

### desktop_connector_capabilities

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Capability identity. |
| `workspace_id` | `uuid` | FK workspaces | Tenant scope. |
| `device_id` | `uuid` | FK devices | Desktop device. |
| `capability_type` | `text` | telegram_local_bot_api | Capability. |
| `state` | `text` | running/stopped/degraded/crashed | Current state. |
| `max_upload_bytes` | `bigint` | nullable | Current limit. |
| `metadata` | `jsonb` | default `{}` | Version, port, mode, warnings. |
| `last_heartbeat_at` | `timestamptz` | not null | Expiry. |
| `expires_at` | `timestamptz` | not null | Capability expiry. |

### desktop_job_leases

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Lease identity. |
| `job_id` | `uuid` | not null | Queue job reference. |
| `device_id` | `uuid` | FK devices | Leasing desktop. |
| `workspace_id` | `uuid` | FK workspaces | Tenant scope. |
| `lease_state` | `text` | active/completed/expired/cancelled | Lease lifecycle. |
| `leased_at` | `timestamptz` | not null | Lease start. |
| `expires_at` | `timestamptz` | not null | Lease expiry. |
| `completed_at` | `timestamptz` | nullable | Completion time. |

Unique active lease per job is required.

### folders

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Logical folder. |
| `workspace_id` | `uuid` | FK workspaces | Owner. |
| `parent_folder_id` | `uuid` | nullable FK folders | Tree. |
| `name` | `text` | not null | Display name. |
| `path_cache` | `text` | not null | Fast browsing. |
| `sort_order` | `integer` | not null default 0 | Manual ordering. |
| `deleted_at` | `timestamptz` | nullable | Soft delete. |

Constraint: unique active folder name within same parent and workspace.

### resources

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Logical file resource. |
| `workspace_id` | `uuid` | FK workspaces | Owner. |
| `folder_id` | `uuid` | nullable FK folders | Logical location. |
| `created_by_user_id` | `uuid` | FK users | Creator. |
| `name` | `text` | not null | Canonical display filename. |
| `extension` | `text` | nullable | File extension. |
| `checksum_sha256` | `text` | not null | Deduplication. |
| `lifecycle_state` | `text` | active/archived/deleted/failed | UI state. |
| `index_status` | `text` | pending/indexed/failed | Search state. |
| `metadata` | `jsonb` | default `{}` | Extracted metadata. |
| `notes` | `text` | nullable | User notes. |
| `created_at` | `timestamptz` | not null | Audit. |
| `updated_at` | `timestamptz` | not null | Audit. |
| `deleted_at` | `timestamptz` | nullable | Soft delete. |

### file_versions

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Version identity. |
| `resource_id` | `uuid` | FK resources | Parent. |
| `version_number` | `integer` | unique per resource | Version order. |
| `size_bytes` | `bigint` | not null, >= 0 | Size. |
| `mime_type` | `text` | not null | Server-detected type. |
| `original_filename` | `text` | not null | Intake name. |
| `content_hash` | `text` | not null | Version hash. |
| `created_at` | `timestamptz` | not null | Audit. |

### storage_objects

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Provider object reference. |
| `file_version_id` | `uuid` | FK file_versions | Version. |
| `provider_account_id` | `uuid` | FK provider_accounts | Credential used. |
| `provider` | `text` | drive/telegram | Adapter. |
| `provider_object_id` | `text` | nullable until uploaded | External ID. |
| `provider_path` | `text` | nullable | External path or chat/message ref. |
| `sync_state` | `text` | queued/uploading/synced/failed/orphaned | State. |
| `last_verified_at` | `timestamptz` | nullable | Reconciliation. |
| `error_code` | `text` | nullable | Last failure. |
| `created_at` | `timestamptz` | not null | Audit. |

### upload_sessions and upload_session_items

Upload sessions group drag-and-drop batches. Items track per-file validation, local name, staged path, checksum, selected provider, and job state.

| Table | Key Constraints | Notes |
| --- | --- | --- |
| `upload_sessions` | FK user, workspace | Expires after configured timeout. |
| `upload_session_items` | FK session, optional resource | One row per dropped file. |

### tags and resource_tags

Tags are workspace-scoped labels. `resource_tags` is a join table with unique `(resource_id, tag_id)`.

### classifications

Stores AI and rule-based suggestions with confidence, source, suggested folder, suggested tags, reason text, status, and reviewer.

### audit_events

Append-only event table with actor, workspace, resource, action, target type, target ID, IP hash, user agent, before/after redacted diff, and correlation ID.

### ai_conversations and ai_messages

Track assistant conversations, source citations, prompt policy decisions, and user-visible messages. Do not store full sensitive document text unless policy permits.

## Edge Cases

- Soft-deleted folders must not make active resources unreachable; move resources to parent or keep hidden folder path based on delete mode.
- Checksums can collide theoretically; use checksum plus size and optional perceptual hash for media duplicates.
- Provider object IDs can be reused or invalidated externally; verify with provider metadata before destructive repair.
- JSON metadata requires schema versioning.

## Future Considerations

- Partition `audit_events` by month at scale.
- Move extracted text to a dedicated table or search engine if rows become large.
- Add row-level security for stronger workspace isolation.
- Add vector embeddings table with provider-specific dimensions.
