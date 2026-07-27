# Providers - Policy and Feasibility

## Purpose

Define whether StoragePK's provider integration approach is allowed, where it is risky, and what constraints must be respected before implementation.

## Scope

This document covers Google Drive OAuth policy, Google scope selection, Telegram bot limitations, local Bot API mode, privacy disclosures, prohibited assumptions, and launch gates.

## Responsibilities

- Prevent building a provider strategy that later cannot be shipped.
- Separate technically possible behavior from policy-safe behavior.
- Define what must be disclosed to users.

## Assumptions

- This document is not legal advice; final launch should review current provider terms and policies.
- Provider policies and limits can change; implementation must keep limits configurable.
- The product should avoid hidden behavior, unclear data use, or surprise provider access.

## Dependencies

- [linking-flows.md](linking-flows.md)
- [capacity-planning.md](capacity-planning.md)
- [routing-algorithm.md](routing-algorithm.md)
- [google-drive.md](google-drive.md)
- [telegram.md](telegram.md)
- [telegram-local-bot-api-server.md](telegram-local-bot-api-server.md)
- [../security/secrets.md](../security/secrets.md)

## Detailed Explanation

### Google Drive Feasibility

Google Drive integration is feasible if StoragePK uses OAuth correctly, requests the minimum scopes needed, explains data use clearly, and follows Google API Services User Data Policy.

Recommended MVP stance:

| Decision | Recommendation | Reason |
| --- | --- | --- |
| Scope | Prefer `drive.file`. | Narrow, non-sensitive per-file access; broad distribution still needs applicable basic verification. |
| Full Drive scope | Avoid for MVP. | `drive` is restricted and may require verification/security assessment if storing/transmitting restricted-scope data. |
| Existing Drive import | Use Google Picker or explicit user selection. | Works better with narrow scopes and user control. |
| Multiple account destinations | Allowed only as separately represented, user-authorized destinations for placement or redundancy. | Do not market or automate them as quota evasion, sharding, cloning, or unlimited storage. |
| Provider metadata | Store only what is needed. | Aligns with minimum data use. |

Google policy requirements to document in product:

- Who is requesting access.
- What Drive data is requested.
- Why StoragePK needs it.
- How data is stored, used, deleted, and protected.
- Clear privacy policy before public OAuth launch.
- Production desktop installers package the public Desktop Client ID and matching installed-app Client Secret because current token and refresh requests require both.
- The installed-app secret is recoverable from the binary and cannot be treated as absolutely confidential, but its actual value must not be committed or logged.
- PKCE `S256`, state validation, and loopback callback validation remain mandatory; the packaged secret is not a replacement for PKCE.
- End users should receive one-click PKCE + loopback authorization instead of instructions to create a Google Cloud project.
- A consent project in **Testing** is for test users only and issues refresh tokens that expire after seven days.
- Broad distribution requires **In production** publication and applicable basic verification for the non-sensitive `drive.file` scope.
- No hidden secondary use of Google user data.
- No requesting broad scopes for unbuilt future features.
- No sharding or cloning content across accounts to circumvent provider storage limits.

### Telegram Feasibility

Telegram integration is technically feasible as bot-backed storage, but Telegram is not a private object store with StoragePK-native permissions. A Telegram channel or chat has its own members/admins who may access files independently of StoragePK.

Recommended MVP stance:

| Decision | Recommendation | Reason |
| --- | --- | --- |
| Public Bot API | Allow for small files only. | Official public bot upload limit is 50 MB for documents, download via `getFile` is 20 MB. |
| Local Bot API server | Advanced option. | Official local mode supports larger uploads up to 2000 MB and local file paths, but requires deployment/ops. |
| Telegram as primary | Do not default to primary for all files. | Privacy and size constraints. |
| Telegram as archive | Supported with explicit warnings. | Good fit for small archives, receipts, exports, and backup copies. |
| Channel membership | Must warn user. | Telegram admins/members can access channel files outside StoragePK. |
| Download by channel members | Allowed by Telegram access model. | Once a file is posted, members who can see it can generally download it through Telegram. |

### Not Allowed or Not Safe For MVP

| Idea | Decision | Reason |
| --- | --- | --- |
| Bypass provider limits by pretending files are smaller. | Not allowed. | Breaks provider behavior and risks data loss. |
| Split files across Telegram messages silently. | Not allowed in MVP. | Restore complexity and user surprise. |
| Use broad Google Drive scope without verification plan. | Not allowed for public launch. | Restricted scope risk. |
| Store Google tokens unencrypted. | Not allowed. | Security and policy failure. |
| Hide which account stored a file. | Not allowed. | User trust and repair failure. |
| Present separate Google accounts as one Google-provided quota or use them to circumvent limits. | Not allowed. | Misleading capacity model and Google policy risk. |
| Treat Telegram privacy as equal to StoragePK permissions. | Not allowed. | Telegram has separate access model. |

### Launch Gates

Before production:

1. Confirm the desktop installer packages matching `STORAGEPK_GOOGLE_CLIENT_ID` and `STORAGEPK_GOOGLE_CLIENT_SECRET` values supplied by a protected build environment.
2. Confirm the Client Secret is absent from tracked files and logs, while PKCE `S256` and exact loopback validation remain enabled.
3. Move the Google OAuth consent project from **Testing** to **In production**.
4. Complete and record the applicable basic verification for the non-sensitive `drive.file` scope without claiming approval early.
5. Publish privacy policy and in-product disclosure.
6. Confirm Telegram mode limits in configuration.
7. Test Drive one-click connection, reconnect, and account identity mismatch.
8. Test Telegram bot permission and channel removal.
9. Confirm encrypted credential storage.
10. Confirm user can export/delete provider connections.

## Edge Cases

- A private/internal-only app may use a Testing project, but refresh tokens expire after seven days and the same setup must not be presented as production-ready.
- A user can authorize several Drive accounts, but the UI and routing must preserve separate account identity, quota, and file location.
- Telegram local Bot API server increases file size capability but adds infrastructure security and availability responsibilities.
- Telegram access is not the same as StoragePK access; removing a user from StoragePK does not remove them from Telegram channels.
- Provider terms may change; docs and code must treat limits as runtime configuration.

## Future Considerations

- Add a formal legal review checklist before public launch.
- Add provider terms review cadence every quarter.
- Add per-provider policy version field in configuration.
- Add user-facing privacy center.

## References

- Google Drive API scopes: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Google API Services User Data Policy: https://developers.google.com/terms/api-services-user-data-policy
- Google Workspace API user-data/developer policy: https://developers.google.com/workspace/workspace-api-user-data-developer-policy
- Google Cloud quotas: https://docs.cloud.google.com/docs/quotas/view-manage
- Telegram Bot API: https://core.telegram.org/bots/api
