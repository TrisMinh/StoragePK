import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { AuthService, type AuthUser } from "./auth.service";

export type AuthenticatedRequest = Request & { user?: AuthUser; workspaceId?: string };

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.header("authorization");
    if (!authorization && process.env.NODE_ENV !== "production") {
      request.user = { id: request.header("x-user-id") || "demo-user", email: "demo@storagepk.local", displayName: "Development user" };
      return true;
    }
    if (!authorization?.startsWith("Bearer ")) throw new UnauthorizedException("AUTHENTICATION_REQUIRED");
    request.user = this.auth.verifyAccessToken(authorization.slice("Bearer ".length));
    return true;
  }
}
