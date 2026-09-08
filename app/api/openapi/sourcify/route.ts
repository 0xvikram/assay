import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sourcify publishes a full OpenAPI document, but Bazantic's fetcher would not
 * ingest it. This is the one-endpoint subset the pre-flight recipe uses,
 * served from our origin; the gateway's endpoint is still sourcify.dev.
 */
export function GET() {
  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "Sourcify (verified-source lookup)",
      version: "2.0.0",
      summary: "Is this contract's source verified?",
      description: "Subset of the Sourcify v2 API used by Assay's pre-flight recipe: look up whether a contract at an address on a chain has verified source. Upstream: https://sourcify.dev/server/api-docs/",
      license: { name: "MIT", identifier: "MIT" },
    },
    servers: [{ url: "https://sourcify.dev/server" }],
    security: [],
    paths: {
      "/v2/contract/{chainId}/{address}": {
        get: {
          operationId: "getContract",
          summary: "Verification status of a contract",
          parameters: [
            { name: "chainId", in: "path", required: true, schema: { type: "integer", examples: [8453, 1] } },
            { name: "address", in: "path", required: true, schema: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" } },
          ],
          responses: {
            "200": {
              description: "Match found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Contract" } } },
            },
            "404": { description: "No verified source for this address", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { description: "Rate limited", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
    },
    components: {
      schemas: {
        Contract: {
          type: "object",
          properties: {
            match: { type: ["string", "null"], enum: ["exact_match", "match", null], description: "Verification level; null when unverified." },
            creationMatch: { type: ["string", "null"] },
            runtimeMatch: { type: ["string", "null"] },
            chainId: { type: "string" },
            address: { type: "string" },
            verifiedAt: { type: ["string", "null"] },
          },
        },
        Error: { type: "object", properties: { customCode: { type: "string" }, message: { type: "string" }, errorId: { type: "string" } } },
      },
    },
  });
}
