import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

const scryptAsync = promisify(scrypt);
const required = ["DATABASE_URL", "STORAGEPK_BOOTSTRAP_EMAIL", "STORAGEPK_BOOTSTRAP_PASSWORD", "STORAGEPK_BOOTSTRAP_DISPLAY_NAME"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing bootstrap environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const salt = randomBytes(16);
const derived = await scryptAsync(process.env.STORAGEPK_BOOTSTRAP_PASSWORD, salt, 32);
const passwordHash = `scrypt$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
const prisma = new PrismaClient();

try {
  const email = process.env.STORAGEPK_BOOTSTRAP_EMAIL.trim().toLowerCase();
  const user = await prisma.user.upsert({
    where: { email },
    update: { displayName: process.env.STORAGEPK_BOOTSTRAP_DISPLAY_NAME, passwordHash, status: "active", deletedAt: null },
    create: { email, displayName: process.env.STORAGEPK_BOOTSTRAP_DISPLAY_NAME, passwordHash, status: "active" },
  });
  const workspace = await prisma.workspace.upsert({
    where: { slug: `${email.replace(/[^a-z0-9]+/g, "-")}-workspace` },
    update: { name: `${user.displayName}'s workspace`, ownerUserId: user.id, deletedAt: null },
    create: { name: `${user.displayName}'s workspace`, slug: `${email.replace(/[^a-z0-9]+/g, "-")}-workspace`, ownerUserId: user.id },
  });
  await prisma.workspaceMember.upsert({ where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } }, update: { role: "owner" }, create: { workspaceId: workspace.id, userId: user.id, role: "owner" } });
  console.log(`Bootstrapped ${email} with workspace ${workspace.slug}.`);
} finally {
  await prisma.$disconnect();
}
