const assert = require("node:assert/strict");
const test = require("node:test");
const {
  safeProviderErrorCode,
  validateProviderUploadJob,
} = require("../dist/jobs.js");

const validJob = {
  schemaVersion: 1,
  workspaceId: "workspace",
  fileVersionId: "file-version",
  providerAccountId: "provider-account",
  provider: "drive",
  stagedFilePath: "staging/file.bin",
  filename: "file.bin",
  mimeType: "application/octet-stream",
  sizeBytes: 4,
  idempotencyKey: "decision:provider",
  attempt: 1,
  routeDecisionId: "decision",
};

test("provider jobs require an explicit workspace and staging path", () => {
  assert.doesNotThrow(() => validateProviderUploadJob(validJob));
  assert.throws(
    () => validateProviderUploadJob({ ...validJob, workspaceId: "" }),
    /INVALID_PROVIDER_JOB_SCOPE/,
  );
  assert.throws(
    () => validateProviderUploadJob({ ...validJob, stagedFilePath: "" }),
    /MISSING_STAGED_FILE_PATH/,
  );
});

test("provider errors never persist raw URLs or tokens", () => {
  assert.equal(
    safeProviderErrorCode(new Error("DRIVE_QUOTA_EXCEEDED")),
    "DRIVE_QUOTA_EXCEEDED",
  );
  assert.equal(
    safeProviderErrorCode(new Error("request failed for https://secret.example/token")),
    "PROVIDER_UPLOAD_FAILED",
  );
});
