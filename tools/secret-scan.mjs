import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const skippedDirectories = new Set([
  ".git",
  ".next",
  ".tmp",
  "build",
  "dist",
  "node_modules",
  "target",
]);
const skippedExtensions = new Set([
  ".bmp",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".msi",
  ".pdf",
  ".png",
  ".webp",
]);
const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["Telegram bot token", /\b\d{6,12}:[A-Za-z0-9_-]{25,}\b/],
  ["Google OAuth client secret", /\bGOCSPX-[A-Za-z0-9_-]{10,}\b/],
  ["Google API key", /\bAIza[A-Za-z0-9_-]{30,}\b/],
  ["personal Windows user path", /C:\\Users\\(?!Public\\|<)[^\\\r\n]+\\/i],
];
const files = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".storagepk") {
        throw new Error(`Sensitive runtime directory must not exist in source: ${relative(root, path)}`);
      }
      walk(path);
      continue;
    }
    if (!entry.isFile() || skippedExtensions.has(extname(entry.name).toLowerCase())) continue;
    if (statSync(path).size > 5 * 1024 * 1024) continue;
    files.push(path);
  }
}

walk(root);
const findings = [];
for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const [label, pattern] of patterns) {
    if (pattern.test(content)) findings.push(`${relative(root, file)}: ${label}`);
  }
}

if (findings.length) {
  console.error("Secret/PII scan failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}
console.log(`Secret/PII scan passed (${files.length} text files checked).`);
