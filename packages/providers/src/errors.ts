import type { ProviderName } from "@storagepk/contracts";

export type ProviderErrorCode =
  | "AUTH_EXPIRED"
  | "AUTH_INVALID"
  | "DESTINATION_INVALID"
  | "DESTINATION_PERMISSION_DENIED"
  | "FILE_TOO_LARGE"
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "NETWORK_ERROR"
  | "PROVIDER_ERROR"
  | "UNSUPPORTED_OPERATION";

export class ProviderError extends Error {
  override readonly name = "ProviderError";

  constructor(
    readonly provider: ProviderName,
    readonly code: ProviderErrorCode,
    message: string,
    readonly retryable: boolean,
    readonly statusCode?: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function mapHttpError(
  provider: ProviderName,
  status: number,
  message: string,
  details?: Record<string, unknown>,
): ProviderError {
  if (status === 401) return new ProviderError(provider, "AUTH_EXPIRED", message, false, status, details);
  if (status === 403) return new ProviderError(provider, "DESTINATION_PERMISSION_DENIED", message, false, status, details);
  if (status === 404) return new ProviderError(provider, "NOT_FOUND", message, false, status, details);
  if (status === 413) return new ProviderError(provider, "FILE_TOO_LARGE", message, false, status, details);
  if (status === 429) return new ProviderError(provider, "RATE_LIMITED", message, true, status, details);
  return new ProviderError(provider, "PROVIDER_ERROR", message, status >= 500, status, details);
}
