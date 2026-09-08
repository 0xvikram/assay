import { test } from "node:test";
import assert from "node:assert/strict";
import { endpointCandidates } from "./resolve";

test("candidates cover case and trailing-slash variants without duplicates", () => {
  const c = endpointCandidates("  HTTPS://MCP.Zyf.ai/ ");
  assert.ok(c.includes("https://mcp.zyf.ai"));
  assert.ok(c.includes("https://mcp.zyf.ai/"));
  assert.equal(new Set(c).size, c.length);
});

test("a path is preserved and the host alone is lowercased", () => {
  const c = endpointCandidates("https://OpenClaw.ai/MCP");
  assert.ok(c.includes("https://openclaw.ai/MCP"));
  assert.ok(!c.includes("https://openclaw.ai/mcp"));
});

test("a non-URL is matched literally", () => {
  assert.deepEqual(endpointCandidates("not a url"), ["not a url"]);
});
