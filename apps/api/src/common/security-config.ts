const DEVELOPMENT_SESSION_SECRET = "local-only-storagepk-session-secret-change-me";

export interface SecurityEnvironment {
  NODE_ENV?: string;
  SESSION_SECRET?: string;
  DATABASE_URL?: string;
  TOKEN_ENCRYPTION_KEY?: string;
}

export function sessionSecret(environment: SecurityEnvironment = process.env): string {
  const configured = environment.SESSION_SECRET?.trim();
  if (environment.NODE_ENV !== "production") {
    return configured || DEVELOPMENT_SESSION_SECRET;
  }
  if (
    !configured
    || configured === DEVELOPMENT_SESSION_SECRET
    || configured.length < 32
  ) {
    throw new Error("SESSION_SECRET must be a unique value of at least 32 characters in production.");
  }
  return configured;
}

export function validateProductionEnvironment(
  environment: SecurityEnvironment = process.env,
): void {
  if (environment.NODE_ENV !== "production") return;
  if (!environment.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required in production.");
  }
  sessionSecret(environment);
  if (!environment.TOKEN_ENCRYPTION_KEY?.trim()) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required in production.");
  }
}
