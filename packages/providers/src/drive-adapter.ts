import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import type {
  ProviderCapabilities,
  ProviderDownload,
  ProviderHealth,
  ProviderObject,
  ProviderQuota,
  StorageProvider,
  UploadSource,
} from "@storagepk/contracts";
import { ProviderError } from "./errors";
import { assertOk, readJson, requestJson } from "./http";

export interface DriveCredentials {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  tokenExpiresAt?: string;
}

const driveCapabilities: ProviderCapabilities = {
  upload: true,
  download: true,
  delete: true,
  verify: true,
  quotaStatus: true,
  healthCheck: true,
  resumableUpload: true,
  folderMirror: true,
  multiAccount: true,
  maxUploadBytes: null,
  maxDownloadBytes: null,
};

function parseQuota(data: Record<string, unknown>): ProviderQuota | null {
  const storageQuota = data.storageQuota as Record<string, unknown> | undefined;
  if (!storageQuota) return null;
  const limit = typeof storageQuota.limit === "string" ? Number(storageQuota.limit) : null;
  const usage = typeof storageQuota.usage === "string" ? Number(storageQuota.usage) : null;
  const hasLimit = limit !== null && Number.isFinite(limit);
  const hasUsage = usage !== null && Number.isFinite(usage);
  return {
    limitBytes: hasLimit ? limit : null,
    usageBytes: hasUsage ? usage : null,
    remainingBytes: hasLimit && hasUsage ? Math.max(0, limit - usage) : null,
    measuredAt: new Date().toISOString(),
  };
}

export class GoogleDriveAdapter implements StorageProvider {
  readonly name = "drive" as const;
  readonly mode = "oauth" as const;

  constructor(
    private readonly credentials: DriveCredentials,
    private readonly folderId?: string,
  ) {}

  private async accessToken(): Promise<string> {
    const expiresAt = this.credentials.tokenExpiresAt ? Date.parse(this.credentials.tokenExpiresAt) : 0;
    if (expiresAt > Date.now() + 60_000 || !this.credentials.refreshToken) return this.credentials.accessToken;
    if (!this.credentials.clientId || !this.credentials.clientSecret) {
      throw new ProviderError(this.name, "AUTH_EXPIRED", "Drive access token expired and refresh credentials are missing.", false);
    }
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        refresh_token: this.credentials.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    await assertOk(response, this.name);
    const body = await readJson(response);
    if (typeof body.access_token !== "string") {
      throw new ProviderError(this.name, "AUTH_EXPIRED", "Drive token refresh did not return an access token.", false);
    }
    this.credentials.accessToken = body.access_token;
    this.credentials.tokenExpiresAt = new Date(Date.now() + Number(body.expires_in ?? 3600) * 1000).toISOString();
    return this.credentials.accessToken;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const token = await this.accessToken();
    const data = await requestJson(
      "https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress),storageQuota",
      { headers: { authorization: `Bearer ${token}` } },
      this.name,
    );
    const user = data.user as Record<string, unknown> | undefined;
    return {
      state: "healthy",
      identity: typeof user?.emailAddress === "string" ? user.emailAddress : null,
      capabilities: driveCapabilities,
      quota: parseQuota(data),
      warnings: [],
    };
  }

  async uploadObject(source: UploadSource, idempotencyKey: string): Promise<ProviderObject> {
    const token = await this.accessToken();
    const metadata: Record<string, unknown> = {
      name: source.filename,
      description: `StoragePK idempotency key: ${idempotencyKey}`,
    };
    if (this.folderId) metadata.parents = [this.folderId];
    const session = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,mimeType,webViewLink,md5Checksum", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=UTF-8",
        "x-upload-content-type": source.mimeType,
        "x-upload-content-length": String(source.sizeBytes),
      },
      body: JSON.stringify(metadata),
    });
    await assertOk(session, this.name);
    const location = session.headers.get("location");
    if (!location) throw new ProviderError(this.name, "PROVIDER_ERROR", "Drive did not return a resumable upload URL.", true);
    const upload = await fetch(location, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": source.mimeType,
        "content-length": String(source.sizeBytes),
      },
      body: createReadStream(source.filePath) as unknown as BodyInit,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    await assertOk(upload, this.name);
    const object = await readJson(upload);
    return {
      providerObjectId: typeof object.id === "string" ? object.id : "",
      providerPath: null,
      sizeBytes: typeof object.size === "string" ? Number(object.size) : source.sizeBytes,
      mimeType: typeof object.mimeType === "string" ? object.mimeType : source.mimeType,
      webUrl: typeof object.webViewLink === "string" ? object.webViewLink : null,
      metadata: object,
    };
  }

  async getObjectMetadata(providerObjectId: string): Promise<ProviderObject> {
    const token = await this.accessToken();
    const object = await requestJson(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(providerObjectId)}?fields=id,name,size,mimeType,modifiedTime,md5Checksum,webViewLink`,
      { headers: { authorization: `Bearer ${token}` } },
      this.name,
    );
    return {
      providerObjectId,
      providerPath: null,
      sizeBytes: typeof object.size === "string" ? Number(object.size) : null,
      mimeType: typeof object.mimeType === "string" ? object.mimeType : null,
      webUrl: typeof object.webViewLink === "string" ? object.webViewLink : null,
      metadata: object,
    };
  }

  async downloadObject(providerObjectId: string): Promise<ProviderDownload> {
    const token = await this.accessToken();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(providerObjectId)}?alt=media`, {
      headers: { authorization: `Bearer ${token}` },
    });
    await assertOk(response, this.name);
    if (!response.body) throw new ProviderError(this.name, "PROVIDER_ERROR", "Drive returned an empty download body.", true);
    return {
      stream: Readable.fromWeb(response.body as never),
      sizeBytes: response.headers.get("content-length") ? Number(response.headers.get("content-length")) : null,
      mimeType: response.headers.get("content-type"),
      filename: null,
    };
  }

  async deleteObject(providerObjectId: string): Promise<void> {
    const token = await this.accessToken();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(providerObjectId)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    await assertOk(response, this.name);
  }
}
