import type { ProviderName } from "./provider";

export const PROVIDER_UPLOAD_QUEUE = "provider-upload";

export interface ProviderUploadJob {
  schemaVersion: 1;
  workspaceId: string;
  fileVersionId: string;
  providerAccountId: string;
  provider: ProviderName;
  stagedFilePath: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  idempotencyKey: string;
  attempt: number;
  routeDecisionId: string;
}
