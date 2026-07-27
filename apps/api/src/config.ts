import { registerAs } from "@nestjs/config";

export const appConfig = registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),
  publicUrl: process.env.API_PUBLIC_URL ?? "http://localhost:4000",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  version: process.env.APP_VERSION ?? "0.1.0",
  sessionSecret: process.env.SESSION_SECRET ?? "local-only-storagepk-session-secret-change-me",
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:4000/v1/providers/drive/callback",
}));
