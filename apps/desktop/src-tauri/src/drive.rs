use super::{
    delete_keyring_entry, item_for_snapshot, now_ms, persist_state, prepare_upload_snapshot,
    safe_persisted_error, snapshot as app_snapshot, source_matches_snapshot, AppSnapshot,
    RuntimeState, VaultItem,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use keyring::Entry;
use reqwest::{
    header::{AUTHORIZATION, CONTENT_LENGTH, CONTENT_RANGE, CONTENT_TYPE, LOCATION, RANGE},
    Client, Response, StatusCode,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    io::{ErrorKind, Read, Write},
    net::TcpListener,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::{Duration, Instant},
};
use tauri::{AppHandle, State};
use tokio::io::{AsyncReadExt, AsyncSeekExt};
use url::Url;
use uuid::Uuid;

const CLIENT_SERVICE: &str = "StoragePK.GoogleDrive.Client";
const CLIENT_ID_USER: &str = "client-id";
const CLIENT_SECRET_USER: &str = "client-secret";
const REFRESH_TOKEN_SERVICE: &str = "StoragePK.GoogleDrive.RefreshToken";
const UPLOAD_SESSION_SERVICE: &str = "StoragePK.GoogleDrive.UploadSession";
const DRIVE_SCOPE: &str = "https://www.googleapis.com/auth/drive.file";
const DRIVE_FOLDER_NAME: &str = "StoragePK";
const OAUTH_CALLBACK_PATH: &str = "/";
const OAUTH_TIMEOUT: Duration = Duration::from_secs(300);
const DRIVE_CHUNK_SIZE: usize = 8 * 1024 * 1024;
const DRIVE_UPLOAD_ATTEMPTS: usize = 4;
static OAUTH_IN_PROGRESS: AtomicBool = AtomicBool::new(false);
const PACKAGED_CLIENT_ID: Option<&str> = option_env!("STORAGEPK_GOOGLE_CLIENT_ID");
const PACKAGED_CLIENT_SECRET: Option<&str> = option_env!("STORAGEPK_GOOGLE_CLIENT_SECRET");

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub(crate) struct DriveConfig {
    pub(crate) accounts: Vec<DriveAccount>,
    pub(crate) auto_sync: bool,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DriveAccount {
    pub(crate) id: String,
    pub(crate) email: String,
    pub(crate) display_name: String,
    pub(crate) folder_id: String,
    pub(crate) enabled: bool,
    pub(crate) quota_limit_bytes: Option<u64>,
    pub(crate) quota_usage_bytes: Option<u64>,
    pub(crate) connected_at: u64,
    pub(crate) last_checked_at: Option<u64>,
    pub(crate) last_error: Option<String>,
    #[serde(default)]
    pub(crate) granted_scopes: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DriveSnapshot {
    configured: bool,
    packaged_client: bool,
    custom_client: bool,
    accounts: Vec<DriveAccount>,
    auto_sync: bool,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    scope: Option<String>,
}

#[derive(Clone)]
struct ClientCredentials {
    client_id: String,
    client_secret: Option<String>,
}

struct DriveIdentity {
    id: String,
    email: String,
    display_name: String,
    quota_limit_bytes: Option<u64>,
    quota_usage_bytes: Option<u64>,
}

struct OAuthFlowGuard;

impl Drop for OAuthFlowGuard {
    fn drop(&mut self) {
        OAUTH_IN_PROGRESS.store(false, Ordering::Release);
    }
}

enum UploadSessionStatus {
    Active(u64),
    Complete(Option<String>),
    Expired,
}

pub(crate) fn snapshot(config: &DriveConfig) -> DriveSnapshot {
    DriveSnapshot {
        configured: client_credentials().is_ok(),
        packaged_client: packaged_client_credentials().is_ok(),
        custom_client: stored_client_credentials().is_ok(),
        accounts: config.accounts.clone(),
        auto_sync: config.auto_sync,
    }
}

fn credential(service: &str, username: &str) -> Result<Entry, String> {
    Entry::new(service, username).map_err(|error| error.to_string())
}

fn save_client_credentials(credentials: &ClientCredentials) -> Result<(), String> {
    credential(CLIENT_SERVICE, CLIENT_ID_USER)?
        .set_password(&credentials.client_id)
        .map_err(|error| error.to_string())?;
    let secret = credential(CLIENT_SERVICE, CLIENT_SECRET_USER)?;
    if let Some(client_secret) = credentials.client_secret.as_deref() {
        secret
            .set_password(client_secret)
            .map_err(|error| error.to_string())
    } else {
        delete_keyring_entry(secret)
    }
}

fn validate_client_id(client_id: &str) -> Result<String, String> {
    let client_id = client_id.trim();
    if client_id.is_empty()
        || client_id.chars().any(char::is_whitespace)
        || !client_id.ends_with(".apps.googleusercontent.com")
    {
        return Err(
            "Google OAuth Client ID không hợp lệ. Client Desktop phải kết thúc bằng .apps.googleusercontent.com."
                .to_owned(),
        );
    }
    Ok(client_id.to_owned())
}

fn stored_client_credentials() -> Result<ClientCredentials, String> {
    let client_id = credential(CLIENT_SERVICE, CLIENT_ID_USER)?
        .get_password()
        .map_err(|_| "Chưa có Google OAuth Client ID trên máy này.".to_owned())?;
    let client_secret = credential(CLIENT_SERVICE, CLIENT_SECRET_USER)
        .ok()
        .and_then(|entry| entry.get_password().ok())
        .filter(|value| !value.trim().is_empty());
    Ok(ClientCredentials {
        client_id: validate_client_id(&client_id)?,
        client_secret,
    })
}

fn packaged_client_credentials() -> Result<ClientCredentials, String> {
    let client_id = PACKAGED_CLIENT_ID
        .ok_or_else(|| "Bản build chưa được đóng gói Google OAuth Client ID.".to_owned())?;
    let client_secret = PACKAGED_CLIENT_SECRET
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Bản build chưa được đóng gói Google OAuth Client Secret.".to_owned())?;
    Ok(ClientCredentials {
        client_id: validate_client_id(client_id)?,
        client_secret: Some(client_secret.to_owned()),
    })
}

fn client_credentials() -> Result<ClientCredentials, String> {
    packaged_client_credentials()
        .or_else(|_| stored_client_credentials())
        .map_err(|_| {
            "Bản build chưa có Google OAuth Client. Hãy dùng cấu hình developer để thêm Desktop Client ID."
                .to_owned()
        })
}

fn refresh_token_entry(account_id: &str) -> Result<Entry, String> {
    credential(REFRESH_TOKEN_SERVICE, account_id)
}

fn upload_session_username(item: &VaultItem, account_id: &str) -> String {
    hex::encode(Sha256::digest(
        format!(
            "{}:{}:{}:{}",
            account_id, item.id, item.size_bytes, item.checksum_sha256
        )
        .as_bytes(),
    ))
}

fn upload_session_entry(item: &VaultItem, account: &DriveAccount) -> Result<Entry, String> {
    credential(
        UPLOAD_SESSION_SERVICE,
        &upload_session_username(item, &account.id),
    )
}

fn parse_u64(value: Option<&Value>) -> Option<u64> {
    value.and_then(|value| {
        value
            .as_u64()
            .or_else(|| value.as_str().and_then(|text| text.parse().ok()))
    })
}

async fn api_error(response: Response, fallback: &str) -> String {
    let status = response.status();
    let _ = response.bytes().await;
    format!("DRIVE_API_ERROR: {fallback} (HTTP {}).", status.as_u16())
}

fn pkce_pair() -> (String, String) {
    let verifier = format!(
        "{}{}{}",
        Uuid::new_v4().simple(),
        Uuid::new_v4().simple(),
        Uuid::new_v4().simple()
    );
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    (verifier, challenge)
}

fn token_form(credentials: &ClientCredentials, fields: &[(&str, &str)]) -> Vec<(String, String)> {
    let mut form = vec![("client_id".to_owned(), credentials.client_id.clone())];
    if let Some(client_secret) = credentials.client_secret.as_deref() {
        form.push(("client_secret".to_owned(), client_secret.to_owned()));
    }
    form.extend(
        fields
            .iter()
            .map(|(name, value)| ((*name).to_owned(), (*value).to_owned())),
    );
    form
}

fn callback_html(success: bool, message: &str) -> String {
    let color = if success { "#197a4d" } else { "#b4232c" };
    format!(
        "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>StoragePK</title></head><body style=\"font-family:Segoe UI,sans-serif;background:#f5f7fb;color:#172033;display:grid;place-items:center;min-height:100vh;margin:0\"><main style=\"max-width:520px;background:white;border:1px solid #dfe5ed;border-radius:18px;padding:32px;box-shadow:0 18px 50px rgba(20,40,80,.1)\"><div style=\"width:44px;height:44px;border-radius:13px;background:{color};color:white;display:grid;place-items:center;font-size:24px\">✓</div><h1 style=\"font-size:24px;margin:18px 0 8px\">StoragePK</h1><p style=\"color:#5c697b;line-height:1.6\">{message}</p><p style=\"font-size:13px;color:#8491a3\">Bạn có thể đóng tab này và quay lại ứng dụng.</p></main></body></html>"
    )
}

fn wait_for_oauth_callback(
    listener: TcpListener,
    expected_state: String,
    expected_host: String,
) -> Result<String, String> {
    listener
        .set_nonblocking(true)
        .map_err(|error| error.to_string())?;
    let started = Instant::now();
    while started.elapsed() < OAUTH_TIMEOUT {
        match listener.accept() {
            Ok((mut stream, _)) => {
                stream
                    .set_read_timeout(Some(Duration::from_secs(3)))
                    .map_err(|error| error.to_string())?;
                let mut request_bytes = Vec::with_capacity(2048);
                let mut buffer = [0_u8; 1024];
                loop {
                    let size = stream
                        .read(&mut buffer)
                        .map_err(|_| "Google OAuth callback không đọc được.".to_owned())?;
                    if size == 0 {
                        break;
                    }
                    request_bytes.extend_from_slice(&buffer[..size]);
                    if request_bytes.windows(4).any(|window| window == b"\r\n\r\n") {
                        break;
                    }
                    if request_bytes.len() >= 8192 {
                        return Err("Google OAuth callback vượt quá giới hạn an toàn.".to_owned());
                    }
                }
                let request = String::from_utf8_lossy(&request_bytes);
                let path = request
                    .lines()
                    .next()
                    .and_then(|line| line.split_whitespace().nth(1))
                    .ok_or_else(|| "Google OAuth callback không hợp lệ.".to_owned())?;
                let host = request
                    .lines()
                    .find_map(|line| {
                        line.strip_prefix("Host:")
                            .or_else(|| line.strip_prefix("host:"))
                            .map(str::trim)
                    })
                    .unwrap_or_default();
                let callback = Url::parse(&format!("http://{host}{path}"))
                    .map_err(|error| error.to_string())?;
                if host != expected_host || callback.path() != OAUTH_CALLBACK_PATH {
                    let html = callback_html(false, "Đường dẫn OAuth callback không hợp lệ.");
                    let response = format!(
                        "HTTP/1.1 404 Not Found\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                        html.len(),
                        html
                    );
                    let _ = stream.write_all(response.as_bytes());
                    continue;
                }
                let params = callback
                    .query_pairs()
                    .collect::<std::collections::HashMap<_, _>>();
                let callback_state = params.get("state").map(|value| value.as_ref());
                let error = params.get("error").map(|value| value.to_string());
                let code = params.get("code").map(|value| value.to_string());
                let valid = callback_state == Some(expected_state.as_str()) && code.is_some();
                let message = if valid {
                    "Google Drive đã xác thực thành công."
                } else {
                    "Không thể xác thực Google Drive. Hãy quay lại ứng dụng để thử lại."
                };
                let html = callback_html(valid, message);
                let response_status = if valid { "200 OK" } else { "400 Bad Request" };
                let response = format!(
                    "HTTP/1.1 {response_status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    html.len(),
                    html
                );
                let _ = stream.write_all(response.as_bytes());
                if callback_state != Some(expected_state.as_str()) {
                    continue;
                }
                if let Some(error) = error {
                    return Err(format!("Google OAuth bị từ chối: {error}"));
                }
                return code.ok_or_else(|| "Google không trả về authorization code.".to_owned());
            }
            Err(error) if error.kind() == ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(120));
            }
            Err(error) => return Err(error.to_string()),
        }
    }
    Err("Hết thời gian chờ đăng nhập Google (5 phút).".to_owned())
}

async fn authorize(credentials: &ClientCredentials) -> Result<TokenResponse, String> {
    let listener = TcpListener::bind(("127.0.0.1", 0)).map_err(|error| error.to_string())?;
    let port = listener
        .local_addr()
        .map_err(|error| error.to_string())?
        .port();
    let expected_host = format!("127.0.0.1:{port}");
    let redirect_uri = format!("http://{expected_host}{OAUTH_CALLBACK_PATH}");
    let state = Uuid::new_v4().simple().to_string();
    let (verifier, challenge) = pkce_pair();
    let mut authorization = Url::parse("https://accounts.google.com/o/oauth2/v2/auth")
        .map_err(|error| error.to_string())?;
    authorization
        .query_pairs_mut()
        .append_pair("client_id", &credentials.client_id)
        .append_pair("redirect_uri", &redirect_uri)
        .append_pair("response_type", "code")
        .append_pair("scope", DRIVE_SCOPE)
        .append_pair("access_type", "offline")
        .append_pair("prompt", "consent select_account")
        .append_pair("state", &state)
        .append_pair("code_challenge", &challenge)
        .append_pair("code_challenge_method", "S256");
    open::that_detached(authorization.as_str()).map_err(|error| error.to_string())?;
    let callback = tauri::async_runtime::spawn_blocking(move || {
        wait_for_oauth_callback(listener, state, expected_host)
    })
    .await
    .map_err(|error| error.to_string())??;
    let form = token_form(
        credentials,
        &[
            ("code", callback.as_str()),
            ("code_verifier", verifier.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_uri.as_str()),
        ],
    );
    let response = Client::new()
        .post("https://oauth2.googleapis.com/token")
        .form(&form)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err(api_error(response, "Không đổi được Google authorization code").await);
    }
    let token = response
        .json::<TokenResponse>()
        .await
        .map_err(|error| error.to_string())?;
    if token
        .scope
        .as_deref()
        .is_some_and(|scopes| !scopes.split_whitespace().any(|scope| scope == DRIVE_SCOPE))
    {
        return Err("Google không cấp quyền drive.file bắt buộc.".to_owned());
    }
    Ok(token)
}

