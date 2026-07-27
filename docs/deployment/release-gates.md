# Deployment - Release Gates

## Purpose

Define auditable release gates for StoragePK, with emphasis on provider integrations, desktop packages, security evidence, and rollback readiness.

## Scope

This document covers required evidence, owners, blocking criteria, provider policy review, security scans, staging smoke tests, desktop signing, SBOM/provenance, canary, and rollback rehearsal.

## Responsibilities

- Prevent release without verifiable evidence.
- Assign owner for each release gate.
- Make provider policy and local desktop safety release-blocking where necessary.

## Assumptions

- MVP can ship behind feature flags.
- Production release uses protected branch or manual approval.
- Provider features require smoke tests in staging.

## Dependencies

- [ci-cd.md](ci-cd.md)
- [monitoring.md](monitoring.md)
- [../providers/provider-release-checklist.md](../providers/provider-release-checklist.md)
- [../providers/compliance-readiness.md](../providers/compliance-readiness.md)
- [../security/credential-lifecycle.md](../security/credential-lifecycle.md)

## Detailed Explanation

| Gate | Evidence | Owner | Blocks Release |
| --- | --- | --- | --- |
| Unit/integration/e2e tests | CI report | QA | Yes |
| Provider test matrix | Drive/Telegram smoke report | QA/Backend | Yes for provider release |
| OAuth scope review | Scope list and policy signoff | Security | Yes |
| Privacy disclosure | Published copy and consent screen text | Product/Legal | Yes |
| Secret scan | CI artifact | Security | Yes |
| Dependency/container scan | CI artifact | Security/DevOps | High/critical exploitable issues |
| SBOM/provenance | Build artifact | DevOps | Yes before public release |
| Desktop signing | Signed installer/hash | Desktop/DevOps | Yes for desktop release |
| Local Bot API hardening | Checklist evidence | Security/Desktop | Yes for local mode |
| Staging smoke | Upload/download/repair report | QA/Ops | Yes |
| Rollback rehearsal | Rollback notes and tested command | DevOps | Yes |
| Runbook review | Reviewed runbook version | Ops | Yes |

### Controlled Unsigned Pre-Release

An unsigned Windows build may be published only as an explicitly labeled GitHub **pre-release** for controlled testing. The release workflow requires a manual `workflow_dispatch` approval input, verifies that the immutable version tag matches `package.json`, records the unsigned Authenticode result, and refuses to replace an existing release asset. This exception does not satisfy the production signing gate above.

### Provider Policy Version Check

Every release touching provider code must record:

```json
{
  "googleDriveScopeSet": ["https://www.googleapis.com/auth/drive.file"],
  "telegramPublicUploadLimitBytes": 52428800,
  "telegramLocalUploadLimitBytes": 2097152000,
  "policyReviewedAt": "2026-07-27",
  "reviewer": "security-owner"
}
```

## Edge Cases

- Emergency security patch can bypass non-critical gates only with incident owner approval.
- Provider feature flag disabled means provider smoke gate can be deferred for unrelated release.
- Desktop local mode cannot ship without signed package and hardening evidence.
- Public OAuth launch cannot proceed with broad Drive scope unless verification path is complete.

## Future Considerations

- Generate release evidence bundle automatically.
- Add progressive canary deploy.
- Add automated rollback verification.
