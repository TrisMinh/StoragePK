import { PrismaClient } from "@prisma/client";

export { PrismaClient } from "@prisma/client";
export * from "@prisma/client";

export function createDatabaseClient(): PrismaClient | undefined {
  if (!process.env.DATABASE_URL) return undefined;
  return new PrismaClient();
}
