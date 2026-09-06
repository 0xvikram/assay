# Assay — Execution & Implementation Plan

**Event:** ETHOnline 2026 · Sept 4–16 · async · solo · starting fresh
**Written:** Sept 6 (day 3). **Days left including today: 11.**
**Goal:** secure one bounty; collect every other track the same build qualifies for.

This document is written to be executed by Claude Code (Opus). Each phase has an
*Opus brief* you can paste verbatim, and an *acceptance check* that must pass before
moving on. Do not skip acceptance checks — every one of them maps to a sponsor's
qualification text.

---

## 0. What Assay is (one paragraph, keep it stable)

**Assay is a paid pre-flight for agent payments.** Before your agent pays a
counterparty over x402, Assay answers *"is this agent's reputation real?"* by reading
the ERC-8004 registries through The Graph and returning a verdict —
`VERIFIED` / `UNPROVEN` / `WASH_REPUTATION_DETECTED` — with the evidence attached and
a provenance envelope naming the exact subgraph deployment and block it was read at.
Confidence is only ever earned from payment-backed reviews by independent addresses.
The same engine, pointed at Messari's standardized lending schema, proves the domain
swap is a registry entry rather than a rewrite.

**Already built (day 3):** scoring engine, 10 named detectors, provenance envelope,
chain registry, CLI. Verified on mainnet: the #1 agent on Base by review count
(309,734 reviews) is a farm — 96.5% single-source, uniform score, 100% in one 24h window.

---

## 1. Verified facts the plan depends on

Everything here was checked on Sept 6. If any of it drifts, fix the plan, not the code.

### Packages (npm, current versions)
| Package | Version | Used for |
|---|---|---|
| `@x402/express` `@x402/core` `@x402/hedera` `@x402/fetch` | 2.25.0 | x402 server + client, Hedera scheme |
| `@hiero-ledger/sdk` | latest | Hedera signing, HCS receipts |
| `@modelcontextprotocol/sdk` | 1.30.0 | MCP server (stdio + Streamable HTTP) |
| `@circle-fin/x402-batching` | 3.4.0 | Arc Nanopayments seller + buyer |
| `@worldcoin/idkit` | 4.2.3 | Selfie Check widget |
| `@privy-io/node` | 0.34.0 | Server wallets, policies, key quorum |
| `@bazantic/cli` | 0.8.0 | Gateway + recipe deployment |
| `@ledgerhq/wallet-cli` | 2.1.0 | Device confirmation (**physical device mandatory**) |
| `express` | ^4.21 | HTTP server (matches the x402 middleware) |

### Hedera
- Facilitator (hosted testnet, no API key): `https://api.testnet.blocky402.com` — endpoints `/supported`, `/verify`, `/settle`.
  Mainnet: `https://api.blocky402.com`. **The Hedera track requires Blocky402**, not x402.org.
- Network string: `hedera:testnet`. HBAR asset id `0.0.0` (amounts in tinybars, 1 HBAR = 1e8). No token association needed for HBAR.
- USDC testnet token `0.0.429274` (6 decimals) — needs association on both accounts; fund at faucet.circle.com.
- Accounts: create **two ECDSA** testnet accounts at portal.hedera.com — *agent payer* and *service receiver*.
- Server wiring (verified from the x402 repo):
  ```ts
  import { paymentMiddleware, x402ResourceServer } from "@x402/express";
  import { HTTPFacilitatorClient } from "@x402/core/server";
  import { ExactHederaScheme } from "@x402/hedera/exact/server";
  const facilitator = new HTTPFacilitatorClient({ url: "https://api.testnet.blocky402.com" });
  const server = new x402ResourceServer(facilitator)
    .register("hedera:*", new ExactHederaScheme({ defaultAssets: { "hedera:testnet": { asset: "0.0.429274", decimals: 6 } } }));
  app.use(paymentMiddleware({ "GET /v1/check/:chain/:agentId": { accepts: { scheme: "exact", price: "$0.001", network: "hedera:testnet", payTo: "0.0.SERVICE" }, description: "..." } }, server));
  ```
