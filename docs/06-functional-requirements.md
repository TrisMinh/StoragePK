# 06 - Functional Requirements

## Purpose

Define what StoragePK must do in implementation-ready language.

## Scope

Requirements cover clients, API, storage providers, metadata, AI, search, audit, and administration.

## Responsibilities

- Provide testable functional behavior.
- Map features to services and endpoints.
- Define required states and transitions.

## Assumptions

- All resources belong to a workspace.
- A resource can have multiple versions, but MVP exposes only the latest version in the main library.

## Dependencies

- [05-feature-list.md](05-feature-list.md)
- [backend/services.md](backend/services.md)
- [database/schema.md](database/schema.md)

## Detailed Explanation

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-001 | The system shall create an intake session for every drag-and-drop batch. | MVP |
| FR-002 | The system shall calculate SHA-256 for every file before final metadata commit. | MVP |
| FR-003 | The system shall detect duplicate content by checksum within the same workspace. | MVP |
| FR-004 | The system shall upload files to Google Drive using resumable upload for large files. | MVP |
| FR-005 | The system shall upload Telegram-compatible files to a configured chat/channel through a bot adapter. | MVP |
| FR-006 | The system shall classify files by MIME type, extension, content signals, OCR text, and user rules. | MVP |
| FR-007 | The system shall allow users to edit category, tags, folder, notes, and provider route before commit. | MVP |
| FR-008 | The system shall index metadata and extracted text for search. | MVP |
| FR-009 | The system shall keep provider object IDs and sync status for every resource version. | MVP |
| FR-010 | The system shall expose a repair center for failed uploads and provider drift. | MVP |
| FR-011 | The system shall record audit events for all create, update, upload, delete, restore, and repair actions. | MVP |
| FR-012 | The desktop app shall continue queued uploads after restart. | MVP |

## Edge Cases

- If checksum fails, upload must not start.
- If provider upload succeeds but DB commit fails, reconciliation must detect orphaned provider objects.
- If metadata commit succeeds but search indexing fails, resource remains usable with `index_status=pending`.
- If a user removes provider permission, resources remain listed with degraded provider health.

## Future Considerations

- Version compare and restore.
- Provider migration per collection.
- Rule builder with dry-run simulation.
- Multi-user comments and approvals.