async fn refresh_access_token(
    credentials: &ClientCredentials,
    refresh_token: &str,
) -> Result<String, String> {
    let form = token_form(
        credentials,
        &[
            ("refresh_token", refresh_token),
            ("grant_type", "refresh_token"),
        ],
    );
    let response = Client::new()
        .post("https://oauth2.googleapis.com/token")
        .form(&form)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err(api_error(response, "Không làm mới được Google access token").await);
    }
    response
        .json::<TokenResponse>()
        .await
        .map(|token| token.access_token)
        .map_err(|error| error.to_string())
}

async fn drive_identity(access_token: &str) -> Result<DriveIdentity, String> {
    let response = Client::new()
        .get("https://www.googleapis.com/drive/v3/about")
        .query(&[(
            "fields",
            "user(displayName,emailAddress,permissionId),storageQuota(limit,usage)",
        )])
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err(api_error(response, "Không đọc được thông tin Google Drive").await);
    }
    let payload = response
        .json::<Value>()
        .await
        .map_err(|error| error.to_string())?;
    let email = payload
        .pointer("/user/emailAddress")
        .and_then(Value::as_str)
        .unwrap_or("Google Drive account")
        .to_owned();
    let display_name = payload
        .pointer("/user/displayName")
        .and_then(Value::as_str)
        .unwrap_or(&email)
        .to_owned();
    let id = payload
        .pointer("/user/permissionId")
        .and_then(Value::as_str)
        .map(str::to_owned)
        .unwrap_or_else(|| hex::encode(Sha256::digest(email.as_bytes())));
    Ok(DriveIdentity {
        id,
        email,
        display_name,
        quota_limit_bytes: parse_u64(payload.pointer("/storageQuota/limit")),
        quota_usage_bytes: parse_u64(payload.pointer("/storageQuota/usage")),
    })
}

