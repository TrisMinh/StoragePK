import { openAsBlob } from "node:fs";
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
import { assertOk, readJson } from "./http";

export interface TelegramCredentials {
  botToken: string;
  destinationChatId: string;
  mode: "public_bot_api" | "local_bot_api";
  localBaseUrl?: string;
}

const PUBLIC_UPLOAD_LIMIT = 50 * 1024 * 1024;
const PUBLIC_DOWNLOAD_LIMIT = 20 * 1024 * 1024;
const LOCAL_UPLOAD_LIMIT = 2_000 * 1024 * 1024;

function capabilities(mode: TelegramCredentials["mode"]): ProviderCapabilities {
  return {
    upload: true,
    download: true,
    delete: false,
    verify: true,
    quotaStatus: false,
    healthCheck: true,
    resumableUpload: false,
    folderMirror: false,
    multiAccount: true,
    maxUploadBytes: mode === "local_bot_api" ? LOCAL_UPLOAD_LIMIT : PUBLIC_UPLOAD_LIMIT,
    maxDownloadBytes: mode === "local_bot_api" ? null : PUBLIC_DOWNLOAD_LIMIT,
  };
}

export class TelegramAdapter implements StorageProvider {
  readonly name = "telegram" as const;
  readonly mode: TelegramCredentials["mode"];
  private readonly baseUrl: string;

  constructor(private readonly credentials: TelegramCredentials) {
    this.mode = credentials.mode;
    this.baseUrl = (credentials.localBaseUrl ?? "https://api.telegram.org").replace(/\/$/, "");
  }

  private endpoint(method: string): string {
    return `${this.baseUrl}/bot${this.credentials.botToken}/${method}`;
  }

  private fileEndpoint(path: string): string {
    const fileBase = this.credentials.mode === "local_bot_api" ? this.baseUrl : "https://api.telegram.org/file";
    return `${fileBase}/bot${this.credentials.botToken}/${path}`;
  }

  private async call(method: string, body?: BodyInit): Promise<Record<string, unknown>> {
    const response = await fetch(this.endpoint(method), {
      method: body ? "POST" : "GET",
      headers: body instanceof FormData ? undefined : { "content-type": "application/json" },
      body,
    });
    await assertOk(response, this.name);
    const payload = await readJson(response);
    if (payload.ok !== true) {
      throw new ProviderError(this.name, "PROVIDER_ERROR", typeof payload.description === "string" ? payload.description : "Telegram request failed.", false, undefined, payload);
    }
    return payload.result as Record<string, unknown>;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const identity = await this.call("getMe");
    await this.call("getChat", JSON.stringify({ chat_id: this.credentials.destinationChatId }));
    const quota: ProviderQuota = {
      limitBytes: null,
      usageBytes: null,
      remainingBytes: null,
      measuredAt: new Date().toISOString(),
    };
    return {
      state: "healthy",
      identity: typeof identity.username === "string" ? `@${identity.username}` : typeof identity.id === "number" ? String(identity.id) : null,
      capabilities: capabilities(this.credentials.mode),
      quota,
      warnings: [
        "Telegram does not expose a Drive-like storage quota.",
        "People who can access the destination chat may download stored files outside StoragePK.",
      ],
    };
  }

  async uploadObject(source: UploadSource, idempotencyKey: string): Promise<ProviderObject> {
    const limit = capabilities(this.credentials.mode).maxUploadBytes ?? 0;
    if (source.sizeBytes > limit) {
      throw new ProviderError(this.name, "FILE_TOO_LARGE", `Telegram ${this.credentials.mode} mode accepts files up to ${limit} bytes.`, false, 413, { limitBytes: limit });
    }
    const document = await openAsBlob(source.filePath, { type: source.mimeType });
    const form = new FormData();
    form.set("chat_id", this.credentials.destinationChatId);
    form.set("caption", `StoragePK | ${idempotencyKey}`);
    form.set("document", document, source.filename);
    const result = await this.call("sendDocument", form);
    const documentResult = result.document as Record<string, unknown> | undefined;
    const messageId = typeof result.message_id === "number" ? result.message_id : "unknown";
    const fileId = typeof documentResult?.file_id === "string" ? documentResult.file_id : "";
    return {
      providerObjectId: fileId,
      providerPath: `${this.credentials.destinationChatId}:${messageId}`,
      sizeBytes: typeof documentResult?.file_size === "number" ? documentResult.file_size : source.sizeBytes,
      mimeType: typeof documentResult?.mime_type === "string" ? documentResult.mime_type : source.mimeType,
      webUrl: null,
      metadata: result,
    };
  }

  async getObjectMetadata(providerObjectId: string): Promise<ProviderObject> {
    const result = await this.call("getFile", JSON.stringify({ file_id: providerObjectId }));
    return {
      providerObjectId,
      providerPath: typeof result.file_path === "string" ? result.file_path : null,
      sizeBytes: typeof result.file_size === "number" ? result.file_size : null,
      mimeType: null,
      webUrl: null,
      metadata: result,
    };
  }

  async downloadObject(providerObjectId: string): Promise<ProviderDownload> {
    const result = await this.call("getFile", JSON.stringify({ file_id: providerObjectId }));
    const filePath = typeof result.file_path === "string" ? result.file_path : null;
    if (!filePath) throw new ProviderError(this.name, "NOT_FOUND", "Telegram did not return a file path.", false);
    const response = await fetch(this.fileEndpoint(filePath));
    await assertOk(response, this.name);
    if (!response.body) throw new ProviderError(this.name, "PROVIDER_ERROR", "Telegram returned an empty download body.", true);
    return {
      stream: Readable.fromWeb(response.body as never),
      sizeBytes: typeof result.file_size === "number" ? result.file_size : null,
      mimeType: null,
      filename: null,
    };
  }

  async deleteObject(): Promise<void> {
    throw new ProviderError(this.name, "UNSUPPORTED_OPERATION", "Telegram Bot API does not support deleting a sent document through this adapter.", false);
  }
}