- Client wiring: `createClientHederaSigner(accountId, PrivateKey.fromStringECDSA(pk), { network: "hedera:testnet" })` → `new x402Client().register("hedera:*", new ExactHederaScheme(signer))` → wrap `fetch` with `@x402/fetch`.
- Facilitator co-signs and submits; settlement is async; the client must **sign only**, never submit.
- Extra-points list (from the prize page): metering · A2A/ACP · **ERC-8004 identity** · discovery · HTS fees · **HCS audit trail** · Scheduled Transactions.

### The Graph
- Gateway: `https://gateway.thegraph.com/api/<KEY>/subgraphs/id/<SUBGRAPH_ID>`. Key already in `.env`.
- Agent0 deployments: see `registry/chains.json` (Ethereum, Base, BSC, Polygon healthy; Sepolia + Monad unreliable).
- Messari Lending/CDP deployments (decentralised network query IDs, from `messari/subgraphs/deployment/deployment.json`):

  | Slug | Query ID | schema | subgraph | methodology |
  |---|---|---|---|---|
  | aave-v3-ethereum | `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk` | 3.1.0 | 2.4.1 | **1.1.0** |
  | aave-v3-base | `D7mapexM5ZsQckLJai2FawTKXJ7CqYGKM8PErnS3cJi9` | 3.1.0 | 1.4.1 | **1.1.0** |
  | compound-v3-ethereum | `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9` | 3.1.0 | 2.3.0 | **1.0.0** |
  | compound-v3-base | `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9` ⚠ same ID as Ethereum in the file — verify via `protocols { network }` before use | 3.1.0 | 2.3.0 | 1.0.0 |
  | spark-lend-ethereum | `GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si` | 3.1.0 | 2.4.0 | 1.0.0 |
  | moonwell-base | `33ex1ExmYQtwGVwri1AP3oMFPGSce6YbocBP7fWbsBrg` | **2.0.1** | 1.0.0 | 1.0.0 |

  This table *is* the demo for Idea B: Aave-ETH vs Aave-Base share methodology 1.1.0 (comparable);
  Aave vs Compound differ (1.1.0 vs 1.0.0 → `METHODOLOGY_MISMATCH`); Moonwell is a different schema
  version entirely (→ `SCHEMA_MISMATCH`). The refusal path writes itself from real data.
- Disqualifiers: mocked/local/static data; querying one subgraph with no composition. Video 2–4 min.

### Arc (Circle)
- Arc testnet chain id `5042002`, RPC `https://rpc.testnet.arc.io`, explorer `https://testnet.arcscan.app`, faucet `https://faucet.circle.com`. **USDC is the native gas token (18 decimals).**
- Nanopayments = x402 with off-chain EIP-3009 authorizations batched by Circle Gateway. Seller:
  `createGatewayMiddleware({ sellerAddress })` + `gateway.require("$0.001")`. Buyer:
  `new GatewayClient({ chain: "arcTestnet", privateKey })` → `deposit("1.00")` → `pay(url)`.
- Requirements on every Arc track: **working frontend AND backend AND an architecture diagram**, video + presentation. Launch track: deployed or deployment-ready on Arc mainnet **by Sept 30**.

### World
- Sandbox form submitted (Sept 6). Sandbox app arrives via **TestFlight (iOS) or Play private track (Android)** — you need a phone.
- **Selfie Check is separately feature-flagged.** Email `developers@toolsforhumanity.com` to request it for your app_id. Do this today.
- IDKit: `IDKitInviteCodeRequestWidget` with the `selfieCheckLegacy` preset; set `environment: "sandbox"`.
- Backend verify: `POST https://developer.world.org/api/v4/verify/{rp_id}` — no API key.
- Judged: working app **and** a feedback document covering docs, portal navigation, sandbox testing, issues found.

### Privy
- `@privy-io/node`: create a wallet, attach a **policy** (allowlist + spending limit — docs: `controls/policies/example-policies/ethereum`), a **key quorum** for escalation (`controls/key-quorum/create`), optionally **intents** (`transaction-management/intents/create/execute-transfer`).
- B2B track needs: one wallet + one B2B workflow (approval / treasury op) + one control (policy / quorum / intent). Flow track needs one live transfer/swap through a Privy wallet. Mocked features don't count.

### Ledger
- `wallet-cli send … ` shows "Review on device" — **a physical Ledger over USB is mandatory; no simulator documented; no Node SDK — CLI only.**
- **Decision gate:** if you don't own a Ledger device, cut this track now and reclaim the day.

