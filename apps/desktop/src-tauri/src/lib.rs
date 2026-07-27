mod drive;

use keyring::Entry;
use reqwest::multipart::{Form, Part};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    fs::{self, File, OpenOptions},
    io::{BufReader, Read, Write},
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

const TELEGRAM_SERVICE: &str = "StoragePK.Telegram";
const TELEGRAM_TOKEN_USER: &str = "bot-token";
const TELEGRAM_PUBLIC_UPLOAD_LIMIT: u64 = 49_000_000;
const TELEGRAM_UPLOAD_ATTEMPTS: usize = 4;
const STATE_SCHEMA_VERSION: u32 = 3;
const SAFE_PREVIOUS_ERROR: &str =
    "STORAGEPK_OPERATION_FAILED: Chi tiết lỗi trước đó đã được ẩn. Hãy thử lại.";

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultItem {
    id: String,
    name: String,
    extension: String,
    category: String,
    size_bytes: u64,
    imported_at: u64,
    local_path: String,
    checksum_sha256: String,
    sync_state: String,
    remote_provider: Option<String>,
    remote_id: Option<String>,
    last_error: Option<String>,
    #[serde(default = "default_sync_state")]
    drive_sync_state: String,
    #[serde(default)]
    drive_account_id: Option<String>,
    #[serde(default)]
    drive_remote_id: Option<String>,
    #[serde(default)]
    drive_last_error: Option<String>,
}

fn default_sync_state() -> String {
    "local".to_owned()
}

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct TelegramConnection {
    connected: bool,
    bot_username: Option<String>,
    chat_id: Option<String>,
    auto_sync: bool,
    last_checked_at: Option<u64>,
    last_error: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistedState {
    #[serde(default)]
    schema_version: u32,
    vault_path: PathBuf,
    items: Vec<VaultItem>,
    telegram: TelegramConnection,
    #[serde(default)]
    drive: drive::DriveConfig,
}

struct RuntimeState {
    persisted: PersistedState,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppSnapshot {
    vault_path: String,
    items: Vec<VaultItem>,
    telegram: TelegramConnection,
    drive: drive::DriveSnapshot,
    total_size_bytes: u64,
    version: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportResult {
    snapshot: AppSnapshot,
    imported_ids: Vec<String>,
    skipped_count: usize,
    errors: Vec<String>,
}

struct ImportOutcome {
    items: Vec<VaultItem>,
    skipped_count: usize,
    errors: Vec<String>,
}

struct UploadSnapshot {
    source_path: PathBuf,
    snapshot_path: PathBuf,
    size_bytes: u64,
    checksum_sha256: String,
}

impl Drop for UploadSnapshot {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.snapshot_path);
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn state_file(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("vault-state.json"))
}

fn default_vault_path(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_local_data_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|error| error.to_string())?;
    let vault = base.join("Vault");
    fs::create_dir_all(&vault).map_err(|error| error.to_string())?;
    Ok(vault)
}

fn safe_persisted_error(error: &str) -> String {
    let trimmed = error.trim();
    if trimmed.starts_with("TELEGRAM_")
        || trimmed.starts_with("DRIVE_")
        || trimmed.starts_with("LOCAL_")
        || trimmed.starts_with("CREDENTIAL_")
    {
        trimmed.chars().take(500).collect()
    } else {
        SAFE_PREVIOUS_ERROR.to_owned()
    }
}

fn scrub_persisted_errors(persisted: &mut PersistedState) {
    persisted.telegram.last_error = persisted
        .telegram
        .last_error
        .as_deref()
        .map(safe_persisted_error);
    for account in &mut persisted.drive.accounts {
        account.last_error = account.last_error.as_deref().map(safe_persisted_error);
    }
    for item in &mut persisted.items {
        item.last_error = item.last_error.as_deref().map(safe_persisted_error);
        item.drive_last_error = item.drive_last_error.as_deref().map(safe_persisted_error);
    }
}

fn persist_state(app: &AppHandle, persisted: &PersistedState) -> Result<(), String> {
    let target = state_file(app)?;
    let mut sanitized = persisted.clone();
    scrub_persisted_errors(&mut sanitized);
    let bytes = serde_json::to_vec_pretty(&sanitized).map_err(|error| error.to_string())?;
    let temporary = target.with_extension(format!("tmp-{}", Uuid::new_v4()));
    let backup = target.with_extension("backup.json");
    {
        let mut file = File::create(&temporary).map_err(|error| error.to_string())?;
        file.write_all(&bytes).map_err(|error| error.to_string())?;
        file.sync_all().map_err(|error| error.to_string())?;
    }
    if target.exists() {
        fs::copy(&target, &backup).map_err(|error| error.to_string())?;
    }
    replace_file(&temporary, &target).inspect_err(|_| {
        let _ = fs::remove_file(&temporary);
    })
}

#[cfg(windows)]
fn replace_file(source: &Path, target: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
    };

    let source_wide = source
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect::<Vec<_>>();
    let target_wide = target
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect::<Vec<_>>();
    let result = unsafe {
        MoveFileExW(
            source_wide.as_ptr(),
            target_wide.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };
    if result == 0 {
        Err(std::io::Error::last_os_error().to_string())
    } else {
        Ok(())
    }
}

#[cfg(not(windows))]
fn replace_file(source: &Path, target: &Path) -> Result<(), String> {
    fs::rename(source, target).map_err(|error| error.to_string())
}

fn parse_persisted_state(bytes: &[u8]) -> Result<PersistedState, String> {
    let mut persisted =
        serde_json::from_slice::<PersistedState>(bytes).map_err(|error| error.to_string())?;
    if persisted.schema_version > STATE_SCHEMA_VERSION {
        return Err(format!(
            "Dữ liệu được tạo bởi StoragePK schema {} mới hơn phiên bản ứng dụng này.",
            persisted.schema_version
        ));
    }
    if persisted.schema_version < STATE_SCHEMA_VERSION {
        scrub_persisted_errors(&mut persisted);
    }
    persisted.schema_version = STATE_SCHEMA_VERSION;
    Ok(persisted)
}

fn load_state(app: &AppHandle) -> Result<RuntimeState, String> {
    let target = state_file(app)?;
    let backup = target.with_extension("backup.json");
    let mut recovered_from_backup = false;
    let persisted = if target.exists() {
        match fs::read(&target)
            .map_err(|error| error.to_string())
            .and_then(|bytes| parse_persisted_state(&bytes))
        {
            Ok(state) => state,
            Err(primary_error) if backup.exists() => {
                recovered_from_backup = true;
                fs::read(&backup)
                    .map_err(|error| error.to_string())
                    .and_then(|bytes| parse_persisted_state(&bytes))
                    .map_err(|backup_error| {
                        format!(
                            "Không đọc được dữ liệu StoragePK. State: {primary_error}. Backup: {backup_error}. File cũ được giữ nguyên."
                        )
                    })?
            }
            Err(error) => {
                return Err(format!(
                "Không đọc được dữ liệu StoragePK: {error}. File cũ được giữ nguyên để phục hồi."
            ))
            }
        }
    } else {
        PersistedState {
            schema_version: STATE_SCHEMA_VERSION,
            vault_path: default_vault_path(app)?,
            items: Vec::new(),
            telegram: TelegramConnection::default(),
            drive: drive::DriveConfig::default(),
        }
    };
    fs::create_dir_all(&persisted.vault_path).map_err(|error| error.to_string())?;
    if recovered_from_backup {
        let corrupt = target.with_extension(format!("corrupt-{}.json", now_ms()));
        fs::rename(&target, &corrupt).map_err(|error| {
            format!("Không thể bảo toàn state hỏng trước khi phục hồi backup: {error}")
        })?;
    }
    persist_state(app, &persisted)?;
    Ok(RuntimeState { persisted })
}

fn snapshot(app: &AppHandle, state: &PersistedState) -> AppSnapshot {
    AppSnapshot {
        vault_path: state.vault_path.to_string_lossy().into_owned(),
        items: state.items.clone(),
        telegram: state.telegram.clone(),
        drive: drive::snapshot(&state.drive),
        total_size_bytes: state.items.iter().map(|item| item.size_bytes).sum(),
        version: app.package_info().version.to_string(),
    }
}

fn category_for(path: &Path) -> &'static str {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    match extension.as_str() {
        "doc" | "docx" | "odt" | "pdf" | "ppt" | "pptx" | "rtf" | "txt" | "xls" | "xlsx" => {
            "Documents"
        }
        "avif" | "bmp" | "gif" | "heic" | "jpeg" | "jpg" | "png" | "svg" | "webp" => "Images",
        "avi" | "m4v" | "mkv" | "mov" | "mp4" | "mpeg" | "webm" => "Video",
        "aac" | "flac" | "m4a" | "mp3" | "ogg" | "wav" => "Audio",
        "7z" | "gz" | "rar" | "tar" | "zip" => "Archives",
        _ => "Other",
    }
}

