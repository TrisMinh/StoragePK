# Auth - Authentication

## Purpose

Define how users prove identity to StoragePK.

## Scope

This document covers login methods, OAuth, token lifecycle, desktop device trust, MFA readiness, and provider account connection.

## Responsibilities

- Keep account access secure.
- Support web and desktop clients.
- Provide a path to stronger authentication.

## Assumptions

- MVP supports email login and optional OAuth identity providers.
- Provider OAuth for Google Drive is separate from StoragePK login.
- Desktop devices are registered and revocable.

## Dependencies

- [session-management.md](session-management.md)
- [authorization.md](authorization.md)
- [../api/authentication.md](../api/authentication.md)

## Detailed Explanation

Authentication flows:

| Flow | Use |
| --- | --- |
| Email/password or magic link | StoragePK account login. |
| OAuth identity login | Optional sign-in with Google/Microsoft/etc. |
| Google Drive OAuth | Provider connection, not account login by itself. |
| Telegram bot token setup | Provider connection through user-provided bot/channel config. |
| Desktop device registration | Bind refresh tokens to trusted desktop install. |

Token rules:

- Access tokens are short-lived.
- Refresh tokens rotate on every use.
- Refresh token reuse revokes the session family.
- Web sessions use secure HTTP-only cookies where possible.
- Desktop stores refresh tokens in OS credential storage.

## Edge Cases

- User changes password: revoke existing refresh tokens unless policy says otherwise.
- Provider connection expires: user remains logged in but uploads to that provider stop.
- Desktop device is stolen: user can revoke device from settings.
- OAuth callback opened in wrong browser profile: require account confirmation.

## Future Considerations

- Add passkeys.
- Add MFA enrollment and recovery codes.
- Add enterprise SSO.

