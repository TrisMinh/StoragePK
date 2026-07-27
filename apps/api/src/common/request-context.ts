import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { ForbiddenException } from "@nestjs/common";

export const DEMO_WORKSPACE_ID = "demo-workspace";

export function requestId(request: Request): string {
  const header = request.header("x-request-id");
  return header?.trim() || randomUUID();
}

export function workspaceId(request: Request & { workspaceId?: string }): string {
  if (!request.workspaceId) throw new ForbiddenException("WORKSPACE_NOT_AUTHORIZED");
  return request.workspaceId;
}