#[cfg(windows)]
fn is_reparse_point(metadata: &fs::Metadata) -> bool {
    use std::os::windows::fs::MetadataExt;
    use windows_sys::Win32::Storage::FileSystem::FILE_ATTRIBUTE_REPARSE_POINT;

    metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0
}

#[cfg(not(windows))]
fn is_reparse_point(metadata: &fs::Metadata) -> bool {
    metadata.file_type().is_symlink()
}

fn collect_files_within(root: &Path, path: &Path, files: &mut Vec<PathBuf>) {
    let Ok(metadata) = fs::symlink_metadata(path) else {
        return;
    };
    if metadata.file_type().is_symlink() || is_reparse_point(&metadata) {
        return;
    }
    let Ok(canonical) = fs::canonicalize(path) else {
        return;
    };
    if !canonical.starts_with(root) {
        return;
    }
    if metadata.is_file() {
        files.push(canonical);
        return;
    }
    if !metadata.is_dir() {
        return;
    }
    if let Ok(entries) = fs::read_dir(&canonical) {
        for entry in entries.flatten() {
            collect_files_within(root, &entry.path(), files);
        }
    }
}

fn collect_files(path: &Path, files: &mut Vec<PathBuf>) {
    let Ok(metadata) = fs::symlink_metadata(path) else {
        return;
    };
    if metadata.file_type().is_symlink() || is_reparse_point(&metadata) {
        return;
    }
    let Ok(root) = fs::canonicalize(path) else {
        return;
    };
    collect_files_within(&root, &root, files);
}

fn checksum(path: &Path) -> Result<String, String> {
    let file = open_upload_source(path)?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 1024 * 1024];
    loop {
        let read = reader
            .read(&mut buffer)
            .map_err(|error| error.to_string())?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(hex::encode(hasher.finalize()))
}

