"use client";

import {
  Bell,
  CaretRight,
  CaretUpDown,
  CheckCircle,
  CloudArrowUp,
  ClockCounterClockwise,
  DotsThree,
  Files,
  FileDoc,
  FilePdf,
  FileZip,
  FolderOpen,
  GearSix,
  GoogleDriveLogo,
  MagnifyingGlass,
  Moon,
  PaperPlaneTilt,
  Plus,
  Sparkle,
  SquaresFour,
  Sun,
  UploadSimple,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type Theme = "light" | "dark";
type Activity = { name: string; size: string; location: "Drive Stack" | "Telegram Vault"; action: string; updated: string; type: "pdf" | "zip" | "doc" };

const activities: Activity[] = [
  { name: "Project brief.pdf", size: "2.4 MB", location: "Drive Stack", action: "Uploaded", updated: "2 minutes ago", type: "pdf" },
  { name: "Brand assets.zip", size: "42 MB", location: "Telegram Vault", action: "Synced", updated: "18 minutes ago", type: "zip" },
  { name: "Meeting notes.docx", size: "840 KB", location: "Drive Stack", action: "Organised", updated: "Yesterday", type: "doc" },
];

function ProviderIcon({ provider, large = false }: { provider: "drive" | "telegram"; large?: boolean }) {
  return <span className={`provider-icon provider-icon--${provider}${large ? " provider-icon--large" : ""}`}>{provider === "drive" ? <GoogleDriveLogo /> : <PaperPlaneTilt />}</span>;
}

export function Dashboard() {
  const authRequired = process.env.NEXT_PUBLIC_AUTH_REQUIRED === "true";
  const [authState, setAuthState] = useState<"checking" | "authenticated" | "anonymous">(authRequired ? "checking" : "authenticated");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [feedback, setFeedback] = useState("PDF, images, video and more. Up to 2 GB per file.");
  const [toast, setToast] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<"checking" | "connected" | "offline">("checking");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedAccessToken = window.localStorage.getItem("storagepk-access-token");
    const savedRefreshToken = window.localStorage.getItem("storagepk-refresh-token");
    if (authRequired && !savedAccessToken && !savedRefreshToken) setAuthState("anonymous");
    if (savedAccessToken) setAccessToken(savedAccessToken);
    const saved = window.localStorage.getItem("storagepk-theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    fetch(`${apiUrl}/v1/health`, { signal: AbortSignal.timeout(1800) })
      .then((response) => setApiStatus(response.ok ? "connected" : "offline"))
      .catch(() => setApiStatus("offline"));
  }, [authRequired]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("storagepk-theme", theme);
  }, [theme]);

  const filteredActivities = useMemo(() => activities.filter((activity) => activity.name.toLowerCase().includes(query.trim().toLowerCase())), [query]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const label = files.length === 1 ? files[0]?.name ?? "File" : `${files.length} files`;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    try {
      const authHeaders: Record<string, string> = accessToken ? { authorization: `Bearer ${accessToken}` } : {};
      const sessionResponse = await fetch(`${apiUrl}/v1/upload-sessions`, { method: "POST", headers: { ...authHeaders, "x-workspace-id": "demo-workspace", "content-type": "application/json" }, body: "{}" });
      if (!sessionResponse.ok) throw new Error("session_failed");
      const session = await sessionResponse.json() as { id: string };
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("file", file);
        const itemResponse = await fetch(`${apiUrl}/v1/upload-sessions/${session.id}/items`, { method: "POST", headers: { ...authHeaders, "x-workspace-id": "demo-workspace" }, body: form });
        if (!itemResponse.ok) throw new Error("file_failed");
      }
      setFeedback(`${label} staged. Smart routing is ready to choose a pool.`);
      setToast(`${label} added to your upload queue.`);
    } catch {
      setFeedback(`${label} selected in preview mode. Start the API to stage it locally.`);
      setToast(`${label} selected for preview.`);
    }
    window.setTimeout(() => setToast(null), 3200);
  };

  if (authRequired && authState === "checking") return <div className="auth-loading">Loading your workspace...</div>;
  if (authRequired && authState === "anonymous") return <LoginScreen onLogin={(token) => { setAccessToken(token); setAuthState("authenticated"); }} />;

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Workspace navigation">
        <div className="sidebar-top">
          <a className="brand" href="#overview"><span className="brand-mark"><span /><span /><span /></span><span className="brand-name">StoragePK</span></a>
          <button className="workspace-switcher" type="button"><span className="workspace-avatar">D</span><span className="workspace-copy"><strong>Demo workspace</strong><small>Local preview</small></span><CaretUpDown /></button>
          <nav className="primary-nav" aria-label="Primary"><p className="nav-label">Workspace</p><a className="nav-item is-active" href="#overview"><SquaresFour /><span>Overview</span></a><a className="nav-item" href="#files"><Files /><span>All files</span><span className="nav-count">248</span></a><a className="nav-item" href="#activity"><ClockCounterClockwise /><span>Activity</span></a></nav>
          <div className="sidebar-section"><div className="sidebar-section-heading"><p className="nav-label">Storage pools</p><button className="icon-button icon-button--small" type="button" aria-label="Add storage pool"><Plus /></button></div><a className="pool-nav-item" href="#pools"><ProviderIcon provider="drive" /><span>Drive Stack</span><span className="status-dot status-dot--healthy" /></a><a className="pool-nav-item" href="#pools"><ProviderIcon provider="telegram" /><span>Telegram Vault</span><span className="status-dot status-dot--healthy" /></a></div>
        </div>
        <div className="sidebar-bottom"><div className="support-card"><span className="support-icon"><Sparkle /></span><div><strong>StoragePK</strong><p>Local-first storage workspace.</p><button type="button">View docs <ArrowUpRight /></button></div></div><a className="nav-item" href="#settings"><GearSix /><span>Settings</span></a><div className="profile-row"><span className="profile-avatar">SP</span><span className="profile-copy"><strong>StoragePK user</strong><small>Demo mode</small></span><DotsThree /></div></div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar"><div className="breadcrumbs"><span>Demo workspace</span><CaretRight /><strong>Overview</strong></div><div className="topbar-actions"><label className="search-box"><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search files" aria-label="Search files" /><kbd>⌘ K</kbd></label><button className="icon-button notification-button" type="button" aria-label="Notifications"><Bell /><span className="notification-dot" /></button><button className="theme-toggle" type="button" aria-pressed={theme === "dark"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Moon /> : <Sun />}<span>{theme === "dark" ? "Dark" : "Light"}</span></button></div></header>
        <div className="content-wrap">
          <section className="page-heading"><div><p className="eyebrow">Workspace overview</p><h1>Your storage, organised.</h1><p className="page-subtitle">Review local files and connected provider pools in one place.</p></div><button className="button button--primary" type="button" onClick={() => fileInputRef.current?.click()}><UploadSimple />Add files</button></section>
          <section className="top-grid" aria-label="Storage summary"><article className="surface storage-summary"><div className="card-heading"><div><p className="section-kicker">Total storage</p><h2>14.8 <span>GB</span></h2></div><button className="more-button" type="button" aria-label="More storage options"><DotsThree /></button></div><div className="storage-summary-body"><div className="storage-ring"><div className="storage-ring__inner"><strong>46%</strong><span>used</span></div></div><div className="storage-breakdown"><div className="breakdown-row"><span><i className="legend-dot legend-dot--drive" />Drive Stack</span><strong>8.2 GB</strong></div><div className="breakdown-row"><span><i className="legend-dot legend-dot--telegram" />Telegram Vault</span><strong>6.6 GB</strong></div><div className="storage-progress"><span /></div><p className="muted-note">32 GB available across 10 connected accounts</p></div></div></article>
            <article className={`surface upload-card${dragging ? " is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); setFeedback("Drop to add files to your queue."); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); handleFiles(event.dataTransfer.files); }}><div className="upload-card__header"><div><p className="section-kicker">Quick upload</p><h2>Bring files in.</h2></div><span className="upload-status"><CheckCircle /> Ready</span></div><div className="drop-target" tabIndex={0}><span className="drop-icon"><CloudArrowUp /></span><div><strong>Drop files anywhere here</strong><p>or <button type="button" onClick={() => fileInputRef.current?.click()}>browse from your device</button></p></div><small>Routing honors each provider&apos;s current limits</small></div><p className="upload-feedback">{feedback}</p><input ref={fileInputRef} onChange={(event) => handleFiles(event.target.files)} type="file" multiple hidden /></article>
          </section>

          <section className="section-block" id="pools"><div className="section-heading"><div><p className="eyebrow">Connected infrastructure</p><h2>Storage pools</h2></div><button className="button button--secondary" type="button">Manage pools <ArrowUpRight /></button></div><div className="pool-grid"><PoolCard provider="drive" name="Drive Stack" description="10 Google Drive accounts" used="8.2 GB used" detail="25.6%" footer="32 GB total capacity" sync="Synced 2 min ago" progress="26%" /><PoolCard provider="telegram" name="Telegram Vault" description="Private bot archive" used="6.6 GB used" detail="Local Bot API" footer="Large file mode enabled" sync="Synced 5 min ago" progress="41%" /><button className="surface add-pool-card" type="button"><span className="add-pool-icon"><Plus /></span><strong>Connect a storage pool</strong><span>Google Drive, Telegram or more</span></button></div></section>

          <section className="section-block" id="activity"><div className="section-heading section-heading--compact"><div><p className="eyebrow">Latest changes</p><h2>Recent activity</h2></div><a className="text-link" href="#activity">View all activity <ArrowUpRight /></a></div><div className="surface activity-table"><div className="activity-row activity-row--head"><span>File</span><span>Location</span><span>Activity</span><span>Updated</span></div>{filteredActivities.map((activity) => <ActivityRow key={activity.name} activity={activity} />)}{filteredActivities.length === 0 && <div className="activity-empty">No matching files in recent activity.</div>}</div></section>
          <footer className="page-footer"><span><span className="status-dot status-dot--healthy" />{apiStatus === "connected" ? "API connected" : apiStatus === "offline" ? "Preview mode" : "Checking API"}</span><span>StoragePK v0.1</span></footer>
        </div>
      </main>
      {toast && <div className="toast"><CheckCircle />{toast}</div>}
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (accessToken: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/v1/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, clientType: "web" }) });
      if (!response.ok) throw new Error("Invalid credentials.");
      const tokens = await response.json() as { accessToken: string; refreshToken: string };
      window.localStorage.setItem("storagepk-access-token", tokens.accessToken);
      window.localStorage.setItem("storagepk-refresh-token", tokens.refreshToken);
      onLogin(tokens.accessToken);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="auth-screen"><div className="auth-card"><span className="brand-mark"><span /><span /><span /></span><p className="eyebrow">StoragePK workspace</p><h1>Welcome back.</h1><p>Sign in to manage your files and connected storage pools.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="current-password" /></label>{error && <p className="auth-error">{error}</p>}<button className="button button--primary" type="submit" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}</button></form></div></main>;
}

function PoolCard({ provider, name, description, used, detail, footer, sync, progress }: { provider: "drive" | "telegram"; name: string; description: string; used: string; detail: string; footer: string; sync: string; progress: string }) {
  return <article className="surface pool-card"><div className="pool-card__topline"><ProviderIcon provider={provider} large /><span className="connection-badge"><CheckCircle /> Connected</span></div><div className="pool-card__name-row"><div><h3>{name}</h3><p>{description}</p></div><button className="more-button" type="button" aria-label={`More ${name} options`}><DotsThree /></button></div><div className="pool-capacity"><span>{used}</span><strong>{detail}</strong></div><div className={`capacity-track capacity-track--${provider}`}><span style={{ width: progress }} /></div><div className="pool-card__footer"><span>{footer}</span><span>{sync}</span></div></article>;
}

function ActivityRow({ activity }: { activity: Activity }) {
  const FileIcon = activity.type === "pdf" ? FilePdf : activity.type === "zip" ? FileZip : FileDoc;
  return <div className="activity-row"><div className="file-cell"><span className={`file-icon file-icon--${activity.type}`}><FileIcon /></span><span><strong>{activity.name}</strong><small>{activity.size}</small></span></div><span className="location-cell">{activity.location === "Drive Stack" ? <GoogleDriveLogo /> : <PaperPlaneTilt />}{activity.location}</span><span className="activity-cell"><CheckCircle />{activity.action === "Organised" ? <FolderOpen /> : null}{activity.action}</span><span className="time-cell">{activity.updated}</span></div>;
}
