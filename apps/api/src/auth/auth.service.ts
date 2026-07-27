import { createHash, createHmac, randomBytes, timingSafeEqual, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { PrismaClient } from "@storagepk/database";
import { DEMO_WORKSPACE_ID } from "../common/request-context";
import { sessionSecret } from "../common/security-config";

const scryptAsync = promisify(scrypt);
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

interface TokenPayload {
  sub: string;
  email: string;
  type: "access" | "refresh";
  exp: number;
  iat: number;
  sid?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthTokens {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function base64Url(value: string | Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: TokenPayload): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", sessionSecret()).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function parse(token: string): TokenPayload {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) throw new UnauthorizedException("INVALID_TOKEN");
  const expected = createHmac("sha256", sessionSecret()).update(`${header}.${body}`).digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new UnauthorizedException("INVALID_TOKEN");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
  if (payload.exp <= Math.floor(Date.now() / 1000)) throw new UnauthorizedException("TOKEN_EXPIRED");
  return payload;
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, 32) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [, saltValue, hashValue] = encoded.split("$");
  if (!saltValue || !hashValue) return false;
  const expected = Buffer.from(hashValue, "base64url");
  const actual = await scryptAsync(password, Buffer.from(saltValue, "base64url"), expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

@Injectable()
export class AuthService {
  private readonly memoryUsers = new Map<string, AuthUser>();
  private readonly memoryRefresh = new Map<string, { user: AuthUser; expiresAt: number; revoked: boolean }>();

  constructor(private readonly prisma?: PrismaClient) {}

  async login(email: string, password: string, clientType = "web"): Promise<AuthTokens> {
    const normalizedEmail = email.trim().toLowerCase();
    if (this.prisma) {
      const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) throw new UnauthorizedException("INVALID_CREDENTIALS");
      return this.issue({ id: user.id, email: user.email, displayName: user.displayName }, clientType);
    }
    const expectedEmail = (process.env.DEV_LOGIN_EMAIL ?? "").trim().toLowerCase();
    const expectedPassword = process.env.DEV_LOGIN_PASSWORD ?? "";
    if (process.env.NODE_ENV === "production" || !expectedEmail || !expectedPassword || normalizedEmail !== expectedEmail || password !== expectedPassword) throw new UnauthorizedException("INVALID_CREDENTIALS");
    const user = this.memoryUsers.get(normalizedEmail) ?? { id: "dev-user", email: normalizedEmail, displayName: "Development user" };
    this.memoryUsers.set(normalizedEmail, user);
    return this.issue(user, clientType);
  }

  async refresh(refreshToken: string, clientType = "web"): Promise<AuthTokens> {
    const payload = parse(refreshToken);
    if (payload.type !== "refresh") throw new UnauthorizedException("INVALID_REFRESH_TOKEN");
    const hash = tokenHash(refreshToken);
    if (this.prisma) {
      const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash }, include: { user: true } });
      if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException("REFRESH_TOKEN_REVOKED");
      await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date(), revokeReason: "rotated", lastUsedAt: new Date() } });
      return this.issue({ id: session.user.id, email: session.user.email, displayName: session.user.displayName }, clientType);
    }
    const stored = this.memoryRefresh.get(hash);
    if (!stored || stored.revoked || stored.expiresAt <= Date.now()) throw new UnauthorizedException("REFRESH_TOKEN_REVOKED");
    stored.revoked = true;
    return this.issue(stored.user, clientType);
  }

  async revoke(refreshToken: string): Promise<void> {
    const payload = parse(refreshToken);
    if (payload.type !== "refresh") return;
    const hash = tokenHash(refreshToken);
    if (this.prisma) {
      await this.prisma.session.updateMany({ where: { refreshTokenHash: hash, revokedAt: null }, data: { revokedAt: new Date(), revokeReason: "logout" } });
    } else {
      const stored = this.memoryRefresh.get(hash);
      if (stored) stored.revoked = true;
    }
  }

  verifyAccessToken(token: string): AuthUser {
    const payload = parse(token);
    if (payload.type !== "access") throw new UnauthorizedException("INVALID_ACCESS_TOKEN");
    return { id: payload.sub, email: payload.email, displayName: payload.email };
  }

  async authorizeWorkspace(userId: string, requestedWorkspaceId?: string): Promise<string> {
    const workspaceId = requestedWorkspaceId?.trim() || DEMO_WORKSPACE_ID;
    if (!this.prisma) {
      if (process.env.NODE_ENV === "production" || workspaceId !== DEMO_WORKSPACE_ID) {
        throw new ForbiddenException("WORKSPACE_ACCESS_DENIED");
      }
      return DEMO_WORKSPACE_ID;
    }
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        deletedAt: null,
        OR: [
          { ownerUserId: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true },
    });
    if (!workspace) throw new ForbiddenException("WORKSPACE_ACCESS_DENIED");
    return workspace.id;
  }

  private async issue(user: AuthUser, clientType: string): Promise<AuthTokens> {
    const now = Math.floor(Date.now() / 1000);
    const accessToken = sign({ sub: user.id, email: user.email, type: "access", iat: now, exp: now + ACCESS_TOKEN_TTL_SECONDS });
    const refreshToken = sign({ sub: user.id, email: user.email, type: "refresh", iat: now, exp: now + REFRESH_TOKEN_TTL_SECONDS });
    const hash = tokenHash(refreshToken);
    if (this.prisma) {
      await this.prisma.session.create({ data: { userId: user.id, familyId: randomBytes(16).toString("hex"), refreshTokenHash: hash, clientType, expiresAt: new Date((now + REFRESH_TOKEN_TTL_SECONDS) * 1000), lastUsedAt: new Date() } });
    } else {
      this.memoryRefresh.set(hash, { user, expiresAt: (now + REFRESH_TOKEN_TTL_SECONDS) * 1000, revoked: false });
    }
    return { user, accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }
}