fn open_upload_source(path: &Path) -> Result<File, String> {
    let mut options = OpenOptions::new();
    options.read(true);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        use windows_sys::Win32::Storage::FileSystem::FILE_SHARE_READ;
        options.share_mode(FILE_SHARE_READ);
    }
    options
        .open(path)
        .map_err(|_| "LOCAL_FILE_UNAVAILABLE: Không thể mở file local để đồng bộ.".to_owned())
}

fn prepare_upload_snapshot(
    app: &AppHandle,
    item: &VaultItem,
    vault_path: &Path,
) -> Result<UploadSnapshot, String> {
    let canonical_vault = fs::canonicalize(vault_path)
        .map_err(|_| "LOCAL_VAULT_UNAVAILABLE: Không thể truy cập kho local.".to_owned())?;
    let source_path = fs::canonicalize(&item.local_path)
        .map_err(|_| "LOCAL_FILE_UNAVAILABLE: Không tìm thấy file local.".to_owned())?;
    if !source_path.starts_with(&canonical_vault) {
        return Err(
            "LOCAL_PATH_OUTSIDE_VAULT: File không nằm trong kho StoragePK đã chọn.".to_owned(),
        );
    }
    let source_metadata = fs::symlink_metadata(&source_path)
        .map_err(|_| "LOCAL_FILE_UNAVAILABLE: Không đọc được thông tin file local.".to_owned())?;
    if !source_metadata.is_file()
        || source_metadata.file_type().is_symlink()
        || is_reparse_point(&source_metadata)
    {
        return Err(
            "LOCAL_UNSAFE_FILE_TYPE: StoragePK không đồng bộ symlink, junction hoặc file đặc biệt."
                .to_owned(),
        );
    }

    let snapshot_directory = app
        .path()
        .app_cache_dir()
        .map_err(|_| "LOCAL_CACHE_UNAVAILABLE: Không mở được thư mục cache.".to_owned())?
        .join("upload-snapshots");
    fs::create_dir_all(&snapshot_directory)
        .map_err(|_| "LOCAL_CACHE_UNAVAILABLE: Không tạo được thư mục cache.".to_owned())?;
    let snapshot_path = snapshot_directory.join(format!("{}-{}.upload", item.id, Uuid::new_v4()));

    let mut source = open_upload_source(&source_path)?;
    let before = source
        .metadata()
        .map_err(|_| "LOCAL_FILE_UNAVAILABLE: Không đọc được thông tin file local.".to_owned())?;
    let before_modified = before.modified().ok();
    let mut snapshot = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&snapshot_path)
        .map_err(|_| "LOCAL_CACHE_UNAVAILABLE: Không tạo được snapshot upload.".to_owned())?;
    let mut hasher = Sha256::new();
    let mut size_bytes = 0_u64;
    let mut buffer = [0_u8; 1024 * 1024];
    loop {
        let read = source
            .read(&mut buffer)
            .map_err(|_| "LOCAL_FILE_READ_FAILED: Không đọc được file local.".to_owned())?;
        if read == 0 {
            break;
        }
        snapshot
            .write_all(&buffer[..read])
            .map_err(|_| "LOCAL_CACHE_WRITE_FAILED: Không ghi được snapshot upload.".to_owned())?;
        hasher.update(&buffer[..read]);
        size_bytes += read as u64;
    }
    snapshot
        .sync_all()
        .map_err(|_| "LOCAL_CACHE_WRITE_FAILED: Không hoàn tất snapshot upload.".to_owned())?;
    let after = source
        .metadata()
        .map_err(|_| "LOCAL_FILE_UNAVAILABLE: Không đọc được thông tin file local.".to_owned())?;
    if before.len() != after.len()
        || before_modified != after.modified().ok()
        || size_bytes != before.len()
    {
        let _ = fs::remove_file(&snapshot_path);
        return Err(
            "LOCAL_FILE_CHANGED: File thay đổi trong lúc chuẩn bị đồng bộ. Hãy thử lại.".to_owned(),
        );
    }

    Ok(UploadSnapshot {
        source_path,
        snapshot_path,
        size_bytes,
        checksum_sha256: hex::encode(hasher.finalize()),
    })
}

fn source_matches_snapshot(snapshot: &UploadSnapshot) -> bool {
    fs::metadata(&snapshot.source_path)
        .ok()
        .is_some_and(|metadata| metadata.len() == snapshot.size_bytes)
        && checksum(&snapshot.source_path)
            .ok()
            .is_some_and(|value| value == snapshot.checksum_sha256)
}

fn item_for_snapshot(item: &VaultItem, snapshot: &UploadSnapshot) -> VaultItem {
    let mut prepared = item.clone();
    prepared.local_path = snapshot.snapshot_path.to_string_lossy().into_owned();
    prepared.size_bytes = snapshot.size_bytes;
    prepared.checksum_sha256 = snapshot.checksum_sha256.clone();
    prepared
}

fn unique_target(directory: &Path, source: &Path) -> PathBuf {
    let filename = source
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("file");
    let initial = directory.join(filename);
    if !initial.exists() {
        return initial;
    }
    let stem = source
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("file");
    let extension = source.extension().and_then(|value| value.to_str());
    for index in 1..10_000 {
        let candidate = match extension {
            Some(value) => directory.join(format!("{stem} ({index}).{value}")),
            None => directory.join(format!("{stem} ({index})")),
        };
        if !candidate.exists() {
            return candidate;
        }
    }
    directory.join(format!("{}-{}", Uuid::new_v4(), filename))
}

