import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Queue, type ConnectionOptions } from "bullmq";
import { PROVIDER_UPLOAD_QUEUE, type ProviderUploadJob } from "@storagepk/contracts";

function redisConnection(): ConnectionOptions | undefined {
  const value = process.env.REDIS_URL;
  if (!value) return undefined;
  const url = new URL(value);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
  };
}

@Injectable()
export class UploadQueue implements OnModuleDestroy {
  private readonly queue?: Queue<ProviderUploadJob>;

  constructor() {
    const connection = redisConnection();
    if (connection) this.queue = new Queue<ProviderUploadJob>(PROVIDER_UPLOAD_QUEUE, { connection });
  }

  get enabled(): boolean {
    return Boolean(this.queue);
  }

  async add(job: ProviderUploadJob): Promise<string> {
    if (!this.queue) throw new Error("REDIS_URL is required to enqueue provider uploads.");
    const queued = await this.queue.add("provider-upload", job, {
      jobId: job.idempotencyKey,
      attempts: 5,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 86_400, count: 10_000 },
      removeOnFail: { age: 604_800, count: 20_000 },
    });
    return String(queued.id);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }
}
