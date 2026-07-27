import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { ForbiddenException } from "@nestjs/common";
import type { PrismaClient } from "@storagepk/database";
import { AuthService } from "../auth/auth.service";
import { workspaceId } from "../common/request-context";
import {
  sessionSecret,
  validateProductionEnvironment,
} from "../common/security-config";
import { UploadPipeline } from "../uploads/upload.pipeline";

const previousNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
});

describe("production security configuration", () => {
  it("rejects missing and weak production secrets", () => {
    assert.throws(
      () => validateProductionEnvironment({ NODE_ENV: "production" }),
      /DATABASE_URL/,
    );
    assert.throws(
      () => validateProductionEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://db/storagepk",
        SESSION_SECRET: "short",
        TOKEN_ENCRYPTION_KEY: "configured",
      }),
      /SESSION_SECRET/,
    );
  });

  it("accepts an explicit production secret set", () => {
    const environment = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://db/storagepk",
      SESSION_SECRET: "a-unique-session-secret-with-more-than-32-characters",
      TOKEN_ENCRYPTION_KEY: "a-unique-encryption-key",
    };
    assert.equal(sessionSecret(environment), environment.SESSION_SECRET);
    assert.doesNotThrow(() => validateProductionEnvironment(environment));
  });
});

describe("workspace authorization", () => {
  it("does not use a spoofed workspace header", () => {
    const request = {
      workspaceId: "authorized-workspace",
      header: () => "attacker-workspace",
    };
    assert.equal(workspaceId(request as never), "authorized-workspace");
  });

  it("denies non-demo workspaces without a database", async () => {
    process.env.NODE_ENV = "development";
    const auth = new AuthService();
    await assert.rejects(
      auth.authorizeWorkspace("demo-user", "attacker-workspace"),
      ForbiddenException,
    );
    assert.equal(
      await auth.authorizeWorkspace("demo-user", "demo-workspace"),
      "demo-workspace",
    );
  });

  it("returns only a workspace confirmed by membership lookup", async () => {
    const prisma = {
      workspace: {
        findFirst: async ({ where }: { where: { id: string } }) => (
          where.id === "member-workspace" ? { id: where.id } : null
        ),
      },
    } as unknown as PrismaClient;
    const auth = new AuthService(prisma);
    assert.equal(
      await auth.authorizeWorkspace("member-user", "member-workspace"),
      "member-workspace",
    );
    await assert.rejects(
      auth.authorizeWorkspace("member-user", "other-workspace"),
      ForbiddenException,
    );
  });
});

describe("upload session isolation", () => {
  it("rejects staging into another workspace session", async () => {
    let addFileCalled = false;
    const uploads = {
      getSession: async () => ({
        id: "session",
        workspaceId: "workspace-a",
        userId: "user-a",
      }),
      addFile: async () => {
        addFileCalled = true;
        throw new Error("unexpected");
      },
    };
    const pipeline = new UploadPipeline(
      uploads as never,
      {} as never,
      {} as never,
    );
    await assert.rejects(
      pipeline.stageAndRoute(
        "session",
        "workspace-b",
        "user-a",
        {} as never,
      ),
      /UPLOAD_SESSION_NOT_FOUND/,
    );
    assert.equal(addFileCalled, false);
  });
});
