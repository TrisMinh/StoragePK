# API - Users

## Purpose

Define user, workspace, preference, and device APIs.

## Scope

This document covers profile retrieval, profile update, preferences, workspace membership, and device status.

## Responsibilities

- Provide user-related contracts.
- Separate identity from workspace permissions.
- Support consistent settings across web and desktop.

## Assumptions

- A user can belong to multiple workspaces in future releases.
- MVP may create one default personal workspace.

## Dependencies

- [authentication.md](authentication.md)
- [../database/schema.md](../database/schema.md)
- [../auth/authorization.md](../auth/authorization.md)

## Detailed Explanation

### GET `/v1/me`

Purpose: return current user, default workspace, preferences, and device policy.

Authentication: required.

Response:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Demo User"
  },
  "defaultWorkspaceId": "uuid",
  "preferences": {
    "theme": "system",
    "density": "comfortable",
    "defaultProvider": "drive"
  }
}
```

### PATCH `/v1/me`

Purpose: update display name and preferences.

Validation:

- Display name: 1-80 characters.
- Theme: `light`, `dark`, or `system`.
- Density: `compact`, `comfortable`, or `spacious`.

### GET `/v1/workspaces`

Purpose: list workspaces the user can access.

Authorization: authenticated user.

### GET `/v1/devices`

Purpose: list registered devices.

### DELETE `/v1/devices/{deviceId}`

Purpose: revoke a device and its sessions.

## Edge Cases

- Deleting current device should log the user out after success.
- Workspace membership may be removed while client is active; next request must return `WORKSPACE_ACCESS_REVOKED`.
- Preference update conflicts should use last-write-wins with audit event.

## Future Considerations

- Add organization profile APIs.
- Add user invitations and pending membership states.
- Add notification preference APIs.
