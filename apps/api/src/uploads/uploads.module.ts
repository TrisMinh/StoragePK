import { Module } from "@nestjs/common";
import { UploadsController } from "./uploads.controller";
import { UploadStore } from "./upload.store";
import { AuthModule } from "../auth/auth.module";
import { createDatabaseClient } from "@storagepk/database";
import { ProvidersModule } from "../providers/providers.module";
import { ProviderStore } from "../providers/provider.store";
import { UploadPipeline } from "./upload.pipeline";
import { UploadQueue } from "./upload.queue";

@Module({ imports: [AuthModule, ProvidersModule], controllers: [UploadsController], providers: [UploadQueue, { provide: UploadStore, useFactory: () => new UploadStore(createDatabaseClient()) }, { provide: UploadPipeline, useFactory: (store: UploadStore, providers: ProviderStore, queue: UploadQueue) => new UploadPipeline(store, providers, queue, createDatabaseClient()), inject: [UploadStore, ProviderStore, UploadQueue] }] })
export class UploadsModule {}