async fn ensure_storagepk_folder(
    client: &Client,
    access_token: &str,
    existing_folder_id: Option<&str>,
) -> Result<String, String> {
    if let Some(folder_id) = existing_folder_id {
        let response = client
            .get(format!(
                "https://www.googleapis.com/drive/v3/files/{folder_id}"
            ))
            .query(&[("fields", "id,trashed")])
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|error| error.to_string())?;
        if response.status().is_success() {
            let payload = response
                .json::<Value>()
                .await
                .map_err(|error| error.to_string())?;
            if payload.get("trashed").and_then(Value::as_bool) != Some(true) {
                return Ok(folder_id.to_owned());
            }
        }
    }

    let query = format!(
        "name = '{}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'root' in parents",
        DRIVE_FOLDER_NAME.replace('\'', "\\'")
    );
    let response = client
        .get("https://www.googleapis.com/drive/v3/files")
        .query(&[
            ("q", query.as_str()),
            ("spaces", "drive"),
            ("fields", "files(id,name)"),
            ("pageSize", "10"),
        ])
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err(api_error(response, "Không tìm được thư mục StoragePK").await);
    }
    let payload = response
        .json::<Value>()
        .await
        .map_err(|error| error.to_string())?;
    if let Some(folder_id) = payload
        .pointer("/files/0/id")
        .and_then(Value::as_str)
        .map(str::to_owned)
    {
        return Ok(folder_id);
    }

    let response = client
        .post("https://www.googleapis.com/drive/v3/files")
        .query(&[("fields", "id")])
        .bearer_auth(access_token)
        .json(&json!({
            "name": DRIVE_FOLDER_NAME,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": ["root"]
        }))
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err(api_error(response, "Không tạo được thư mục StoragePK").await);
    }
    response
        .json::<Value>()
        .await
        .map_err(|error| error.to_string())?
        .get("id")
        .and_then(Value::as_str)
        .map(str::to_owned)
        .ok_or_else(|| "Google Drive không trả về ID thư mục StoragePK.".to_owned())
}

