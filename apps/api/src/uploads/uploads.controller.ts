import { BadRequestException, Controller, Get, NotFoundException, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { workspaceId } from "../common/request-context";
import { UploadPipeline } from "./upload.pipeline";
import { UploadStore } from "./upload.store";
import { AccessTokenGuard, type AuthenticatedRequest } from "../auth/access-token.guard";
import { WorkspaceAccessGuard } from "../auth/workspace-access.guard";

@Controller("upload-sessions")
@UseGuards(AccessTokenGuard, WorkspaceAccessGuard)
export class UploadsController {
  constructor(private readonly store: UploadStore, private readonly pipeline: UploadPipeline) {}

  @Post()
  create(@Req() request: AuthenticatedRequest) {
    return this.store.createSession(workspaceId(request), request.user!.id);
  }

  @Post(":sessionId/items")
  @UseInterceptors(FileInterceptor("file", {
    storage: diskStorage({
      destination: (_request, _file, callback) => callback(null, resolve(process.env.UPLOAD_STAGING_DIR ?? ".storagepk/staging")),
      filename: (_request, file, callback) => callback(null, `${randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
    }),
    limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES ?? 2_000 * 1024 * 1024) },
  }))
  async addFile(@Req() request: AuthenticatedRequest, @Param("sessionId") sessionId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("A multipart field named file is required.");
    try {
      const workspace = workspaceId(request);
      const userId = request.user!.id;
      const result = await this.pipeline.stageAndRoute(sessionId, workspace, userId, file);
      const { stagedPath: _stagedPath, ...publicItem } = result.item;
      return { data: publicItem, queue: result.queue, routeDecision: result.routeDecision };
    } catch (error) {
      rmSync(file.path, { force: true });
      if (error instanceof Error && error.message === "UPLOAD_SESSION_EXPIRED") throw new BadRequestException("Upload session is expired.");
      if (error instanceof Error && error.message === "UPLOAD_SESSION_NOT_FOUND") throw new NotFoundException("Upload session was not found.");
      throw error;
    }
  }

  @Get(":sessionId")
  async get(@Req() request: AuthenticatedRequest, @Param("sessionId") sessionId: string) {
    const session = await this.store.getSession(sessionId);
    if (
      !session
      || session.workspaceId !== workspaceId(request)
      || session.userId !== request.user!.id
    ) {
      throw new NotFoundException("Upload session was not found.");
    }
    return { data: { ...session, items: session.items.map(({ stagedPath: _stagedPath, ...item }) => item) } };
  }
}
