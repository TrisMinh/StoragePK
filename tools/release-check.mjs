import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const desktopRelease = process.argv.includes("--desktop");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const required = [
  "package.json",
  "package-lock.json",
  "LICENSE",
  "PRIVACY.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  ".env.example",
  "docs/deployment/release-gates.md",
  `docs/reviews/release-${packageJson.version}.md`,
  `release/RELEASE_NOTES_${packageJson.version}.md`,
  "packages/database/prisma/migrations/0001_init/migration.sql",
  "apps/api/dist/main.js",
  "apps/worker/dist/main.js",
  "apps/web/.next/BUILD_ID",
  "apps/desktop/dist/index.html",
];
if (desktopRelease) {
  required.push(
    `apps/desktop/src-tauri/target/release/bundle/msi/StoragePK_${packageJson.version}_x64_en-US.msi`,
    `apps/desktop/src-tauri/target/release/bundle/nsis/StoragePK_${packageJson.version}_x64-setup.exe`,
  );
}

const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length) {
  console.error("Release preflight failed. Missing artifacts:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const envExample = readFileSync(join(root, ".env.example"), "utf8");
for (const key of ["DATABASE_URL", "REDIS_URL", "SESSION_SECRET", "TOKEN_ENCRYPTION_KEY"]) {
  if (!envExample.includes(`${key}=`)) {
    console.error(`Release preflight failed. .env.example is missing ${key}.`);
    process.exit(1);
  }
}

if (packageJson.license !== "MIT") {
  console.error("Release preflight failed. package.json license must be MIT.");
  process.exit(1);
}

console.log("Release preflight passed.");
console.log(`- version: ${packageJson.version}`);
console.log(`- artifacts: ${required.length}`);
