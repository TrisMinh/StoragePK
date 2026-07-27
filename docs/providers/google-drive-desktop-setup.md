# Google Drive Desktop Setup

## End-User Setup for `0.3.0`

What an end user needs:

- A Google account.
- A production StoragePK Desktop `0.3.0` installer.

The production installer packages `STORAGEPK_GOOGLE_CLIENT_ID` and `STORAGEPK_GOOGLE_CLIENT_SECRET` for a Google OAuth client whose application type is **Desktop app**. End users do not create a Google Cloud project, enable an API, or enter either OAuth value.

StoragePK does not require a public callback domain. It opens a temporary callback on a random `127.0.0.1` port and protects the authorization-code exchange with PKCE `S256`.

## Connect the First Account

1. Open StoragePK.
2. Choose **Kết nối lưu trữ**.
3. Find the **Google Drive** card.
4. Select **Đăng nhập với Google Drive**.
5. In the system browser, choose the Google account and approve the requested `drive.file` permission.
6. Return to StoragePK after the success page appears.

StoragePK then:

- validates the loopback callback, OAuth state, and PKCE verifier;
- identifies the Drive account;
- reads its current quota when Google supplies one;
- creates or reuses an app-owned folder named `StoragePK`;
- stores the refresh token in Windows Credential Manager;
- shows the account as a distinct storage destination.

The packaged Client ID is a public OAuth identifier. The current Google token endpoint requires the matching Client Secret for both authorization-code exchange and refresh, so the production installer embeds it at build time. A Desktop installed-app secret can be recovered from the binary and therefore is not an absolute confidential secret; nevertheless, its actual value must not be committed, logged, printed in release output, or requested from end users. PKCE remains mandatory and is not replaced by the packaged secret.

## Add More Accounts

1. Open the same Google Drive card.
2. Select **Thêm tài khoản Drive**.
3. Choose another Google account in the browser.
4. Confirm that the new email appears as a separate row.

The app does not merge account identities. Each file records the exact destination account. Automatic mode chooses an eligible account with enough known free quota and pins the upload to it.

Multiple accounts are not unlimited storage and must not be used to circumvent Google quotas or policies.

## Upload Modes

- **Manual:** Open **Tất cả file**, then select the Google Drive action on a file.
- **Automatic:** Enable **Tự đồng bộ file mới lên Drive** in the Google Drive card.
- **Local only:** Leave auto-sync off. Every imported file still remains in Local Vault.

Drive uploads use resumable 8 MiB chunks and can continue from a provider-acknowledged offset after retrying the same file.

## Publisher Setup for Production Installers

This section is for the StoragePK release owner, not end users.

1. Create or select the publisher-owned Google Cloud project.
2. Enable **Google Drive API**.
3. Configure the OAuth consent screen with accurate app identity, support contacts, privacy disclosures, and the intended external audience.
4. Request only `https://www.googleapis.com/auth/drive.file`; StoragePK does not need broad Drive access.
5. Create an OAuth Client ID whose application type is **Desktop app**.
6. Copy the Client ID ending in `.apps.googleusercontent.com` and its matching Client Secret.
7. Package both values at build time:

```powershell
$env:STORAGEPK_GOOGLE_CLIENT_ID = "your-desktop-client-id.apps.googleusercontent.com"
$env:STORAGEPK_GOOGLE_CLIENT_SECRET = "your-desktop-client-secret"
npm run release:desktop
```

Supply the Client Secret through a protected local or CI release environment. Do not commit it, log it, paste it into release notes, or store it in tracked configuration. Packaging necessarily places the installed-app secret in the desktop binary, so do not describe it as absolutely confidential. PKCE `S256`, state validation, and the exact loopback callback remain required even when the token request also sends the Client Secret.

### Testing and Production Status

- While the OAuth consent project remains in **Testing**, only configured test users can connect and issued refresh tokens expire after seven days. Repeated reconnect prompts are expected in that mode.
- Before distributing StoragePK broadly, the publisher must choose **Publish app** so the project is **In production** and complete the applicable basic verification for the non-sensitive `drive.file` scope.
- Publishing and verification are external release gates. This document does not claim that the current Google Cloud project has completed verification.
- Broader Drive scopes are not part of this release and would require a separate policy and verification review.

## Developer Fallback

Manual OAuth configuration is retained only for development builds, local testing, or intentionally testing a different publisher-owned Desktop client.

1. Create a Google Cloud project, enable Google Drive API, and create a **Desktop app** OAuth Client ID and Client Secret.
2. Add the developer's Google account as a test user while the consent project is in **Testing**.
3. In StoragePK, choose the developer/custom OAuth client option.
4. Enter the Desktop Client ID and matching Client Secret.
5. Keep both values outside tracked files and logs.
6. Connect and approve the fixed `drive.file` scope.

If accounts are already connected, disconnect them before selecting **Đổi OAuth Client**. Disconnecting does not delete remote Drive files.

Manual configuration is not the production end-user path. Never commit or log the custom Client Secret. Treat it as build-sensitive configuration even though a Desktop installed-app secret cannot remain absolutely confidential once embedded in a distributed binary.

## Troubleshooting

### “Access blocked” or app not available

For an official production installer, contact the publisher; end users should not create replacement credentials.

For a developer fallback:

- confirm the OAuth client type is **Desktop app**;
- confirm Google Drive API is enabled in the same project;
- if the consent project is in **Testing**, add the signing-in Google account as a test user.

### StoragePK asks to reconnect after seven days

The OAuth project is still in **Testing**. Move the publisher project to **In production** and complete the applicable basic verification before broad distribution. Do not work around this by asking every end user to create a separate Cloud project.

### Browser opens but StoragePK times out

- Complete sign-in within five minutes.
- Allow StoragePK through local firewall rules for loopback traffic.
- Do not copy the callback URL to another machine.
- Retry once; only one OAuth window can be active.

### Google does not return a refresh token

- Remove StoragePK access from the Google Account permissions page.
- Return to StoragePK and connect again.
- Ensure the consent flow completes instead of closing the browser early.

### Quota is unavailable

Some account configurations may not return a finite limit. The account remains usable, but automatic routing treats it as an unknown-quota fallback.

### Upload failed after a network interruption

Retry the same file. StoragePK keeps the resumable session URL in Windows Credential Manager, probes the acknowledged offset, and checks private app properties before creating another remote object.

## Credential Locations

Windows Credential Manager services:

- `StoragePK.GoogleDrive.Client` — custom developer Client ID and Client Secret only; the packaged production values are compiled into the application;
- `StoragePK.GoogleDrive.RefreshToken` — account-scoped refresh tokens;
- `StoragePK.GoogleDrive.UploadSession` — resumable upload session URLs.

The local `vault-state.json` contains account display metadata, folder/file IDs, state, and checksums. It does not contain OAuth Client values, authorization codes, refresh tokens, access tokens, PKCE values, or resumable session URLs.
