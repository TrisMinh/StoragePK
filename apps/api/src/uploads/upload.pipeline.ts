import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Express } from "express";
import type { PrismaClient } from "@storagepk/database";
import type { ProviderUploadJob, RouteDecision, RouteInput } from "@storagepk/contracts";
import { simulateRoute } from "@storagepk/providers";
import { ProviderStore } from "../providers/provider.store";
import { UploadQueue } from "./upload.queue";
import { UploadStore, type UploadSessionItemView } from "./upload.store";

export interface UploadPipelineResult {
  item: UploadSessionItemView;
  queue: { state: "queued" | "blocked" | "staged"; jobIds: string[]; reason?: string };
  routeDecision?: RouteDecision;
}

@Injectable()
export class UploadPipeline {
  constructor(
    private readonly uploads: UploadStore,
    private readonly providers: ProviderStore,
    private readonly queue: UploadQueue,
    private readonly prisma?: PrismaClient,
  ) {}

  async stageAndRoute(sessionId: string, workspaceId: string, userId: string, file: Express.Multer.File): Promise<UploadPipelineResult> {
    const session = await this.uploads.getSession(sessionId);
    if (!session || session.workspaceId !== workspaceId || session.userId !== userId) {
      throw new Error("UPLOAD_SESSION_NOT_FOUND");
    }
    const item = await this.uploads.addFile(sessionId, file);
    if (!this.prisma) return { item, queue: { state: "staged", jobIds: [], reason: "DATABASE_URL is not configured." } };
    if (!this.queue.enabled) return { item, queue: { state: "blocked", jobIds: [], reason: "REDIS_URL is required to process provider uploads." } };

    const pool = await this.providers.getDefaultPool(workspaceId);
    if (!pool) return { item, queue: { state: "blocked", jobIds: [], reason: "DEFAULT_STORAGE_POOL_NOT_CONFIGURED" } };
    const accounts = await this.providers.listProviders(workspaceId);
    const routeInput: RouteInput = { filename: item.originalName, sizeBytes: item.sizeBytes, mimeType: item.mimeType };
    const decision = simulateRoute(routeInput, pool, accounts);
    const resourceId = randomUUID();
    const fileVersionId = randomUUID();
    await this.prisma.resource.create({
      data: {
        id: resourceId,
        workspaceId,
        createdByUserId: userId,
        name: item.originalName,
        extension: item.originalName.includes(".") ? item.originalName.split(".").pop() : null,
        checksumSha256: item.checksumSha256,
        versions: { create: { id: fileVersionId, versionNumber: 1, sizeBytes: BigInt(item.sizeBytes), mimeType: item.mimeType, originalFilename: item.originalName, contentHash: item.checksumSha256 } },
      },
    });
    await this.prisma.uploadSessionItem.update({ where: { id: item.id }, data: { resourceId } });
    await this.prisma.storagePoolRouteDecision.create({
      data: {
        id: decision.id,
        workspaceId,
        storagePoolId: pool.id,
        uploadSessionItemId: item.id,
        fileVersionId,
        selectedProviderAccountId: decision.selectedProviderAccountId,
        replicaProviderAccountIds: decision.replicaProviderAccountIds,
        mode: decision.mode,
        decisionTrace: JSON.parse(JSON.stringify(decision)),
        status: decision.status,
      },
    });
    if (!decision.selectedProviderAccountId) return { item, routeDecision: decision, queue: { state: "blocked", jobIds: [], reason: decision.reason } };

    const selected = [decision.selectedProviderAccountId, ...decision.replicaProviderAccountIds];
    const jobIds: string[] = [];
    for (const providerAccountId of selected) {
      const account = accounts.find((candidate) => candidate.id === providerAccountId);
      if (!account) continue;
      const job: ProviderUploadJob = {
        schemaVersion: 1,
        workspaceId,
        fileVersionId,
        providerAccountId,
        provider: account.provider,
        stagedFilePath: item.stagedPath,
        filename: item.originalName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        idempotencyKey: `${decision.id}:${providerAccountId}`,
        attempt: 1,
        routeDecisionId: decision.id,
      };
      jobIds.push(await this.queue.add(job));
    }
    return { item, routeDecision: decision, queue: { state: "queued", jobIds } };
  }
}
