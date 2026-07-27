# Security Policy

## Supported Versions

StoragePK is under active development. Security updates are prioritized as
follows:

| Version | Support |
| --- | --- |
| Latest release | Full security support |
| Previous minor release | Critical fixes for up to 90 days |
| Older releases and unreleased forks | Not supported |

Users should upgrade to the latest release before reporting or validating a
fix.

## Reporting a Vulnerability

Do not open a public issue, discussion, or pull request for a suspected
vulnerability.

Use [GitHub private vulnerability reporting](https://github.com/TrisMinh/StoragePK/security/advisories/new)
to send the maintainers:

- the affected version, commit, and component;
- a concise impact assessment and realistic attack scenario;
- minimal reproduction steps or a proof of concept;
- relevant configuration and platform details; and
- a safe way to contact you for follow-up.

If private vulnerability reporting is unavailable, contact the repository owner
through a verified private contact method on their GitHub profile. Share only a
request to establish a secure channel until one is available.

Never include live access tokens, bot tokens, refresh tokens, OAuth client
secrets, private provider object links, user file names, or personal data. Use
redacted examples and test accounts.

## Response Process

Maintainers aim to acknowledge a complete report within five business days and
provide an initial assessment within ten business days. Timing for a fix and
public disclosure depends on severity, exploitability, provider coordination,
and release readiness.

The maintainers will:

1. confirm receipt and establish a private discussion;
2. reproduce and assess severity and affected versions;
3. coordinate a fix, tests, release notes, and any provider notification;
4. publish a patched release or mitigation; and
5. credit the reporter if requested and appropriate.

Please allow a reasonable remediation period before disclosure. The project
does not currently operate a paid bug-bounty program.

## Security Scope

Reports are especially useful for:

- authentication, authorization, session, or account-isolation failures;
- OAuth callback, PKCE, credential, keyring, or token-lifecycle weaknesses;
- unsafe desktop loopback services or local file access;
- path traversal, arbitrary file write/read, command execution, or injection;
- provider-routing failures that expose data across accounts;
- sensitive data in logs, builds, crash reports, or release artifacts; and
- vulnerable dependency behavior with a demonstrated StoragePK impact.

## Release Requirements

Every public release must satisfy the applicable checks in
`docs/deployment/release-gates.md`, including tests, secret and dependency
review, provider policy review, migration review, and desktop signing
requirements. GitHub Actions release credentials must come from repository
secrets and must never be hardcoded or printed.

## Safe Harbor

Good-faith research is welcome when it avoids privacy violations, data
destruction, service disruption, social engineering, and access beyond what is
necessary to demonstrate the issue. Stop testing and report immediately if you
encounter real user data or credentials.