### Bazantic
- Catalogue is empty (`0 OF 0`). Both gateways must be yours. Gateway needs: base URL, auth method, product website, **OpenAPI 3.1 spec**. Grants settle on **Base** only.
- CLI: `npm i -g @bazantic/cli` → `baz gateway add --spec-url … --endpoint … --name … --status draft --json` → `baz grant create --name agent-1 --cap 5` → `baz curl <url> --account agent-1 --max-amount 0.02 --yes --json`. MCP at `<gateway>/mcp`.
- Submission must include your Bazantic username.

### Hedera Harness (OSS track)
- It is a **coding-agent harness** (TypeScript CLI that drives Claude Code/Cursor to build features into scaffold-hbar from a PRD, then validates). Skills are vendored from `hedera-dev/hedera-skills`; `x402-payments` sits in `unmerged-skills`; there is a `docs/prds/x402-metered-api.md` PRD. Open issues include #8 (HOL Guard validator) and #41 (ASSERT accepts clean-exit timeouts).
- An open PR qualifies; "before/after developer-experience evidence" earns points.

### Uniswap
- Stack Contribution: public repo + `FEEDBACK.md` + form at `https://developers.uniswap.org/hackathon-feedback` + README pointing at the exact lines. Tooling counts.

### Chainlink / ENS — tier C, only if ahead
- Chainlink: CRE with a registered `handlerInTee` processing a real secret; CLI simulation is enough. Liquidation challenge contract `0x59d5B29FbA5ca865a171076BE94EbEeC5BCA1E04` on Sepolia, `join()` from Sept 8.
- ENS: ENSv2 on Sepolia; Permissioned Resolver / Enhanced Access Control; "agents as namespaces" bonus; ENSIP-25/26 agent records.

---

## 2. Architecture (freeze this; draw it on day 8 for Arc)

```
                       ┌──────────────────────────────────────────────────────┐
  paying agent ──402──▶│  Assay API (Express)                                  │
  (x402 client)        │   /v1/check/:chain/:id      $  Hedera x402 (Blocky402)│
                       │   /v1/corroborate/:id       $$ cross-chain            │
                       │   /v1/resolve?url=          $  endpoint → agent       │
                       │   /v1/lending/...           $  Idea B (Messari)       │
                       │   /arc/v1/check/...         $  Arc Nanopayments       │
                       │   /mcp                         MCP (Streamable HTTP)  │
                       │   /openapi.json                for Bazantic           │
                       └───────────────┬──────────────────────────────────────┘
                                       │  engine (pure TS)
                    ┌──────────────────┴───────────────────┐
                    │ registry/chains.json  registry/lending.json │  ← add a source = add a row
                    │ graph client (pins _meta)                   │
                    │ signals → detectors → verdict               │
                    │ reconcile (two-source, methodology-aware)   │
                    └──────────────────┬───────────────────┘
                                       │
              The Graph decentralised network (Agent0 ERC-8004 · Messari Lending 3.1.0)

  side effects:  HCS receipt topic (every paid call)  ·  Privy treasury wallet + policy + quorum
  step-ups:      World Selfie Check (envelope change)  ·  Ledger device (irreversible move)
  front door 2:  Bazantic gateway → MCP + recipes (settles on Base)
```

Repository layout (extend the existing flat repo; no monorepo):
```
src/engine/…        (move existing graph/ + score/ here)
src/api/            server.ts, routes/, x402.ts, hcs.ts, openapi.ts
src/mcp/            server.ts (stdio + http), tools.ts
src/agent/          pay.ts — the reference x402 client that pays Assay end-to-end
src/lending/        Idea B: queries, reconcile.ts, registry loader
registry/           chains.json, lending.json
web/                Next.js app: demo console, action trail, Selfie Check step-up, architecture page
docs/               PLAN.md, ARCHITECTURE.md (+ diagram), FEEDBACK-world.md, demo scripts
FEEDBACK.md         Uniswap
```

Hosting: the service must be **publicly reachable** for Hedera ("live service"), Bazantic (gateway origin) and the demo. Use Railway or Fly.io (either free tier runs a single Node process). Do not demo from a laptop tunnel — the 8 GB machine is for building, not serving.

---

## 3. Day-by-day

Deadline is Sept 16 — **confirm the exact submission hour on the ETHGlobal dashboard on day 4 and write it here: ________.**

