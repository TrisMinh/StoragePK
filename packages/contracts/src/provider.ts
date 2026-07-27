import type { Readable } from "node:stream";

export type ProviderName = "drive" | "telegram";
export type ProviderMode = "oauth" | "public_bot_api" | "local_bot_api";
export type ProviderHealthState = "healthy" | "degraded" | "disconnected" | "revoked";
export type StoragePoolMode =
  | "fill_first"
  | "balanced"
  | "rule_based"
  | "failover"
  | "replicated"
  | "archive";

export interface ProviderCapabilities {
  upload: boolean;
  download: boolean;
  delete: boolean;
  verify: boolean;
  quotaStatus: boolean;
  healthCheck: boolean;
  resumableUpload: boolean;
  folderMirror: boolean;
  multiAccount: boolean;
  maxUploadBytes: number | null;
  maxDownloadBytes: number | null;
}

export interface ProviderQuota {
  limitBytes: number | null;
  usageBytes: number | null;
  remainingBytes: number | null;
  measuredAt: string;
}

export interface ProviderAccountView {
  id: string;
  provider: ProviderName;
  mode: ProviderMode;
  label: string;
  identity: string | null;
  healthState: ProviderHealthState;
  capabilities: ProviderCapabilities;
  quota: ProviderQuota | null;
  warnings: string[];
  revokedAt: string | null;
}

export interface StoragePoolAccount {
  providerAccountId: string;
  priority: number;
  role: "primary" | "overflow" | "archive" | "replica" | "manual";
  quotaThresholdPercent: number | null;
  rules: ProviderRouteRules;
}

export interface StoragePool {
  id: string;
  workspaceId: string;
  name: string;
  mode: StoragePoolMode;
  isDefault: boolean;
  accounts: StoragePoolAccount[];
  healthState: ProviderHealthState;
}

export interface ProviderRouteRules {
  maxSizeBytes?: number;
  minSizeBytes?: number;
  mimeTypes?: string[];
  extensions?: string[];
  tags?: string[];
  folderPrefixes?: string[];
  classificationLabels?: string[];
}

export interface RouteInput {
  filename: string;
  sizeBytes: number;
  mimeType: string;
  tags?: string[];
  folderPath?: string;
  classificationLabels?: string[];
}

export interface RouteCandidate {
  providerAccountId: string;
  provider: ProviderName;
  accepted: boolean;
  score: number | null;
  reasons: string[];
}

export interface RouteDecision {
  id: string;
  poolId: string;
  mode: StoragePoolMode;
  selectedProviderAccountId: string | null;
  replicaProviderAccountIds: string[];
  status: "selected" | "fallback" | "rejected";
  reason: string;
  candidates: RouteCandidate[];
  createdAt: string;
}

export interface UploadSource {
  filePath: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256?: string;
}

export interface ProviderObject {
  providerObjectId: string;
  providerPath: string | null;
  sizeBytes: number | null;
  mimeType: string | null;
  webUrl: string | null;
  metadata: Record<string, unknown>;
}

export interface ProviderHealth {
  state: ProviderHealthState;
  identity: string | null;
  capabilities: ProviderCapabilities;
  quota: ProviderQuota | null;
  warnings: string[];
}

export interface ProviderDownload {
  stream: Readable;
  sizeBytes: number | null;
  mimeType: string | null;
  filename: string | null;
}

export interface StorageProvider {
  readonly name: ProviderName;
  readonly mode: ProviderMode;
  healthCheck(): Promise<ProviderHealth>;
  uploadObject(source: UploadSource, idempotencyKey: string): Promise<ProviderObject>;
  getObjectMetadata(providerObjectId: string): Promise<ProviderObject>;
  downloadObject(providerObjectId: string): Promise<ProviderDownload>;
  deleteObject(providerObjectId: string): Promise<void>;
}
