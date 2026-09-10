# Assay

**Know who you're paying before you pay them.**

A paid pre-flight for agent payments. Before your agent pays another ERC-8004 agent, it asks Assay — over x402 — whether that agent's reputation is real. Assay reads the registries live through The Graph, returns `VERIFIED` / `UNPROVEN` / `WASH_REPUTATION_DETECTED` with the evidence, what would change it, and the exact subgraph deployment and block it was read at — or refuses to guess. After the agent pays, it writes the one review that can't be faked: ERC-8004 feedback whose file carries the settlement as proof of payment.

**Live:** https://assay-dusky.vercel.app · **Ledger:** https://assay-dusky.vercel.app/trail · **OpenAPI:** `/api/openapi` · **MCP:** `/api/mcp`

Built solo for ETHOnline 2026 (Sept 4–16). Everything below is live against mainnet and testnet data; nothing is mocked.

## The problem, in one agent

The #1 agent on Base by review count has **309,734 reviews**. Read live:

```
$ npm run assay -- base:25975
  WASH_REPUTATION_DETECTED   confidence 0/100
  ✗ 95.5% of 1000 reviews from 0x7cf8286c…3810b
  ✗ 1 distinct score value across 1000 reviews, 0 payment proofs
  ✗ 100.0% of reviews inside one 24h window
  deployment QmcLwgyKn3RnyhkkSwLYscP9dL1Fc6omvfC9bFRgcK1e7u · block 51034437
```

