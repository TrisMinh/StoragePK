import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function keyFromEnvironment(): Buffer {
  const configured = process.env.TOKEN_ENCRYPTION_KEY ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(configured)) {
    if (process.env.NODE_ENV === "production") throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters.");
    return createHashFallback();
  }
  return Buffer.from(configured, "hex");
}

function createHashFallback(): Buffer {
  return Buffer.from("storagepk-local-development-key-32", "utf8").subarray(0, 32);
}

export function encryptJson(value: Record<string, unknown>): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, keyFromEnvironment(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptJson<T extends Record<string, unknown>>(payload: Uint8Array): T {
  const buffer = Buffer.from(payload);
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, keyFromEnvironment(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")) as T;
}
