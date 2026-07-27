# Database - Migrations

## Purpose

Define how database schema changes are created, reviewed, applied, rolled back, and monitored.

## Scope

This document covers migration naming, transactional safety, zero-downtime patterns, seed data, backfills, rollback, and production gates.

## Responsibilities

- Prevent unsafe schema changes.
- Make database evolution predictable.
- Ensure workers and API versions remain compatible during deploys.

## Assumptions

- Migrations are version-controlled and reviewed with application changes.
- Production deploys can run API and worker versions side by side during rollout.
- Large backfills run as explicit jobs, not as blocking migrations.

## Dependencies

- [schema.md](schema.md)
- [indexes.md](indexes.md)
- [../deployment/ci-cd.md](../deployment/ci-cd.md)

## Detailed Explanation

Migration rules:

| Rule | Requirement |
| --- | --- |
| Naming | `YYYYMMDDHHMMSS_descriptive_name`. |
| Review | Every migration must include purpose, rollback notes, and expected lock behavior. |
| Transactions | Use transactional DDL when possible. |
| Backfills | Do not backfill millions of rows inside a blocking migration. |
| Compatibility | Add nullable columns before writing, then backfill, then enforce constraints. |
| Indexes | Create large indexes concurrently in production. |
| Rollback | Destructive migrations require explicit restore plan. |

Safe rollout pattern:

1. Add new nullable column or table.
2. Deploy code that writes both old and new shape.
3. Backfill existing rows.
4. Deploy code that reads new shape.
5. Add constraints and remove old fields in a later release.

## Edge Cases

- Worker jobs created before migration may contain older payload shape; job handlers need version checks.
- Failed migrations must leave the database in a known state.
- Renaming enum values can break older app versions; prefer lookup tables or check constraints.
- Rollbacks cannot recover dropped data without backups.

## Future Considerations

- Add migration dry-run in CI against anonymized production snapshot.
- Add automated schema drift detection.
- Add database performance baseline after each migration.

