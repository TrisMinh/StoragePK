import { Controller, Get } from "@nestjs/common";
import type { HealthResponse } from "@storagepk/contracts";
import { ConfigService } from "@nestjs/config";

@Controller("health")
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  getHealth(): HealthResponse {
    const database = process.env.DATABASE_URL ? "configured" : "not_configured";
    const redis = process.env.REDIS_URL ? "configured" : "not_configured";
    return {
      status: database === "configured" ? "ok" : "degraded",
      service: "storagepk-api",
      version: this.config.get<string>("app.version", "0.1.0"),
      timestamp: new Date().toISOString(),
      checks: { database, redis },
    };
  }
}
