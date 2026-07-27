# Providers - Release Checklist

## Purpose

Define release gates that must pass before provider features ship.

## Scope

This checklist covers Drive, Telegram, local Bot API server, storage pools, routing, desktop connector, docs, tests, security, and operations.

## Responsibilities

- Prevent unfinished provider integration from reaching users.
- Provide a go/no-go checklist for MVP.
- Tie implementation to documentation.

## Assumptions

- Provider release can be staged by feature flag.
- Public launch requires policy and privacy review.
- Desktop local server mode can ship after basic Drive/Telegram public mode if needed.

## Dependencies

- [implementation-handoff.md](implementation-handoff.md)
- [provider-testing-matrix.md](provider-testing-matrix.md)
- [provider-runbook.md](provider-runbook.md)
- [policy-and-feasibility.md](policy-and-feasibility.md)

## Detailed Explanation

Release checklist:

| Gate | Required |
| --- | --- |
| Production desktop package contains matching `STORAGEPK_GOOGLE_CLIENT_ID` and `STORAGEPK_GOOGLE_CLIENT_SECRET` values. | Yes |
| Client Secret is injected through protected build configuration and absent from tracked files/logs. | Yes |
| End-user Drive flow starts without manual Cloud project or credential entry. | Yes |
| Drive OAuth uses automatic loopback callback and mandatory PKCE `S256` in addition to the Client Secret. | Yes |
| Drive OAuth uses approved scopes and privacy copy. | Yes |
| Consent project is **In production**, not **Testing**. | Yes |
| Applicable basic verification for non-sensitive `drive.file` is recorded. | Yes |
| Drive reconnect identity mismatch is blocked. | Yes |
| Telegram public mode warns about file limits and channel access. | Yes |
| Telegram local mode binds localhost by default. | Yes |
| Storage pools show selected account and skipped reasons. | Yes |
| Route decision is saved and audited. | Yes |
| Worker revalidates provider before upload. | Yes |
| Provider error catalog is implemented in API/UI. | Yes |
| Desktop connector leases are idempotent. | Yes |
| Secrets are encrypted and redacted. | Yes |
| Provider tests pass. | Yes |
| Runbook is reviewed. | Yes |
| Feature flags and rollback path exist. | Yes |

Ship blockers:

- Raw provider token appears in logs or API.
- A Google Client Secret is committed, logged, or exposed outside the expected desktop binary packaging.
- The production installer lacks either matching OAuth build value or requires end users to create a Cloud project.
- PKCE is disabled because a Client Secret is present.
- The consent project remains in **Testing**, causing seven-day refresh-token expiry.
- Release copy implies Google verification is complete without recorded evidence.
- Full Drive scope is used without verification plan.
- Telegram large-file mode claims to work without local/server Bot API.
- Web/cloud tries to call a user's localhost.
- Route decision does not record selected provider account.
- Failed upload can silently disappear without repair state.

## Edge Cases

- Internal-only builds may enable broader Drive tests, but public builds must follow policy docs.
- Desktop local mode can be disabled by feature flag if packaging is not ready.
- Telegram archive can ship without large-file mode as long as limits are visible.

## Future Considerations

- Add automated release checklist in CI.
- Add policy review sign-off workflow.
- Add provider release notes template.
