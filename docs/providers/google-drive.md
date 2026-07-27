# Provider - Google Drive

## Runtime Status

StoragePK Desktop `0.3.0` contains a native one-click Google Drive connector. The connector works without the StoragePK API, PostgreSQL, Redis, Docker, or a hosted callback.

Implemented:

- Production installers package `STORAGEPK_GOOGLE_CLIENT_ID` and `STORAGEPK_GOOGLE_CLIENT_SECRET` for the publisher-owned Google OAuth client whose application type is **Desktop app**.
- OAuth 2.0 Authorization Code flow for a Google OAuth Client of type **Desktop app**.
- Random `127.0.0.1` loopback port, exact callback path, one active login flow, state validation, and PKCE `S256`.
- Fixed least-privilege `https://www.googleapis.com/auth/drive.file` scope.
- Multiple independently authorized Google accounts.
- One app-created `StoragePK` root folder per account.
- Quota/status refresh through Drive `about.get`.
- 8 MiB resumable chunks, retry/backoff, session probing, expired-session restart, and duplicate reconciliation through private `appProperties`.
- Refresh tokens, custom developer OAuth client values, and resumable session URLs in Windows Credential Manager.
- Account-scoped Drive file IDs and upload state in the local metadata index.

The production installer deliberately includes the Client ID and matching Client Secret so the end user can select **Kết nối Google Drive** without creating a Google Cloud project or entering credentials. The Client ID is public. The installed-app Client Secret is recoverable from the binary and cannot be considered absolutely confidential, but its actual value must not be committed or logged. The current token endpoint requires it for code exchange and refresh. PKCE `S256` remains mandatory rather than being replaced by the packaged secret. Custom Client ID and Client Secret entry remains only as a developer fallback. See [google-drive-desktop-setup.md](google-drive-desktop-setup.md).

## Distribution Status

- A production build must set matching `STORAGEPK_GOOGLE_CLIENT_ID` and `STORAGEPK_GOOGLE_CLIENT_SECRET` values before packaging.
- A Google OAuth consent project left in **Testing** limits sign-in to configured test users and produces refresh tokens that expire after seven days.
- Before broad distribution, the publisher must move the consent project to **In production** and complete the applicable basic verification for the non-sensitive `drive.file` scope.
- The implemented connector and successful build checks do not establish that Google publication or verification is complete; release evidence must track those gates separately.

## Permission Boundary

StoragePK requests only `drive.file`. It can create and manage the `StoragePK` folder and files created by the app. It does not request permission to read the user's entire Drive.

Consequences:

- StoragePK is not a full Google Drive browser.
- Existing arbitrary Drive files are not imported.
- Manually moving an app-created file does not change its Drive file ID.
- Manually deleting a remote file creates drift that a future reconciliation command must surface.

Broader `drive` or metadata scopes are intentionally excluded because they increase user-data exposure and may trigger restricted-scope verification requirements.

## Account Model

Each authorized Google account remains a separate destination:

| Field | Purpose |
| --- | --- |
| `id` | Stable Drive permission ID; never the mutable email address. |
| `email` | Display metadata only. |
| `folderId` | App-owned `StoragePK` folder for this account. |
| `quotaLimitBytes` | Provider-reported limit when available. |
| `quotaUsageBytes` | Provider-reported whole-account usage. |
| `grantedScopes` | Persisted fixed-scope grant used by routing checks. |
| `lastCheckedAt` | Last successful token/quota verification. |

Multiple accounts are supported for user-managed placement and redundancy. StoragePK must not describe this feature as quota evasion, sharding to bypass limits, or unlimited storage. Provider quotas and Google policy still apply to every account.

## OAuth Algorithm

1. Reject the request if another OAuth flow is already active.
2. Bind a listener to `127.0.0.1:0`.
3. Generate a single-use state value and a 96-character PKCE verifier.
4. Derive the `S256` challenge.
5. Use the packaged Client ID and Client Secret, or matching custom developer values only when explicitly configured, and open the Google authorization endpoint in the system browser.
6. Request offline access and the fixed `drive.file` scope.
7. Accept only the exact host, random port, callback path, and state.
8. Exchange the authorization code inside the Rust process using the matching Client Secret, same redirect URI, and PKCE verifier.
9. Verify that the returned scope has not excluded `drive.file`.
10. Query Drive identity/quota and create or recover the app-owned root folder.
11. Save the refresh token by stable account ID in Windows Credential Manager.
12. Persist non-secret account metadata only after the secret and folder are ready.

Authorization codes, PKCE values, access tokens, refresh tokens, and resumable session URLs are never returned to React.

## Upload Algorithm

1. Pin an explicit account, an interrupted upload's previous account, or choose an enabled account with `drive.file` and enough known free quota.
2. Refresh a short-lived access token.
3. Search private `appProperties` for the local item ID and SHA-256 to reconcile an ambiguous prior completion.
4. Probe a saved resumable session URL when one exists.
5. Start a new resumable session only when no valid session or completed object exists.
6. Store the session URL in Windows Credential Manager.
7. Upload 8 MiB chunks; the chunk size is a multiple of Drive's 256 KiB requirement.
8. Handle HTTP `308` and its `Range` header as the acknowledged offset.
9. Refresh access on `401`; back off on `429` and server errors.
10. Accept only a successful response with a non-empty Drive file ID.
11. Delete the credential-held session URL and persist the account/file mapping.

The private Drive `appProperties` contain only the StoragePK item ID and SHA-256. No technical text is added to the visible filename or description.

## Routing

Automatic routing considers only accounts that:

- are enabled;
- retain the exact `drive.file` grant;
- have enough free quota when quota is known.

Among eligible accounts with known quota, the account with the largest free space is chosen. Accounts with unknown quota are fallback candidates. Once an upload is started, retries stay pinned to that account.

Routing is transparent in the UI: the selected account is stored on the item, each connected account shows its own email/quota, and disconnecting an account does not delete its remote files.

## Local State and Recovery

- State schema: `2`.
- Existing `0.1.x` local items and Telegram metadata migrate in place.
- Newly added Drive fields use safe defaults.
- Before replacement, the previous state is copied to `vault-state.backup.json`.
- The new state is written, flushed, and replaced with Windows write-through semantics.
- If both primary and backup state cannot be parsed, startup stops and preserves the old files instead of silently creating an empty vault.

## Operational Limits

- Google API/storage quotas remain account-specific.
- A resumable session can expire; StoragePK reconciles before starting a replacement.
- OAuth consent projects in Google Cloud **Testing** work only for configured test users, and their refresh tokens expire after seven days.
- Broad distribution requires the publisher-owned consent project to be **In production**, with accurate privacy disclosures and applicable basic verification for the non-sensitive `drive.file` scope.
- Windows code signing is a separate distribution gate.

## References

- Native-app OAuth: <https://developers.google.com/identity/protocols/oauth2/native-app>
- Drive scopes: <https://developers.google.com/workspace/drive/api/guides/api-specific-auth>
- Resumable upload: <https://developers.google.com/workspace/drive/api/guides/manage-uploads>
- Drive limits: <https://developers.google.com/workspace/drive/api/guides/limits>
- Workspace API user-data policy: <https://developers.google.com/workspace/workspace-api-user-data-developer-policy>
