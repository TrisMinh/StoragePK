import { mapHttpError, ProviderError } from "./errors";
import type { ProviderName } from "@storagepk/contracts";

export async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export async function assertOk(response: Response, provider: ProviderName): Promise<void> {
  if (response.ok) return;
  const body = await readJson(response);
  const message = typeof body.description === "string"
    ? body.description
    : typeof body.error_description === "string"
      ? body.error_description
      : `Provider request failed with HTTP ${response.status}`;
  throw mapHttpError(provider, response.status, message, body);
}

export async function requestJson(
  input: RequestInfo | URL,
  init: RequestInit,
  provider: ProviderName,
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(input, init);
    await assertOk(response, provider);
    return readJson(response);
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(provider, "NETWORK_ERROR", "Provider network request failed.", true, undefined, {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}
