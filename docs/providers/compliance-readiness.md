# Providers - Compliance Readiness

## Purpose

Define the provider compliance evidence required before releasing Google Drive and Telegram integrations.

## Scope

This document covers Google OAuth verification, Google API Services User Data Policy, Limited Use mapping, privacy disclosures, Telegram access model disclosure, retention, export, deletion, evidence, and sign-off owners.

## Responsibilities

- Ensure provider integrations can pass policy review.
- Make user-data handling visible and auditable.
- Prevent release with broad or undisclosed provider access.

## Assumptions

- This is not legal advice and requires final human review before public launch.
- Google policies and Telegram behavior can change.
- Public production release requires privacy policy and accurate consent screens.

## Dependencies

- [policy-and-feasibility.md](policy-and-feasibility.md)
- [linking-flows.md](linking-flows.md)
- [risk-register.md](risk-register.md)
- [../security/secrets.md](../security/secrets.md)

## Detailed Explanation

### Google Drive Data Inventory

| Data | Source | Stored? | Purpose | Delete Path |
| --- | --- | --- | --- | --- |
| OAuth subject/email | Google OAuth | Yes | Provider identity. | Remove provider account. |
| Refresh token | Google OAuth | Encrypted | Drive upload/verify. | Revoke provider. |
| Granted scopes | Google OAuth | Yes | Capability and policy check. | Remove provider account. |
| Drive file ID | Drive API | Yes | Provider object reference. | Delete resource/provider reference. |
| Drive quota | Drive API | Cached | Routing. | Snapshot expiry/delete provider. |
| File bytes | User upload | Stored in Drive | User storage. | Optional provider delete with confirmation. |

### Desktop OAuth Distribution Gate

- `STORAGEPK_GOOGLE_CLIENT_ID` is a public Desktop OAuth identifier and is packaged in the production installer.
- `STORAGEPK_GOOGLE_CLIENT_SECRET` is also packaged because current live token and refresh requests require the matching installed-app secret.
- A Desktop installed-app secret can be recovered from the binary and is not absolutely confidential. Its actual value must still never be committed, logged, or requested from end users; release automation must inject it through a protected build environment.
- StoragePK Desktop must continue to use PKCE `S256`, state validation, and an exact loopback callback. The packaged secret does not replace PKCE.
- End users of the production installer must not be instructed to create individual Google Cloud projects; manual Client ID and Client Secret entry is a developer fallback only.
- A consent project in **Testing** restricts access to test users and issues refresh tokens that expire after seven days.
- Broad distribution requires the publisher-owned project to be **In production** and to complete the applicable basic verification for the non-sensitive `drive.file` scope.
- Build completion is not verification evidence. Release notes and UI must not state or imply that Google verification is complete until the publisher records the external approval.

### Google Limited Use Mapping

| Requirement | StoragePK Control |
| --- | --- |
| Use data only for user-facing features. | Provider docs prohibit hidden secondary use. |
| Transfer data only as necessary. | File bytes go to selected provider; metadata stored in StoragePK. |
| Do not use Drive data for advertising. | Explicit non-goal and privacy policy requirement. |
| Secure user data. | Encrypted credentials, audit, least scopes. |
| Allow revocation/deletion. | Provider revoke and resource delete flows. |

### Telegram Disclosure

StoragePK must disclose:

- Telegram destination members/admins can access uploaded files outside StoragePK.
- Telegram public Bot API has small-file limits.
- Local Bot API server is a user/device/server process, not private Telegram storage.
- Removing StoragePK access does not remove Telegram channel membership.
- Deleting StoragePK metadata does not delete Telegram messages by default.

### Sign-Off Owners

| Gate | Owner |
| --- | --- |
| OAuth scope review | Security/architecture owner. |
| OAuth publication and basic verification evidence | Product/security owner. |
| Packaged matching Client ID/Secret and PKCE release check | Release/security owner. |
| Privacy policy | Product/legal owner. |
| Credential storage review | Security owner. |
| Telegram access disclosure | Product/security owner. |
| Provider tests | QA owner. |
| Runbook readiness | DevOps owner. |

## Edge Cases

- Internal-only app can use a Testing OAuth project, but its seven-day refresh-token expiry is unsuitable for broad distribution.
- User connects personal Drive accounts; privacy policy must still cover token and metadata handling.
- Telegram channel owner can add other members after StoragePK upload; this is outside app-level permission control.
- User requests deletion; StoragePK must distinguish app metadata deletion from provider object deletion.

## Future Considerations

- Add compliance evidence folder.
- Add policy review date and version tracking.
- Add data processing agreement template if team/enterprise features ship.
