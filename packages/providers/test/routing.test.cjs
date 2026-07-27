const test = require("node:test");
const assert = require("node:assert/strict");
const { simulateRoute } = require("../dist/routing.js");

const account = (id, provider, remainingBytes, maxUploadBytes = null) => ({
  id,
  provider,
  mode: provider === "drive" ? "oauth" : "public_bot_api",
  label: id,
  identity: null,
  healthState: "healthy",
  capabilities: {
    upload: true,
    download: true,
    delete: provider === "drive",
    verify: true,
    quotaStatus: provider === "drive",
    healthCheck: true,
    resumableUpload: provider === "drive",
    folderMirror: provider === "drive",
    multiAccount: true,
    maxUploadBytes,
    maxDownloadBytes: null,
  },
  quota: { limitBytes: remainingBytes * 2, usageBytes: remainingBytes, remainingBytes, measuredAt: new Date().toISOString() },
  warnings: [],
  revokedAt: null,
});

test("fill-first selects the first compatible account", () => {
  const decision = simulateRoute(
    { filename: "invoice.pdf", sizeBytes: 100, mimeType: "application/pdf" },
    { id: "pool", workspaceId: "workspace", name: "Personal", mode: "fill_first", isDefault: true, healthState: "healthy", accounts: [
      { providerAccountId: "drive-1", priority: 1, role: "primary", quotaThresholdPercent: null, rules: {} },
      { providerAccountId: "drive-2", priority: 2, role: "overflow", quotaThresholdPercent: null, rules: {} },
    ] },
    [account("drive-1", "drive", 10_000), account("drive-2", "drive", 20_000)],
  );
  assert.equal(decision.selectedProviderAccountId, "drive-1");
  assert.equal(decision.status, "selected");
});

test("routing skips a public Telegram account above its file limit", () => {
  const decision = simulateRoute(
    { filename: "archive.zip", sizeBytes: 60 * 1024 * 1024, mimeType: "application/zip" },
    { id: "pool", workspaceId: "workspace", name: "Archive", mode: "failover", isDefault: false, healthState: "healthy", accounts: [
      { providerAccountId: "telegram-1", priority: 1, role: "archive", quotaThresholdPercent: null, rules: {} },
      { providerAccountId: "drive-1", priority: 2, role: "overflow", quotaThresholdPercent: null, rules: {} },
    ] },
    [account("telegram-1", "telegram", 0, 50 * 1024 * 1024), account("drive-1", "drive", 20_000_000_000)],
  );
  assert.equal(decision.selectedProviderAccountId, "drive-1");
  assert.match(decision.candidates[0].reasons.join(" "), /upload limit/);
});
