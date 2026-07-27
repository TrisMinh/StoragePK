# Security - Vulnerability Management

## Purpose

Define how StoragePK prevents, detects, triages, fixes, and verifies security vulnerabilities.

## Scope

This document covers dependency scanning, static analysis, dynamic testing, container scanning, secret scanning, disclosure, and patch SLAs.

## Responsibilities

- Maintain a repeatable vulnerability process.
- Prioritize fixes by risk and exploitability.
- Ensure vulnerabilities do not silently reach production.

## Assumptions

- CI runs security checks before merge.
- Production dependencies are pinned and reviewed.
- Vulnerability severity follows CVSS plus product context.

## Dependencies

- [owasp.md](owasp.md)
- [../deployment/ci-cd.md](../deployment/ci-cd.md)
- [../testing/strategy.md](../testing/strategy.md)

## Detailed Explanation

Required checks:

| Check | When | Blocks Release |
| --- | --- | --- |
| Dependency audit | Every PR and nightly | High/critical exploitable issues. |
| Secret scan | Every PR | Any real secret. |
| Static analysis | Every PR | High-confidence security findings. |
| Container scan | Build pipeline | High/critical runtime CVEs. |
| IaC scan | Infrastructure changes | Public exposure or unsafe permissions. |
| Dynamic scan | Staging release | Critical auth/session issues. |

Patch SLAs:

| Severity | Response |
| --- | --- |
| Critical | Same day triage, emergency fix path. |
| High | Fix or mitigation within 7 days. |
| Medium | Fix within normal sprint. |
| Low | Backlog with documented risk. |

## Edge Cases

- False positives require documented suppression with owner and expiry.
- Vulnerability in provider SDK may need mitigation even before vendor fix.
- Desktop app auto-update vulnerabilities require separate incident path.
- AI prompt injection is treated as security when it causes data exposure or unsafe actions.

## Future Considerations

- Add bug bounty or responsible disclosure policy.
- Add third-party penetration test before public launch.
- Add SBOM generation.

