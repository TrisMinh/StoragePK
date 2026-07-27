import { Body, Controller, Get, NotFoundException, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { ProviderListResponse } from "@storagepk/contracts";
import { workspaceId } from "../common/request-context";
import { DriveLinkIntentDto, TelegramProviderDto } from "./dto";
import { ProviderStore } from "./provider.store";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { AccessTokenGuard, type AuthenticatedRequest } from "../auth/access-token.guard";
import type { DriveCredentials } from "@storagepk/providers";
import { WorkspaceAccessGuard } from "../auth/workspace-access.guard";

@Controller("providers")
export class ProvidersController {
  private readonly linkIntents = new Map<string, { workspaceId: string; userId: string; label: string; expiresAt: number }>();

  constructor(private readonly store: ProviderStore, private readonly config: ConfigService) {}

  @Get()
  @UseGuards(AccessTokenGuard, WorkspaceAccessGuard)
  async list(@Req() request: AuthenticatedRequest): Promise<ProviderListResponse> {
    return { data: await this.store.listProviders(workspaceId(request)) };
  }

  @Post("drive/link-intents")
  @UseGuards(AccessTokenGuard, WorkspaceAccessGuard)
  createDriveLinkIntent(@Body() body: DriveLinkIntentDto, @Req() request: AuthenticatedRequest): Record<string, string> {
    const clientId = this.config.get<string>("app.googleClientId", "");
    if (!clientId) throw new Error("OAUTH_CONFIG_MISSING");
    const id = randomUUID();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const label = body.label?.trim() || "Google Drive account";
    this.linkIntents.set(id, { workspaceId: workspaceId(request), userId: request.user!.id, label, expiresAt });
    const scopes = body.requestedScopes?.length ? body.requestedScopes : ["https://www.googleapis.com/auth/drive.file"];
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: this.config.get<string>("app.googleRedirectUri", ""), response_type: "code", access_type: "offline", prompt: "consent", scope: scopes.join(" "), state: id });
    return { linkIntentId: id, authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, expiresAt: new Date(expiresAt).toISOString() };
  }

  @Post("telegram")
  @UseGuards(AccessTokenGuard, WorkspaceAccessGuard)
  async createTelegram(@Body() body: TelegramProviderDto, @Req() request: AuthenticatedRequest) {
    const workspace = workspaceId(request);
    return this.store.createTelegram(workspace, request.user!.id, body);
  }

  @Get("drive/callback")
  async driveCallback(@Query("code") code: string, @Query("state") state: string, @Query("error") oauthError?: string) {
    const intent = this.linkIntents.get(state);
    if (oauthError) throw new Error(`DRIVE_OAUTH_${oauthError.toUpperCase()}`);
    if (!intent || intent.expiresAt <= Date.now()) throw new Error("LINK_INTENT_EXPIRED");
    if (!code) throw new Error("OAUTH_CODE_MISSING");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: this.config.get<string>("app.googleClientId", ""), client_secret: this.config.get<string>("app.googleClientSecret", ""), redirect_uri: this.config.get<string>("app.googleRedirectUri", ""), grant_type: "authorization_code" }) });
    const tokenBody = await tokenResponse.json() as Record<string, unknown>;
    if (!tokenResponse.ok || typeof tokenBody.access_token !== "string") throw new Error("DRIVE_TOKEN_EXCHANGE_FAILED");
    const credentials: DriveCredentials = { accessToken: tokenBody.access_token, refreshToken: typeof tokenBody.refresh_token === "string" ? tokenBody.refresh_token : undefined, clientId: this.config.get<string>("app.googleClientId", ""), clientSecret: this.config.get<string>("app.googleClientSecret", ""), tokenExpiresAt: new Date(Date.now() + Number(tokenBody.expires_in ?? 3600) * 1000).toISOString() };
    this.linkIntents.delete(state);
    return this.store.createDrive(intent.workspaceId, intent.userId, intent.label, credentials);
  }

  @Post(":providerAccountId/health-check")
  @UseGuards(AccessTokenGuard, WorkspaceAccessGuard)
  async healthCheck(
    @Req() request: AuthenticatedRequest,
    @Param("providerAccountId") providerAccountId: string,
  ) {
    if (!await this.store.hasProvider(workspaceId(request), providerAccountId)) {
      throw new NotFoundException("PROVIDER_ACCOUNT_NOT_FOUND");
    }
    return { providerAccountId, status: "queued", message: "Health checks are executed by the provider worker." };
  }
}