fn select_account(
    accounts: &[DriveAccount],
    requested_id: Option<&str>,
    file_size: u64,
) -> Result<DriveAccount, String> {
    if let Some(account_id) = requested_id {
        let account = accounts
            .iter()
            .find(|account| account.id == account_id && account.enabled)
            .cloned()
            .ok_or_else(|| "Tài khoản Google Drive đã chọn không khả dụng.".to_owned())?;
        if let (Some(limit), Some(usage)) = (account.quota_limit_bytes, account.quota_usage_bytes) {
            if limit.saturating_sub(usage) < file_size {
                return Err(format!(
                    "Google Drive {} không đủ dung lượng.",
                    account.email
                ));
            }
        }
        return Ok(account);
    }

    accounts
        .iter()
        .filter(|account| {
            account.enabled
                && account
                    .granted_scopes
                    .iter()
                    .any(|scope| scope == DRIVE_SCOPE)
        })
        .filter(
            |account| match (account.quota_limit_bytes, account.quota_usage_bytes) {
                (Some(limit), Some(usage)) => limit.saturating_sub(usage) >= file_size,
                _ => true,
            },
        )
        .max_by_key(
            |account| match (account.quota_limit_bytes, account.quota_usage_bytes) {
                (Some(limit), Some(usage)) => (true, limit.saturating_sub(usage)),
                _ => (false, 0),
            },
        )
        .cloned()
        .ok_or_else(|| "Không có Google Drive đang bật và đủ dung lượng cho file này.".to_owned())
}

async fn start_upload_session(
    client: &Client,
    access_token: &str,
    item: &VaultItem,
    account: &DriveAccount,
) -> Result<String, String> {
    let response = client
        .post("https://www.googleapis.com/upload/drive/v3/files")
        .query(&[
            ("uploadType", "resumable"),
            ("fields", "id,name,size,appProperties"),
        ])
        .bearer_auth(access_token)
        .header("X-Upload-Content-Type", "application/octet-stream")
        .header("X-Upload-Content-Length", item.size_bytes)
        .json(&json!({
            "name": item.name,
            "parents": [account.folder_id],
            "appProperties": {
                "storagepkId": item.id,
                "storagepkSha256": item.checksum_sha256
            }
        }))
        .send()
        .await
        .map_err(|_| {
            "DRIVE_NETWORK_ERROR: Không thể khởi tạo phiên upload Google Drive.".to_owned()
        })?;
    if !response.status().is_success() {
        return Err(api_error(response, "Không khởi tạo được phiên upload Google Drive").await);
    }
    response
        .headers()
        .get(LOCATION)
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned)
        .ok_or_else(|| "Google Drive không trả về resumable upload URL.".to_owned())
}

fn escape_drive_query(value: &str) -> String {
    value.replace('\\', "\\\\").replace('\'', "\\'")
}

async fn find_existing_file(
    client: &Client,
    access_token: &str,
    item: &VaultItem,
    account: &DriveAccount,
) -> Result<Option<String>, String> {
    let query = format!(
        "'{}' in parents and trashed = false and appProperties has {{ key='storagepkId' and value='{}' }} and appProperties has {{ key='storagepkSha256' and value='{}' }}",
        escape_drive_query(&account.folder_id),
        escape_drive_query(&item.id),
        escape_drive_query(&item.checksum_sha256)
    );
    let response = client
        .get("https://www.googleapis.com/drive/v3/files")
        .query(&[
            ("q", query.as_str()),
            ("spaces", "drive"),
            ("fields", "files(id,name,size,appProperties)"),
            ("pageSize", "2"),
        ])
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|_| {
            "DRIVE_NETWORK_ERROR: Không thể đối soát file trên Google Drive.".to_owned()
        })?;
    if !response.status().is_success() {
        return Err(api_error(response, "Không đối soát được file Google Drive").await);
    }
    let payload = response
        .json::<Value>()
        .await
        .map_err(|_| "DRIVE_RESPONSE_INVALID: Google Drive trả về dữ liệu lỗi.".to_owned())?;
    Ok(payload
        .get("files")
        .and_then(Value::as_array)
        .and_then(|files| {
            files
                .iter()
                .find(|file| remote_payload_matches_item(file, item))
        })
        .and_then(|file| file.get("id"))
        .and_then(Value::as_str)
        .map(str::to_owned))
}

fn remote_payload_matches_item(payload: &Value, item: &VaultItem) -> bool {
    parse_u64(payload.get("size")) == Some(item.size_bytes)
        && payload
            .pointer("/appProperties/storagepkId")
            .and_then(Value::as_str)
            == Some(item.id.as_str())
        && payload
            .pointer("/appProperties/storagepkSha256")
            .and_then(Value::as_str)
            == Some(item.checksum_sha256.as_str())
}

async fn verify_remote_file(
    client: &Client,
    access_token: &str,
    file_id: &str,
    item: &VaultItem,
) -> Result<(), String> {
    let response = client
        .get(format!(
            "https://www.googleapis.com/drive/v3/files/{file_id}"
        ))
        .query(&[("fields", "id,size,appProperties,trashed")])
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|_| "DRIVE_NETWORK_ERROR: Không thể xác minh file vừa upload.".to_owned())?;
    if !response.status().is_success() {
        return Err(api_error(response, "Không xác minh được file vừa upload").await);
    }
    let payload = response
        .json::<Value>()
        .await
        .map_err(|_| "DRIVE_RESPONSE_INVALID: Google Drive trả về dữ liệu lỗi.".to_owned())?;
    if payload.get("trashed").and_then(Value::as_bool) == Some(true)
        || payload.get("id").and_then(Value::as_str) != Some(file_id)
        || !remote_payload_matches_item(&payload, item)
    {
        return Err(
            "DRIVE_REMOTE_VERIFICATION_FAILED: Kích thước hoặc checksum metadata trên Drive không khớp snapshot upload."
                .to_owned(),
        );
    }
    Ok(())
}

fn uploaded_offset(response: &Response) -> u64 {
    response
        .headers()
        .get(RANGE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.rsplit('-').next())
        .and_then(|value| value.parse::<u64>().ok())
        .map(|last| last.saturating_add(1))
        .unwrap_or(0)
}

