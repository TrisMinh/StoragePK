import { Module } from "@nestjs/common";
import { createDatabaseClient } from "@storagepk/database";
import { AccessTokenGuard } from "./access-token.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { WorkspaceAccessGuard } from "./workspace-access.guard";

@Module({
  controllers: [AuthController],
  providers: [
    { provide: AuthService, useFactory: () => new AuthService(createDatabaseClient()) },
    AccessTokenGuard,
    WorkspaceAccessGuard,
  ],
  exports: [AuthService, AccessTokenGuard, WorkspaceAccessGuard],
})
export class AuthModule {}
