# 07 - Non-Functional Requirements

## Purpose

Define quality attributes required for a trustworthy file system layer.

## Scope

This document covers reliability, performance, security, privacy, usability, observability, scalability, and maintainability.

## Responsibilities

- Convert quality expectations into measurable targets.
- Guide architecture trade-offs.
- Support production readiness reviews.

## Assumptions

- MVP is optimized for one user to small teams, not enterprise scale.
- External providers can throttle, fail, or change limits.

## Dependencies

- [security/threats.md](security/threats.md)
- [deployment/monitoring.md](deployment/monitoring.md)
- [testing/performance.md](testing/strategy.md)

## Detailed Explanation

| Category | Requirement | Target |
| --- | --- | --- |
| Reliability | No silent data loss. | Every failed transition has repair state. |
| Upload Performance | Small files feel immediate. | Files under 50 MB indexed within 15 seconds on stable network. |
| Search Performance | Metadata search is interactive. | P95 under 800 ms for 100k resources. |
| Security | Secrets are encrypted at rest. | AES-256-GCM or managed KMS envelope encryption. |
| Privacy | AI processing is explicit and policy-controlled. | Sensitive categories can disable external AI. |
| Availability | Core metadata API remains usable during provider outage. | Provider outage degrades upload/open, not library browsing. |
| Observability | Every job and provider call is traceable. | Correlation IDs across API, worker, provider logs. |
| Accessibility | Web app is keyboard and screen-reader usable. | WCAG 2.2 AA target. |

## Edge Cases

- Provider API latency spikes should not block the whole intake UI.
- Search index downtime should degrade to DB metadata search.
- Desktop queue corruption must trigger safe re-scan, not data deletion.
- Clock skew can affect audit ordering; server timestamps are authoritative.

## Future Considerations

- Multi-region metadata deployment.
- End-to-end encrypted user vault.
- Formal privacy export and deletion workflows.

