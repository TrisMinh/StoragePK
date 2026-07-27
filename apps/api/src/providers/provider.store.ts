import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type {
  ProviderAccountView,
  ProviderCapabilities,
  ProviderHealthState,
  ProviderMode,
  ProviderName,
  ProviderQuota,
  StoragePool,
} from "@storagepk/contracts";
import type { PrismaClient } from "@storagepk/database";
import { GoogleDriveAdapter, TelegramAdapter, type DriveCredentials } from "@storagepk/providers";
import { encryptJson } from "../common/vault";
import type { CreateStoragePoolDto, TelegramProviderDto } from "./dto";

interface ProviderRecord extends ProviderAccountView {
  credentials?: Record<string, unknown>;
}

const defaultCapabilities = (provider: ProviderName, mode: ProviderMode): ProviderCapabilities => ({
  upload: true,
  download: true,
  delete: provider === "drive",
  verify: true,
  quotaStatus: provider === "drive",
  healthCheck: true,
  resumableUpload: provider === "drive",
  folderMirror: provider === "drive",
  multiAccount: true,
  maxUploadBytes: provider === "telegram" ? mode === "local_bot_api" ? 2_000 * 1024 * 1024 : 50 * 1024 * 1024 : null,
  maxDownloadBytes: provider === "telegram" && mode === "public_bot_api" ? 20 * 1024 * 1024 : null,
});

@Injectable()
export class ProviderStore {
  private readonly providers = new Map<string, ProviderRecord>();
  private readonly pools = new Map<string, StoragePool>();

  constructor(private readonly prisma?: PrismaClient) {}

  async listProviders(workspaceId: string): Promise<ProviderAccountView[]> {
    if (!this.prisma) return [...this.providers.entries()].filter(([key]) => key.startsWith(`${workspaceId}:`) || workspaceId === "demo-workspace").map(([, provider]) => this.publicProvider(provider));
    const records = await this.prisma.providerAccount.findMany({ where: { workspaceId } });
    return records.map((record) => ({
      id: record.id,
      provider: record.provider,
      mode: record.mode,
      label: record.displayName,
      identity: record.identity,
      healthState: record.healthState,
      capabilities: defaultCapabilities(record.provider, record.mode),
      quota: record.quotaStatus as ProviderQuota | null,
      warnings: [],
      revokedAt: record.revokedAt?.toISOString() ?? null,
    }));
  }

  async hasProvider(workspaceId: string, providerAccountId: string): Promise<boolean> {
    if (!this.prisma) return this.providers.has(`${workspaceId}:${providerAccountId}`);
    return Boolean(await this.prisma.providerAccount.findFirst({
      where: { id: providerAccountId, workspaceId, revokedAt: null },
      select: { id: true },
    }));
  }

  async createTelegram(workspaceId: string, userId: string, body: TelegramProviderDto): Promise<ProviderAccountView> {
    if (!body.acknowledgedPrivacyModel) throw new Error("TELEGRAM_PRIVACY_ACK_REQUIRED");
    const adapter = new TelegramAdapter({ botToken: body.botToken, destinationChatId: body.destinationChatId, mode: body.mode, localBaseUrl: body.localBaseUrl });
    const health = await adapter.healthCheck();
    const id = randomUUID();
    const record: ProviderRecord = {
      id,
      provider: "telegram",
      mode: body.mode,
      label: body.label,
      identity: health.identity,
      healthState: health.state,
      capabilities: health.capabilities,
      quota: health.quota,
      warnings: health.warnings,
      revokedAt: null,
      credentials: { botToken: body.botToken, destinationChatId: body.destinationChatId, mode: body.mode, localBaseUrl: body.localBaseUrl, userId, workspaceId },
    };
    this.providers.set(`${workspaceId}:${id}`, record);
    if (this.prisma) {
      const credentials = encryptJson(record.credentials ?? {});
      const quotaStatus = health.quota ? JSON.parse(JSON.stringify(health.quota)) : undefined;
      await this.prisma.providerAccount.create({ data: { id, userId, workspaceId, provider: "telegram", mode: body.mode, displayName: body.label, identity: health.identity, encryptedCredentials: credentials as unknown as Uint8Array<ArrayBuffer>, quotaStatus, healthState: health.state } });
    }
    return this.publicProvider(record);
  }

