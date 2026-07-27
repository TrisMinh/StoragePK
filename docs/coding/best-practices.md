# Coding - Best Practices

## Purpose

Define engineering practices for building StoragePK safely and sustainably.

## Scope

This document covers architecture discipline, reliability, security, performance, testing, documentation, and review expectations.

## Responsibilities

- Help future implementation agents make senior-level decisions.
- Keep changes focused and production-minded.
- Preserve user trust around files.

## Assumptions

- StoragePK handles user-important files and metadata.
- Reliability and recoverability matter more than flashy automation.
- External providers are unreliable boundaries.

## Dependencies

- [naming.md](naming.md)
- [conventions.md](conventions.md)
- [../testing/strategy.md](../testing/strategy.md)
- [../security/threats.md](../security/threats.md)

## Detailed Explanation

Best practices:

| Practice | Reason |
| --- | --- |
| Make state machines explicit. | Upload and repair workflows need safe transitions. |
| Validate at boundaries. | Clients, providers, AI, and queues are untrusted inputs. |
| Prefer idempotent workers. | Retries are unavoidable. |
| Audit meaningful writes. | Users must trust file history. |
| Separate metadata from provider bytes. | Providers are adapters, not canonical taxonomy. |
| Design for repair. | External failures should be recoverable. |
| Keep AI confirmable. | Automation must not surprise users. |
| Test permission filters deeply. | Search and AI leakage are critical risks. |

Review checklist:

- Does this change preserve canonical metadata ownership?
- Are provider errors mapped to actionable states?
- Are secrets redacted?
- Are permissions enforced server-side?
- Are job retries idempotent?
- Are docs and tests updated?

## Edge Cases

- A "simple rename" can affect search, audit, provider mirror paths, and AI citations.
- A retry can duplicate provider objects if idempotency is missing.
- A UI-only permission check can leak via direct API call.
- A provider success response can arrive after client cancellation.

## Future Considerations

- Add ADR process.
- Add production readiness checklist.
- Add incident review template.

