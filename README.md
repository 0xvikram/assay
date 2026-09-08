# Assay

**Is this agent's reputation real?**

A paid pre-flight check for ERC-8004 agents. Before your agent pays a counterparty
over x402, ask Assay whether the reputation it is trusting was earned or manufactured.

```
npm install
cp .env.example .env      # add a Graph gateway key
npm run assay -- base:25975
```

## Why

Measured against the Agent0 ERC-8004 subgraphs on 2026-09-05:

| Signal | Measured |
|---|---|
| Agents registered (Ethereum) | 50,699 |
| Feedback entries (Ethereum) | 3,371 — one per 15 agents |
| Validations across Ethereum, Base, BSC, Polygon | **0** |
| Feedback carrying an on-chain payment proof | 0.7% Base · 2.6% Ethereum · 0% BSC |
| Reviews naming the tool they rate | 0 |

The registries have identity at scale and essentially no verifiable trust. A naive
average score — what the registry stats entities return — cannot tell a real agent
from a farm. **Assay counts only what can be verified.**

## Verdicts

| Verdict | Meaning |
|---|---|
| `VERIFIED` | Enough payment-backed reviews, from enough independent addresses, with no single one dominating. |
| `UNPROVEN` | Reputation exists but nothing about it can be independently checked. The common case. |
| `WASH_REPUTATION_DETECTED` | The signal was manufactured. Findings say exactly how. |

Detectors: `SINGLE_SOURCE_REPUTATION`, `UNIFORM_UNPAID_SCORES`, `BURST_TIMED_REVIEWS`,
`SELF_ISSUED_FEEDBACK`, `NO_PAYMENT_PROOF`, `THIN_PAYMENT_PROOF`, `CONCENTRATED_REVIEWERS`,
`NO_VALIDATION`, `SPARSE_REGISTRATION`, `UNATTRIBUTED_REVIEWS`.

Thresholds live in one place, `src/score/verdict.ts` — a score whose rules are hidden
is the problem this service exists to fix.

## Provenance

Every answer names the exact subgraph deployment hash, the block it was read at, the
indexing-error flag, whether the sample was truncated, and the thresholds applied.
An answer without that is not evidence.

## Adding a chain

Add an entry to `registry/chains.json`. No code changes.

## Status

Day 3. Scoring engine reads live mainnet data across five deployments.
Next: x402 gate on Hedera, then the MCP surface.

## Commands

```
npm run assay -- base:25975                          # verdict for one agent
npm run assay -- --resolve https://mcp.zyf.ai        # which agents claim this endpoint?
npm run assay -- --corroborate base:25975            # the owner, across every healthy chain
npm run assay -- --fixture fixtures/base-25975@51026420.json   # pinned replay; prints source: fixture
npm test · npm run typecheck
```

Every report ends with **what would change the verdict**, priced in payment-backed
reviews. `UNPROVEN` is a path, not a punishment. Payment-backed evidence outranks
free evidence: an agent attacked with manufactured reviews is not stuck at `WASH`
if its paid reviews stand on their own.

`fixtures/` holds pinned snapshots (block number in the filename) so the demo
survives the farm going quiet. A replay always announces itself as a fixture.

## Live

**https://assay-dusky.vercel.app** — console, `/api/*`, `/api/mcp`, `/architecture`.

## Run the service

```
npm run build && npm start          # Next.js 16, all routes under /api
curl localhost:3000/api/healthz
curl localhost:3000/api/v1/preview/base/25975
```

| Route | What |
|---|---|
| `GET /api/v1/agents/{chain}/{agentId}` | full report: verdict, findings, next steps, signals, provenance |
| `GET /api/v1/preview/{chain}/{agentId}` | verdict + confidence only — the free tier |
| `GET /api/v1/resolve?url=` | which registered agents claim this endpoint |
| `GET /api/v1/corroborate/{owner or chain:agentId}` | the same owner across every healthy chain |
| `GET /api/v1/chains` · `GET /api/healthz` · `GET /api/openapi` | registry · liveness · OpenAPI 3.1 |

Free routes allow 10 requests a minute per IP. Every route declares `runtime = "nodejs"`
and `maxDuration = 60`; the engine fans out to chains in parallel, never in a loop.

### Deploy (Vercel Hobby)

1. `vercel.com/new` → import `0xvikram/assay` from your **personal** GitHub account
   (Hobby cannot link organisation repos). Framework is detected as Next.js; no settings to change.
2. Environment variables: `GRAPH_API_KEY` (required), `PUBLIC_BASE_URL` (the deployment URL,
   used as the `servers` entry in `/api/openapi`).
3. Deploy. Every push to `master` redeploys.

## Use from Claude / Cursor (MCP)

```
npm run mcp                       # stdio server, free, runs on your GRAPH_API_KEY
```
Hosted: point any MCP client at `https://<host>/api/mcp` — `assay_agent` costs HBAR over
x402, `assay_preview` is free. Config snippets and a paying client in [docs/MCP.md](docs/MCP.md).

## Two rails, one engine

Every paid route's `402` lists two ways to pay and the client picks:

| Rail | Network | Facilitator | Client |
|---|---|---|---|
| Hedera testnet | `hedera:testnet` | Blocky402 (`api.testnet.blocky402.com`) — verifies and settles, pays the network fee | `npm run agent:pay` |
| Arc testnet | `eip155:5042002` | Circle Gateway (`gateway-api-testnet.circle.com`) — off-chain signatures, batched settlement, no gas | `npm run agent:pay-arc [--deposit 1.00]` |

Prices are the same tiers on both: a cross-chain corroboration costs four single reads.
Settled calls on either rail leave a receipt on the HCS topic.

## Uniswap

The pre-flight recipe's quote step calls the Trading API (`src/agent/quote.ts`,
`npm run agent:quote -- --chain 8453 --in USDC --out WETH --amount 1000000`). Nothing is
executed — the mandate decides. Developer feedback with exact doc pages: [FEEDBACK.md](FEEDBACK.md).

## Bazantic

Two gateways (Assay via `/api/openapi`; Sourcify via its published OpenAPI) and two recipes:
[docs/bazantic/README.md](docs/bazantic/README.md).