  async createDrive(workspaceId: string, userId: string, label: string, credentials: DriveCredentials): Promise<ProviderAccountView> {
    const adapter = new GoogleDriveAdapter(credentials);
    const health = await adapter.healthCheck();
    const id = randomUUID();
    const record: ProviderRecord = {
      id,
      provider: "drive",
      mode: "oauth",
      label,
      identity: health.identity,
      healthState: health.state,
      capabilities: health.capabilities,
      quota: health.quota,
      warnings: health.warnings,
      revokedAt: null,
      credentials: { ...credentials, userId, workspaceId },
    };
    this.providers.set(`${workspaceId}:${id}`, record);
    if (this.prisma) {
      await this.prisma.providerAccount.create({ data: { id, userId, workspaceId, provider: "drive", mode: "oauth", displayName: label, identity: health.identity, encryptedCredentials: encryptJson(record.credentials ?? {}) as unknown as Uint8Array<ArrayBuffer>, quotaStatus: health.quota ? JSON.parse(JSON.stringify(health.quota)) : undefined, healthState: health.state } });
    }
    return this.publicProvider(record);
  }

  async listPools(workspaceId: string): Promise<StoragePool[]> {
    if (!this.prisma) return [...this.pools.values()].filter((pool) => pool.workspaceId === workspaceId);
    const pools = await this.prisma.storagePool.findMany({ where: { workspaceId }, include: { accounts: true } });
    const providers = await this.listProviders(workspaceId);
    const providerById = new Map(providers.map((provider) => [provider.id, provider]));
    return pools.map((pool) => ({
      id: pool.id,
      workspaceId: pool.workspaceId,
      name: pool.name,
      mode: pool.mode,
      isDefault: pool.isDefault,
      healthState: this.poolHealth(pool.accounts.map((account) => providerById.get(account.providerAccountId)).filter((account): account is ProviderAccountView => Boolean(account))),
      accounts: pool.accounts.map((account) => ({ providerAccountId: account.providerAccountId, priority: account.priority, role: account.role as StoragePool["accounts"][number]["role"], quotaThresholdPercent: account.quotaThresholdPercent, rules: account.rules as StoragePool["accounts"][number]["rules"] })),
    }));
  }

  async createPool(workspaceId: string, body: CreateStoragePoolDto): Promise<StoragePool> {
    const pool: StoragePool = {
      id: randomUUID(),
      workspaceId,
      name: body.name,
      mode: body.mode,
      isDefault: body.isDefault ?? false,
      healthState: "healthy",
      accounts: body.accounts.map((account) => ({ providerAccountId: account.providerAccountId, priority: account.priority, role: account.role, quotaThresholdPercent: account.quotaThresholdPercent ?? null, rules: account.rules ?? {} })),
    };
    this.pools.set(pool.id, pool);
    if (this.prisma) {
      await this.prisma.storagePool.create({ data: { id: pool.id, workspaceId, name: pool.name, mode: pool.mode, isDefault: pool.isDefault, accounts: { create: pool.accounts.map((account) => ({ providerAccount: { connect: { id: account.providerAccountId } }, priority: account.priority, role: account.role, quotaThresholdPercent: account.quotaThresholdPercent, rules: JSON.parse(JSON.stringify(account.rules)) })) } } });
    }
    return pool;
  }

  async getPool(workspaceId: string, poolId: string): Promise<StoragePool | undefined> {
    const pools = await this.listPools(workspaceId);
    return pools.find((pool) => pool.id === poolId);
  }

  async getDefaultPool(workspaceId: string): Promise<StoragePool | undefined> {
    const pools = await this.listPools(workspaceId);
    return pools.find((pool) => pool.isDefault) ?? pools[0];
  }

  getProviderCredentials(workspaceId: string, providerAccountId: string): Record<string, unknown> | undefined {
    return this.providers.get(`${workspaceId}:${providerAccountId}`)?.credentials;
  }

  private poolHealth(accounts: ProviderAccountView[]): ProviderHealthState {
    if (!accounts.length) return "disconnected";
    if (accounts.some((account) => account.healthState === "healthy")) return "healthy";
    if (accounts.some((account) => account.healthState === "degraded")) return "degraded";
    return "disconnected";
  }

  private publicProvider(record: ProviderRecord): ProviderAccountView {
    const { credentials: _credentials, ...publicRecord } = record;
    return publicRecord;
  }
}