async fn inspect_upload_session(
    client: &Client,
    session_url: &str,
    file_size: u64,
    access_token: &str,
) -> Result<UploadSessionStatus, String> {
    let response = client
        .put(session_url)
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .header(CONTENT_LENGTH, 0)
        .header(CONTENT_RANGE, format!("bytes */{file_size}"))
        .body(Vec::new())
        .send()
        .await
        .map_err(|_| {
            "DRIVE_NETWORK_ERROR: Không thể kiểm tra phiên upload Google Drive.".to_owned()
        })?;
    if response.status() == StatusCode::PERMANENT_REDIRECT {
        return Ok(UploadSessionStatus::Active(uploaded_offset(&response)));
    }
    if response.status().is_success() {
        let file_id = response
            .json::<Value>()
            .await
            .ok()
            .and_then(|payload| payload.get("id").and_then(Value::as_str).map(str::to_owned));
        return Ok(UploadSessionStatus::Complete(file_id));
    }
    if matches!(response.status(), StatusCode::NOT_FOUND | StatusCode::GONE) {
        return Ok(UploadSessionStatus::Expired);
    }
    Err(api_error(response, "Không kiểm tra được phiên upload Google Drive").await)
}

async fn upload_file(
    item: &VaultItem,
    account: &DriveAccount,
    credentials: &ClientCredentials,
    refresh_token: &str,
    initial_access_token: String,
) -> Result<String, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|_| "DRIVE_CLIENT_ERROR: Không tạo được kết nối Google Drive.".to_owned())?;
    let session_entry = upload_session_entry(item, account)?;
    if let Ok(legacy_entry) = credential(UPLOAD_SESSION_SERVICE, &item.id) {
        let _ = delete_keyring_entry(legacy_entry);
    }
    if let Some(file_id) = find_existing_file(&client, &initial_access_token, item, account).await?
    {
        verify_remote_file(&client, &initial_access_token, &file_id, item).await?;
        let _ = session_entry.delete_credential();
        return Ok(file_id);
    }
    let mut session_url = session_entry.get_password().ok();
    let mut offset = 0_u64;
    if let Some(existing_url) = session_url.as_deref() {
        match inspect_upload_session(
            &client,
            existing_url,
            item.size_bytes,
            &initial_access_token,
        )
        .await?
        {
            UploadSessionStatus::Active(value) => offset = value.min(item.size_bytes),
            UploadSessionStatus::Complete(Some(file_id)) => {
                verify_remote_file(&client, &initial_access_token, &file_id, item).await?;
                let _ = session_entry.delete_credential();
                return Ok(file_id);
            }
            UploadSessionStatus::Complete(None) => {
                if let Some(file_id) =
                    find_existing_file(&client, &initial_access_token, item, account).await?
                {
                    let _ = session_entry.delete_credential();
                    return Ok(file_id);
                }
                return Err(
                    "DRIVE_RECONCILIATION_FAILED: Upload đã hoàn tất nhưng chưa đối soát được file ID."
                        .to_owned(),
                );
            }
            UploadSessionStatus::Expired => {
                let _ = session_entry.delete_credential();
                session_url = None;
            }
        }
    }
    let mut access_token = initial_access_token;
    if session_url.is_none() {
        let created = start_upload_session(&client, &access_token, item, account).await?;
        session_entry.set_password(&created).map_err(|_| {
            "CREDENTIAL_WRITE_FAILED: Không lưu được phiên upload an toàn.".to_owned()
        })?;
        session_url = Some(created);
    }
    let session_url = session_url.expect("upload session URL");
    let mut file = tokio::fs::File::open(&item.local_path)
        .await
        .map_err(|_| "LOCAL_FILE_UNAVAILABLE: Không mở được snapshot upload.".to_owned())?;
    file.seek(std::io::SeekFrom::Start(offset))
        .await
        .map_err(|_| "LOCAL_FILE_READ_FAILED: Không đọc tiếp được snapshot upload.".to_owned())?;

    while offset < item.size_bytes {
        let remaining = item.size_bytes - offset;
        let length = remaining.min(DRIVE_CHUNK_SIZE as u64) as usize;
        let mut bytes = vec![0_u8; length];
        file.read_exact(&mut bytes)
            .await
            .map_err(|_| "LOCAL_FILE_READ_FAILED: Không đọc được snapshot upload.".to_owned())?;
        let end = offset + length as u64 - 1;
        let mut last_error = "DRIVE_UPLOAD_FAILED: Không thể tải file lên Google Drive.".to_owned();
        let mut uploaded = false;
        for attempt in 0..DRIVE_UPLOAD_ATTEMPTS {
            let response = client
                .put(&session_url)
                .header(AUTHORIZATION, format!("Bearer {access_token}"))
                .header(CONTENT_TYPE, "application/octet-stream")
                .header(CONTENT_LENGTH, length)
                .header(
                    CONTENT_RANGE,
                    format!("bytes {offset}-{end}/{}", item.size_bytes),
                )
                .body(bytes.clone())
                .send()
                .await;
            match response {
                Ok(response) if response.status().is_success() => {
                    let payload = response.json::<Value>().await.map_err(|_| {
                        "DRIVE_RESPONSE_INVALID: Google Drive trả về dữ liệu lỗi.".to_owned()
                    })?;
                    let file_id = payload
                        .get("id")
                        .and_then(Value::as_str)
                        .map(str::to_owned)
                        .ok_or_else(|| {
                            "DRIVE_RESPONSE_INVALID: Google Drive không trả về file ID.".to_owned()
                        })?;
                    verify_remote_file(&client, &access_token, &file_id, item).await?;
                    let _ = session_entry.delete_credential();
                    return Ok(file_id);
                }
                Ok(response) if response.status() == StatusCode::PERMANENT_REDIRECT => {
                    offset = uploaded_offset(&response).max(end + 1);
                    uploaded = true;
                    break;
                }
                Ok(response) if response.status() == StatusCode::UNAUTHORIZED => {
                    access_token = refresh_access_token(credentials, refresh_token).await?;
                    last_error = "DRIVE_TOKEN_EXPIRED: Google access token hết hạn; đang thử lại."
                        .to_owned();
                }
                Ok(response)
                    if response.status() == StatusCode::TOO_MANY_REQUESTS
                        || response.status().is_server_error() =>
                {
                    let retry_after = response
                        .headers()
                        .get("retry-after")
                        .and_then(|value| value.to_str().ok())
                        .and_then(|value| value.parse::<u64>().ok());
                    last_error = api_error(response, "Google Drive tạm thời bận").await;
                    if attempt + 1 < DRIVE_UPLOAD_ATTEMPTS {
                        tokio::time::sleep(Duration::from_secs(
                            retry_after.unwrap_or(2_u64.pow(attempt as u32)),
                        ))
                        .await;
                    }
                }
                Ok(response) => {
                    return Err(api_error(response, "Google Drive từ chối upload").await);
                }
                Err(_) => {
                    last_error =
                        "DRIVE_NETWORK_ERROR: Kết nối upload Google Drive bị gián đoạn.".to_owned();
                    if attempt + 1 < DRIVE_UPLOAD_ATTEMPTS {
                        tokio::time::sleep(Duration::from_secs(2_u64.pow(attempt as u32))).await;
                    }
                }
            }
        }
        if !uploaded {
            return Err(last_error);
        }
    }
    match inspect_upload_session(&client, &session_url, item.size_bytes, &access_token).await? {
        UploadSessionStatus::Complete(Some(file_id)) => {
            verify_remote_file(&client, &access_token, &file_id, item).await?;
            let _ = session_entry.delete_credential();
            Ok(file_id)
        }
        _ => {
            Err("DRIVE_UPLOAD_INVALID_STATE: Google Drive upload kết thúc không hợp lệ.".to_owned())
        }
    }
}

