# Database - ER Diagram

## Purpose

Show the core StoragePK metadata model and entity relationships.

## Scope

This document covers user, workspace, provider, resource, classification, search, AI, and audit entities.

## Responsibilities

- Provide a visual overview of database relationships.
- Align schema and migration docs.
- Help engineers understand cascade and ownership paths.

## Assumptions

- PostgreSQL is the canonical database.
- File bytes live in providers, not in PostgreSQL.
- All primary entities use UUID identifiers.

## Dependencies

- [schema.md](schema.md)
- [indexes.md](indexes.md)
- [migrations.md](migrations.md)

## Detailed Explanation

```mermaid
erDiagram
  users ||--o{ workspace_members : joins
  workspaces ||--o{ workspace_members : has
  users ||--o{ devices : owns
  users ||--o{ provider_accounts : connects
  workspaces ||--o{ folders : contains
  workspaces ||--o{ resources : owns
  folders ||--o{ resources : groups
  resources ||--o{ file_versions : versions
  file_versions ||--o{ storage_objects : stored_as
  resources ||--o{ resource_tags : tagged
  tags ||--o{ resource_tags : labels
  resources ||--o{ classifications : classified
  resources ||--o{ upload_session_items : intake_item
  upload_sessions ||--o{ upload_session_items : includes
  upload_sessions ||--o{ ingestion_jobs : creates
  resources ||--o{ search_documents : indexed
  resources ||--o{ audit_events : audited
  users ||--o{ audit_events : performs
  users ||--o{ ai_conversations : starts
  ai_conversations ||--o{ ai_messages : contains

  users {
    uuid id PK
    text email
    text display_name
    text status
  }
  workspaces {
    uuid id PK
    text name
    text slug
  }
  resources {
    uuid id PK
    uuid workspace_id FK
    uuid folder_id FK
    text name
    text checksum_sha256
    text lifecycle_state
  }
  file_versions {
    uuid id PK
    uuid resource_id FK
    integer version_number
    bigint size_bytes
    text mime_type
  }
  storage_objects {
    uuid id PK
    uuid file_version_id FK
    text provider
    text provider_object_id
    text sync_state
  }
```

## Edge Cases

- A resource can temporarily have no successful storage object while upload is failed.
- A file version can have multiple storage objects during migration or replication.
- A folder can be soft-deleted while resources are retained or moved according to policy.
- Audit events reference deleted users by preserving actor snapshots.

## Future Considerations

- Add vector table or external vector index references.
- Add teams, roles, and group permission entities.
- Add retention and legal hold entities.

