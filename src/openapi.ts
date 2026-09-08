/**
 * Hand-written OpenAPI 3.1. Bazantic requires 3.1 with `servers`, per-route
 * summaries and parameters; agents read this to learn what a call costs and
 * what comes back. Prices are stated once the x402 gate lands (Phase C).
 */
export function openapi(origin: string) {
  const chainParam = {
    name: "chain", in: "path", required: true,
    description: "Registry key (base, ethereum, bsc, polygon, base-sepolia, bsc-chapel) or numeric chain id.",
    schema: { type: "string", examples: ["base", "8453"] },
  };
  const agentParam = {
    name: "agentId", in: "path", required: true,
    description: "ERC-8004 agent id on that chain.",
    schema: { type: "string", examples: ["25975"] },
  };
  const err = (description: string) => ({ description, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } });

  return {
    openapi: "3.1.0",
    info: {
      title: "Assay",
      version: "0.1.0",
      summary: "Is this agent's reputation real?",
      description:
        "A pre-flight for agent payments. Reads the ERC-8004 registries through The Graph and returns a verdict — VERIFIED, UNPROVEN or WASH_REPUTATION_DETECTED — with the evidence, what would change it, and a provenance envelope naming the exact subgraph deployment and block. Confidence is earned only from payment-backed reviews by independent addresses.",
      license: { name: "MIT", identifier: "MIT" },
    },
    servers: [{ url: origin }],
    // No authentication today; Phase C adds an x402 security scheme to the paid routes.
    security: [],
    paths: {
      "/api/v1/agents/{chain}/{agentId}": {
        get: {
          operationId: "assayAgent",
          summary: "Full verdict with evidence, next steps and provenance",
          parameters: [chainParam, agentParam],
          responses: {
            "200": { description: "The report", content: { "application/json": { schema: { $ref: "#/components/schemas/Report" } } } },
            "404": err("Unknown chain or agent"), "429": err("Free-tier rate limit"), "502": err("Gateway error"), "503": err("Chain has no reliable indexer"),
          },
        },
      },
      "/api/v1/preview/{chain}/{agentId}": {
        get: {
          operationId: "previewAgent",
          summary: "Verdict and confidence only (free tier)",
          parameters: [chainParam, agentParam],
          responses: { "200": { description: "Verdict only", content: { "application/json": { schema: { $ref: "#/components/schemas/Preview" } } } }, "404": err("Unknown chain or agent") },
        },
      },
      "/api/v1/resolve": {
        get: {
          operationId: "resolveEndpoint",
          summary: "Which registered agents claim this endpoint URL?",
          parameters: [{ name: "url", in: "query", required: true, schema: { type: "string", format: "uri", examples: ["https://mcp.zyf.ai"] } }],
          responses: { "200": { description: "Matches across every healthy chain", content: { "application/json": { schema: { $ref: "#/components/schemas/Resolve" } } } }, "400": err("Missing url"), "429": err("Free-tier rate limit") },
        },
      },
      "/api/v1/corroborate/{ref}": {
        get: {
          operationId: "corroborateOwner",
          summary: "The same owner across every healthy chain, each agent assessed",
          parameters: [{ name: "ref", in: "path", required: true, description: "Owner address or chain:agentId.", schema: { type: "string", examples: ["base:25975"] } }],
          responses: { "200": { description: "Cross-chain report", content: { "application/json": { schema: { $ref: "#/components/schemas/Corroboration" } } } }, "404": err("Unknown reference") },
        },
      },
      "/api/v1/chains": { get: { operationId: "listChains", summary: "The chain registry with health flags", responses: { "200": { description: "Chains" }, "429": err("Free-tier rate limit") } } },
      "/api/healthz": { get: { operationId: "health", summary: "Liveness", responses: { "200": { description: "OK" }, "503": err("Not ready") } } },
    },
    components: {
      schemas: {
        Verdict: { type: "string", enum: ["VERIFIED", "UNPROVEN", "WASH_REPUTATION_DETECTED"] },
        Finding: {
          type: "object", required: ["code", "severity", "statement", "measured"],
          properties: { code: { type: "string" }, severity: { type: "string", enum: ["critical", "warning", "info"] }, statement: { type: "string" }, measured: { type: "string" } },
        },
        Provenance: {
          type: "object", required: ["chain", "chainId", "subgraphId", "deployment", "block", "hasIndexingErrors", "sampleCap", "sampleTruncated", "readAt"],
          properties: {
            chain: { type: "string" }, chainId: { type: "integer" }, subgraphId: { type: "string" },
            deployment: { type: "string", description: "The exact subgraph deployment hash the answer was read from." },
            block: { type: "integer" }, blockTime: { type: ["string", "null"] }, hasIndexingErrors: { type: "boolean" },
            sampleCap: { type: "integer" }, sampleTruncated: { type: "boolean" }, readAt: { type: "string" }, latencyMs: { type: "integer" },
            thresholds: { type: "object", description: "The rules the verdict was computed under." },
          },
        },
        Report: {
          type: "object", required: ["agent", "assessment", "signals", "provenance"],
          properties: {
            agent: { type: "object", properties: { id: { type: "string" }, name: { type: ["string", "null"] }, owner: { type: "string" }, wallet: { type: ["string", "null"] }, ens: { type: ["string", "null"] }, x402Support: { type: ["boolean", "null"] }, registeredDaysAgo: { type: ["integer", "null"] } } },
            assessment: {
              type: "object", required: ["verdict", "confidence", "headline", "findings", "nextSteps"],
              properties: { verdict: { $ref: "#/components/schemas/Verdict" }, confidence: { type: "integer", minimum: 0, maximum: 100 }, headline: { type: "string" }, findings: { type: "array", items: { $ref: "#/components/schemas/Finding" } }, nextSteps: { type: "array", items: { type: "string" }, description: "What would change this verdict, priced in payment-backed reviews." } },
            },
            signals: { type: "object", description: "The measurements the findings were computed from." },
            provenance: { $ref: "#/components/schemas/Provenance" },
          },
        },
        Preview: { type: "object", properties: { agent: { type: "string" }, verdict: { $ref: "#/components/schemas/Verdict" }, confidence: { type: "integer" }, provenance: { type: "object" }, full: { type: "string" } } },
        Resolve: { type: "object", properties: { input: { type: "string" }, candidates: { type: "array", items: { type: "string" } }, matches: { type: "array", items: { type: "object" } }, chainsQueried: { type: "array", items: { type: "string" } }, truncated: { type: "array", items: { type: "string" } }, failures: { type: "array", items: { type: "object" } } } },
        Corroboration: { type: "object", properties: { owner: { type: "string" }, chains: { type: "array", items: { type: "object" } }, findings: { type: "array", items: { $ref: "#/components/schemas/Finding" } }, consistent: { type: "boolean" } } },
        Error: { type: "object", required: ["error"], properties: { error: { type: "string" }, detail: { type: "string" } } },
      },
    },
  };
}
