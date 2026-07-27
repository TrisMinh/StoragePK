# Google Drive Setup

## Connect

1. Open StoragePK and select **Kết nối lưu trữ**.
2. Select **Đăng nhập với Google Drive**.
3. Choose a Google account in the system browser.
4. Approve the `drive.file` permission.
5. Return to StoragePK after the success page appears.

The production installer contains the publisher-owned Desktop OAuth configuration. End users do not create a Google Cloud project or paste OAuth credentials.

## Behavior

- StoragePK opens a temporary callback on `127.0.0.1` and validates OAuth state and PKCE `S256`.
- Refresh tokens are stored in Windows Credential Manager.
- Each Google account is an independent storage destination.
- StoragePK creates or reuses an app-owned `StoragePK` folder.
- Uploads use resumable 8 MiB chunks, retry recovery, and remote reconciliation metadata.
- Automatic routing selects an eligible account with sufficient known quota and pins retries to that account.
- `drive.file` lets StoragePK manage files it creates; it does not grant access to every existing Drive file.

Multiple Drive accounts do not form one Google quota and must not be used to bypass provider policies.

## Common Problems

- **Access blocked:** the publisher OAuth project or test-user list is not ready.
- **Reconnect after seven days:** Google OAuth projects in Testing can issue short-lived refresh authorization.
- **Browser timeout:** a firewall or security tool blocked the temporary loopback callback.
- **No refresh token:** remove the prior StoragePK grant from the Google account and connect again.
- **Quota unavailable:** uploads can still work, but automatic routing has less capacity information.

## Publisher Configuration

Release builds receive these values through local environment variables or encrypted GitHub Actions secrets:

- `STORAGEPK_GOOGLE_CLIENT_ID`
- `STORAGEPK_GOOGLE_CLIENT_SECRET`

Use a Google OAuth client whose application type is **Desktop app**, enable the Google Drive API, request only `drive.file`, and configure the consent screen before distribution. Never commit or log the values.