#[tauri::command]
pub(crate) async fn connect_google_drive(
    app: AppHandle,
    state: State<'_, Mutex<RuntimeState>>,
    client_id: String,
    client_secret: String,
) -> Result<AppSnapshot, String> {
    if OAUTH_IN_PROGRESS
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        return Err(
            "Một cửa sổ đăng nhập Google đang mở. Hãy hoàn tất hoặc chờ hết thời gian.".to_owned(),
        );
    }
    let _oauth_guard = OAuthFlowGuard;
    let supplied_credentials = !client_id.trim().is_empty() || !client_secret.trim().is_empty();
    if supplied_credentials && packaged_client_credentials().is_ok() && !cfg!(debug_assertions) {
        return Err(
            "Bản production đã dùng OAuth chính thức của StoragePK. Cấu hình tùy chỉnh chỉ dành cho bản developer."
                .to_owned(),
        );
    }
    let credentials = if supplied_credentials {
        if client_id.trim().is_empty() {
            return Err("Nhập Google OAuth Client ID dành cho Desktop app.".to_owned());
        }
        ClientCredentials {
            client_id: validate_client_id(&client_id)?,
            client_secret: (!client_secret.trim().is_empty())
                .then(|| client_secret.trim().to_owned()),
        }
    } else {
        client_credentials()?
    };
    let token = authorize(&credentials).await?;
    let refresh_token = token.refresh_token.ok_or_else(|| {
        "Google không trả về refresh token. Hãy gỡ quyền StoragePK trong Google Account rồi kết nối lại."
            .to_owned()
    })?;
    let identity = drive_identity(&token.access_token).await?;
    let existing_folder_id = {
        let state = state
            .lock()
            .map_err(|_| "Storage state is unavailable.".to_owned())?;
        state
            .persisted
            .drive
            .accounts
            .iter()
            .find(|account| account.id == identity.id)
            .map(|account| account.folder_id.as_str())
            .map(str::to_owned)
    };
    let folder_id = ensure_storagepk_folder(
        &Client::new(),
        &token.access_token,
        existing_folder_id.as_deref(),
    )
    .await?;
    if supplied_credentials {
        save_client_credentials(&credentials)?;
    }
    refresh_token_entry(&identity.id)?
        .set_password(&refresh_token)
        .map_err(|error| error.to_string())?;
    let mut state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    let connected_at = state
        .persisted
        .drive
        .accounts
        .iter()
        .find(|account| account.id == identity.id)
        .map(|account| account.connected_at)
        .unwrap_or_else(now_ms);
    let account = DriveAccount {
        id: identity.id,
        email: identity.email,
        display_name: identity.display_name,
        folder_id,
        enabled: true,
        quota_limit_bytes: identity.quota_limit_bytes,
        quota_usage_bytes: identity.quota_usage_bytes,
        connected_at,
        last_checked_at: Some(now_ms()),
        last_error: None,
        granted_scopes: token
            .scope
            .as_deref()
            .map(|value| value.split_whitespace().map(str::to_owned).collect())
            .unwrap_or_else(|| vec![DRIVE_SCOPE.to_owned()]),
    };
    if let Some(existing) = state
        .persisted
        .drive
        .accounts
        .iter_mut()
        .find(|candidate| candidate.id == account.id)
    {
        *existing = account;
    } else {
        state.persisted.drive.accounts.push(account);
    }
    persist_state(&app, &state.persisted)?;
    Ok(app_snapshot(&app, &state.persisted))
}

#[tauri::command]
pub(crate) async fn refresh_google_drive(
    app: AppHandle,
    state: State<'_, Mutex<RuntimeState>>,
    account_id: String,
) -> Result<AppSnapshot, String> {
    let credentials = client_credentials()?;
    let refresh_token = refresh_token_entry(&account_id)?
        .get_password()
        .map_err(|_| {
            "Không tìm thấy Google refresh token trong Windows Credential Manager.".to_owned()
        })?;
    let access_token = refresh_access_token(&credentials, &refresh_token).await?;
    let identity = drive_identity(&access_token).await?;
    let existing_folder = {
        let state = state
            .lock()
            .map_err(|_| "Storage state is unavailable.".to_owned())?;
        state
            .persisted
            .drive
            .accounts
            .iter()
            .find(|account| account.id == account_id)
            .map(|account| account.folder_id.clone())
    };
    let folder_id =
        ensure_storagepk_folder(&Client::new(), &access_token, existing_folder.as_deref()).await?;
    let mut state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    let account = state
        .persisted
        .drive
        .accounts
        .iter_mut()
        .find(|account| account.id == account_id)
        .ok_or_else(|| "Không tìm thấy tài khoản Google Drive.".to_owned())?;
    account.email = identity.email;
    account.display_name = identity.display_name;
    account.folder_id = folder_id;
    account.quota_limit_bytes = identity.quota_limit_bytes;
    account.quota_usage_bytes = identity.quota_usage_bytes;
    account.last_checked_at = Some(now_ms());
    account.last_error = None;
    if !account
        .granted_scopes
        .iter()
        .any(|scope| scope == DRIVE_SCOPE)
    {
        account.granted_scopes = vec![DRIVE_SCOPE.to_owned()];
    }
    persist_state(&app, &state.persisted)?;
    Ok(app_snapshot(&app, &state.persisted))
}

