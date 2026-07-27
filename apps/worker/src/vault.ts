import { createDecipheriv } from "node:crypto";

function keyFromEnvironment(): Buffer {
  const configured = process.env.TOKEN_ENCRYPTION_KEY ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(configured)) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters.");
  return Buffer.from(configured, "hex");
}

export function decryptJson<T extends Record<string, unknown>>(payload: Uint8Array): T {
  const buffer = Buffer.from(payload);
  const decipher = createDecipheriv("aes-256-gcm", keyFromEnvironment(), buffer.subarray(0, 12));
  decipher.setAuthTag(buffer.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]).toString("utf8")) as T;
}
