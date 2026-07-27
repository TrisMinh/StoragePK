# API - Authentication

## Purpose

Define authentication endpoints, token behavior, request requirements, and error responses.

## Scope

This document covers login, OAuth callback, token refresh, logout, session listing, device registration, and provider connection authentication.

## Responsibilities

- Provide endpoint contracts for client implementation.
- Ensure auth flows support web and desktop clients.
- Define validation, rate limits, and error behavior.

## Assumptions

- Web uses secure HTTP-only cookies for browser sessions.
- Desktop uses short-lived access tokens and refresh-token rotation tied to a registered device.
- MFA is architecture-ready even if MVP starts with OAuth and email login.

## Dependencies

- [../auth/authentication.md](../auth/authentication.md)
- [../auth/session-management.md](../auth/session-management.md)
- [error-handling.md](error-handling.md)
- [rate-limit.md](rate-limit.md)

## Detailed Explanation

### POST `/v1/auth/login`

| Field | Value |
| --- | --- |
| Purpose | Start email/password or magic-link login. |
| Authentication | None. |
| Authorization | Public. |
| Rate Limit | Strict per IP and email. |

Request:

```json
{
  "email": "user@example.com",
  "password": "redacted",
  "deviceName": "Demo Desktop",
  "clientType": "desktop"
}
```

Response:

```json
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "accessToken": "short-lived-token",
  "refreshToken": "rotating-refresh-token",
  "expiresIn": 900
}
```

Possible errors: `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `MFA_REQUIRED`, `RATE_LIMITED`.

### POST `/v1/auth/refresh`

Purpose: rotate refresh token and issue a new access token.

Validation:

- Refresh token must exist, be unexpired, not revoked, and match registered device.
- Token reuse after rotation triggers session family revocation.

### POST `/v1/auth/logout`

Purpose: revoke current session.

Authentication: required.

Request body: current refresh token. The access token is supplied through the Bearer header.

Response: `204 No Content`.

### GET `/v1/auth/sessions`

Purpose: list active sessions and devices.

Authorization: current user only.

### DELETE `/v1/auth/sessions/{sessionId}`

Purpose: revoke a specific session.

Authorization: current user for own session; admin for workspace-managed sessions.

## Edge Cases

- Desktop clock skew should not break refresh if server validates absolute token expiry.
- Refresh token reuse indicates theft and must revoke the token family.
- Web CSRF protection must apply to cookie-authenticated mutating requests.
- OAuth callback can be opened from desktop browser and must deep-link back safely.

## Future Considerations

- Add passkeys.
- Add SAML/enterprise SSO.
- Add hardware key MFA.