#[tauri::command]
pub(crate) fn disconnect_google_drive(
    app: AppHandle,
    state: State<'_, Mutex<RuntimeState>>,
    account_id: String,
) -> Result<AppSnapshot, String> {
    let session_entries = {
        let state = state
            .lock()
            .map_err(|_| "Storage state is unavailable.".to_owned())?;
        state
            .persisted
            .items
            .iter()
            .filter(|item| item.drive_account_id.as_deref() == Some(account_id.as_str()))
            .flat_map(|item| {
                [
                    credential(
                        UPLOAD_SESSION_SERVICE,
                        &upload_session_username(item, &account_id),
                    )
                    .ok(),
                    credential(UPLOAD_SESSION_SERVICE, &item.id).ok(),
                ]
                .into_iter()
                .flatten()
            })
            .collect::<Vec<_>>()
    };
    for entry in session_entries {
        delete_keyring_entry(entry)?;
    }
    delete_keyring_entry(refresh_token_entry(&account_id)?)?;
    let mut state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    state
        .persisted
        .drive
        .accounts
        .retain(|account| account.id != account_id);
    if state.persisted.drive.accounts.is_empty() {
        state.persisted.drive.auto_sync = false;
    }
    persist_state(&app, &state.persisted)?;
    Ok(app_snapshot(&app, &state.persisted))
}

#[tauri::command]
pub(crate) fn clear_google_drive_client(
    app: AppHandle,
    state: State<'_, Mutex<RuntimeState>>,
) -> Result<AppSnapshot, String> {
    let state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    if !state.persisted.drive.accounts.is_empty() {
        return Err("Hãy ngắt tất cả tài khoản Drive trước khi thay OAuth Client.".to_owned());
    }
    delete_keyring_entry(credential(CLIENT_SERVICE, CLIENT_ID_USER)?)?;
    delete_keyring_entry(credential(CLIENT_SERVICE, CLIENT_SECRET_USER)?)?;
    Ok(app_snapshot(&app, &state.persisted))
}

#[tauri::command]
pub(crate) fn set_google_drive_auto_sync(
    app: AppHandle,
    state: State<'_, Mutex<RuntimeState>>,
    auto_sync: bool,
) -> Result<AppSnapshot, String> {
    let mut state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    if auto_sync && state.persisted.drive.accounts.is_empty() {
        return Err("Kết nối ít nhất một Google Drive trước khi bật tự đồng bộ.".to_owned());
    }
    state.persisted.drive.auto_sync = auto_sync;
    persist_state(&app, &state.persisted)?;
    Ok(app_snapshot(&app, &state.persisted))
}

