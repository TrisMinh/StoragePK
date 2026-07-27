const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const source = readFileSync(join(__dirname, "..", "app", "dashboard.tsx"), "utf8");

test("dashboard source contains no personal demo identity", () => {
  assert.doesNotMatch(source, /Minh(?:'s| Nguyen|\b)/i);
  assert.match(source, /Demo workspace/);
  assert.match(source, /StoragePK user/);
});

test("dashboard does not advertise unsupported Telegram file sizes", () => {
  assert.doesNotMatch(source, /184 MB/);
  assert.match(source, /42 MB/);
});