fn import_files(
    paths: Vec<String>,
    vault_path: PathBuf,
    existing_checksums: HashSet<String>,
) -> ImportOutcome {
    let mut sources = Vec::new();
    for value in paths {
        collect_files(Path::new(&value), &mut sources);
    }
    let mut known = existing_checksums;
    let mut items = Vec::new();
    let mut skipped_count = 0;
    let mut errors = Vec::new();

    for source in sources {
        let source_name = source
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("file")
            .to_owned();
        let source_checksum = match checksum(&source) {
            Ok(value) => value,
            Err(error) => {
                errors.push(format!("{source_name}: {error}"));
                continue;
            }
        };
        if known.contains(&source_checksum) {
            skipped_count += 1;
            continue;
        }
        let category = category_for(&source).to_owned();
        let category_path = vault_path.join(&category);
        if let Err(error) = fs::create_dir_all(&category_path) {
            errors.push(format!("{source_name}: {error}"));
            continue;
        }
        let target = unique_target(&category_path, &source);
        if let Err(error) = fs::copy(&source, &target) {
            errors.push(format!("{source_name}: {error}"));
            continue;
        }
        let copied_checksum = match checksum(&target) {
            Ok(value) if value == source_checksum => value,
            Ok(_) => {
                let _ = fs::remove_file(&target);
                errors.push(format!(
                    "{source_name}: file changed while it was being imported"
                ));
                continue;
            }
            Err(error) => {
                let _ = fs::remove_file(&target);
                errors.push(format!("{source_name}: {error}"));
                continue;
            }
        };
        let metadata = match fs::metadata(&target) {
            Ok(value) => value,
            Err(error) => {
                let _ = fs::remove_file(&target);
                errors.push(format!("{source_name}: {error}"));
                continue;
            }
        };
        known.insert(copied_checksum.clone());
        items.push(VaultItem {
            id: Uuid::new_v4().to_string(),
            name: target
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or(&source_name)
                .to_owned(),
            extension: target
                .extension()
                .and_then(|value| value.to_str())
                .unwrap_or_default()
                .to_ascii_lowercase(),
            category,
            size_bytes: metadata.len(),
            imported_at: now_ms(),
            local_path: target.to_string_lossy().into_owned(),
            checksum_sha256: copied_checksum,
            sync_state: "local".to_owned(),
            remote_provider: None,
            remote_id: None,
            last_error: None,
            drive_sync_state: default_sync_state(),
            drive_account_id: None,
            drive_remote_id: None,
            drive_last_error: None,
        });
    }

    ImportOutcome {
        items,
        skipped_count,
        errors,
    }
}

fn index_vault_files(
    vault_path: PathBuf,
    existing_paths: HashSet<String>,
    existing_checksums: HashSet<String>,
) -> ImportOutcome {
    let mut sources = Vec::new();
    collect_files(&vault_path, &mut sources);
    let mut known_checksums = existing_checksums;
    let mut items = Vec::new();
    let mut skipped_count = 0;
    let mut errors = Vec::new();

    for source in sources {
        let path_string = source.to_string_lossy().into_owned();
        if existing_paths.contains(&path_string) {
            skipped_count += 1;
            continue;
        }
        let name = source
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("file")
            .to_owned();
        let file_checksum = match checksum(&source) {
            Ok(value) => value,
            Err(error) => {
                errors.push(format!("{name}: {error}"));
                continue;
            }
        };
        if known_checksums.contains(&file_checksum) {
            skipped_count += 1;
            continue;
        }
        let metadata = match fs::metadata(&source) {
            Ok(value) => value,
            Err(error) => {
                errors.push(format!("{name}: {error}"));
                continue;
            }
        };
        known_checksums.insert(file_checksum.clone());
        items.push(VaultItem {
            id: Uuid::new_v4().to_string(),
            name,
            extension: source
                .extension()
                .and_then(|value| value.to_str())
                .unwrap_or_default()
                .to_ascii_lowercase(),
            category: category_for(&source).to_owned(),
            size_bytes: metadata.len(),
            imported_at: metadata
                .created()
                .or_else(|_| metadata.modified())
                .ok()
                .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
                .map(|value| value.as_millis() as u64)
                .unwrap_or_else(now_ms),
            local_path: path_string,
            checksum_sha256: file_checksum,
            sync_state: "local".to_owned(),
            remote_provider: None,
            remote_id: None,
            last_error: None,
            drive_sync_state: default_sync_state(),
            drive_account_id: None,
            drive_remote_id: None,
            drive_last_error: None,
        });
    }

    ImportOutcome {
        items,
        skipped_count,
        errors,
    }
}

fn telegram_entry() -> Result<Entry, String> {
    Entry::new(TELEGRAM_SERVICE, TELEGRAM_TOKEN_USER).map_err(|_| {
        "CREDENTIAL_STORE_UNAVAILABLE: Không mở được Windows Credential Manager.".to_owned()
    })
}

fn delete_keyring_entry(entry: Entry) -> Result<(), String> {
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err(
            "CREDENTIAL_DELETE_FAILED: Không thể xóa thông tin đăng nhập khỏi Windows Credential Manager."
                .to_owned(),
        ),
    }
}

