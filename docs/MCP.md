# Assay over MCP

The same tools, two doors.

| Transport | Where it runs | Who pays |
|---|---|---|
| **stdio** — `npm run mcp` | your machine, your `GRAPH_API_KEY` | nobody; the compute is yours |
| **Streamable HTTP** — `https://<host>/api/mcp` | our deployment | `assay_agent`, `assay_resolve`, `assay_corroborate` cost HBAR over x402 on Hedera; `assay_preview`, `assay_chains`, `assay_thresholds` are free |

## Tools

| Tool | Args | Returns |
|---|---|---|
| `assay_agent` | `chain`, `agentId` | full report: verdict, findings, next steps, signals, provenance — as structured content and a summary ending with the deployment + block |
| `assay_preview` | `chain`, `agentId` | verdict + confidence + deployment + block. Free. |
| `assay_resolve` | `url` | every registered agent claiming that endpoint, across healthy chains |
| `assay_corroborate` | `ref` (owner or `chain:agentId`) | the owner across chains, each agent assessed |
| `assay_chains` | — | the registry with health flags. Free. |
| `assay_thresholds` | — | the rules every verdict is computed under. Free. |

A refused read (no `_meta`, unhealthy chain, unknown agent) comes back as `isError: true` with the reason — never a guessed number.

## Claude Desktop / Claude Code (stdio)

`claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "assay": {
      "command": "npx",
      "args": ["tsx", "--env-file=/path/to/assay/.env", "/path/to/assay/bin/assay-mcp.ts"]
    }
  }
}
```
Claude Code: `claude mcp add assay -- npx tsx --env-file=/path/to/assay/.env /path/to/assay/bin/assay-mcp.ts`

Then ask: *"Is base agent 25975 safe to pay?"*

## Cursor (stdio)

`.cursor/mcp.json` with the same `command` / `args` block.

## Hosted (Streamable HTTP, paid tools)

Inspector: `npx @modelcontextprotocol/inspector` → transport *Streamable HTTP* → `https://<host>/api/mcp`.
Calling `assay_agent` without payment returns a tool result with `isError: true` whose
`structuredContent` is the x402 `PaymentRequired` (network `hedera:testnet`, amount in tinybar).

Paying client, in five lines:
```ts
import { createx402MCPClient } from "@x402/mcp";
import { createClientHederaSigner, PrivateKey } from "@x402/hedera";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const signer = createClientHederaSigner(ACCOUNT_ID, PrivateKey.fromStringECDSA(KEY), { network: "hedera:testnet" });
const client = createx402MCPClient({ name: "my-agent", version: "1.0.0", schemes: [{ network: "hedera:*", client: new ExactHederaScheme(signer) }], autoPayment: true });
await client.connect(new StreamableHTTPClientTransport(new URL("https://<host>/api/mcp")));
const r = await client.callTool("assay_agent", { chain: "base", agentId: "25975" });
```
The payment rides in `_meta["x402/payment"]`; the settlement comes back in `_meta["x402/payment-response"]`, and a receipt lands on the HCS topic.
