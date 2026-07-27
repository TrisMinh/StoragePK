# Coding - Naming

## Purpose

Define naming conventions for future StoragePK implementation.

## Scope

This document covers files, directories, variables, services, database objects, API routes, events, jobs, and permissions.

## Responsibilities

- Keep implementation consistent.
- Make names meaningful across frontend, backend, and database.
- Avoid ambiguous provider terminology.

## Assumptions

- Future implementation uses TypeScript for most app code.
- Database uses snake_case.
- API uses kebab-case route segments and camelCase JSON fields.

## Dependencies

- [conventions.md](conventions.md)
- [best-practices.md](best-practices.md)
- [../architecture/folder-structure.md](../architecture/folder-structure.md)

## Detailed Explanation

Naming rules:

| Area | Convention | Example |
| --- | --- | --- |
| TypeScript files | kebab-case | `upload-session.service.ts` |
| React components | PascalCase | `UploadDropZone.tsx` |
| Variables/functions | camelCase | `providerAccountId` |
| Classes | PascalCase | `ProviderRouterService` |
| DB tables/columns | snake_case | `provider_accounts`, `created_at` |
| API routes | kebab-case plural nouns | `/v1/upload-sessions` |
| Events | dot-separated domain events | `upload.item.failed` |
| Jobs | kebab-case | `provider-upload` |
| Permissions | colon-separated action | `resource:update` |

Domain terms:

- Use `resource` for logical file record.
- Use `file_version` for a specific version of bytes.
- Use `storage_object` for provider object reference.
- Use `provider_account` for connected Drive/Telegram credential.
- Use `folder` for StoragePK logical taxonomy, not provider folder.

## Edge Cases

- Avoid naming provider object IDs as `fileId` without provider prefix.
- Avoid using `driveFolder` as canonical taxonomy.
- Avoid `data` or `payload` variables when a specific name exists.
- Avoid abbreviations except common IDs and URLs.

## Future Considerations

- Add lint rules for file naming.
- Add generated API naming checks.
- Add event catalog validation.

