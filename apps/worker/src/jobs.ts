export { PROVIDER_UPLOAD_QUEUE } from "@storagepk/contracts";
import type { ProviderUploadJob } from "@storagepk/contracts";

export type { ProviderUploadJob } from "@storagepk/contracts";

export function validateProviderUploadJob(job: ProviderUploadJob): void {
  if (job.schemaVersion !== 1) throw new Error("UNSUPPORTED_JOB_SCHEMA");
  if (!job.workspaceId || !job.fileVersionId || !job.providerAccountId) {
    throw new Error("INVALID_PROVIDER_JOB_SCOPE");
  }
  if (!job.stagedFilePath) throw new Error("MISSING_STAGED_FILE_PATH");
}

export function safeProviderErrorCode(error: unknown): string {
  if (
    error instanceof Error
    && /^[A-Z][A-Z0-9_]{2,79}$/.test(error.message)
  ) {
    return error.message;
  }
  return "PROVIDER_UPLOAD_FAILED";
}
