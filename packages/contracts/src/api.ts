import type {
  ProviderAccountView,
  RouteDecision,
  StoragePool,
} from "./provider";

export interface HealthResponse {
  status: "ok" | "degraded";
  service: "storagepk-api";
  version: string;
  timestamp: string;
  checks: {
    database: "configured" | "not_configured" | "unknown";
    redis: "configured" | "not_configured" | "unknown";
  };
}

export interface ProviderListResponse {
  data: ProviderAccountView[];
}

export interface StoragePoolListResponse {
  data: StoragePool[];
}

export interface RouteSimulationResponse {
  data: RouteDecision;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}
