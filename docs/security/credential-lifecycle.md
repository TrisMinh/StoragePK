# Security - Credential Lifecycle

## Purpose

Define the complete lifecycle for StoragePK credentials, provider secrets, desktop tokens, encryption keys, rotation, revocation, audit, and incident response.

## Scope

This document covers Google refresh tokens, Telegram bot tokens, Telegram API ID/hash, desktop refresh tokens, JWT signing keys, KMS/envelope encryption, OS keychain storage, redaction validation, and compromise playbooks.

## Responsibilities

- Ensure secrets are never stored or exposed unsafely.
- Provide implementation-ready lifecycle rules.
- Define audit and incident response requirements.

## Assumptions

- Production uses KMS or equivalent envelope encryption.
- Desktop uses OS credential storage for device tokens.
- Provider credentials are decrypted only inside trusted API/worker/desktop contexts.

## Dependencies

- [secrets.md](secrets.md)
- [encryption.md](encryption.md)
- [../providers/compliance-readiness.md](../providers/compliance-readiness.md)
- [../providers/provider-threat-controls.md](../providers/provider-threat-controls.md)

## Detailed Explanation

### Credential Inventory

| Credential | Created By | Stored Where | Rotation Trigger |
| --- | --- | --- | --- |
| Google refresh token | OAuth callback | Encrypted DB vault | Reconnect, suspected exposure, user revoke. |
| Telegram bot token | User input | Encrypted DB vault | User rotation, bot compromise. |
| Telegram API hash | App/deployment config | Secret manager or desktop secure store | Incident or Telegram app rotation. |
| Desktop refresh token | Login | OS keychain/credential manager | Refresh rotation, device revoke. |
| JWT signing key | Deployment | Secret manager/KMS | Scheduled key rotation. |
| Data encryption key | KMS envelope | Wrapped in DB metadata | Master key rotation. |

### Decrypt Audit Event

Every provider credential decrypt must emit a security audit record:

```json
{
  "event": "credential.decrypt",
  "credentialType": "telegram_bot_token",
  "providerAccountId": "uuid",
  "actorType": "worker",
  "jobId": "uuid",
  "reason": "provider_upload",
  "requestId": "req_123",
  "occurredAt": "2026-07-27T10:00:00Z"
}
```

Rules:

- Do not log decrypted value.
- Decrypt only for the minimum duration.
- Keep decrypted value in memory only.
- Redact request URLs containing Telegram bot token.

### Compromise Playbooks

| Incident | Immediate Action | Follow-Up |
| --- | --- | --- |
| Google refresh token leaked | Revoke provider account, rotate app secret if needed. | Reconnect user, audit provider activity. |
| Telegram bot token leaked | Revoke token via BotFather, save new token, pause jobs. | Audit channel messages and repair failed jobs. |
| Desktop device stolen | Revoke device sessions. | Invalidate connector jobs and rotate affected tokens. |
| KMS key concern | Disable key, rewrap credentials with new key. | Review decrypt audit and logs. |
| Local server exposed | Stop server, rotate bot token, inspect logs. | Add firewall rule and release patch. |

### Redaction Tests

Required tests:

- API responses never include `encrypted_credentials`.
- Logs never include OAuth refresh tokens.
- Logs never include Telegram bot tokens in URL path.
- Audit events include credential reference, not secret value.
- Error details never include provider authorization headers.

## Edge Cases

- Telegram bot token appears in local Bot API URL path; request logger must sanitize paths.
- Desktop crash dump can include process args; avoid passing secrets as command-line args when possible.
- KMS outage prevents provider jobs; fail closed without plaintext fallback.
- User exports workspace data; provider credentials are excluded.

## Future Considerations

- Add secret scanning CI.
- Add hardware-backed desktop secure storage.
- Add automated key rotation drills.