Independent research ([arXiv:2606.26028](https://arxiv.org/html/2606.26028), July 2026) found 59–91% of reviewers Sybil-flagged and **98.7–100% of all feedback without proof of payment**. The paper measured; nothing changed. Measuring isn't the product.

## What's live (Sept 8)

| | Evidence |
|---|---|
| **Hedera x402** — 402 → signed → settled by Blocky402's fee payer | [HashScan tx](https://hashscan.io/testnet/transaction/0.0.7162784%401788858215.582262398) · `docs/evidence/hedera-first-paid-request.md` |
| **HCS receipts** — every settlement on both rails, no database | [topic 0.0.10419050](https://hashscan.io/testnet/topic/0.0.10419050) · `/trail` |
| **Arc rail** — Circle Gateway, off-chain signature, no gas | `docs/evidence/arc-paid-request.md` |
| **Base Sepolia rail** — x402.org, the rail marketplaces pay upstream on | advertised in every 402 |
| **The receipt** — Assay is [agent #9200](https://sepolia.basescan.org/tx/0xf8bcf0c1e4ac1d7a4cfca6cfbf1410982bfa3367aa989eb497f099a16bc7ffbe); its first payment-backed review [is on-chain](https://sepolia.basescan.org/tx/0xb8238519f39e83ef4d3af9a4e13838a6413f66d3b6c2f745af3f823f8d0998d5) and reads back as 100% proof coverage | `docs/evidence/receipt-loop.md` |
| **Privy** — treasury wallet bound to a policy owned by a key quorum; stranger transfer refused with `policy_violation` | [allowlisted tx](https://sepolia.basescan.org/tx/0x50beff490104b8a9acac3ab529dcdf381d55e40b5f775170eb9ad60e230e7b43) |
| **Uniswap** — Trading API quote as the recipe's price step | `FEEDBACK.md` |
| **MCP** — stdio for Claude Desktop/Cursor, hosted with `@x402/mcp` paid tools | `docs/MCP.md` |
| **Hedera Harness** — `doctor` verifies the x402 facilitator before a run | [PR #44](https://github.com/hedera-dev/hedera-harness/pull/44) |
| **World Selfie Check** — the step-up for raising an agent's cap | code live at `/escalate`; sandbox pending — `docs/FEEDBACK-world.md` |
| **Bazantic** — two gateways registered | `docs/bazantic/README.md` (their edge 404s, reported) |

## How it works

```
paying agent ──402→pay→200──▶ Assay (Next.js on Vercel) ──GraphQL+_meta──▶ The Graph (Agent0, 6 chains)
   │ signs only                 │ REST · MCP · console
   │                            └─ afterSettle ──▶ HCS topic ──▶ mirror node ──▶ /trail
   └─ giveFeedback(proofOfPayment) ──▶ ERC-8004 Reputation Registry (Base Sepolia), file on IPFS
```

Read `docs/ARCHITECTURE.md` (or `/architecture`) for the full picture. The rules that make it honest:

- **Provenance or nothing.** Every query carries `_meta`; no pinned deployment and block, no answer.
- **Confidence is earned** only from reviews backed by verifiable payments from independent addresses. Eleven detectors catch the one-wallet farm and the hundred-wallet, one-afternoon farm. Payment-backed evidence outranks free evidence, so an agent attacked with fake reviews isn't stuck at `WASH`.
- **Every `UNPROVEN` is a path**: the report ends with what would change it, priced in paid reviews.
- **Priced by work**: a six-chain corroboration costs four single reads. Settlement only after a successful response.
- **State lives on Hedera**, not in a database. The action trail is a public ledger.

## Run it

```
cp .env.example .env            # docs/ENV.md walks through every value
npm ci
npm run assay -- base:25975      # CLI verdict · add --json
npm run assay -- --resolve https://mcp.zyf.ai
npm run assay -- --corroborate base:25975
npm test && npm run typecheck
npm run build && npm start       # the site + API on :3000
```

Live flows (need funded testnet accounts — see `docs/ENV.md`):

```
npm run hcs:create-topic                          # the receipt topic
npm run agent:pay                                 # 402 → pay on Hedera → verdict → mandate decision
npm run agent:pay -- ethereum:6888 --receipt      # …then write the payment-backed review
npm run agent:pay-arc -- --deposit 1.00           # same purchase on Arc
npm run register:self                             # Assay as an ERC-8004 agent
npm run treasury:setup && npm run treasury:demo   # Privy policy: allowlist passes, stranger refused
npm run agent:quote -- --chain 8453 --in USDC --out WETH --amount 1000000
npm run lending:demo                              # all three reconciliation outcomes, live
npm run mcp                                       # stdio MCP server
```

## Routes

| Route | Cost | What |
|---|---|---|
| `GET /api/v1/agents/{chain}/{agentId}` | paid | verdict, findings, next steps, signals, provenance |
| `GET /api/v1/preview/{chain}/{agentId}` | free | verdict + confidence + block |
| `GET /api/v1/resolve?url=` | paid | which registered agents claim this endpoint |
| `GET /api/v1/corroborate/{owner or chain:id}` | paid ×4 | the owner across every healthy chain |
| `GET /api/v1/lending/market?asset=&sources=a,b` | paid | reconcile one market across two Messari subgraphs, or refuse |
| `GET /api/v1/lending/sources` | free | the lending registry with schema and methodology versions |
| `GET /api/v1/trail` · `GET /api/v1/mandate/{id}/approvals` | free | the ledger, from the mirror node |
| `POST /api/mcp` | mixed | Streamable HTTP MCP; `assay_agent` paid, `assay_preview` free |
| `GET /api/openapi` · `/api/v1/chains` · `/api/healthz` | free | |

Every paid route's 402 offers **three rails**: `hedera:testnet` (Blocky402), `eip155:5042002` Arc (Circle Gateway), `eip155:84532` Base Sepolia (x402.org). Free routes allow 10 requests/min per IP.

## Adding a source

One row in `registry/chains.json` (a chain) or `registry/lending.json` (a lending protocol) — never a code path. The engine refuses to answer from a source marked unhealthy rather than guess.

## Composition, and when it refuses

Two subgraphs agreeing on a number means nothing unless they computed it the same way. Messari versions that intent: `schemaVersion` says what the fields mean, `methodologyVersion` says how they were derived. Assay re-reads both from every subgraph on every request and compares only when both match:

| Live pair | Result |
|---|---|
| `compound-v3-ethereum` ↔ `spark-lend-ethereum` | **COMPARABLE / DISAGREE** — same schema *and* methodology, but the USDC lender rate differs 28.6%. Reported as `EVIDENCE_INCONSISTENT`, never averaged. |
| `aave-v3-ethereum` ↔ `spark-lend-ethereum` | **METHODOLOGY_MISMATCH** — both schema 3.1.0, methodology 1.1.0 vs 1.0.0. Comparing would invent agreement. |
| `aave-v3-ethereum` ↔ `moonwell-base` | **SCHEMA_MISMATCH** — 3.1.0 vs 2.0.1. The fields do not mean the same thing. |
| `aave-v3-base`, `compound-v3-base` | **not servable** — no allocations, and a query id that resolves to Ethereum. Refused, with the reason stated. |

`npm run lending:demo` prints all of it live.

## Repository

```
src/engine/       pure TypeScript: graph client, signals, detectors, verdict, resolve, corroborate
src/x402.ts       the gate: three facilitators, tiers, the settle→HCS hook
src/hcs.ts        receipts, approvals, mirror-node reads
src/agent/        the reference paying agent, the mandate, the receipt writer, the Arc buyer, the quote
src/treasury/     Privy policy-bound wallet
src/mcp/ bin/     MCP tools, stdio server
app/              Next.js 16: console, /trail, /escalate, /architecture, /api/*
docs/             PLAN, ARCHITECTURE, ENV, MCP, DEMO, evidence/, bazantic/, FEEDBACK-world
fixtures/         pinned snapshots (block in filename); --fixture replays announce themselves
```

## Feedback documents

`FEEDBACK.md` (Uniswap) · `docs/FEEDBACK-world.md` (World) · `docs/bazantic/README.md` (Bazantic) · [hedera-harness PR #44](https://github.com/hedera-dev/hedera-harness/pull/44)

MIT.
