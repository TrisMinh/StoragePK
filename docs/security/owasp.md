# Security - OWASP Top 10

## Purpose

Map StoragePK controls to OWASP Top 10 web application risks.

## Scope

This document covers OWASP categories relevant to API, web, desktop webview, upload, provider integration, and AI-assisted features.

## Responsibilities

- Ensure common web risks are addressed.
- Provide implementation and testing checkpoints.
- Link security docs to backend and frontend behavior.

## Assumptions

- StoragePK exposes authenticated web APIs.
- Desktop app uses embedded web technologies and API tokens.
- Users upload untrusted files.

## Dependencies

- [threats.md](threats.md)
- [vulnerabilities.md](vulnerabilities.md)
- [../backend/middleware.md](../backend/middleware.md)

## Detailed Explanation

| OWASP Risk | StoragePK Controls |
| --- | --- |
| Broken Access Control | Server-side authorization, workspace scoping, permission-filtered search/AI. |
| Cryptographic Failures | TLS, encrypted provider credentials, hashed refresh tokens, encrypted backups. |
| Injection | Parameterized queries, DTO validation, filename normalization, safe extraction. |
| Insecure Design | Threat modeling, repair workflows, audit logs, provider abstraction. |
| Security Misconfiguration | Hardened headers, minimal health endpoints, environment isolation. |
| Vulnerable Components | Dependency scanning, container scanning, patch SLAs. |
| Identification/Auth Failures | Short access tokens, refresh rotation, device revocation, MFA-ready flows. |
| Software/Data Integrity Failures | CI checks, signed releases for desktop, job payload validation. |
| Logging/Monitoring Failures | Structured logs, security events, provider anomaly alerts. |
| SSRF | Restrict server-side URL fetching, validate provider endpoints, deny arbitrary URL imports by default. |

Testing checkpoints:

- Attempt cross-workspace resource access by ID.
- Attempt search result leakage after permission revocation.
- Upload files with misleading extension and MIME.
- Submit filenames with path traversal and control characters.
- Replay refresh tokens.
- Inject instructions into documents used by AI.

## Edge Cases

- Desktop webview can introduce platform-specific security settings.
- Public share links, when added, expand access-control risk significantly.
- File previews must sandbox active content.
- Admin diagnostic endpoints can leak infrastructure details.

## Future Considerations

- Add ASVS checklist.
- Add desktop security baseline.
- Add automated DAST in staging.

