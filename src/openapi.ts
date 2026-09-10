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
        "A pre-flight for agent payments. Reads the ERC-8004 registries through The Graph and returns a verdict — VERIFIED, UNPROVEN or WASH_REPUTATION_DETECTED — with the evidence, what would change it, and a provenance envelope naming the exact subgraph deployment and block. Confidence is earned only from payment-backed reviews by independent addresses. The same engine reconciles lending markets across Messari standardized subgraphs, and refuses to compare sources whose schema or methodology versions differ.",
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
      "/api/v1/lending/market": {
        get: {
          operationId: "compareLendingMarket",
          summary: "Reconcile one lending market across two Messari subgraphs, or refuse",
          description: "Compares only when both sources share schemaVersion and methodologyVersion, re-read from each subgraph on every request. Otherwise returns METHODOLOGY_MISMATCH or SCHEMA_MISMATCH and no number. One source returns a snapshot instead.",
          parameters: [
            { name: "asset", in: "query", required: false, description: "Token symbol. Defaults to USDC.", schema: { type: "string", examples: ["USDC", "WETH"] } },
            { name: "sources", in: "query", required: true, description: "One or two registry keys, comma-separated.", schema: { type: "string", examples: ["compound-v3-ethereum,spark-lend-ethereum"] } },
          ],
          responses: {
            "200": { description: "The comparison, each side with its own deployment and block", content: { "application/json": { schema: { $ref: "#/components/schemas/LendingReport" } } } },
            "400": err("Missing or too many sources"), "404": err("Unknown lending source"), "502": err("Gateway error"), "503": err("Source not servable"),
          },
        },
      },
      "/api/v1/lending/preview": {
        get: {
          operationId: "previewLendingComparability",
          summary: "Whether two lending sources may be compared at all (free tier)",
          parameters: [
            { name: "a", in: "query", required: true, schema: { type: "string", examples: ["compound-v3-ethereum"] } },
            { name: "b", in: "query", required: true, schema: { type: "string", examples: ["spark-lend-ethereum"] } },
          ],
          responses: { "200": { description: "Comparability and the versions that decided it", content: { "application/json": { schema: { $ref: "#/components/schemas/ComparabilityPreview" } } } }, "400": err("Missing a or b"), "404": err("Unknown lending source"), "429": err("Free-tier rate limit") },
        },
      },
      "/api/v1/lending/sources": { get: { operationId: "listLendingSources", summary: "The lending registry with schema and methodology versions", responses: { "200": { description: "Sources", content: { "application/json": { schema: { $ref: "#/components/schemas/LendingSources" } } } }, "429": err("Free-tier rate limit") } } },
      "/api/v1/lookup": {
        get: {
          operationId: "lookupCounterparty",
          summary: "Which registered agents a payment would go to (free)",
          description: "Joins a 402's payTo address and resource URL to ERC-8004 registrations by owner, declared wallet and endpoint, across every healthy chain. Used by the x402 guard before any payment is signed.",
          parameters: [
            { name: "address", in: "query", required: false, description: "The payTo address from a 402.", schema: { type: "string", examples: ["0x69747c4ce6185d21a33b3bcdba980d659600ac7b"] } },
            { name: "url", in: "query", required: false, description: "The paid resource's URL.", schema: { type: "string", format: "uri" } },
          ],
          responses: { "200": { description: "Matching registrations", content: { "application/json": { schema: { $ref: "#/components/schemas/CounterpartyLookup" } } } }, "400": err("Neither address nor url given"), "429": err("Free-tier rate limit") },
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
        Comparability: { type: "string", enum: ["COMPARABLE", "SCHEMA_MISMATCH", "METHODOLOGY_MISMATCH", "REGISTRY_DRIFT"] },
        LendingReport: {
          type: "object", required: ["asset", "comparison", "provenance", "readAt", "tolerance"],
          properties: {
            asset: { type: "string" },
            comparison: {
              type: "object", required: ["comparability", "reconciliation", "statement"],
              properties: {
                comparability: { $ref: "#/components/schemas/Comparability" },
                reconciliation: { type: "string", enum: ["AGREE", "DISAGREE", "NOT_ATTEMPTED"] },
                statement: { type: "string" },
                deltas: { type: "array", items: { type: "object", properties: { field: { type: "string" }, a: { type: "number" }, b: { type: "number" }, relDiff: { type: "number" }, withinTolerance: { type: "boolean" } } } },
                sources: { type: "array", items: { type: "object" } },
              },
            },
            provenance: { type: "array", items: { type: "object", properties: { source: { type: "string" }, deployment: { type: "string" }, block: { type: "integer" }, hasIndexingErrors: { type: "boolean" } } } },
            readAt: { type: "string" }, tolerance: { type: "number" },
          },
        },
        ComparabilityPreview: {
          type: "object", required: ["a", "b", "comparability", "statement", "versions"],
          properties: {
            a: { type: "string" }, b: { type: "string" }, comparability: { $ref: "#/components/schemas/Comparability" }, statement: { type: "string" },
            versions: { type: "array", items: { type: "object", properties: { key: { type: "string" }, schemaVersion: { type: "string" }, methodologyVersion: { type: "string" }, network: { type: "string" } } } },
            readAt: { type: "string" },
          },
        },
        LendingSources: { type: "object", properties: { sources: { type: "array", items: { type: "object" } }, note: { type: "string" } } },
        CounterpartyLookup: { type: "object", properties: { address: { type: ["string", "null"] }, url: { type: ["string", "null"] }, matches: { type: "array", items: { type: "object", properties: { ref: { type: "string" }, chain: { type: "string" }, chainId: { type: "integer" }, agentId: { type: "string" }, name: { type: ["string", "null"] }, matchedOn: { type: "string", enum: ["owner", "agentWallet", "endpoint"] } } } }, chainsQueried: { type: "array", items: { type: "string" } } } },
        Error: { type: "object", required: ["error"], properties: { error: { type: "string" }, detail: { type: "string" } } },
      },
    },
  };
}
