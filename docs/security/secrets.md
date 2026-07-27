# Security - Secrets

## Purpose

Define how StoragePK creates, stores, accesses, rotates, and audits secrets.

## Scope

This document covers application secrets, provider credentials, OAuth client secrets, Telegram bot tokens, database URLs, signing keys, and CI/CD secrets.

## Responsibilities

- Prevent secret leakage.
- Standardize secret handling across environments.
- Keep production credentials isolated.

## Assumptions

- Local uses `.env` files ignored by Git.
- Staging and production use a secret manager.
- CI/CD receives secrets through secure environment injection.

## Dependencies

- [encryption.md](encryption.md)
- [credential-lifecycle.md](credential-lifecycle.md)
- [../deployment/environments.md](../deployment/environments.md)
- [../deployment/ci-cd.md](../deployment/ci-cd.md)

## Detailed Explanation

Secret categories:

| Secret | Storage | Rotation |
| --- | --- | --- |
| JWT signing key | Secret manager | Scheduled and incident-based. |
| Provider OAuth client secret | Secret manager | Provider policy. |
| Google refresh tokens | Encrypted DB vault | User reconnect or incident. |
| Telegram bot token | Encrypted DB vault | User/admin rotation. |
| Database URL | Secret manager | Infrastructure rotation. |
| Redis URL | Secret manager | Infrastructure rotation. |
| AI provider key | Secret manager | Scheduled and incident-based. |

Rules:

- Never commit `.env` files.
- Never log secret values or provider authorization headers.
- Never return stored secrets from API after creation.
- Support secret versioning and rollback during deploys.
- Separate local, staging, and production credentials.

## Edge Cases

- User pastes Telegram bot token into UI; display only masked confirmation after save.
- Provider token refresh can fail; preserve old token only if provider contract allows and it is still valid.
- CI logs can leak build-time env vars; mask secrets and avoid `set -x` style output.
- Secret manager outage should degrade provider operations safely.

## Future Considerations

- Add automated secret scanning in CI.
- Add just-in-time access to production secrets.
- Add key ceremony docs for production launch.
