import {
  ArrowClockwise,
  ArrowSquareOut,
  Bell,
  CaretRight,
  CaretUpDown,
  CheckCircle,
  ClockCounterClockwise,
  CloudArrowUp,
  DotsThree,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  Files,
  FileText,
  FileVideo,
  FolderOpen,
  GearSix,
  GoogleDriveLogo,
  HardDrive,
  MagnifyingGlass,
  Moon,
  PaperPlaneTilt,
  Plus,
  ShieldCheck,
  SquaresFour,
  Sun,
  Trash,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark";
type View = "overview" | "files" | "connections" | "settings";
type SyncState = "local" | "syncing" | "synced" | "failed";

type VaultItem = {
  id: string;
  name: string;
  extension: string;
  category: string;
  sizeBytes: number;
  importedAt: number;
  localPath: string;
  checksumSha256: string;
  syncState: SyncState;
  remoteProvider: string | null;
  remoteId: string | null;
  lastError: string | null;
  driveSyncState: SyncState;
  driveAccountId: string | null;
  driveRemoteId: string | null;
  driveLastError: string | null;
};

type TelegramConnection = {
  connected: boolean;
  botUsername: string | null;
  chatId: string | null;
  autoSync: boolean;
  lastCheckedAt: number | null;
  lastError: string | null;
};

type DriveAccount = {
  id: string;
  email: string;
  displayName: string;
  folderId: string;
  enabled: boolean;
  quotaLimitBytes: number | null;
  quotaUsageBytes: number | null;
  connectedAt: number;
  lastCheckedAt: number | null;
  lastError: string | null;
};

type DriveSnapshot = {
  configured: boolean;
  packagedClient: boolean;
  customClient: boolean;
  accounts: DriveAccount[];
  autoSync: boolean;
};

type AppSnapshot = {
  vaultPath: string;
  items: VaultItem[];
  telegram: TelegramConnection;
  drive: DriveSnapshot;
  totalSizeBytes: number;
  version: string;
};

type ImportResult = {
  snapshot: AppSnapshot;
  importedIds: string[];
  skippedCount: number;
  errors: string[];
};

const categories = ["Tất cả", "Documents", "Images", "Video", "Audio", "Archives", "Other"];

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB", "PB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${units[index]}`;
}

function formatDate(value: number | null) {
  if (!value) return "Chưa kiểm tra";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeDate(value: number) {
  const difference = Date.now() - value;
  const minutes = Math.max(0, Math.floor(difference / 60_000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value));
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    Documents: "Tài liệu",
    Images: "Hình ảnh",
    Video: "Video",
    Audio: "Âm thanh",
    Archives: "Tệp nén",
    Other: "Khác",
  };
  return labels[category] ?? category;
}

function categoryIcon(category: string) {
  const icons: Record<string, ReactNode> = {
    Documents: <FileText />,
    Images: <FileImage />,
    Video: <FileVideo />,
    Audio: <FileAudio />,
    Archives: <FileArchive />,
    Other: <File />,
  };
  return icons[category] ?? <File />;
}

function syncCopy(state: SyncState, provider: "drive" | "telegram") {
  if (state === "syncing") return "Đang tải";
  if (state === "failed") return "Cần thử lại";
  if (state === "synced") return provider === "drive" ? "Đã lưu Drive" : "Đã lưu Telegram";
  return "Chưa lưu";
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function App() {
  const [theme, setTheme] = useState<Theme>("light");
  const [view, setView] = useState<View>("overview");
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3400);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setSnapshot(await invoke<AppSnapshot>("app_snapshot"));
    } catch (loadError) {
      setError(String(loadError));
    }
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("storagepk-theme");
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("storagepk-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setView("files");
        window.requestAnimationFrame(() => {
          document.querySelector<HTMLInputElement>("#global-file-search")?.focus();
        });
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const syncTelegram = useCallback(async (itemId: string, silent = false) => {
    setBusyItem(itemId);
    setError(null);
    try {
      const next = await invoke<AppSnapshot>("sync_item_telegram", { itemId });
      setSnapshot(next);
      if (!silent) showToast("Đã lưu nguyên file lên Telegram.");
    } catch (syncError) {
      setError(String(syncError));
      await refresh();
    } finally {
      setBusyItem(null);
    }
  }, [refresh, showToast]);

  const syncDrive = useCallback(async (
    itemId: string,
    accountId: string | null = null,
    silent = false,
  ) => {
    setBusyItem(itemId);
    setError(null);
    try {
      const next = await invoke<AppSnapshot>("sync_item_google_drive", { itemId, accountId });
      setSnapshot(next);
      if (!silent) showToast("Đã lưu file lên Google Drive.");
    } catch (syncError) {
      setError(String(syncError));
      await refresh();
    } finally {
      setBusyItem(null);
    }
  }, [refresh, showToast]);

  const importSelectedPaths = useCallback(async (paths: string[]) => {
    if (!paths.length) return;
    setBusy(true);
    setError(null);
    try {
      const result = await invoke<ImportResult>("import_paths", { paths });
      setSnapshot(result.snapshot);
      const imported = result.importedIds.length;
      const details = [
        imported ? `Đã thêm ${imported} file` : "",
        result.skippedCount ? `bỏ qua ${result.skippedCount} file trùng` : "",
      ].filter(Boolean).join(", ");
      showToast(details || "Không có file mới.");
      if (result.errors.length) setError(result.errors.slice(0, 3).join("\n"));
      for (const itemId of result.importedIds) {
        if (result.snapshot.drive.autoSync && result.snapshot.drive.accounts.length) {
          await syncDrive(itemId, null, true);
        }
        if (result.snapshot.telegram.connected && result.snapshot.telegram.autoSync) {
          await syncTelegram(itemId, true);
        }
      }
      if (
        result.importedIds.length
        && (result.snapshot.drive.autoSync || result.snapshot.telegram.autoSync)
      ) {
        showToast("Đã nhập file và hoàn tất tự đồng bộ.");
      }
    } catch (importError) {
      setError(String(importError));
    } finally {
      setBusy(false);
    }
  }, [showToast, syncDrive, syncTelegram]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "enter" || event.payload.type === "over") setDragging(true);
      if (event.payload.type === "leave") setDragging(false);
      if (event.payload.type === "drop") {
        setDragging(false);
        void importSelectedPaths(event.payload.paths);
      }
    }).then((dispose) => {
      unlisten = dispose;
    }).catch(() => undefined);
    return () => unlisten?.();
  }, [importSelectedPaths]);

  const pickFiles = async () => {
    const selected = await open({
      multiple: true,
      directory: false,
      title: "Chọn file để thêm vào StoragePK",
    });
    const paths = Array.isArray(selected) ? selected : selected ? [selected] : [];
    await importSelectedPaths(paths);
  };

  const filteredItems = useMemo(() => {
    if (!snapshot) return [];
    const normalized = query.trim().toLocaleLowerCase("vi");
    return snapshot.items.filter((item) => {
      const matchesCategory = category === "Tất cả" || item.category === category;
      const matchesQuery = !normalized
        || item.name.toLocaleLowerCase("vi").includes(normalized)
        || item.extension.toLocaleLowerCase("vi").includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, query, snapshot]);

  const openItem = async (itemId: string) => {
    try {
      await invoke("open_item", { itemId });
    } catch (openError) {
      setError(String(openError));
    }
  };

  const revealItem = async (itemId: string) => {
    try {
      await invoke("reveal_item", { itemId });
    } catch (revealError) {
      setError(String(revealError));
    }
  };

  const deleteItem = async (item: VaultItem) => {
    if (!window.confirm(`Xóa "${item.name}" khỏi kho local? Bản đã lưu trên Drive/Telegram vẫn được giữ.`)) return;
    try {
      setSnapshot(await invoke<AppSnapshot>("delete_item", { itemId: item.id }));
      showToast("Đã xóa file khỏi kho local.");
    } catch (deleteError) {
      setError(String(deleteError));
    }
  };

  if (!snapshot) {
    return (
      <main className="loading-screen">
        <span className="brand-mark"><span /><span /><span /></span>
        <strong>Đang mở workspace...</strong>
        <small>Đọc kho local và các kết nối an toàn</small>
        {error && (
          <button className="button button--secondary" type="button" onClick={() => void refresh()}>
            Thử lại
          </button>
        )}
      </main>
    );
  }

  const telegramSynced = snapshot.items.filter((item) => item.syncState === "synced").length;
  const driveSynced = snapshot.items.filter((item) => item.driveSyncState === "synced").length;
  const failedCount = snapshot.items.filter(
    (item) => item.syncState === "failed" || item.driveSyncState === "failed",
  ).length;

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        snapshot={snapshot}
        failedCount={failedCount}
        onView={setView}
        onAddPool={() => setView("connections")}
      />

      <main className="main-content">
        <Topbar
          view={view}
          theme={theme}
          query={query}
          onTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
          onQuery={(value) => {
            setQuery(value);
            if (value) setView("files");
          }}
          onStatus={() => showToast("Local Vault đang hoạt động. Không có lỗi hệ thống nền.")}
        />

        <div className="content-wrap">
          {error && (
            <div className="error-banner" role="alert">
              <WarningCircle />
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} aria-label="Đóng thông báo">
                <X />
              </button>
            </div>
          )}

          {view === "overview" && (
            <OverviewView
              snapshot={snapshot}
              busy={busy}
              driveSynced={driveSynced}
              telegramSynced={telegramSynced}
              onPickFiles={() => void pickFiles()}
              onConnections={() => setView("connections")}
              onFiles={() => setView("files")}
              onOpen={(itemId) => void openItem(itemId)}
            />
          )}

          {view === "files" && (
            <FilesView
              snapshot={snapshot}
              items={filteredItems}
              category={category}
              query={query}
              busy={busy}
              busyItem={busyItem}
              onCategory={setCategory}
              onQuery={setQuery}
              onPickFiles={() => void pickFiles()}
              onOpen={(itemId) => void openItem(itemId)}
              onReveal={(itemId) => void revealItem(itemId)}
              onDrive={(itemId) => {
                if (snapshot.drive.accounts.length) void syncDrive(itemId);
                else setView("connections");
              }}
              onTelegram={(itemId) => {
                if (snapshot.telegram.connected) void syncTelegram(itemId);
                else setView("connections");
              }}
              onDelete={(item) => void deleteItem(item)}
            />
          )}

          {view === "connections" && (
            <ConnectionsView
              snapshot={snapshot}
              telegramSynced={telegramSynced}
              driveSynced={driveSynced}
              onSnapshot={setSnapshot}
              onError={setError}
              onToast={showToast}
              onOpenVault={() => void invoke("open_vault").catch((value) => setError(String(value)))}
              onRescan={async () => {
                try {
                  const result = await invoke<ImportResult>("rescan_vault");
                  setSnapshot(result.snapshot);
                  showToast(
                    result.importedIds.length
                      ? `Đã nhận thêm ${result.importedIds.length} file trong kho.`
                      : "Kho local đã được kiểm tra.",
                  );
                  if (result.errors.length) setError(result.errors.slice(0, 3).join("\n"));
                } catch (scanError) {
                  setError(String(scanError));
                }
              }}
            />
          )}

          {view === "settings" && (
            <SettingsView
              snapshot={snapshot}
              theme={theme}
              onTheme={setTheme}
              onOpenVault={() => void invoke("open_vault").catch((value) => setError(String(value)))}
            />
          )}

          <footer className="page-footer">
            <span><i className="status-dot status-dot--healthy" /> Local-first đang hoạt động</span>
            <span>StoragePK {snapshot.version}</span>
          </footer>
        </div>
      </main>

      {dragging && (
        <div className="drop-overlay">
          <CloudArrowUp />
          <strong>Thả file để lưu vào StoragePK</strong>
          <span>File được sao chép, phân loại và chống trùng tự động.</span>
        </div>
      )}
      {toast && <div className="toast"><CheckCircle />{toast}</div>}
    </div>
  );
}

function Sidebar({
  view,
  snapshot,
  failedCount,
  onView,
  onAddPool,
}: {
  view: View;
  snapshot: AppSnapshot;
  failedCount: number;
  onView: (view: View) => void;
  onAddPool: () => void;
}) {
  return (
    <aside className="sidebar" aria-label="Điều hướng workspace">
      <div className="sidebar-top">
        <button className="brand" type="button" onClick={() => onView("overview")}>
          <span className="brand-mark"><span /><span /><span /></span>
          <span className="brand-name">StoragePK</span>
        </button>

        <button className="workspace-switcher" type="button" onClick={() => onView("settings")}>
          <span className="workspace-avatar">M</span>
          <span className="workspace-copy">
            <strong>Workspace của bạn</strong>
            <small>Personal storage</small>
          </span>
          <CaretUpDown />
        </button>

        <nav className="primary-nav">
          <p className="nav-label">Workspace</p>
          <button
            className={`nav-item${view === "overview" ? " is-active" : ""}`}
            type="button"
            onClick={() => onView("overview")}
          >
            <SquaresFour /><span>Tổng quan</span>
          </button>
          <button
            className={`nav-item${view === "files" ? " is-active" : ""}`}
            type="button"
            onClick={() => onView("files")}
          >
            <Files /><span>Tất cả file</span><small className="nav-count">{snapshot.items.length}</small>
          </button>
          <button
            className={`nav-item${view === "connections" ? " is-active" : ""}`}
            type="button"
            onClick={() => onView("connections")}
          >
            <ClockCounterClockwise /><span>Hoạt động & lưu trữ</span>
            {failedCount > 0 && <small className="nav-alert">{failedCount}</small>}
          </button>
        </nav>

        <section className="sidebar-section">
          <div className="sidebar-section-heading">
            <p className="nav-label">Storage pools</p>
            <button className="icon-button icon-button--small" type="button" onClick={onAddPool} aria-label="Thêm nơi lưu">
              <Plus />
            </button>
          </div>
          <button className="pool-nav-item" type="button" onClick={onAddPool}>
            <span className="provider-icon provider-icon--local"><HardDrive /></span>
            <span>Local Vault</span>
            <i className="status-dot status-dot--healthy" />
          </button>
          <button className="pool-nav-item" type="button" onClick={onAddPool}>
            <span className="provider-icon provider-icon--drive"><GoogleDriveLogo /></span>
            <span>Google Drive</span>
            <i className={`status-dot ${snapshot.drive.accounts.length ? "status-dot--healthy" : "status-dot--idle"}`} />
          </button>
          <button className="pool-nav-item" type="button" onClick={onAddPool}>
            <span className="provider-icon provider-icon--telegram"><PaperPlaneTilt /></span>
            <span>Telegram Vault</span>
            <i className={`status-dot ${snapshot.telegram.connected ? "status-dot--healthy" : "status-dot--idle"}`} />
          </button>
        </section>
      </div>

      <div className="sidebar-bottom">
        <div className="support-card">
          <span className="support-icon"><ShieldCheck /></span>
          <div>
            <strong>Local-first</strong>
            <p>File gốc luôn nằm trên máy trước khi đồng bộ.</p>
          </div>
        </div>
        <button
          className={`nav-item${view === "settings" ? " is-active" : ""}`}
          type="button"
          onClick={() => onView("settings")}
        >
          <GearSix /><span>Cài đặt</span>
        </button>
        <div className="profile-row">
          <span className="profile-avatar">M</span>
          <span className="profile-copy"><strong>Máy tính này</strong><small>StoragePK {snapshot.version}</small></span>
          <DotsThree />
        </div>
      </div>
    </aside>
  );
}

function Topbar({
  view,
  theme,
  query,
  onTheme,
  onQuery,
  onStatus,
}: {
  view: View;
  theme: Theme;
  query: string;
  onTheme: () => void;
  onQuery: (value: string) => void;
  onStatus: () => void;
}) {
  const labels: Record<View, string> = {
    overview: "Tổng quan",
    files: "Tất cả file",
    connections: "Kết nối lưu trữ",
    settings: "Cài đặt",
  };
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <span>Workspace của bạn</span><CaretRight /><strong>{labels[view]}</strong>
      </div>
      <div className="topbar-actions">
        <label className="search-box">
          <MagnifyingGlass />
          <input
            id="global-file-search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            type="search"
            placeholder="Tìm file"
            aria-label="Tìm file"
          />
          {query ? (
            <button type="button" onClick={() => onQuery("")} aria-label="Xóa tìm kiếm"><X /></button>
          ) : (
            <kbd>Ctrl K</kbd>
          )}
        </label>
        <button className="icon-button" type="button" onClick={onStatus} aria-label="Trạng thái hệ thống">
          <Bell /><i className="notification-dot" />
        </button>
        <button className="theme-toggle" type="button" onClick={onTheme} aria-pressed={theme === "dark"}>
          {theme === "dark" ? <Moon /> : <Sun />}
          <span>{theme === "dark" ? "Tối" : "Sáng"}</span>
        </button>
      </div>
    </header>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-subtitle">{description}</p>
      </div>
      {action}
    </section>
  );
}

function OverviewView({
  snapshot,
  busy,
  driveSynced,
  telegramSynced,
  onPickFiles,
  onConnections,
  onFiles,
  onOpen,
}: {
  snapshot: AppSnapshot;
  busy: boolean;
  driveSynced: number;
  telegramSynced: number;
  onPickFiles: () => void;
  onConnections: () => void;
  onFiles: () => void;
  onOpen: (itemId: string) => void;
}) {
  const backedUpItems = snapshot.items.filter(
    (item) => item.driveSyncState === "synced" || item.syncState === "synced",
  ).length;
  const backupPercent = snapshot.items.length
    ? Math.round((backedUpItems / snapshot.items.length) * 100)
    : 0;
  const ringStyle = {
    "--storage-percent": `${backupPercent * 3.6}deg`,
  } as CSSProperties;

  return (
    <>
      <PageHeading
        eyebrow="Workspace overview"
        title={`${greeting()}.`}
        description={
          snapshot.items.length
            ? `${snapshot.items.length} file được tổ chức trong kho local và sẵn sàng đồng bộ.`
            : "Kho đang trống. Thêm file đầu tiên để StoragePK tự phân loại."
        }
        action={(
          <button className="button button--primary" type="button" onClick={onPickFiles} disabled={busy}>
            <UploadSimple />{busy ? "Đang thêm..." : "Thêm file"}
          </button>
        )}
      />

      <section className="top-grid">
        <article className="surface storage-summary">
          <div className="card-heading">
            <div>
              <p className="section-kicker">Dữ liệu StoragePK</p>
              <h2>{formatBytes(snapshot.totalSizeBytes)}</h2>
            </div>
            <span className="quiet-badge">{snapshot.items.length} file</span>
          </div>
          <div className="storage-summary-body">
            <div className="storage-ring" style={ringStyle}>
              <div className="storage-ring__inner">
                <strong>{snapshot.items.length ? `${backupPercent}%` : "Local"}</strong>
                <span>{snapshot.items.length ? "có bản sao" : "an toàn"}</span>
              </div>
            </div>
            <div className="storage-breakdown">
              <div className="breakdown-row">
                <span><i className="legend-dot legend-dot--local" />Kho local</span>
                <strong>{formatBytes(snapshot.totalSizeBytes)}</strong>
              </div>
              <div className="breakdown-row">
                <span><i className="legend-dot legend-dot--drive" />Google Drive</span>
                <strong>{driveSynced} file</strong>
              </div>
              <div className="breakdown-row">
                <span><i className="legend-dot legend-dot--telegram" />Telegram</span>
                <strong>{telegramSynced} file</strong>
              </div>
              <div className="storage-progress"><span style={{ width: `${backupPercent}%` }} /></div>
              <p className="muted-note">
                {snapshot.drive.accounts.length
                  ? `${snapshot.drive.accounts.length} đích Drive độc lập • quota hiển thị riêng từng tài khoản`
                  : "Chưa kết nối Google Drive"}
              </p>
            </div>
          </div>
        </article>

        <article className="surface upload-card" onClick={onPickFiles}>
          <div className="upload-card__header">
            <div>
              <p className="section-kicker">Quick upload</p>
              <h2>Kéo file vào đây.</h2>
            </div>
            <span className="upload-status"><CheckCircle /> Sẵn sàng</span>
          </div>
          <div className="drop-target">
            <span className="drop-icon"><CloudArrowUp /></span>
            <div>
              <strong>Thả file vào bất kỳ đâu</strong>
              <p>hoặc <button type="button">chọn từ máy tính</button></p>
            </div>
            <small>File được lưu local trước, sau đó mới chạy auto-sync đã bật</small>
          </div>
          <p className="upload-feedback">Giữ nguyên file gốc • SHA-256 chống trùng • tự phân loại</p>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">Connected infrastructure</p><h2>Storage pools</h2></div>
          <button className="button button--secondary" type="button" onClick={onConnections}>
            Quản lý kết nối <ArrowSquareOut />
          </button>
        </div>
        <div className="pool-grid">
          <article className="surface pool-card pool-card--local">
            <div className="pool-card__topline">
              <span className="provider-icon provider-icon--local provider-icon--large"><HardDrive /></span>
              <span className="connection-badge"><CheckCircle /> Hoạt động</span>
            </div>
            <div className="pool-card__name-row">
              <div><h3>Local Vault</h3><p>Kho gốc trên máy tính</p></div>
            </div>
            <div className="pool-capacity"><span>{formatBytes(snapshot.totalSizeBytes)} đã lưu</span><strong>{snapshot.items.length} file</strong></div>
            <div className="capacity-track capacity-track--local"><span style={{ width: snapshot.items.length ? "100%" : "0%" }} /></div>
            <div className="pool-card__footer"><span>Chống trùng SHA-256</span><span>Luôn sẵn sàng</span></div>
          </article>

          <button className="surface pool-card pool-card--drive" type="button" onClick={onConnections}>
            <div className="pool-card__topline">
              <span className="provider-icon provider-icon--drive provider-icon--large"><GoogleDriveLogo /></span>
              <span className={`connection-badge${snapshot.drive.accounts.length ? "" : " is-idle"}`}>
                {snapshot.drive.accounts.length ? <CheckCircle /> : <Plus />}
                {snapshot.drive.accounts.length ? "Đã kết nối" : "Kết nối"}
              </span>
            </div>
            <div className="pool-card__name-row">
              <div>
                <h3>Google Drive</h3>
                <p>{snapshot.drive.accounts.length ? `${snapshot.drive.accounts.length} tài khoản` : "OAuth chính chủ"}</p>
              </div>
            </div>
            <div className="pool-capacity">
              <span>{driveSynced} file StoragePK</span>
              <strong>{snapshot.drive.accounts.length ? `${snapshot.drive.accounts.length} tài khoản` : "drive.file"}</strong>
            </div>
            <div className="capacity-track"><span style={{ width: `${snapshot.items.length ? Math.round((driveSynced / snapshot.items.length) * 100) : 0}%` }} /></div>
            <div className="pool-card__footer"><span>Resumable upload</span><span>{snapshot.drive.autoSync ? "Auto-sync bật" : "Thủ công"}</span></div>
          </button>

          <button className="surface pool-card pool-card--telegram" type="button" onClick={onConnections}>
            <div className="pool-card__topline">
              <span className="provider-icon provider-icon--telegram provider-icon--large"><PaperPlaneTilt /></span>
              <span className={`connection-badge${snapshot.telegram.connected ? "" : " is-idle"}`}>
                {snapshot.telegram.connected ? <CheckCircle /> : <Plus />}
                {snapshot.telegram.connected ? "Đã kết nối" : "Kết nối"}
              </span>
            </div>
            <div className="pool-card__name-row">
              <div><h3>Telegram Vault</h3><p>{snapshot.telegram.botUsername ?? "Private bot archive"}</p></div>
            </div>
            <div className="pool-capacity"><span>{telegramSynced} file đã gửi</span><strong>Public Bot API</strong></div>
            <div className="capacity-track capacity-track--telegram"><span style={{ width: telegramSynced ? "100%" : "0%" }} /></div>
            <div className="pool-card__footer"><span>Nguyên file dưới 50 MB</span><span>{snapshot.telegram.autoSync ? "Auto-sync bật" : "Thủ công"}</span></div>
          </button>
        </div>
      </section>

      <RecentActivity items={snapshot.items.slice(0, 5)} onFiles={onFiles} onOpen={onOpen} />
    </>
  );
}

function RecentActivity({
  items,
  onFiles,
  onOpen,
}: {
  items: VaultItem[];
  onFiles: () => void;
  onOpen: (itemId: string) => void;
}) {
  return (
    <section className="section-block">
      <div className="section-heading section-heading--compact">
        <div><p className="eyebrow">Latest changes</p><h2>Hoạt động gần đây</h2></div>
        <button className="text-link" type="button" onClick={onFiles}>Xem tất cả <ArrowSquareOut /></button>
      </div>
      <div className="surface activity-table">
        <div className="activity-row activity-row--head">
          <span>File</span><span>Phân loại</span><span>Bản sao</span><span>Cập nhật</span>
        </div>
        {items.length ? items.map((item) => (
          <button className="activity-row" type="button" key={item.id} onClick={() => onOpen(item.id)}>
            <span className="file-cell">
              <i className={`file-icon category-${item.category.toLocaleLowerCase()}`}>{categoryIcon(item.category)}</i>
              <span><strong>{item.name}</strong><small>{formatBytes(item.sizeBytes)}</small></span>
            </span>
            <span className="location-cell">{categoryLabel(item.category)}</span>
            <span className="provider-pills">
              {item.driveSyncState === "synced" && <i className="provider-pill drive"><GoogleDriveLogo /> Drive</i>}
              {item.syncState === "synced" && <i className="provider-pill telegram"><PaperPlaneTilt /> Telegram</i>}
              {item.driveSyncState !== "synced" && item.syncState !== "synced" && <i className="provider-pill local"><HardDrive /> Local</i>}
            </span>
            <span className="time-cell">{formatRelativeDate(item.importedAt)}</span>
          </button>
        )) : (
          <div className="activity-empty">
            <FolderOpen /><strong>Chưa có hoạt động</strong><span>File mới sẽ xuất hiện tại đây.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function FilesView({
  snapshot,
  items,
  category,
  query,
  busy,
  busyItem,
  onCategory,
  onQuery,
  onPickFiles,
  onOpen,
  onReveal,
  onDrive,
  onTelegram,
  onDelete,
}: {
  snapshot: AppSnapshot;
  items: VaultItem[];
  category: string;
  query: string;
  busy: boolean;
  busyItem: string | null;
  onCategory: (value: string) => void;
  onQuery: (value: string) => void;
  onPickFiles: () => void;
  onOpen: (itemId: string) => void;
  onReveal: (itemId: string) => void;
  onDrive: (itemId: string) => void;
  onTelegram: (itemId: string) => void;
  onDelete: (item: VaultItem) => void;
}) {
  return (
    <>
      <PageHeading
        eyebrow="Organised library"
        title="Tất cả file"
        description={`${snapshot.items.length} file • ${formatBytes(snapshot.totalSizeBytes)} trong kho local`}
        action={(
          <button className="button button--primary" type="button" onClick={onPickFiles} disabled={busy}>
            <Plus />{busy ? "Đang thêm..." : "Thêm file"}
          </button>
        )}
      />

      <section className="surface file-toolbar">
        <label className="file-search">
          <MagnifyingGlass />
          <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Tìm theo tên hoặc phần mở rộng" />
          {query && <button type="button" onClick={() => onQuery("")}><X /></button>}
        </label>
        <div className="category-tabs">
          {categories.map((value) => (
            <button
              className={category === value ? "is-active" : ""}
              type="button"
              key={value}
              onClick={() => onCategory(value)}
            >
              {value === "Tất cả" ? value : categoryLabel(value)}
            </button>
          ))}
        </div>
      </section>

      {snapshot.items.length === 0 ? (
        <section className="surface empty-state">
          <span className="empty-icon"><FolderOpen /></span>
          <h2>Kho file đang trống</h2>
          <p>Thêm file đầu tiên. StoragePK sẽ sao chép vào kho local, chống trùng và tự phân loại.</p>
          <button className="button button--primary" type="button" onClick={onPickFiles}><Plus />Thêm file đầu tiên</button>
        </section>
      ) : items.length === 0 ? (
        <section className="surface empty-state compact">
          <MagnifyingGlass /><h2>Không tìm thấy file</h2><p>Thử đổi từ khóa hoặc danh mục.</p>
        </section>
      ) : (
        <section className="surface files-table">
          <div className="file-row file-row--head">
            <span>Tên file</span><span>Phân loại</span><span>Đồng bộ</span><span>Ngày thêm</span><span />
          </div>
          {items.map((item) => (
            <article className="file-row" key={item.id}>
              <button className="file-main" type="button" onClick={() => onOpen(item.id)}>
                <span className={`file-icon category-${item.category.toLocaleLowerCase()}`}>{categoryIcon(item.category)}</span>
                <span><strong>{item.name}</strong><small>{formatBytes(item.sizeBytes)}{item.extension ? ` • ${item.extension.toUpperCase()}` : ""}</small></span>
              </button>
              <span className="file-category">{categoryLabel(item.category)}</span>
              <span className="sync-stack">
                <i className={`mini-state state-${item.driveSyncState}`}>
                  <GoogleDriveLogo />{syncCopy(item.driveSyncState, "drive")}
                </i>
                <i className={`mini-state state-${item.syncState}`}>
                  <PaperPlaneTilt />{syncCopy(item.syncState, "telegram")}
                </i>
              </span>
              <time>{formatDate(item.importedAt)}</time>
              <span className="row-actions">
                <button type="button" onClick={() => onReveal(item.id)} title="Hiện trong thư mục"><FolderOpen /></button>
                <button
                  type="button"
                  onClick={() => onDrive(item.id)}
                  disabled={busyItem === item.id || item.driveSyncState === "synced"}
                  title={snapshot.drive.accounts.length ? "Lưu lên Google Drive" : "Kết nối Google Drive"}
                >
                  {busyItem === item.id && item.driveSyncState === "syncing" ? <ArrowClockwise className="spin" /> : <GoogleDriveLogo />}
                </button>
                <button
                  type="button"
                  onClick={() => onTelegram(item.id)}
                  disabled={busyItem === item.id || item.syncState === "synced"}
                  title={snapshot.telegram.connected ? "Lưu lên Telegram" : "Kết nối Telegram"}
                >
                  {busyItem === item.id && item.syncState === "syncing" ? <ArrowClockwise className="spin" /> : <PaperPlaneTilt />}
                </button>
                <button className="danger-action" type="button" onClick={() => onDelete(item)} title="Xóa bản local"><Trash /></button>
              </span>
              {(item.lastError || item.driveLastError) && (
                <p className="row-error">{item.driveLastError ?? item.lastError}</p>
              )}
            </article>
          ))}
        </section>
      )}
    </>
  );
}

function ConnectionsView({
  snapshot,
  telegramSynced,
  driveSynced,
  onSnapshot,
  onError,
  onToast,
  onOpenVault,
  onRescan,
}: {
  snapshot: AppSnapshot;
  telegramSynced: number;
  driveSynced: number;
  onSnapshot: (value: AppSnapshot) => void;
  onError: (value: string | null) => void;
  onToast: (value: string) => void;
  onOpenVault: () => void;
  onRescan: () => Promise<void>;
}) {
  return (
    <>
      <PageHeading
        eyebrow="Connected infrastructure"
        title="Kết nối lưu trữ"
        description="Quản lý rõ từng nơi lưu. File local không bị xóa khi ngắt kết nối."
      />
      <div className="connection-layout">
        <LocalConnection snapshot={snapshot} onOpenVault={onOpenVault} onRescan={onRescan} />
        <DriveConnection
          drive={snapshot.drive}
          syncedCount={driveSynced}
          onSnapshot={onSnapshot}
          onError={onError}
          onToast={onToast}
        />
        <TelegramConnectionCard
          snapshot={snapshot}
          syncedCount={telegramSynced}
          onSnapshot={onSnapshot}
          onError={onError}
          onToast={onToast}
        />
      </div>
    </>
  );
}

function LocalConnection({
  snapshot,
  onOpenVault,
  onRescan,
}: {
  snapshot: AppSnapshot;
  onOpenVault: () => void;
  onRescan: () => Promise<void>;
}) {
  return (
    <section className="surface connection-card">
      <div className="connection-heading">
        <span className="provider-icon provider-icon--local provider-icon--large"><HardDrive /></span>
        <div><h2>Local Vault</h2><p>Nguồn dữ liệu chính trên máy tính</p></div>
        <span className="connection-badge"><CheckCircle /> Hoạt động</span>
      </div>
      <dl className="stat-grid">
        <div><dt>Đường dẫn</dt><dd title={snapshot.vaultPath}>{snapshot.vaultPath}</dd></div>
        <div><dt>Dung lượng</dt><dd>{formatBytes(snapshot.totalSizeBytes)}</dd></div>
        <div><dt>Số file</dt><dd>{snapshot.items.length}</dd></div>
        <div><dt>Chống trùng</dt><dd>SHA-256</dd></div>
      </dl>
      <div className="connection-actions">
        <button className="button button--secondary" type="button" onClick={onOpenVault}><FolderOpen />Mở thư mục</button>
        <button className="button button--secondary" type="button" onClick={() => void onRescan()}><ArrowClockwise />Quét lại</button>
      </div>
    </section>
  );
}

function DriveConnection({
  drive,
  syncedCount,
  onSnapshot,
  onError,
  onToast,
}: {
  drive: DriveSnapshot;
  syncedCount: number;
  onSnapshot: (value: AppSnapshot) => void;
  onError: (value: string | null) => void;
  onToast: (value: string) => void;
}) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);
  const [clearingClient, setClearingClient] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(!drive.configured);
  const busy = connecting || busyAccountId !== null || clearingClient;

  useEffect(() => {
    if (!drive.configured) setAdvancedOpen(true);
  }, [drive.configured]);

  const connect = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setConnecting(true);
    onError(null);
    try {
      const next = await invoke<AppSnapshot>("connect_google_drive", { clientId, clientSecret });
      onSnapshot(next);
      setClientId("");
      setClientSecret("");
      onToast("Google Drive đã kết nối. Thư mục StoragePK đã sẵn sàng.");
    } catch (connectError) {
      onError(String(connectError));
    } finally {
      setConnecting(false);
    }
  };

  const refreshAccount = async (accountId: string) => {
    setBusyAccountId(accountId);
    onError(null);
    try {
      onSnapshot(await invoke<AppSnapshot>("refresh_google_drive", { accountId }));
      onToast("Đã cập nhật quota và trạng thái Google Drive.");
    } catch (refreshError) {
      onError(String(refreshError));
    } finally {
      setBusyAccountId(null);
    }
  };

  const disconnect = async (account: DriveAccount) => {
    if (!window.confirm(`Ngắt ${account.email} khỏi StoragePK? File đã tải lên Drive vẫn được giữ.`)) return;
    setBusyAccountId(account.id);
    try {
      onSnapshot(await invoke<AppSnapshot>("disconnect_google_drive", { accountId: account.id }));
      onToast(`Đã ngắt ${account.email}.`);
    } catch (disconnectError) {
      onError(String(disconnectError));
    } finally {
      setBusyAccountId(null);
    }
  };

  const toggleAutoSync = async (autoSync: boolean) => {
    try {
      onSnapshot(await invoke<AppSnapshot>("set_google_drive_auto_sync", { autoSync }));
    } catch (toggleError) {
      onError(String(toggleError));
    }
  };

  const clearClient = async () => {
    if (!window.confirm("Xóa OAuth Client đã lưu để nhập bộ Client ID/Secret khác?")) return;
    setClearingClient(true);
    try {
      onSnapshot(await invoke<AppSnapshot>("clear_google_drive_client"));
      setAdvancedOpen(true);
      onToast("Đã xóa OAuth Client khỏi Windows Credential Manager.");
    } catch (clearError) {
      onError(String(clearError));
    } finally {
      setClearingClient(false);
    }
  };

  return (
    <section className="surface connection-card provider-connection drive-connection">
      <div className="connection-heading">
        <span className="provider-icon provider-icon--drive provider-icon--large"><GoogleDriveLogo /></span>
        <div><h2>Google Drive</h2><p>OAuth chính chủ • quyền tối thiểu drive.file</p></div>
        <span className={`connection-badge${drive.accounts.length ? "" : " is-idle"}`}>
          {drive.accounts.length ? <CheckCircle /> : <WarningCircle />}
          {drive.accounts.length ? `${drive.accounts.length} tài khoản` : "Chưa kết nối"}
        </span>
      </div>

      {drive.accounts.length > 0 && (
        <>
          <div className="account-list">
            {drive.accounts.map((account) => {
              const percent = account.quotaLimitBytes && account.quotaUsageBytes != null
                ? Math.min(100, Math.round((account.quotaUsageBytes / account.quotaLimitBytes) * 100))
                : null;
              return (
                <article className="account-row" key={account.id}>
                  <span className="account-avatar">{account.displayName.slice(0, 1).toUpperCase()}</span>
                  <span className="account-copy">
                    <strong>{account.displayName}</strong>
                    <small>{account.email}</small>
                  </span>
                  <span className="account-quota">
                    <strong>{percent == null ? "Quota chưa rõ" : `${percent}% đã dùng`}</strong>
                    <small>
                      {account.quotaLimitBytes && account.quotaUsageBytes != null
                        ? `${formatBytes(account.quotaUsageBytes)} / ${formatBytes(account.quotaLimitBytes)}`
                        : `Kiểm tra ${formatDate(account.lastCheckedAt)}`}
                    </small>
                  </span>
                  <span className="account-actions">
                    <button type="button" onClick={() => void refreshAccount(account.id)} disabled={busy} title="Cập nhật">
                      <ArrowClockwise className={busyAccountId === account.id ? "spin" : undefined} />
                    </button>
                    <button className="danger-action" type="button" onClick={() => void disconnect(account)} disabled={busy} title="Ngắt kết nối"><Trash /></button>
                  </span>
                </article>
              );
            })}
          </div>
          <label className="toggle-row">
            <span><strong>Tự đồng bộ file mới lên Drive</strong><small>Tự chọn tài khoản đang bật và còn đủ quota.</small></span>
            <input type="checkbox" checked={drive.autoSync} onChange={(event) => void toggleAutoSync(event.target.checked)} />
          </label>
          {connecting ? (
            <div className="drive-auth-progress drive-auth-progress--compact" role="status" aria-live="polite">
              <span className="drive-auth-progress__spinner"><ArrowClockwise className="spin" /></span>
              <span>
                <strong>Đang chờ xác nhận trên trình duyệt</strong>
                <small>Chọn tài khoản Google và cấp quyền để thêm vào StoragePK.</small>
              </span>
            </div>
          ) : (
            <div className="connection-actions">
              <button className="button button--secondary" type="button" onClick={() => void connect()} disabled={busy}>
                <Plus />Thêm tài khoản Drive
              </button>
              <span className="connection-summary">{syncedCount} file StoragePK đã lưu trên Drive</span>
            </div>
          )}
        </>
      )}

      {drive.accounts.length === 0 && connecting && (
        <div className="drive-auth-progress" role="status" aria-live="polite">
          <span className="drive-auth-progress__spinner"><ArrowClockwise className="spin" /></span>
          <div className="drive-auth-progress__copy">
            <span className="drive-auth-eyebrow">Đang kết nối an toàn</span>
            <h3>Hoàn tất đăng nhập trong trình duyệt</h3>
            <p>Chọn tài khoản Google và cấp quyền <strong>drive.file</strong>. StoragePK sẽ tự nhận kết quả và cập nhật trạng thái kết nối.</p>
          </div>
          <div className="drive-auth-progress__steps" aria-hidden="true">
            <span className="is-complete"><CheckCircle />Mở trình duyệt</span>
            <span className="is-active"><ArrowClockwise className="spin" />Cấp quyền Google Drive</span>
            <span><CheckCircle />Tự quay về StoragePK</span>
          </div>
          <small className="drive-auth-progress__hint">Giữ StoragePK đang mở trong lúc xác nhận quyền truy cập.</small>
        </div>
      )}

      {drive.configured && drive.accounts.length === 0 && !connecting && (
        <div className="drive-auth-shell">
          <span className="drive-auth-mark"><GoogleDriveLogo /></span>
          <div className="drive-auth-copy">
            <span className="drive-auth-eyebrow">Kết nối trong một bước</span>
            <h3>Đưa file của bạn lên Google Drive</h3>
            <p>StoragePK sẽ mở trình duyệt để bạn chọn tài khoản và cấp quyền. Xác nhận xong, ứng dụng tự nhận kết quả và sẵn sàng đồng bộ.</p>
          </div>
          <button className="button button--primary drive-auth-button" type="button" onClick={() => void connect()} disabled={busy}>
            <GoogleDriveLogo />
            Đăng nhập với Google Drive
            <ArrowSquareOut />
          </button>
          <div className="drive-auth-flow">
            <span><ArrowSquareOut /><small>1</small>Mở trình duyệt</span>
            <span><ShieldCheck /><small>2</small>Cấp quyền drive.file</span>
            <span><CheckCircle /><small>3</small>Tự kết nối vào app</span>
          </div>
        </div>
      )}

      {!drive.configured && drive.accounts.length === 0 && !connecting && (
        <div className="drive-auth-shell drive-auth-shell--setup">
          <span className="drive-auth-mark"><GearSix /></span>
          <div className="drive-auth-copy">
            <span className="drive-auth-eyebrow">Thiết lập dành cho developer</span>
            <h3>Bản build này chưa có OAuth Client</h3>
            <p>Mở cấu hình nâng cao bên dưới để nhập OAuth Client loại Desktop app. Người dùng thông thường không cần thực hiện bước này.</p>
          </div>
          <span className="drive-auth-setup-hint"><GearSix /> Cấu hình một lần, sau đó chỉ cần đăng nhập bằng Google.</span>
        </div>
      )}

      {!drive.packagedClient && (
        <details
          className="developer-settings"
          open={advancedOpen}
          onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
        >
          <summary>
            <span className="developer-settings__title">
              <GearSix />
              <span>
                <strong>Cấu hình nâng cao</strong>
                <small>OAuth Client dành cho developer và bản build tùy chỉnh</small>
              </span>
            </span>
            <CaretRight className="developer-settings__caret" />
          </summary>
          <div className="developer-settings__body">
            {drive.configured ? (
              <div className="developer-client-status">
                <span><ShieldCheck /></span>
                <div>
                  <strong>OAuth Client đã sẵn sàng</strong>
                  <p>Thông tin được lưu trong Windows Credential Manager. Chỉ thay đổi khi bạn phát triển hoặc phân phối một bản build riêng.</p>
                </div>
                <button className="button button--secondary" type="button" onClick={() => void clearClient()} disabled={busy}>
                  {clearingClient ? <ArrowClockwise className="spin" /> : <GearSix />}
                  {clearingClient ? "Đang chuẩn bị..." : "Thay OAuth Client"}
                </button>
              </div>
            ) : (
              <form className="connection-form developer-oauth-form" onSubmit={(event) => void connect(event)}>
                <div className="setup-note">
                  <ShieldCheck />
                  <span>
                    <strong>Credential chỉ được lưu trên máy này.</strong>
                    <small>Dùng OAuth Client loại Desktop app và bật Google Drive API trong cùng Google Cloud project.</small>
                  </span>
                </div>
                <div className="form-grid">
                  <label>
                    <span>OAuth Client ID</span>
                    <input type="text" value={clientId} onChange={(event) => setClientId(event.target.value)} placeholder="...apps.googleusercontent.com" required />
                  </label>
                  <label>
                    <span>OAuth Client Secret (không bắt buộc)</span>
                    <input type="password" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} placeholder="GOCSPX-..." autoComplete="off" />
                  </label>
                </div>
                <ol className="setup-steps">
                  <li>Bật Google Drive API trong project Google Cloud.</li>
                  <li>Tạo OAuth Client loại Desktop app với scope drive.file.</li>
                  <li>Lưu cấu hình và hoàn tất đăng nhập trong trình duyệt.</li>
                </ol>
                <button className="button button--primary" type="submit" disabled={busy}>
                  <GoogleDriveLogo />Lưu và đăng nhập
                </button>
              </form>
            )}
          </div>
        </details>
      )}

      <div className="policy-note">
        <WarningCircle />
        <p>Nhiều tài khoản là các đích lưu do bạn quản lý, không phải cách lách quota hoặc chính sách Google. StoragePK chỉ truy cập file/thư mục do chính ứng dụng tạo.</p>
      </div>
    </section>
  );
}

function TelegramConnectionCard({
  snapshot,
  syncedCount,
  onSnapshot,
  onError,
  onToast,
}: {
  snapshot: AppSnapshot;
  syncedCount: number;
  onSnapshot: (value: AppSnapshot) => void;
  onError: (value: string | null) => void;
  onToast: (value: string) => void;
}) {
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState(snapshot.telegram.chatId ?? "");
  const [autoSync, setAutoSync] = useState(snapshot.telegram.autoSync);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setChatId(snapshot.telegram.chatId ?? "");
    setAutoSync(snapshot.telegram.autoSync);
  }, [snapshot.telegram]);

  const connect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    onError(null);
    try {
      const next = await invoke<AppSnapshot>("connect_telegram", { token, chatId, autoSync });
      onSnapshot(next);
      setToken("");
      onToast("Telegram đã kết nối và kiểm tra thành công.");
    } catch (connectError) {
      onError(String(connectError));
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setSaving(true);
    onError(null);
    try {
      onSnapshot(await invoke<AppSnapshot>("test_telegram"));
      onToast("Kết nối Telegram hoạt động.");
    } catch (testError) {
      onError(String(testError));
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Ngắt Telegram trên máy này? File đã gửi vẫn còn trong chat.")) return;
    try {
      onSnapshot(await invoke<AppSnapshot>("disconnect_telegram"));
      onToast("Đã ngắt kết nối Telegram.");
    } catch (disconnectError) {
      onError(String(disconnectError));
    }
  };

  const toggleAutoSync = async (checked: boolean) => {
    setAutoSync(checked);
    try {
      onSnapshot(await invoke<AppSnapshot>("set_telegram_auto_sync", { autoSync: checked }));
    } catch (toggleError) {
      setAutoSync(!checked);
      onError(String(toggleError));
    }
  };

  return (
    <section className="surface connection-card provider-connection">
      <div className="connection-heading">
        <span className="provider-icon provider-icon--telegram provider-icon--large"><PaperPlaneTilt /></span>
        <div><h2>Telegram Vault</h2><p>Lưu bản sao vào bot hoặc nhóm riêng</p></div>
        <span className={`connection-badge${snapshot.telegram.connected ? "" : " is-idle"}`}>
          {snapshot.telegram.connected ? <CheckCircle /> : <WarningCircle />}
          {snapshot.telegram.connected ? "Đã kết nối" : "Chưa kết nối"}
        </span>
      </div>

      {snapshot.telegram.connected ? (
        <>
          <dl className="stat-grid">
            <div><dt>Bot</dt><dd>{snapshot.telegram.botUsername ?? "Telegram bot"}</dd></div>
            <div><dt>Chat ID</dt><dd>{snapshot.telegram.chatId}</dd></div>
            <div><dt>Đã đồng bộ</dt><dd>{syncedCount} file</dd></div>
            <div><dt>Kiểm tra gần nhất</dt><dd>{formatDate(snapshot.telegram.lastCheckedAt)}</dd></div>
          </dl>
          <label className="toggle-row">
            <span><strong>Tự đồng bộ file mới</strong><small>Public Bot API gửi nguyên file dưới 50 MB.</small></span>
            <input type="checkbox" checked={autoSync} onChange={(event) => void toggleAutoSync(event.target.checked)} />
          </label>
          <div className="connection-actions">
            <button className="button button--secondary" type="button" onClick={() => void test()} disabled={saving}><ArrowClockwise />Kiểm tra lại</button>
            <button className="button button--danger" type="button" onClick={() => void disconnect()}>Ngắt kết nối</button>
          </div>
        </>
      ) : (
        <form className="connection-form" onSubmit={connect}>
          <div className="setup-note">
            <ShieldCheck />
            <span><strong>Bot Token không lưu trong file cấu hình.</strong><small>Token nằm trong Windows Credential Manager.</small></span>
          </div>
          <div className="form-grid">
            <label>
              <span>Bot Token</span>
              <input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="123456789:AA..." required autoComplete="off" />
            </label>
            <label>
              <span>Chat ID</span>
              <input type="text" value={chatId} onChange={(event) => setChatId(event.target.value)} placeholder="-1001234567890 hoặc 123456789" required />
            </label>
          </div>
          <label className="toggle-row">
            <span><strong>Tự đồng bộ file mới</strong><small>File được gửi nguyên vẹn, không tự chia nhỏ.</small></span>
            <input type="checkbox" checked={autoSync} onChange={(event) => setAutoSync(event.target.checked)} />
          </label>
          <button className="button button--primary" type="submit" disabled={saving}>
            <PaperPlaneTilt />{saving ? "Đang kiểm tra..." : "Kiểm tra và kết nối"}
          </button>
        </form>
      )}
      <div className="policy-note">
        <WarningCircle />
        <p>Public Bot API hiện được StoragePK giới hạn dưới 50 MB để giữ một file nguyên vẹn. File lớn hơn vẫn an toàn trong Local Vault.</p>
      </div>
    </section>
  );
}

function SettingsView({
  snapshot,
  theme,
  onTheme,
  onOpenVault,
}: {
  snapshot: AppSnapshot;
  theme: Theme;
  onTheme: (value: Theme) => void;
  onOpenVault: () => void;
}) {
  return (
    <>
      <PageHeading
        eyebrow="Application preferences"
        title="Cài đặt"
        description="Giao diện, vị trí kho và nguyên tắc bảo mật của StoragePK."
      />
      <div className="settings-layout">
        <section className="surface settings-section">
          <div className="settings-heading"><h2>Giao diện</h2><p>Chọn chế độ hiển thị phù hợp với máy của bạn.</p></div>
          <div className="theme-options">
            <button className={theme === "light" ? "is-active" : ""} type="button" onClick={() => onTheme("light")}>
              <Sun /><span><strong>Sáng</strong><small>Rõ ràng ban ngày</small></span>
            </button>
            <button className={theme === "dark" ? "is-active" : ""} type="button" onClick={() => onTheme("dark")}>
              <Moon /><span><strong>Tối</strong><small>Dịu mắt ban đêm</small></span>
            </button>
          </div>
        </section>
        <section className="surface settings-section">
          <div className="settings-heading"><h2>Kho file</h2><p>File gốc được sao chép và phân loại tại đây.</p></div>
          <div className="path-field">
            <FolderOpen /><span title={snapshot.vaultPath}>{snapshot.vaultPath}</span>
            <button type="button" onClick={onOpenVault}><ArrowSquareOut />Mở</button>
          </div>
        </section>
        <section className="surface settings-section">
          <div className="settings-heading"><h2>Quyền riêng tư</h2><p>Thiết kế local-first, không có server trung gian của StoragePK.</p></div>
          <div className="privacy-grid">
            <div><ShieldCheck /><span><strong>Credential Manager</strong><small>Telegram token, Google OAuth client và refresh token không nằm trong JSON.</small></span></div>
            <div><HardDrive /><span><strong>Local source of truth</strong><small>File được giữ trên máy trước khi gửi đến provider.</small></span></div>
            <div><GoogleDriveLogo /><span><strong>Quyền drive.file</strong><small>Chỉ quản lý file và thư mục do StoragePK tạo.</small></span></div>
          </div>
        </section>
        <section className="surface settings-section about-section">
          <span className="brand-mark"><span /><span /><span /></span>
          <div><h2>StoragePK Desktop</h2><p>Phiên bản {snapshot.version} • MIT License</p></div>
        </section>
      </div>
    </>
  );
}
