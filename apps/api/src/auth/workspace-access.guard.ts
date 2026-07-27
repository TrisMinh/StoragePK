import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { AuthenticatedRequest } from "./access-token.guard";

@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) throw new UnauthorizedException("AUTHENTICATION_REQUIRED");
    const requestedWorkspaceId = request.header("x-workspace-id")?.trim();
    if (!requestedWorkspaceId && process.env.NODE_ENV === "production") {
      throw new BadRequestException("WORKSPACE_CONTEXT_REQUIRED");
    }
    request.workspaceId = await this.auth.authorizeWorkspace(
      request.user.id,
      requestedWorkspaceId,
    );
    return true;
  }
}