async fn telegram_identity(token: &str, chat_id: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let me: Value = client
        .get(format!("https://api.telegram.org/bot{token}/getMe"))
        .send()
        .await
        .map_err(|_| {
            "TELEGRAM_NETWORK_ERROR: Không thể kết nối Telegram để kiểm tra bot.".to_owned()
        })?
        .json()
        .await
        .map_err(|_| {
            "TELEGRAM_RESPONSE_INVALID: Telegram trả về dữ liệu không hợp lệ.".to_owned()
        })?;
    if me.get("ok").and_then(Value::as_bool) != Some(true) {
        return Err(
            "TELEGRAM_AUTH_FAILED: Telegram từ chối Bot Token. Hãy kiểm tra lại token.".to_owned(),
        );
    }
    let chat: Value = client
        .post(format!("https://api.telegram.org/bot{token}/getChat"))
        .json(&serde_json::json!({ "chat_id": chat_id }))
        .send()
        .await
        .map_err(|_| {
            "TELEGRAM_NETWORK_ERROR: Không thể kết nối Telegram để kiểm tra Chat ID.".to_owned()
        })?
        .json()
        .await
        .map_err(|_| {
            "TELEGRAM_RESPONSE_INVALID: Telegram trả về dữ liệu không hợp lệ.".to_owned()
        })?;
    if chat.get("ok").and_then(Value::as_bool) != Some(true) {
        return Err(
            "TELEGRAM_CHAT_UNAVAILABLE: Bot không truy cập được Chat ID đã chọn.".to_owned(),
        );
    }
    Ok(me
        .pointer("/result/username")
        .and_then(Value::as_str)
        .map(|value| format!("@{value}"))
        .unwrap_or_else(|| "Telegram bot".to_owned()))
}

async fn upload_to_telegram(
    item: VaultItem,
    token: String,
    chat_id: String,
) -> Result<(String, String), String> {
    if item.size_bytes > TELEGRAM_PUBLIC_UPLOAD_LIMIT {
        return Err(
            "Telegram Public Bot API chỉ gửi nguyên file dưới 50 MB. File vẫn an toàn trong kho local; Local Bot API là bắt buộc để gửi một file lớn hơn."
                .to_owned(),
        );
    }
    let local_path = item.local_path.clone();
    let bytes = tauri::async_runtime::spawn_blocking(move || fs::read(local_path))
        .await
        .map_err(|_| "LOCAL_UPLOAD_TASK_FAILED: Không chuẩn bị được file upload.".to_owned())?
        .map_err(|_| "LOCAL_FILE_READ_FAILED: Không đọc được snapshot upload.".to_owned())?;
    if bytes.len() as u64 != item.size_bytes
        || hex::encode(Sha256::digest(&bytes)) != item.checksum_sha256
    {
        return Err(
            "LOCAL_SNAPSHOT_MISMATCH: Snapshot upload không khớp checksum đã chuẩn bị.".to_owned(),
        );
    }
    let client = reqwest::Client::new();
    let mut last_error = "TELEGRAM_UPLOAD_FAILED: Không thể tải file lên Telegram.".to_owned();

    for attempt in 0..TELEGRAM_UPLOAD_ATTEMPTS {
        let part = Part::bytes(bytes.clone()).file_name(item.name.clone());
        let form = Form::new()
            .text("chat_id", chat_id.clone())
            .part("document", part);
        match client
            .post(format!("https://api.telegram.org/bot{token}/sendDocument"))
            .multipart(form)
            .send()
            .await
        {
            Ok(response) => {
                let status = response.status();
                let body = response.text().await.map_err(|_| {
                    "TELEGRAM_RESPONSE_INVALID: Không đọc được phản hồi Telegram.".to_owned()
                })?;
                let payload = serde_json::from_str::<Value>(&body).unwrap_or(Value::Null);
                if payload.get("ok").and_then(Value::as_bool) == Some(true) {
                    let remote_id = payload
                        .pointer("/result/document/file_id")
                        .and_then(Value::as_str)
                        .unwrap_or_default()
                        .to_owned();
                    let message_id = payload
                        .pointer("/result/message_id")
                        .and_then(Value::as_i64)
                        .map(|value| value.to_string())
                        .unwrap_or_default();
                    return Ok((remote_id, message_id));
                }
                last_error = format!(
                    "TELEGRAM_API_REJECTED: Telegram từ chối upload (HTTP {}).",
                    status.as_u16()
                );
                let retry_after = payload
                    .pointer("/parameters/retry_after")
                    .and_then(Value::as_u64);
                let retryable = status.as_u16() == 429 || status.is_server_error();
                if !retryable || attempt + 1 == TELEGRAM_UPLOAD_ATTEMPTS {
                    break;
                }
                tokio::time::sleep(Duration::from_secs(
                    retry_after.unwrap_or(2_u64.pow(attempt as u32)),
                ))
                .await;
            }
            Err(_) => {
                last_error = "TELEGRAM_NETWORK_ERROR: Kết nối Telegram bị gián đoạn.".to_owned();
                if attempt + 1 == TELEGRAM_UPLOAD_ATTEMPTS {
                    break;
                }
                tokio::time::sleep(Duration::from_secs(2_u64.pow(attempt as u32))).await;
            }
        }
    }

    Err(last_error)
}

#[tauri::command]
fn app_snapshot(
    app: AppHandle,
    state: State<'_, Mutex<RuntimeState>>,
) -> Result<AppSnapshot, String> {
    let state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    Ok(snapshot(&app, &state.persisted))
}

