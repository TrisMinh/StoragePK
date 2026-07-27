import { createHash, randomUUID } from "node:crypto";
import { createReadStream, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { Injectable } from "@nestjs/common";
import type { Express } from "express";
import type { PrismaClient } from "@storagepk/database";

export interface UploadSessionItemView {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  checksumSha256: string;
  stagedPath: string;
  state: "queued" | "processing" | "failed";
  createdAt: string;
}

export interface UploadSessionView {
  id: string;
  workspaceId: string;
  userId: string;
  state: "open" | "queued" | "expired";
  expiresAt: string;
  items: UploadSessionItemView[];
}

@Injectable()
export class UploadStore {
  private readonly sessions = new Map<string, UploadSessionView>();
  private readonly stagingDirectory = resolve(process.env.UPLOAD_STAGING_DIR ?? ".storagepk/staging");

  constructor(private readonly prisma?: PrismaClient) {
    mkdirSync(this.stagingDirectory, { recursive: true });
  }

  async createSession(workspaceId: string, userId: string): Promise<UploadSessionView> {
    const session: UploadSessionView = {
      id: randomUUID(),
      workspaceId,
      userId,
      state: "open",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      items: [],
    };
    this.sessions.set(session.id, session);
    if (this.prisma) {
      await this.prisma.uploadSession.create({ data: { id: session.id, workspaceId, userId, state: session.state, expiresAt: new Date(session.expiresAt) } });
    }
    return session;
  }

  async addFile(sessionId: string, file: Express.Multer.File): Promise<UploadSessionItemView> {
    let session = this.sessions.get(sessionId);
    if (!session && this.prisma) {
      session = await this.getSession(sessionId);
      if (session) this.sessions.set(sessionId, session);
    }
    if (!session || Date.parse(session.expiresAt) <= Date.now()) throw new Error("UPLOAD_SESSION_EXPIRED");
    const checksumSha256 = await this.hashFile(file.path);
    const item: UploadSessionItemView = {
      id: randomUUID(),
      originalName: file.originalname,
      sizeBytes: file.size,
      mimeType: file.mimetype || "application/octet-stream",
      checksumSha256,
      stagedPath: file.path,
      state: "queued",
      createdAt: new Date().toISOString(),
    };
    session.items.push(item);
    session.state = "queued";
    if (this.prisma) {
      await this.prisma.uploadSession.update({ where: { id: sessionId }, data: { state: session.state, items: { create: { id: item.id, originalName: item.originalName, stagedPath: item.stagedPath, sizeBytes: BigInt(item.sizeBytes), checksumSha256: item.checksumSha256, state: item.state } } } });
    }
    return item;
  }

  async getSession(sessionId: string): Promise<UploadSessionView | undefined> {
    const memory = this.sessions.get(sessionId);
    if (memory || !this.prisma) return memory;
    const session = await this.prisma.uploadSession.findUnique({ where: { id: sessionId }, include: { items: true } });
    if (!session) return undefined;
    return {
      id: session.id,
      workspaceId: session.workspaceId,
      userId: session.userId,
      state: session.state as UploadSessionView["state"],
      expiresAt: session.expiresAt.toISOString(),
      items: session.items.map((item) => ({ id: item.id, originalName: item.originalName, sizeBytes: Number(item.sizeBytes), mimeType: "application/octet-stream", checksumSha256: item.checksumSha256 ?? "", stagedPath: item.stagedPath ?? "", state: item.state as UploadSessionItemView["state"], createdAt: session.createdAt.toISOString() })),
    };
  }

  private hashFile(filePath: string): Promise<string> {
    return new Promise((resolveHash, reject) => {
      const hash = createHash("sha256");
      const stream = createReadStream(filePath);
      stream.on("data", (chunk: string | Buffer) => hash.update(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolveHash(hash.digest("hex")));
    });
  }
}
