import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { ProviderAccountView, StoragePoolListResponse } from "@storagepk/contracts";
import { RouteSimulationDto, CreateStoragePoolDto } from "./dto";
import { ProviderStore } from "./provider.store";
import { simulateRoute } from "@storagepk/providers";
import { AccessTokenGuard, type AuthenticatedRequest } from "../auth/access-token.guard";
import { WorkspaceAccessGuard } from "../auth/workspace-access.guard";
import { workspaceId } from "../common/request-context";

@Controller("storage-pools")
@UseGuards(AccessTokenGuard, WorkspaceAccessGuard)
export class StoragePoolsController {
  constructor(private readonly store: ProviderStore) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest): Promise<StoragePoolListResponse> {
    return { data: await this.store.listPools(workspaceId(request)) };
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateStoragePoolDto) {
    return this.store.createPool(workspaceId(request), body);
  }

  @Post(":storagePoolId/simulate-route")
  async simulate(
    @Req() request: AuthenticatedRequest,
    @Param("storagePoolId") storagePoolId: string,
    @Body() body: RouteSimulationDto,
  ) {
    const authorizedWorkspaceId = workspaceId(request);
    const pool = await this.store.getPool(authorizedWorkspaceId, storagePoolId);
    if (!pool) return { error: { code: "POOL_NOT_FOUND", message: "Storage pool was not found." } };
    const accounts = await this.store.listProviders(authorizedWorkspaceId) as ProviderAccountView[];
    return { data: simulateRoute(body, pool, accounts) };
  }
}