#[tauri::command]
async fn import_paths(
    app: AppHandle,
    state: State<'_, Mutex<RuntimeState>>,
    paths: Vec<String>,
) -> Result<ImportResult, String> {
    if paths.is_empty() {
        return Err("Không có file nào được chọn.".to_owned());
    }
    let (vault_path, known) = {
        let state = state
            .lock()
            .map_err(|_| "Storage state is unavailable.".to_owned())?;
        (
            state.persisted.vault_path.clone(),
            state
                .persisted
                .items
                .iter()
                .map(|item| item.checksum_sha256.clone())
                .collect::<HashSet<_>>(),
        )
    };
    let outcome =
        tauri::async_runtime::spawn_blocking(move || import_files(paths, vault_path, known))
            .await
            .map_err(|error| error.to_string())?;
    let imported_ids = outcome
        .items
        .iter()
        .map(|item| item.id.clone())
        .collect::<Vec<_>>();
    let mut state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    state.persisted.items.extend(outcome.items);
    state
        .persisted
        .items
        .sort_by_key(|item| std::cmp::Reverse(item.imported_at));
    persist_state(&app, &state.persisted)?;
    Ok(ImportResult {
        snapshot: snapshot(&app, &state.persisted),
        imported_ids,
        skipped_count: outcome.skipped_count,
        errors: outcome.errors,
    })
}

#[tauri::command]
async fn rescan_vault(
    app: AppHandle,
    state: State<'_, Mutex<RuntimeState>>,
) -> Result<ImportResult, String> {
    let (vault_path, existing_paths, existing_checksums) = {
        let state = state
            .lock()
            .map_err(|_| "Storage state is unavailable.".to_owned())?;
        (
            state.persisted.vault_path.clone(),
            state
                .persisted
                .items
                .iter()
                .map(|item| item.local_path.clone())
                .collect::<HashSet<_>>(),
            state
                .persisted
                .items
                .iter()
                .map(|item| item.checksum_sha256.clone())
                .collect::<HashSet<_>>(),
        )
    };
    let outcome = tauri::async_runtime::spawn_blocking(move || {
        index_vault_files(vault_path, existing_paths, existing_checksums)
    })
    .await
    .map_err(|error| error.to_string())?;
    let imported_ids = outcome
        .items
        .iter()
        .map(|item| item.id.clone())
        .collect::<Vec<_>>();
    let mut state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    state.persisted.items.extend(outcome.items);
    for item in &mut state.persisted.items {
        if !Path::new(&item.local_path).exists() {
            item.sync_state = "failed".to_owned();
            item.last_error =
                Some("Không tìm thấy bản local. Mở thư mục kho để kiểm tra.".to_owned());
        }
    }
    state
        .persisted
        .items
        .sort_by_key(|item| std::cmp::Reverse(item.imported_at));
    persist_state(&app, &state.persisted)?;
    Ok(ImportResult {
        snapshot: snapshot(&app, &state.persisted),
        imported_ids,
        skipped_count: outcome.skipped_count,
        errors: outcome.errors,
    })
}

#[tauri::command]
fn open_item(state: State<'_, Mutex<RuntimeState>>, item_id: String) -> Result<(), String> {
    let state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    let item = state
        .persisted
        .items
        .iter()
        .find(|item| item.id == item_id)
        .ok_or_else(|| "Không tìm thấy file.".to_owned())?;
    open::that_detached(&item.local_path).map_err(|error| error.to_string())
}

