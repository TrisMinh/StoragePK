import { Module } from "@nestjs/common";
import { createDatabaseClient } from "@storagepk/database";
import { ProvidersController } from "./providers.controller";
import { StoragePoolsController } from "./storage-pools.controller";
import { ProviderStore } from "./provider.store";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [ProvidersController, StoragePoolsController],
  providers: [{ provide: ProviderStore, useFactory: () => new ProviderStore(createDatabaseClient()) }],
  exports: [ProviderStore],
})
export class ProvidersModule {}