| Day | Date | Deliverable | Unlocks |
|---|---|---|---|
| 3 | Sep 6 | Plan locked. Accounts (§4). Engine → `src/engine`. Endpoint→agent resolver. Demo fixture. | — |
| 4 | Sep 7 | Express API, `/openapi.json`, deploy to Railway/Fly. Cross-chain corroboration. | — |
| 5 | Sep 8 | **x402 gate on Hedera via Blocky402. One real paid request. HashScan trail.** HCS receipt topic. | Hedera Agentic |
| 6 | Sep 9 | Reference paying agent (`src/agent`) with a spend cap + refusal on `WASH`. Metered tiers. | Hedera bonus |
| 7 | Sep 10 | **MCP server** (stdio + `/mcp`). Claude Desktop / Cursor config in README. | Graph AI (fresh) |
| 8 | Sep 11 | **Idea B:** `registry/lending.json`, Messari queries, methodology-aware reconcile, `/v1/lending`. Architecture diagram. | Graph Composable |
| 9 | Sep 12 | **Arc:** Nanopayments seller route + buyer. `web/` console (frontend requirement). Privy wallet + policy + quorum. | Arc ×2, Privy B2B (+Flow) |
| 10 | Sep 13 | **World** Selfie Check step-up in `web/` + `docs/FEEDBACK-world.md`. Ledger gate *(only if device)*. | World, Ledger |
| 11 | Sep 14 | **Bazantic** two gateways + two recipes. **Uniswap** quote step + `FEEDBACK.md` + form. **Harness PR.** | Bazantic ×2, Uniswap, Harness |
| 12 | Sep 15 | Videos: ≤5 min (Hedera/Ledger/Arc), 2–4 min (Graph). README final. Clean-clone test. | — |
| 13 | Sep 16 | Submit to every eligible track before the hour above. Bazantic username in submission. | — |

Commit at least once per day. Tag the day's last commit `day-N`.

---

## 4. Day 3 — accounts and forms (you, not Opus)

Do these in this order; each has lead time.

