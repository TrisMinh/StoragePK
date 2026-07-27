# Providers - Testing Matrix

## Purpose

Define provider-specific tests required before StoragePK provider integration is accepted.

## Scope

This document covers unit, integration, E2E, desktop, security, quota, policy, recovery, and operational tests for Drive, Telegram, storage pools, and desktop local server mode.

## Responsibilities

- Make provider behavior verifiable.
- Prevent hidden failure modes.
- Define release gates for provider functionality.

## Assumptions

- Most tests use mocks and contract fakes.
- Staging smoke tests use disposable Drive accounts and Telegram destinations.
- Desktop local server tests can use a local test process or fake server.

## Dependencies

- [provider-error-catalog.md](provider-error-catalog.md)
- [provider-state-machines.md](provider-state-machines.md)
- [desktop-connector-protocol.md](desktop-connector-protocol.md)
- [../testing/strategy.md](../testing/strategy.md)

## Detailed Explanation

### Unit Tests

| Area | Required Tests |
| --- | --- |
| Routing | `fill_first`, `balanced`, `rule_based`, `failover`, `replicated`, tie-breakers. |
| Capacity | Drive usable quota, Telegram per-file caps, stale snapshots. |
| Errors | Raw provider errors map to catalog codes. |
| Credential vault | Encrypt, decrypt, rotate, redact. |
| Permission | Provider manage/read/repair permissions. |
| State machines | Valid and invalid provider/storage/desktop transitions. |

### Integration Tests

| Area | Required Tests |
| --- | --- |
| Drive OAuth callback | State validation, scope validation, duplicate account, identity mismatch. |
| Desktop one-click OAuth | Packaged matching Client ID/Secret fallback, blank manual fields, random loopback port, exact callback path/state, mandatory PKCE `S256`, and Client Secret in code/refresh token requests. |
| Telegram linking | Bot token, destination, send permission, privacy acknowledgement. |
| Storage pools | Create pool, update priorities, simulate route, no healthy account. |
| Worker upload | Idempotency, timeout after success, fallback, replication partial failure. |
| Desktop connector | Heartbeat, lease, progress, lease expiry, completion. |
| Capability snapshots | Expiry, update, route impact. |

### E2E Tests

| Scenario | Expected Result |
| --- | --- |
| Connect 2 Drive accounts and upload files until first threshold. | Files route to second account after threshold. |
| Install a production `0.3.0` build and select **Kết nối Google Drive** with blank manual fields. | Browser consent starts with the packaged Client ID and returns automatically through loopback. |
| Connect Telegram public and upload 60 MB file. | Upload is blocked or rerouted with clear error. |
| Enable desktop local Telegram and upload 100 MB file from desktop. | File uploads through local server and appears in Telegram destination. |
| Queue web upload requiring desktop local Telegram while desktop offline. | Job waits or reroutes according to pool policy. |
| Add another Telegram account to channel after upload. | Docs/UI warning explains Telegram membership access. |
| Revoke Drive account in pool. | New uploads skip account; existing files show provider degraded if needed. |

### Security Tests

- Provider secrets never appear in logs, API responses, or audit payloads.
- Release inspection confirms the Client Secret is absent from tracked source configuration and logs, supplied only through the protected build environment, and expected to be recoverable from packaged desktop resources.
- Authorization and refresh tests fail closed when the packaged Client Secret is missing, while still requiring a valid PKCE verifier for code exchange.
- Desktop local server binds to localhost by default.
- Public bind requires explicit advanced confirmation and firewall warning.
- Search/AI does not expose Telegram-stored files without StoragePK permission.
- Telegram channel membership warning appears during linking and settings.

## Edge Cases

- Test consent project remains in **Testing** for more than seven days; health check requires reconnect and the release gate remains blocked.
- Test provider rate limiting with forced 429/slowdown responses.
- Test desktop laptop sleep during upload.
- Test local server crash after Telegram upload but before DB completion.
- Test Drive email change with same subject ID.
- Test Telegram bot removed from channel mid-job.

## Future Considerations

- Add nightly real-provider smoke tests.
- Add property-based tests for routing scores.
- Add chaos testing for worker/provider outages.