#[tauri::command]
fn reveal_item(state: State<'_, Mutex<RuntimeState>>, item_id: String) -> Result<(), String> {
    let state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    let item = state
        .persisted
        .items
        .iter()
        .find(|item| item.id == item_id)
        .ok_or_else(|| "Không tìm thấy file.".to_owned())?;
    Command::new("explorer.exe")
        .arg("/select,")
        .arg(&item.local_path)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn open_vault(state: State<'_, Mutex<RuntimeState>>) -> Result<(), String> {
    let state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    open::that_detached(&state.persisted.vault_path).map_err(|error| error.to_string())
}

#[tauri::command]
fn delete_item(
    app: AppHandle,
    state: State<'_, Mutex<RuntimeState>>,
    item_id: String,
) -> Result<AppSnapshot, String> {
    let mut state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    let index = state
        .persisted
        .items
        .iter()
        .position(|item| item.id == item_id)
        .ok_or_else(|| "Không tìm thấy file.".to_owned())?;
    let path = PathBuf::from(&state.persisted.items[index].local_path);
    if path.exists() {
        fs::remove_file(&path).map_err(|error| error.to_string())?;
    }
    state.persisted.items.remove(index);
    persist_state(&app, &state.persisted)?;
    Ok(snapshot(&app, &state.persisted))
}

#[tauri::command]
async fn connect_telegram(
    app: AppHandle,
    state: State<'_, Mutex<RuntimeState>>,
    token: String,
    chat_id: String,
    auto_sync: bool,
) -> Result<AppSnapshot, String> {
    let token = token.trim().to_owned();
    let chat_id = chat_id.trim().to_owned();
    if token.is_empty() || chat_id.is_empty() {
        return Err("Nhập Bot Token và Chat ID trước khi kết nối.".to_owned());
    }
    let identity = telegram_identity(&token, &chat_id).await?;
    telegram_entry()?
        .set_password(&token)
        .map_err(|error| error.to_string())?;
    let mut state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    state.persisted.telegram = TelegramConnection {
        connected: true,
        bot_username: Some(identity),
        chat_id: Some(chat_id),
        auto_sync,
        last_checked_at: Some(now_ms()),
        last_error: None,
    };
    persist_state(&app, &state.persisted)?;
    Ok(snapshot(&app, &state.persisted))
}

#[tauri::command]
async fn test_telegram(
    app: AppHandle,
    state: State<'_, Mutex<RuntimeState>>,
) -> Result<AppSnapshot, String> {
    let token = telegram_entry()?.get_password().map_err(|_| {
        "Không tìm thấy Telegram token trong Windows Credential Manager.".to_owned()
    })?;
    let chat_id = {
        let state = state
            .lock()
            .map_err(|_| "Storage state is unavailable.".to_owned())?;
        state
            .persisted
            .telegram
            .chat_id
            .clone()
            .ok_or_else(|| "Telegram chưa được cấu hình.".to_owned())?
    };
    let identity = telegram_identity(&token, &chat_id).await?;
    let mut state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    state.persisted.telegram.connected = true;
    state.persisted.telegram.bot_username = Some(identity);
    state.persisted.telegram.last_checked_at = Some(now_ms());
    state.persisted.telegram.last_error = None;
    persist_state(&app, &state.persisted)?;
    Ok(snapshot(&app, &state.persisted))
}

#[tauri::command]
fn disconnect_telegram(
    app: AppHandle,
    state: State<'_, Mutex<RuntimeState>>,
) -> Result<AppSnapshot, String> {
    delete_keyring_entry(telegram_entry()?)?;
    let mut state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    state.persisted.telegram = TelegramConnection::default();
    persist_state(&app, &state.persisted)?;
    Ok(snapshot(&app, &state.persisted))
}

#[tauri::command]
fn set_telegram_auto_sync(
    app: AppHandle,
    state: State<'_, Mutex<RuntimeState>>,
    auto_sync: bool,
) -> Result<AppSnapshot, String> {
    let mut state = state
        .lock()
        .map_err(|_| "Storage state is unavailable.".to_owned())?;
    if !state.persisted.telegram.connected {
        return Err("Kết nối Telegram trước khi bật tự đồng bộ.".to_owned());
    }
    state.persisted.telegram.auto_sync = auto_sync;
    persist_state(&app, &state.persisted)?;
    Ok(snapshot(&app, &state.persisted))
}

#[tauri::command]
async fn sync_item_telegram(
    app: AppHandle,
    state: State<'_, Mutex<RuntimeState>>,
    item_id: String,
) -> Result<AppSnapshot, String> {
    let token = telegram_entry()?.get_password().map_err(|_| {
        "Không tìm thấy Telegram token trong Windows Credential Manager.".to_owned()
    })?;
    let (item, vault_path, chat_id) = {
        let state = state
            .lock()
            .map_err(|_| "Storage state is unavailable.".to_owned())?;
        if !state.persisted.telegram.connected {
            return Err("Kết nối Telegram trước khi đồng bộ.".to_owned());
        }
        let chat_id = state
            .persisted
            .telegram
            .chat_id
            .clone()
            .ok_or_else(|| "Telegram Chat ID chưa được cấu hình.".to_owned())?;
        let item = state
            .persisted
            .items
            .iter()
            .find(|item| item.id == item_id)
            .cloned()
            .ok_or_else(|| "Không tìm thấy file.".to_owned())?;
        (item, state.persisted.vault_path.clone(), chat_id)
    };

    let snapshot_app = app.clone();
    let snapshot_item = item.clone();
    let prepared = tauri::async_runtime::spawn_blocking(move || {
        prepare_upload_snapshot(&snapshot_app, &snapshot_item, &vault_path)
    })
    .await
    .map_err(|_| "LOCAL_UPLOAD_TASK_FAILED: Không chuẩn bị được file upload.".to_owned())??;
    let upload_item = item_for_snapshot(&item, &prepared);
    {
        let mut state = state
            .lock()
            .map_err(|_| "Storage state is unavailable.".to_owned())?;
        let target = state
            .persisted
            .items
            .iter_mut()
            .find(|candidate| candidate.id == item_id)
            .ok_or_else(|| "Không tìm thấy file.".to_owned())?;
        target.size_bytes = prepared.size_bytes;
        target.checksum_sha256 = prepared.checksum_sha256.clone();
        target.sync_state = "syncing".to_owned();
        target.last_error = None;
        persist_state(&app, &state.persisted)?;
    }

    let result = upload_to_telegram(upload_item, token, chat_id).await;
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
        Ok((remote_id, message_id)) => {
            target.remote_provider = Some("telegram".to_owned());
            target.remote_id = Some(format!("{message_id}:{remote_id}"));
            if source_unchanged {
                target.sync_state = "synced".to_owned();
                target.last_error = None;
            } else {
                let error = "LOCAL_FILE_CHANGED_DURING_UPLOAD: Telegram đã nhận snapshot an toàn nhưng file local đã thay đổi. Hãy đồng bộ lại.".to_owned();
                target.sync_state = "failed".to_owned();
                target.last_error = Some(error.clone());
                persist_state(&app, &state.persisted)?;
                return Err(error);
            }
        }
        Err(error) => {
            target.sync_state = "failed".to_owned();
            target.last_error = Some(safe_persisted_error(&error));
            persist_state(&app, &state.persisted)?;
            return Err(error);
        }
    }
    persist_state(&app, &state.persisted)?;
    Ok(snapshot(&app, &state.persisted))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let state = load_state(app.handle()).map_err(std::io::Error::other)?;
            app.manage(Mutex::new(state));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_snapshot,
            import_paths,
            rescan_vault,
            open_item,
            reveal_item,
            open_vault,
            delete_item,
            connect_telegram,
            test_telegram,
            disconnect_telegram,
            set_telegram_auto_sync,
            sync_item_telegram,
            drive::connect_google_drive,
            drive::refresh_google_drive,
            drive::disconnect_google_drive,
            drive::clear_google_drive_client,
            drive::set_google_drive_auto_sync,
            drive::sync_item_google_drive
        ])
        .run(tauri::generate_context!())
        .expect("error while running StoragePK Desktop");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_common_file_types() {
        assert_eq!(category_for(Path::new("report.pdf")), "Documents");
        assert_eq!(category_for(Path::new("photo.webp")), "Images");
        assert_eq!(category_for(Path::new("backup.zip")), "Archives");
        assert_eq!(category_for(Path::new("unknown.bin")), "Other");
    }

    #[test]
    fn imports_and_deduplicates_files() {
        let root = std::env::temp_dir().join(format!("storagepk-test-{}", Uuid::new_v4()));
        let source_dir = root.join("source");
        let vault_dir = root.join("vault");
        fs::create_dir_all(&source_dir).expect("create source");
        fs::create_dir_all(&vault_dir).expect("create vault");
        let source = source_dir.join("notes.txt");
        fs::write(&source, b"storagepk test").expect("write source");

        let first = import_files(
            vec![source.to_string_lossy().into_owned()],
            vault_dir.clone(),
            HashSet::new(),
        );
        assert_eq!(first.items.len(), 1);
        assert_eq!(first.items[0].category, "Documents");
        assert!(Path::new(&first.items[0].local_path).exists());

        let second = import_files(
            vec![source.to_string_lossy().into_owned()],
            vault_dir,
            HashSet::from([first.items[0].checksum_sha256.clone()]),
        );
        assert_eq!(second.items.len(), 0);
        assert_eq!(second.skipped_count, 1);

        fs::remove_dir_all(root).expect("remove test directory");
    }

    #[test]
    fn migrates_legacy_state_without_losing_items() {
        let legacy = serde_json::json!({
            "vaultPath": "C:\\StoragePK Vault",
            "items": [{
                "id": "legacy-item",
                "name": "notes.txt",
                "extension": "txt",
                "category": "Documents",
                "sizeBytes": 12,
                "importedAt": 1,
                "localPath": "C:\\StoragePK Vault\\Documents\\notes.txt",
                "checksumSha256": "abc",
                "syncState": "local",
                "remoteProvider": null,
                "remoteId": null,
                "lastError": "request failed for https://api.telegram.org/bot123456:secret/sendDocument"
            }],
            "telegram": {
                "lastError": "https://upload.example/resumable-secret"
            }
        });
        let migrated = parse_persisted_state(&serde_json::to_vec(&legacy).expect("serialize"))
            .expect("migrate");
        assert_eq!(migrated.schema_version, STATE_SCHEMA_VERSION);
        assert_eq!(migrated.items.len(), 1);
        assert_eq!(migrated.items[0].drive_sync_state, "local");
        assert!(migrated.drive.accounts.is_empty());
        assert_eq!(
            migrated.items[0].last_error.as_deref(),
            Some(SAFE_PREVIOUS_ERROR)
        );
        assert_eq!(
            migrated.telegram.last_error.as_deref(),
            Some(SAFE_PREVIOUS_ERROR)
        );
    }

    #[test]
    fn upload_snapshot_detects_source_changes() {
        let root = std::env::temp_dir().join(format!("storagepk-version-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).expect("create version directory");
        let source_path = root.join("source.bin");
        let snapshot_path = root.join("snapshot.bin");
        fs::write(&source_path, b"version one").expect("write source");
        fs::write(&snapshot_path, b"version one").expect("write snapshot");
        let snapshot = UploadSnapshot {
            source_path: source_path.clone(),
            snapshot_path,
            size_bytes: 11,
            checksum_sha256: hex::encode(Sha256::digest(b"version one")),
        };
        assert!(source_matches_snapshot(&snapshot));
        fs::write(&source_path, b"version two").expect("change source");
        assert!(!source_matches_snapshot(&snapshot));
        drop(snapshot);
        fs::remove_dir_all(root).expect("remove version directory");
    }

    #[test]
    fn persisted_errors_only_keep_safe_codes() {
        assert_eq!(
            safe_persisted_error("request failed for https://secret.example/token"),
            SAFE_PREVIOUS_ERROR
        );
        assert_eq!(
            safe_persisted_error("DRIVE_NETWORK_ERROR: Kết nối bị gián đoạn."),
            "DRIVE_NETWORK_ERROR: Kết nối bị gián đoạn."
        );
    }

    #[test]
    fn replaces_state_file_without_partial_contents() {
        let root = std::env::temp_dir().join(format!("storagepk-state-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).expect("create state directory");
        let target = root.join("vault-state.json");
        let source = root.join("vault-state.tmp");
        fs::write(&target, b"old state").expect("write old state");
        fs::write(&source, b"new complete state").expect("write new state");
        replace_file(&source, &target).expect("replace state");
        assert_eq!(
            fs::read_to_string(&target).expect("read replaced state"),
            "new complete state"
        );
        assert!(!source.exists());
        fs::remove_dir_all(root).expect("remove state directory");
    }
}
