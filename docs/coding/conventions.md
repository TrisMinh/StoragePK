# Coding - Conventions

## Purpose

Define coding conventions for future StoragePK implementation.

## Scope

This document covers TypeScript, API contracts, database access, errors, testing, security, and documentation updates.

## Responsibilities

- Keep code readable and maintainable.
- Align implementation with architecture docs.
- Reduce accidental complexity.

## Assumptions

- Implementation uses strict TypeScript.
- Shared contracts are generated or validated from schemas.
- Formatting and linting run in CI.

## Dependencies

- [naming.md](naming.md)
- [best-practices.md](best-practices.md)
- [../api/error-handling.md](../api/error-handling.md)

## Detailed Explanation

Conventions:

| Area | Rule |
| --- | --- |
| TypeScript | Strict mode, no implicit any, explicit domain types. |
| API DTOs | Runtime validation for every external request. |
| Errors | Throw domain errors and map through standard error filter. |
| Services | Business rules live in services, not controllers. |
| Repositories | Repositories own database queries. |
| Providers | Use adapter interface; no provider-specific code in controllers. |
| Tests | Add tests near changed behavior. |
| Docs | Update docs when behavior or contracts change. |

Code organization:

- Keep modules small and domain-focused.
- Prefer dependency injection for external services.
- Avoid circular dependencies between modules.
- Use typed event/job payloads.
- Version long-lived job payloads.

## Edge Cases

- Provider SDK errors should be translated immediately at adapter boundary.
- Upload streaming code must avoid buffering entire large files in memory.
- AI output must be schema-validated before saving.
- Desktop native APIs need explicit permission boundaries.

## Future Considerations

- Add automated architecture dependency checks.
- Add generated OpenAPI client.
- Add shared ESLint/Prettier config.