#[tauri::command]
pub(crate) async fn sync_item_google_drive(
    app: AppHandle,
    state: State<'_, Mutex<RuntimeState>>,
    item_id: String,
    account_id: Option<String>,
) -> Result<AppSnapshot, String> {
    let credentials = client_credentials()?;
    let (item, vault_path) = {
        let state = state
            .lock()
            .map_err(|_| "Storage state is unavailable.".to_owned())?;
        let item = state
            .persisted
            .items
            .iter()
            .find(|item| item.id == item_id)
            .cloned()
            .ok_or_else(|| "Không tìm thấy file.".to_owned())?;
        (item, state.persisted.vault_path.clone())
    };
    let snapshot_app = app.clone();
    let snapshot_item = item.clone();
    let prepared = tauri::async_runtime::spawn_blocking(move || {
        prepare_upload_snapshot(&snapshot_app, &snapshot_item, &vault_path)
    })
    .await
    .map_err(|_| "LOCAL_UPLOAD_TASK_FAILED: Không chuẩn bị được file upload.".to_owned())??;
    let upload_item = item_for_snapshot(&item, &prepared);
    let account = {
        let mut state = state
            .lock()
            .map_err(|_| "Storage state is unavailable.".to_owned())?;
        let current = state
            .persisted
            .items
            .iter()
            .find(|candidate| candidate.id == item_id)
            .cloned()
            .ok_or_else(|| "Không tìm thấy file.".to_owned())?;
        let requested_account = account_id
            .as_deref()
            .or(current.drive_account_id.as_deref());
        if current.drive_sync_state == "synced"
            && current.drive_remote_id.is_some()
            && current.size_bytes == prepared.size_bytes
            && current.checksum_sha256 == prepared.checksum_sha256
            && account_id
                .as_deref()
                .is_none_or(|requested| current.drive_account_id.as_deref() == Some(requested))
        {
            return Ok(app_snapshot(&app, &state.persisted));
        }
        let account = select_account(
            &state.persisted.drive.accounts,
            requested_account,
            prepared.size_bytes,
        )?;
        let target = state
            .persisted
            .items
            .iter_mut()
            .find(|candidate| candidate.id == item_id)
            .expect("item exists");
        target.size_bytes = prepared.size_bytes;
        target.checksum_sha256 = prepared.checksum_sha256.clone();
        target.drive_sync_state = "syncing".to_owned();
        target.drive_account_id = Some(account.id.clone());
        target.drive_last_error = None;
        persist_state(&app, &state.persisted)?;
        account
    };
    let result = async {
        let refresh_token = refresh_token_entry(&account.id)?
            .get_password()
            .map_err(|_| {
                "CREDENTIAL_NOT_FOUND: Không tìm thấy Google refresh token trong Windows Credential Manager."
                    .to_owned()
            })?;
        let access_token = refresh_access_token(&credentials, &refresh_token).await?;
        upload_file(
            &upload_item,
            &account,
            &credentials,
            &refresh_token,
            access_token,
        )
        .await
    }
    .await;
    let source_unchanged = source_matches_snapshot(&prepared);
    let mut state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    let target = state
        .persisted
        .items
        .iter_mut()
        .find(|candidate| candidate.id == item_id)
        .ok_or_else(|| "Không tìm thấy file.".to_owned())?;
    match result {
        Ok(file_id) => {
            target.drive_remote_id = Some(file_id);
            if source_unchanged {
                target.drive_sync_state = "synced".to_owned();
                target.drive_last_error = None;
            } else {
                let error = "LOCAL_FILE_CHANGED_DURING_UPLOAD: Drive đã nhận snapshot an toàn nhưng file local đã thay đổi. Hãy đồng bộ lại.".to_owned();
                target.drive_sync_state = "failed".to_owned();
                target.drive_last_error = Some(error.clone());
                persist_state(&app, &state.persisted)?;
                return Err(error);
            }
        }
        Err(error) => {
            target.drive_sync_state = "failed".to_owned();
            target.drive_last_error = Some(safe_persisted_error(&error));
            persist_state(&app, &state.persisted)?;
            return Err(error);
        }
    }
    persist_state(&app, &state.persisted)?;
    Ok(app_snapshot(&app, &state.persisted))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn account(id: &str, limit: Option<u64>, usage: Option<u64>) -> DriveAccount {
        DriveAccount {
            id: id.to_owned(),
            email: format!("{id}@example.com"),
            display_name: id.to_owned(),
            folder_id: "folder".to_owned(),
            enabled: true,
            quota_limit_bytes: limit,
            quota_usage_bytes: usage,
            connected_at: 0,
            last_checked_at: None,
            last_error: None,
            granted_scopes: vec![DRIVE_SCOPE.to_owned()],
        }
    }

    fn vault_item() -> VaultItem {
        VaultItem {
            id: "item-1".to_owned(),
            name: "archive.bin".to_owned(),
            extension: "bin".to_owned(),
            category: "Other".to_owned(),
            size_bytes: 42,
            imported_at: 0,
            local_path: "archive.bin".to_owned(),
            checksum_sha256: "sha256-value".to_owned(),
            sync_state: "local".to_owned(),
            remote_provider: None,
            remote_id: None,
            last_error: None,
            drive_sync_state: "local".to_owned(),
            drive_account_id: None,
            drive_remote_id: None,
            drive_last_error: None,
        }
    }

    #[test]
    fn pkce_verifier_and_challenge_are_url_safe() {
        let (verifier, challenge) = pkce_pair();
        assert!((43..=128).contains(&verifier.len()));
        assert!(!challenge.contains('='));
        assert!(challenge
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_')));
    }

    #[test]
    fn desktop_client_id_validation_rejects_malformed_values() {
        assert!(validate_client_id("").is_err());
        assert!(validate_client_id("not-a-client").is_err());
        assert!(validate_client_id("123 apps.googleusercontent.com").is_err());
        assert_eq!(
            validate_client_id(" 123.apps.googleusercontent.com ").expect("valid client"),
            "123.apps.googleusercontent.com"
        );
    }

    #[test]
    fn oauth_callback_uses_supported_loopback_root() {
        assert_eq!(OAUTH_CALLBACK_PATH, "/");
    }

    #[test]
    fn oauth_callback_ignores_wrong_state_then_accepts_valid_code() {
        use std::net::{TcpListener, TcpStream};
        use std::thread;

        let listener = TcpListener::bind(("127.0.0.1", 0)).expect("bind callback");
        let address = listener.local_addr().expect("callback address");
        let expected_host = address.to_string();
        let callback = thread::spawn(move || {
            wait_for_oauth_callback(listener, "expected-state".to_owned(), expected_host)
        });

        let send_callback = |state: &str, code: &str| {
            let mut stream = TcpStream::connect(address).expect("connect callback");
            let request = format!(
                "GET /?state={state}&code={code} HTTP/1.1\r\nHost: {address}\r\nConnection: close\r\n\r\n"
            );
            stream
                .write_all(request.as_bytes())
                .expect("write callback");
            let mut response = String::new();
            stream
                .read_to_string(&mut response)
                .expect("read callback response");
            response
        };

        assert!(send_callback("wrong-state", "wrong-code").contains("400 Bad Request"));
        assert!(send_callback("expected-state", "valid-code").contains("200 OK"));
        assert_eq!(
            callback.join().expect("join callback").expect("valid callback"),
            "valid-code"
        );
    }

    #[test]
    fn token_form_only_includes_secret_when_configured() {
        let public_client = ClientCredentials {
            client_id: "public.apps.googleusercontent.com".to_owned(),
            client_secret: None,
        };
        let confidential_client = ClientCredentials {
            client_id: "desktop.apps.googleusercontent.com".to_owned(),
            client_secret: Some("secret".to_owned()),
        };
        let fields = [("grant_type", "refresh_token")];
        assert!(!token_form(&public_client, &fields)
            .iter()
            .any(|(name, _)| name == "client_secret"));
        assert!(token_form(&confidential_client, &fields)
            .iter()
            .any(|(name, value)| name == "client_secret" && value == "secret"));
    }

    #[test]
    fn explicit_routing_rejects_insufficient_quota() {
        let accounts = vec![account("full", Some(100), Some(95))];
        assert!(select_account(&accounts, Some("full"), 10).is_err());
    }

    #[test]
    fn automatic_routing_prefers_largest_known_free_space() {
        let accounts = vec![
            account("small", Some(100), Some(80)),
            account("large", Some(100), Some(20)),
        ];
        assert_eq!(
            select_account(&accounts, None, 10).expect("route").id,
            "large"
        );
    }

    #[test]
    fn remote_payload_requires_matching_size_and_checksum_metadata() {
        let item = vault_item();
        let matching = json!({
            "id": "remote-1",
            "size": "42",
            "appProperties": {
                "storagepkId": "item-1",
                "storagepkSha256": "sha256-value"
            }
        });
        assert!(remote_payload_matches_item(&matching, &item));
        let wrong_size = json!({
            "id": "remote-1",
            "size": "41",
            "appProperties": {
                "storagepkId": "item-1",
                "storagepkSha256": "sha256-value"
            }
        });
        assert!(!remote_payload_matches_item(&wrong_size, &item));
    }

    #[test]
    fn upload_session_key_changes_with_file_version() {
        let mut item = vault_item();
        let first = upload_session_username(&item, "account-1");
        item.checksum_sha256 = "version-two".to_owned();
        let second = upload_session_username(&item, "account-1");
        assert_ne!(first, second);
    }
}