- [x] World Sandbox form — done Sept 6.
- [ ] Email `developers@toolsforhumanity.com`: *"Requesting Selfie Check (Beta) enablement for app_id ____ for ETHOnline 2026 (Selfie Check track)."* Create the app first at `https://developer.world.org` → copy `app_id` and create an action `assay-escalation`.
- [ ] Hedera: `portal.hedera.com` → two **ECDSA** testnet accounts. Save as `HEDERA_AGENT_ACCOUNT_ID/PRIVATE_KEY` and `HEDERA_SERVICE_ACCOUNT_ID/PRIVATE_KEY`. Fund HBAR from the portal.
- [ ] Circle: `faucet.circle.com` → Arc testnet USDC to a fresh EVM key (`ARC_BUYER_PRIVATE_KEY`); a second address for `ARC_SELLER_ADDRESS`. Optionally Hedera-testnet USDC too.
- [ ] Privy: `dashboard.privy.io` → app → `PRIVY_APP_ID`, `PRIVY_APP_SECRET`; create an authorization key (`PRIVY_AUTHORIZATION_KEY`).
- [ ] Railway or Fly account. Decide: ________.
- [ ] Bazantic: account exists. Note your username here: ________.
- [ ] Uniswap developer platform account (`developers.uniswap.org/dashboard`) → API key.
- [ ] **Decision:** own a Ledger device? ☐ yes ☐ no → if no, delete day-10's Ledger line.
- [ ] **Decision:** external non-sponsor API for Bazantic "Agentify" — default **Sourcify** (`https://sourcify.dev/server`, no auth: *is the counterparty's contract verified?*); alternative GoPlus address security. Choose: ________.

Never commit `.env`. Every new secret goes to `.env.example` as an empty key with a comment.

---

## 5. Phases — Opus briefs and acceptance checks

Paste each *Opus brief* into Claude Code from the repo root. Each brief assumes the previous phase's acceptance passed.

### Phase A — engine hardening (day 3, ~3 h)

**Opus brief**
> Read `docs/PLAN.md` §0–§2 and `CLAUDE.md`. Move `src/graph` and `src/score` under `src/engine/` and fix imports; keep `npm run assay` working. Then add three things to the engine, each with a small unit test (node:test, no new test deps):
> 1. `resolveEndpoint(url)` in `src/engine/resolve.ts`: query each healthy chain's `agentRegistrationFiles(where:{ or:[{mcpEndpoint: $url},{webEndpoint:$url},{a2aEndpoint:$url}] })` (check the schema supports `or`; fall back to three queries) and return matching `agentId`s with chain. Normalise URLs (strip trailing slash, lowercase host).
> 2. `corroborate(ownerOrEns)` in `src/engine/corroborate.ts`: for a given owner address, find agents on every healthy chain (`agents(where:{owner:$owner})`), and report chains present, name/ENS consistency, and whether any chain's verdict is WASH. Add a `CROSS_CHAIN_INCONSISTENT` warning finding when names/ENS disagree across chains.
> 3. `fixtures/`: run `assay base:25975 --json`, `ethereum:6888 --json`, `ethereum:14645 --json` and save them under `fixtures/` with the block number in the filename. Add `--fixture <file>` to the CLI so the demo can replay a pinned snapshot if the farm goes quiet. The output must say `source: fixture` loudly.
> Typecheck clean, tests green, commit.

**Acceptance**
- `npm test` green; `npm run assay -- base:25975` still yields `WASH_REPUTATION_DETECTED`.
- `npm run assay -- --resolve https://<some mcpEndpoint from a Base registration>` returns at least one agent.
- Three fixture files exist with block numbers in their names.

### Phase B — HTTP API + deploy (day 4)

**Opus brief**
> Build `src/api/server.ts` with Express 4. Routes (all JSON, all return the full `AssayReport`):
> `GET /v1/check/:chain/:agentId`, `GET /v1/corroborate/:chain/:agentId`, `GET /v1/resolve?url=`, `GET /v1/chains`, `GET /healthz`. Add `GET /openapi.json` generated from a hand-written OpenAPI **3.1** document in `src/api/openapi.ts` (Bazantic requires 3.1; include `servers`, per-route `summary`, `parameters`, and a `Report` schema). Add `GET /v1/preview/:chain/:agentId` that returns only `{verdict, confidence}` — this is the free tier. Add structured request logging and a 10 req/min per-IP limit on free routes. Add `Dockerfile` (node:24-slim, `npm ci --omit=dev`, `npx tsx src/api/server.ts` is fine for the hackathon) and a `railway.json`/`fly.toml` per the choice in §4. Document deploy in README.

**Acceptance**
- `curl https://<public-url>/healthz` → 200 from the hosted service.
- `curl https://<public-url>/v1/check/base/25975 | jq .assessment.verdict` → `"WASH_REPUTATION_DETECTED"`.
- `/openapi.json` validates (use `npx @redocly/cli lint` once, don't add it as a dep).

### Phase C — x402 on Hedera via Blocky402 (day 5) — **the bounty**

**Opus brief**
> Gate the paid routes with x402 using exactly the wiring in `docs/PLAN.md` §1 (Hedera). Facilitator `https://api.testnet.blocky402.com`. Register `hedera:*` with `ExactHederaScheme`. Price tiers in `src/api/x402.ts` as a single table: `preview` free · `check` $0.001 · `resolve` $0.0005 · `corroborate` $0.004 · `lending` $0.002. `payTo` = `HEDERA_SERVICE_ACCOUNT_ID`. Start with **HBAR (`0.0.0`)** so no token association is needed; make USDC (`0.0.429274`) a config switch. On first boot call the facilitator's `/supported` and log the advertised `hedera:testnet` kind and `feePayer`; refuse to start if absent.
> Then write `src/agent/pay.ts`: an x402 client (`@x402/fetch` + `@x402/hedera` client signer from `HEDERA_AGENT_*`) that calls `/v1/check/base/25975`, prints the 402 → payment → 200 sequence, and prints the settlement transaction id and a HashScan link (`https://hashscan.io/testnet/transaction/<id>`). It must **sign only**, never submit.
> Then `src/api/hcs.ts`: on every settled paid call, submit a compact receipt `{type:"assay.receipt.v1", route, payer, amount, asset, settlementTxId, verdict, deployment, block, ts}` to an HCS topic (`HCS_TOPIC_ID`; add `npm run hcs:create-topic`). Failures to write the receipt must not fail the paid response — log and continue.

**Acceptance (record all three on screen — they go in the video)**
- `curl -i https://<url>/v1/check/base/25975` → `HTTP/1.1 402` with `PaymentRequirements` naming `hedera:testnet`.
- `npm run agent:pay` → `200`, verdict printed, HashScan link resolves to a real transfer to the service account.
- The HCS topic on HashScan shows the receipt message.
- README section "Payment flow" written with the exact sequence and the two curl outputs. **Tag `hedera-paid-request`.**

### Phase D — paying agent with a mandate (day 6)

**Opus brief**
> Extend `src/agent/` into a small reference agent that (1) is given a counterparty (`chain:agentId` or an endpoint URL), (2) pays Assay for a check, (3) refuses to proceed on `WASH_REPUTATION_DETECTED`, requires a human step-up on `UNPROVEN` above a configurable spend, and proceeds on `VERIFIED`. The mandate is a JSON file `mandate.json` `{maxSpendUsd, allowedVerdicts, requireStepUpAbove, expiresAt}`. Use `@x402/fetch` lifecycle hooks (`onBeforePaymentCreation`) to enforce `maxSpendUsd` at the payment layer, not just in app logic. Print an **action trail**: intent → evidence bought (what, price, tx) → decision → next action. Add `npm run agent:demo` that runs the three fixture agents in a row.

**Acceptance**
- `npm run agent:demo` shows one refusal (WASH), one step-up request (UNPROVEN), and the hook aborting a payment above the cap.

### Phase E — MCP server (day 7)

**Opus brief**
> Add `src/mcp/server.ts` with `@modelcontextprotocol/sdk` 1.30: tools `assay_check(chain, agentId)`, `assay_resolve(url)`, `assay_corroborate(chain, agentId)`, `assay_chains()`, later `lending_position_safety(...)`. Each tool result is the report as structured content **plus** a short natural-language summary that always ends with the provenance line (`deployment … block …`). Provide two transports: stdio (`npm run mcp`) and Streamable HTTP mounted at `/mcp` on the Express app. Rate-limit `/mcp` like the free routes. Write `docs/MCP.md` with Claude Desktop and Cursor config snippets. Add a `resources` entry exposing `registry/chains.json` read-only.

**Acceptance**
- From Claude Desktop (or `npx @modelcontextprotocol/inspector`), calling `assay_check` on `base 25975` returns the WASH verdict with the deployment hash in the text.
- The README has a "Use from Claude / Cursor" section. This is the Graph AI (From Scratch) submission surface.

### Phase F — Idea B: lending evidence (day 8)

**Opus brief**
> Add `registry/lending.json` with the six Messari deployments from `docs/PLAN.md` §1 (id, network, protocol, schema/subgraph/methodology versions). On load, verify each entry by querying `protocols { id name network schemaVersion subgraphVersion methodologyVersion }` and `_meta`; if the on-chain versions disagree with the registry, log a warning and trust the subgraph. Detect the compound-v3-base duplicate-ID problem by checking `protocols[0].network` and mark the entry `unusable` with a reason if it isn't Base.
> Implement `src/lending/` : `marketSnapshot(source, marketOrAsset)` (Lending/CDP 3.1.0 `markets` — totalValueLockedUSD, totalBorrowBalanceUSD, rates, liquidationThreshold, inputToken), `positionSafety(source, account)` (positions + health), and `reconcile(a, b)` that returns `AGREE | DISAGREE | METHODOLOGY_MISMATCH | SCHEMA_MISMATCH` — comparison is only attempted when `schemaVersion` and `methodologyVersion` match; disagreement beyond a tolerance yields `EVIDENCE_INCONSISTENT` and the API refuses to return a number. Expose `GET /v1/lending/market?asset=USDC&sources=aave-v3-ethereum,aave-v3-base` and `/v1/lending/position`. Add the MCP tool.
> Write `docs/ARCHITECTURE.md` and produce the architecture diagram (Mermaid in the doc **and** a PNG export in `docs/architecture.png` — Arc requires a diagram).

**Acceptance**
- `aave-v3-ethereum` vs `aave-v3-base` → `AGREE`/`DISAGREE` with numbers; `aave-v3-ethereum` vs `compound-v3-ethereum` → `METHODOLOGY_MISMATCH`; anything vs `moonwell-base` → `SCHEMA_MISMATCH`. All live.
- Adding a seventh lending source is a one-line JSON change. Record that moment for the Graph video.

### Phase G — Arc + web console + Privy (day 9)

**Opus brief**
> **Arc:** add `/arc/v1/check/:chain/:agentId` gated by `createGatewayMiddleware({ sellerAddress: ARC_SELLER_ADDRESS }).require("$0.001")` from `@circle-fin/x402-batching/server` (keep the Hedera routes untouched — two rails, one engine). Add `src/agent/pay-arc.ts` using `GatewayClient({ chain: "arcTestnet", privateKey })` → `deposit` → `pay`. Document Arc chain id `5042002` and the USDC-as-gas note in README.
> **Web:** scaffold `web/` (Next.js, App Router, TypeScript). Pages: `/` demo console (enter chain:id or URL → verdict card with findings + provenance, "paid via" badge with HashScan/Arcscan link), `/trail` action trail of the reference agent, `/architecture` rendering the diagram. Read from the hosted API; no mock data anywhere.
> **Privy:** `src/treasury/privy.ts` with `@privy-io/node`: create (or load) an org treasury wallet on Base Sepolia, attach a policy allowing transfers only to `ARC_SELLER_ADDRESS`/service addresses with a per-tx cap, create a key quorum used for "raise the cap" escalations, and perform **one real testnet USDC transfer** through the wallet (`npm run treasury:demo`). Persist wallet/policy/quorum ids in `.env`. Write the "How Privy enables Assay" paragraph in README (B2B: treasury + approval workflow + policy control).

**Acceptance**
- Arc: 402 → paid → 200 on the hosted URL; the batch settlement is visible on `testnet.arcscan.app`.
- `web/` deployed (Vercel is fine) and showing live verdicts.
- Privy: one live transfer hash; policy and quorum ids in the README.

### Phase H — World step-up (+ Ledger if device) (day 10)

**Opus brief**
> In `web/`, add `/escalate`: when the reference agent requests a mandate change (raise cap / add venue / extend expiry), render `IDKitInviteCodeRequestWidget` from `@worldcoin/idkit` with the `selfieCheckLegacy` preset, `environment: "sandbox"`, `app_id` and action `assay-escalation`. `handleVerify` POSTs to `web/app/api/verify-proof` which calls `POST https://developer.world.org/api/v4/verify/{rp_id}` and, on success, writes an approval record the agent polls (`/v1/mandate/:id/approvals` on the API). Frame it as **abuse-prevention / continuity**, not KYC. Keep `docs/FEEDBACK-world.md` open in the editor and log every friction point as you go (docs, portal, sandbox install, invite-code handling, error codes).
> *If a Ledger device is present:* irreversible moves (the treasury transfer above the cap) shell out to `wallet-cli send … ` and wait for device approval; capture the terminal "Review on device" line for the video. Otherwise skip entirely — do not stub it.

**Acceptance**
- A Selfie Check completed in the sandbox app flips an escalation to `approved`, and the agent proceeds. Recorded.
- `docs/FEEDBACK-world.md` has ≥ 8 concrete observations.

### Phase I — Bazantic, Uniswap, Harness PR (day 11)

**Opus brief**
> **Bazantic:** with `@bazantic/cli` add gateway 1 = the Assay API (`--spec-url https://<url>/openapi.json`), gateway 2 = the external API chosen in §4 (write a minimal OpenAPI 3.1 for it under `docs/openapi/`). Create two recipes: (a) *"Pre-flight before paying an agent"* — Assay check → external verification → **Uniswap API quote** for the amount to be paid; (b) *"Is this endpoint safe to pay?"* — resolve → check → external. Test each with `baz grant create` + `baz curl … --max-amount`. Record both screen captures.
> **Uniswap:** the quote step calls the Uniswap Trading API with `UNISWAP_API_KEY`; write `FEEDBACK.md` at repo root (what worked, what didn't, exact doc pages), point README at the exact file/lines, and submit `https://developers.uniswap.org/hackathon-feedback` with the FEEDBACK.md link.
> **Harness:** open one small, real PR against `hedera-dev/hedera-harness` derived from our integration — preferred: extend `doctor` to verify a configured x402 facilitator (`/supported` reachable, `hedera:testnet` advertised, feePayer present) with a `docs/` note; alternative: a validator fix for #41. Include before/after terminal output in the PR body.

**Acceptance**
- Both recipes run end-to-end from a grant; recordings saved under `docs/demo/`.
- `FEEDBACK.md` committed, form submitted (screenshot saved).
- PR URL in README.

### Phase J — videos, README, submission (days 12–13)

Two cuts, scripted in `docs/demo/SCRIPT.md`:
- **≤ 5 min (Hedera / Arc / Ledger / Privy):** problem (30 s: the 309k-review farm) → 402 → paid → 200 with HashScan → HCS receipt → agent refuses WASH → step-up via Selfie Check → Privy policy blocks over-cap → architecture.
- **2–4 min (The Graph):** naive average vs Assay on `base:25975` → MCP tool call from Claude → lending reconcile `METHODOLOGY_MISMATCH` live → add a source by JSON → provenance line.

README must have: one-paragraph pitch, setup from clean clone, architecture (link diagram), payment flow with real outputs, per-sponsor "where to look" table (file:line), Bazantic username, PR link, video links.

**Final acceptance:** on a clean machine or fresh clone, follow README only; every command works. Submit to every track in §6 before the deadline hour.

---

## 6. Submission checklist (tracks and their proof)

| Track | Proof you must have | Where |
|---|---|---|
| Hedera — AI & Agentic Payments | Live Blocky402-settled endpoint; one real paid request; HashScan; ≤5 min video | Phase C, J |
| The Graph — AI (From Scratch) | MCP server, live Graph data, 2–4 min video | Phase E, J |
| The Graph — Composable/Standardized | Messari Lending 3.1.0 across ≥3 sources + Agent0; reconcile; not one subgraph | Phase F |
| Arc — Launch Testnet→Mainnet | Nanopayments route live; frontend+backend; diagram; mainnet-ready note by Sept 30 | Phase G |
| Arc — Agentic Economy | Agent with decision logic that pays over Arc | Phase G |
| Privy — B2B | Wallet + policy + quorum + approval workflow; source | Phase G |
| Privy — Financial flow | One live transfer | Phase G |
| World — Selfie Check | Working step-up in sandbox; feedback doc | Phase H |
| Ledger — AI Agents | Device-confirmed irreversible action *(only with device)* | Phase H |
| Bazantic — Best Recipe | Recipe using Uniswap API + Assay; recording; username | Phase I |
| Bazantic — Agentify | External API gateway + recipe; recording; username | Phase I |
| Uniswap — Stack Contribution | `FEEDBACK.md`, form, README pointers | Phase I |
| Hedera — Harness OSS | Open PR, ≤5 min video of the improvement | Phase I |

Tier C (only if days 8–11 land early): ENSv2 subnames per agent with a Permissioned Resolver holding the mandate hash; Chainlink CRE `handlerInTee` evaluating private mandate thresholds; Chainlink liquidation challenge (`join()` from Sept 8).

---

## 7. Hard rules (copied from sponsor text; each has sunk a finished project)

- Graph: live network data only — no mocks, no static fixtures *in the submitted path* (fixtures are demo backup, labelled).
- Hedera: Blocky402, not x402.org; one real paid request on camera.
- Arc: frontend + backend + diagram, all three.
- Privy: at least one live flow; mocked doesn't count.
- World: feedback doc and sandbox testing are graded.
- Bazantic: username in the submission.
- Uniswap: FEEDBACK.md + form + README line pointers.
- Chainlink: CRE only; Functions/Automation are deprecated.
- Everyone: commit daily; never a single final-day commit.

---

## 8. Risks and the pre-decided response

| Risk | Response |
|---|---|
| Blocky402 testnet down on demo day | Record the paid request the day it first works (Phase C acceptance). Keep the recording. |
| The Base farm stops | `--fixture` replay, labelled `source: fixture`, with the block number on screen. |
| World sandbox / Selfie flag not granted in time | Ship the escalation with the `orbLegacy` preset in sandbox, state plainly in the feedback doc that Selfie Check was requested on Sept 6 and not enabled. Still submit — the feedback doc is graded. |
| No Ledger device | Cut Ledger; move the day to polish. |
| Arc mainnet not open by Sept 30 | "Deployment-ready" qualifies: mainnet config in `registry/`, documented switch. |
| Free-tier host sleeps | Add a 5-min external uptime ping (cron-job.org) from day 4. |
| 8 GB laptop | Build locally, serve remotely; never run web + api + agent + browser at once for the recording — record against the hosted URL. |
