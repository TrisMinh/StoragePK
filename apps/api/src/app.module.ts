import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { appConfig } from "./config";
import { HealthModule } from "./health/health.module";
import { ProvidersModule } from "./providers/providers.module";
import { UploadsModule } from "./uploads/uploads.module";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }), AuthModule, HealthModule, ProvidersModule, UploadsModule],
})
export class AppModule {}
