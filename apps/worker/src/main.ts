import { Worker } from "bullmq";
import pino from "pino";
import { createDatabaseClient } from "@storagepk/database";
import { GoogleDriveAdapter, TelegramAdapter } from "@storagepk/providers";
import type { DriveCredentials, TelegramCredentials } from "@storagepk/providers";
import { decryptJson } from "./vault";
import {
  PROVIDER_UPLOAD_QUEUE,
  safeProviderErrorCode,
  validateProviderUploadJob,
  type ProviderUploadJob,
} from "./jobs";

const logger = pino({ name: "storagepk-worker" });

function redisConnection() {
  const value = process.env.REDIS_URL;
  if (!value) return undefined;
  const url = new URL(value);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

const connection = redisConnection();
const database = process.env.DATABASE_URL ? createDatabaseClient() : undefined;

async function executeProviderUpload(job: ProviderUploadJob) {
  if (!database) throw new Error("DATABASE_URL is required to execute provider jobs.");
  const account = await database.providerAccount.findFirst({
    where: {
      id: job.providerAccountId,
      workspaceId: job.workspaceId,
      revokedAt: null,
    },
  });
  if (!account) throw new Error("PROVIDER_ACCOUNT_UNAVAILABLE");
  const attempt = await database.providerUploadAttempt.upsert({
    where: { idempotencyKey: job.idempotencyKey },
    create: { workspaceId: job.workspaceId, fileVersionId: job.fileVersionId, providerAccountId: job.providerAccountId, routeDecisionId: job.routeDecisionId, attemptNumber: job.attempt, idempotencyKey: job.idempotencyKey, executionLocation: "worker", state: "processing", startedAt: new Date() },
    update: { attemptNumber: job.attempt, state: "processing", startedAt: new Date(), errorCode: null },
  });
  try {
    const credentials = decryptJson<Record<string, unknown>>(account.encryptedCredentials);
    const adapter = account.provider === "drive"
      ? new GoogleDriveAdapter(credentials as unknown as DriveCredentials)
      : new TelegramAdapter(credentials as unknown as TelegramCredentials);
    const providerObject = await adapter.uploadObject({ filePath: job.stagedFilePath, filename: job.filename, mimeType: job.mimeType, sizeBytes: job.sizeBytes }, job.idempotencyKey);
    await database.storageObject.create({ data: { fileVersionId: job.fileVersionId, providerAccountId: job.providerAccountId, provider: account.provider, providerObjectId: providerObject.providerObjectId, providerPath: providerObject.providerPath, syncState: "synced", lastVerifiedAt: new Date() } });
    await database.providerUploadAttempt.update({ where: { id: attempt.id }, data: { state: "synced", providerObjectId: providerObject.providerObjectId, completedAt: new Date() } });
    return providerObject;
  } catch (error) {
    await database.providerUploadAttempt.update({ where: { id: attempt.id }, data: { state: "failed", errorCode: safeProviderErrorCode(error), completedAt: new Date() } });
    throw error;
  }
}

if (!connection) {
  logger.warn("REDIS_URL is not configured. Worker is idle until a queue backend is available.");
} else {
  const worker = new Worker<ProviderUploadJob>(PROVIDER_UPLOAD_QUEUE, async (job) => {
    logger.info({ jobId: job.id, idempotencyKey: job.data.idempotencyKey, provider: job.data.provider }, "provider upload job received");
    validateProviderUploadJob(job.data);
    const providerObject = await executeProviderUpload(job.data);
    logger.info({ jobId: job.id, providerObjectId: providerObject.providerObjectId }, "provider upload executed");
    return { state: "synced", providerObjectId: providerObject.providerObjectId, idempotencyKey: job.data.idempotencyKey };
  }, { connection, concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2), autorun: true });

  worker.on("completed", (job) => logger.info({ jobId: job.id }, "provider upload job completed"));
  worker.on("failed", (job, error) => logger.error({ jobId: job?.id, error: error.message }, "provider upload job failed"));
  worker.on("error", (error) => logger.error({ error: error.message }, "worker runtime error"));
}
