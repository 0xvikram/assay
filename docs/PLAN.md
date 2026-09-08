# Assay — Execution & Implementation Plan

**Event:** ETHOnline 2026 · Sept 4–16 · async · solo · starting fresh
**Written:** Sept 6. **Recalibrated Sept 8 — 9 days left including today.** Idea B (lending) is deferred; this plan is the hero project only.
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

It has a write side too, because a punisher alone is a bad product. Reviews are free to
write, which is exactly why they are worthless — a farm wrote 309,734 for pocket change.
A review that carries a settlement hash costs whatever the work cost. So after every
x402 payment, the paying agent mints the one kind of reputation that cannot be faked:
ERC-8004 feedback with `proofOfPayment` filled in. Assay reads reputation to block bad
agents and writes the receipt that lets a good agent earn its way to `VERIFIED`.

**Independent confirmation (arXiv:2606.26028, July 2026):** 155,300 feedback records
studied; 59–91% of reviewers Sybil-flagged per chain; **98.7–100% of records carry no
proof of payment**; median cost to manipulate a score $0.0027. The paper measured and
did not deploy. The #1 agent on Base is still a farm two months later. RNWY
(`rnwy.com`) is a free explorer that scores 0–95; it has no write side and is not
payable at the point of decision.

**Already built (Sept 8):** scoring engine, 11 named detectors, provenance envelope,
chain registry, CLI, `nextSteps` on every report (the path to VERIFIED), and the
attack-victim rule: payment-backed evidence outranks manufactured free reviews. Verified on mainnet: the #1 agent on Base by review count
(309,734 reviews) is a farm — 96.5% single-source, uniform score, 100% in one 24h window.

---

## 1. Verified facts the plan depends on

Everything here was checked Sept 6 and re-verified Sept 8. If any of it drifts, fix the plan, not the code.

### Packages (npm, current versions)
| Package | Version | Used for |
|---|---|---|
| `@x402/next` `@x402/core` `@x402/hedera` `@x402/fetch` | 2.25.0 | x402 route gate + client, Hedera scheme |
| `@x402/mcp` | 2.25.0 | **paid MCP tools** — `createPaymentWrapper`, `x402ResourceServer` |
| `next` `react` | 16.3.4 / 19.2.8 | the single deployable (UI + API + MCP on one origin) |
| `@hiero-ledger/sdk` | latest | Hedera signing, HCS receipts |
| `@modelcontextprotocol/sdk` | 1.30.0 | MCP server (stdio + Streamable HTTP) |
| `@circle-fin/x402-batching` | 3.4.0 | Arc Nanopayments seller + buyer |
| `@worldcoin/idkit` | 4.2.3 | Selfie Check widget |
| `@privy-io/node` | 0.34.0 | Server wallets, policies, key quorum |
| `@bazantic/cli` | 0.8.0 | Gateway + recipe deployment |

### Hedera
- Facilitator (hosted testnet, no API key): `https://api.testnet.blocky402.com` — endpoints `/supported`, `/verify`, `/settle`.
  Mainnet: `https://api.blocky402.com`. **The Hedera track requires Blocky402**, not x402.org.
- Network string: `hedera:testnet`. HBAR asset id `0.0.0` (amounts in tinybars, 1 HBAR = 1e8). No token association needed for HBAR.
- USDC testnet token `0.0.429274` (6 decimals) — needs association on both accounts; fund at faucet.circle.com.
- Accounts: create **two ECDSA** testnet accounts at portal.hedera.com — *agent payer* and *service receiver*.
- Server wiring (verified from the x402 repo):
  ```ts
  import { paymentMiddleware, x402ResourceServer } from "@x402/next";  // per-route, NOT middleware.ts
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
- **Android is the right platform and the docs say so.** Sandbox builds ship through a **private Google Play testing track**: Developer Portal → **World ID Sandbox** in the sidebar → enter the Google account email you use with the Play Store → wait for access to be granted *before* opening the testing link. The browser and the Play Store must be signed into that same account or Play reports the build unavailable.
- Docs, verbatim on the semi-cold journey: *"reliably works on Android today"* — iOS has a known gap where tapping Sign in instead of Sign up strands the invite code. Being on Android removes a known risk.
- The **mini app itself needs no store install**: register the app, then test by scanning `https://worldcoin.org/mini-app?app_id=app_…` (QR generator on the *Testing your mini app* docs page). Public HTTPS URL required — that is the Vercel deploy.
- **Selfie Check is separately feature-flagged.** Docs: *"must be enabled for your app before you can test it… request access through your World point of contact."* Email `developers@toolsforhumanity.com` with your `app_id`. Sandbox-access problems go to `sandbox.access@toolsforhumanity.org`.
- Sandbox covers the full RP journey (handoff → consent → capture → enrollment → match → proof). Out of scope: load testing, production sign-off.
- IDKit: `IDKitInviteCodeRequestWidget` with the `selfieCheckLegacy` preset; set `environment: "sandbox"`.
- Backend verify: `POST https://developer.world.org/api/v4/verify/{rp_id}` — no API key.
- Judged: working app **and** a feedback document covering docs, portal navigation, sandbox testing, issues found.

### x402 over MCP (verified Sept 8 — this changes the architecture)
`@x402/mcp` exists and is first-party. It gates **individual MCP tools** behind payment, so the MCP
surface and the paid API are the *same* artifact rather than two builds:
```ts
import { createPaymentWrapper, x402ResourceServer } from "@x402/mcp";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactHederaScheme } from "@x402/hedera/exact/server";

const resourceServer = new x402ResourceServer(
  new HTTPFacilitatorClient({ url: "https://api.testnet.blocky402.com" }));
resourceServer.register("hedera:testnet", new ExactHederaScheme());
await resourceServer.initialize();
const accepts = await resourceServer.buildPaymentRequirements({
  scheme: "exact", network: "hedera:testnet", payTo: SERVICE_ACCOUNT, price: "$0.05" });
const paid = createPaymentWrapper(resourceServer, { accepts });

mcpServer.tool("assay_agent", "Verify an ERC-8004 agent. Costs $0.05.",
  { ref: z.string() }, paid(async (a) => ({ content: [{ type: "text", text: await report(a.ref) }] })));
mcpServer.tool("assay_thresholds", "Free: current detector thresholds.", {}, free);
```
Free tools stay unwrapped. Paid + free on one server is the honest shape: discovery is free, evidence costs.
Framework adapters live at `x402-foundation/x402 → typescript/packages/http/{next,express,fastify,hono,fetch,axios,paywall}`.

### ERC-8004 Reputation Registry — write side (verified Sept 8 from the EIP)
- `giveFeedback(agentId, value, valueDecimals, tag1, tag2, endpoint, feedbackURI, feedbackHash)` is
  **permissionless**. The only rule: *"The feedback submitter MUST NOT be the agent owner or an
  approved operator."* So the **payer** writes the review, never the service — which is the right shape.
- Off-chain feedback file carries `proofOfPayment: { fromAddress, toAddress, chainId, txHash }` and the
  spec says the payment may be **on another chain**. A Hedera settlement (EVM chain id **296** testnet /
  **295** mainnet) can back feedback written on Base. That is the whole bridge between the two tracks.
- `revokeFeedback(agentId, feedbackIndex)` — only the writing address. An attacked agent cannot delete
  an attacker's reviews; that is why the engine outranks them instead.
- `appendResponse(agentId, clientAddress, feedbackIndex, responseURI, responseHash)` is permissionless
  and the spec names *"any off-chain data intelligence aggregator tagging feedback as spam"* as an
  intended caller. Assay is that caller, described in the standard. (Tier C: tag one farm entry.)
- Demo chain for writes: **base-sepolia** (Agent0 subgraph healthy, gas free). Assay registers itself
  there as an agent so the loop closes on camera: pay Assay → receipt → next read shows paid feedback.

### Privy
- `@privy-io/node`: create a wallet, attach a **policy** (allowlist + spending limit — docs: `controls/policies/example-policies/ethereum`), a **key quorum** for escalation (`controls/key-quorum/create`), optionally **intents** (`transaction-management/intents/create/execute-transfer`).
- B2B track needs: one wallet + one B2B workflow (approval / treasury op) + one control (policy / quorum / intent). Flow track needs one live transfer/swap through a Privy wallet. Mocked features don't count.

### Ledger — **CUT (decided Sept 8)**
No device. `wallet-cli` requires a physical Ledger over USB; no simulator, no Node SDK. There is no
honest way to demo it, and a stubbed device gate is worse than no gate. $3,500 of surface forfeited;
the half-day it would have cost is spent on the Hedera and Graph demos instead. Do not revisit.

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
  step-ups:      World Selfie Check (envelope change — the only step-up; Ledger is cut)
  front door 2:  Bazantic gateway → MCP + recipes (settles on Base)
```

Repository layout (extend the existing flat repo; no monorepo):
```
src/engine/…              (move existing graph/ + score/ here — pure TS, no HTTP, no Next imports)
src/lending/              Idea B: queries, reconcile.ts, registry loader
src/mcp/tools.ts          tool definitions, shared by both transports
src/agent/pay.ts          the reference x402 client that pays Assay end-to-end (runs locally)
bin/assay-mcp.ts          stdio MCP server for Claude Desktop / Cursor (runs on the judge's machine)
registry/                 chains.json, lending.json
app/                      Next.js App Router — ONE deployable, ONE origin
  page.tsx                demo console + action trail
  escalate/page.tsx       World Selfie Check step-up
  architecture/page.tsx   the Arc-required diagram, rendered
  api/v1/agents/[ref]/route.ts     x402-gated (Hedera)
  api/v1/lending/[...]/route.ts    x402-gated (Hedera)
  api/arc/v1/check/route.ts        Arc Nanopayments
  api/mcp/route.ts                 MCP Streamable HTTP, stateless, paid tools via @x402/mcp
  api/openapi/route.ts             OpenAPI 3.1 for Bazantic
  api/verify-proof/route.ts        World backend verify
docs/                     PLAN.md, ARCHITECTURE.md, FEEDBACK-world.md, demo scripts
FEEDBACK.md               Uniswap
```
Every route handler that touches the Hedera SDK declares `export const runtime = "nodejs"`.
Never put the x402 gate in `middleware.ts` — Next middleware runs on the Edge runtime and the Hedera
signer needs Node. Gate per route.

### Hosting — **Vercel Hobby (decided Sept 8)**

The service must be publicly reachable for Hedera ("a live service"), for Bazantic (gateway origin),
for World (the mini app needs a public HTTPS URL) and for the demo. Never a laptop tunnel — the 8 GB
machine builds, it does not serve.

Vercel Hobby wins on the only three axes that matter here:

| | Vercel Hobby | Render free | Fly.io | Railway |
|---|---|---|---|---|
| Actually free | **yes, no card** | yes | no — card + ~$5/mo min | no — trial credit then paid |
| Cold behaviour | ~sub-second serverless start | **sleeps at 15 min, ~50 s wake** | warm | warm |
| Runs the stack natively | **Next.js is the product** | Node | Node | Node |

Render's 50-second wake is disqualifying on its own: a judge opens the link, waits, and leaves.
Vercel also collapses the two deployables into one — the World mini app *must* be Next.js, so putting
the paid API and the MCP endpoint in the same app buys back roughly a day and removes CORS entirely.

Hobby limits that constrain the design (verified Sept 8 against `vercel.com/docs/limits`):
- **Function duration: 10 s default, 60 s max.** Set `export const maxDuration = 60` on any route
  that fans out to several subgraphs, and bound the fan-out — the four-source reconcile must run
  its queries in parallel, never in a loop.
- 4 CPU-hrs active / 360 GB-hrs memory / 1M invocations per month. Nowhere near the ceiling.
- 100 deployments per day. Fine; do not wire a deploy to every commit.
- Runtime logs kept **1 hour** — capture terminal output for the video at the moment it happens.
- Hobby projects cannot link to a **Git-organisation** repo. Keep `assay` under your personal account.
- Serverless means **no in-process state**: MCP over Streamable HTTP must run stateless, and the
  action trail must not live in a module-level `Map`.

**Where state lives — HCS, not a database (decided Sept 8).** Every paid call already writes a receipt
to a Hedera Consensus Service topic. Make that the *only* store: receipts, mandate changes and Selfie
Check approvals are all HCS messages on one topic, read back over the free, unauthenticated mirror
node — verified reachable Sept 8:
```
GET https://testnet.mirrornode.hedera.com/api/v1/topics/{topicId}/messages?limit=100&order=desc
```
No Postgres, no Redis, no extra free tier to sign up for, nothing to expire mid-judging. And the pitch
gets stronger, not weaker: *the action trail is on a public ledger, so you don't have to trust our
database.* Hedera awards points for real HCS use; this is real use. Cache mirror reads for 5 s.

---

## 3. Day-by-day

Deadline is Sept 16 — **confirm the exact submission hour on the ETHGlobal dashboard today and write it here: ________.**

**Recalibrated Sept 8. Nine days remain, today included.** The original table ran from Sept 6; two days
are gone, and cutting Ledger returns about half of one. What follows is the honest compression, not the
old plan with the dates shifted.

| Day | Date | Deliverable | Unlocks |
|---|---|---|---|
| 5 | **Sep 8 (today)** | Accounts and lead-time requests (§4) **first**. Then Phase A: engine → `src/engine`, endpoint→agent resolver, cross-chain corroboration, pinned fixtures. | — |
| 6 | Sep 9 | Phase B: Next.js app, deployed to Vercel, live URL, `/api/openapi`, unpaid `/api/v1/agents/[ref]` returning the verdict + provenance. | — |
| 7 | Sep 10 | **Phase C: x402 gate on Hedera via Blocky402. One real paid request. HashScan. HCS receipt topic.** | **Hedera Agentic** |
| 8 | Sep 11 | Phase D: reference paying agent with a spend cap + refusal on `WASH`; metered tiers; **the receipt** — payment-backed feedback written to base-sepolia, loop closed on camera. | Hedera bonus |
| 9 | Sep 12 | Phase E: MCP — `bin/assay-mcp.ts` (stdio) and `/api/mcp` with `@x402/mcp` paid tools. `docs/ARCHITECTURE.md` + rendered diagram page. | Graph AI (fresh), Graph Composable (cross-chain) |
| 10 | Sep 13 | Phase G: Arc Nanopayments route + buyer; Privy wallet + policy + key quorum + one live transfer. | Arc ×2, Privy ×2 |
| 11 | Sep 14 | Phase H: World Selfie Check step-up + `docs/FEEDBACK-world.md`. | World |
| 12 | Sep 15 | Phase I: Bazantic two gateways + two recipes; Uniswap quote + `FEEDBACK.md` + form; Harness PR. Then both videos. | Bazantic ×2, Uniswap, Harness |
| 13 | Sep 16 | Buffer. README, clean-clone test, submit to every eligible track before the hour above. Bazantic username in the submission. | — |

**If a day slips, drop in this order** — decide once, now, so you never spend a day deliberating:
Tier C (ENS, Chainlink) → Bazantic *Agentify* (keep *Best Recipe*) → Arc *DeFi* → Privy *Financial flow*.
**Never drop, at any cost:** Phase C (Hedera), Phase D's receipt, Phase E (MCP). Those are the bounty you
said you came for, and they are the only ones with no substitute. Idea B is deferred, not dropped: if
Sep 13–15 land early it returns as the strongest possible Graph Composable entry.

Commit at least once per day. Tag the day's last commit `day-N`.

---

## 4. Today (Sep 8) — accounts and forms (you, not Opus)

Do these before writing code; each has lead time and none of it is parallelisable later.

- [x] World Sandbox form — submitted Sept 6.
- [ ] **World, Android track:** Developer Portal → **World ID Sandbox** → Android → submit the Google account you use with the Play Store → wait for access *before* opening the testing link. Sign the browser and the Play Store into that same account.
- [ ] Email `developers@toolsforhumanity.com`: *"Requesting Selfie Check (Beta) enablement for app_id ____ for ETHOnline 2026 (Selfie Check track)."* Create the app first at `https://developer.world.org` → copy `app_id` and create an action `assay-escalation`.
- [ ] Hedera: `portal.hedera.com` → two **ECDSA** testnet accounts. Save as `HEDERA_AGENT_ACCOUNT_ID/PRIVATE_KEY` and `HEDERA_SERVICE_ACCOUNT_ID/PRIVATE_KEY`. Fund HBAR from the portal.
- [ ] Circle: `faucet.circle.com` → Arc testnet USDC to a fresh EVM key (`ARC_BUYER_PRIVATE_KEY`); a second address for `ARC_SELLER_ADDRESS`. Optionally Hedera-testnet USDC too.
- [ ] Privy: `dashboard.privy.io` → app → `PRIVY_APP_ID`, `PRIVY_APP_SECRET`; create an authorization key (`PRIVY_AUTHORIZATION_KEY`).
- [x] Hosting: **Vercel Hobby** — decided Sept 8. Sign in with GitHub, keep `assay` on your personal account (Hobby cannot link Git-org repos). No card.
- [ ] Bazantic: account exists. Note your username here: ________.
- [ ] Uniswap developer platform account (`developers.uniswap.org/dashboard`) → API key.
- [x] **Decision:** external non-sponsor API for Bazantic "Agentify" — **Sourcify** (decided Sep 8). It publishes OpenAPI at `https://sourcify.dev/server/api-docs/openapi.json` (verified 200), so `baz gateway add --spec-url` can ingest it directly — no hand-written spec. Recipe question: *is the counterparty's contract verified?* (`GET /v2/contract/{chainId}/{address}`).

Never commit `.env`. Every new secret goes to `.env.example` as an empty key with a comment.

---

## 5. Phases — Opus briefs and acceptance checks

Paste each *Opus brief* into Claude Code from the repo root. Each brief assumes the previous phase's acceptance passed.

### Phase A — engine hardening (Sep 8, ~3 h) — ✅ done Sep 8 10:07, `8f58caa`

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

### Phase B — Next.js app + Vercel deploy (Sep 9) — ✅ code Sep 8 `5c731e5`; ⏳ hosted URL (Vercel import)

**Opus brief**
> Add Next.js 16 (App Router, TypeScript) **in this repo, at the root** — one deployable, per §2. `npx create-next-app` into a temp dir and merge, or hand-write `app/` and add `next react react-dom`; do not create a `web/` subfolder and do not touch `src/engine`, which stays framework-free and importable from route handlers via the `@/` alias.
> Route handlers, all JSON, all returning the full `AssayReport`, every one declaring `export const runtime = "nodejs"` and `export const maxDuration = 60`:
> `GET /api/v1/agents/[chain]/[agentId]`, `GET /api/v1/corroborate/[chain]/[agentId]`, `GET /api/v1/resolve?url=`, `GET /api/v1/chains`, `GET /api/healthz`, and `GET /api/v1/preview/[chain]/[agentId]` returning only `{verdict, confidence}` — the free tier.
> `GET /api/openapi` serves a hand-written OpenAPI **3.1** document from `src/openapi.ts` (Bazantic requires 3.1: include `servers`, per-route `summary`, `parameters`, a `Report` schema). Structured request logging; a 10 req/min per-IP limit on free routes only.
> Deploy: `npx vercel --prod` from the repo root, linked to your **personal** GitHub account (Hobby cannot link Git-org repos). Put `GRAPH_API_KEY` in Vercel project env, not in the repo. Record the production URL in README and in `.env.example` as `PUBLIC_BASE_URL`.
> No `Dockerfile`, no `fly.toml`, no `railway.json` — that decision is closed.

**Acceptance**
- `curl https://<vercel-url>/api/healthz` → 200 from the hosted deployment, not localhost.
- `curl https://<vercel-url>/api/v1/agents/base/25975 | jq .assessment.verdict` → `"WASH_REPUTATION_DETECTED"`.
- `/api/openapi` validates (`npx @redocly/cli lint` once; don't add it as a dep).
- A cold request (first after ≥15 min idle) returns in under 3 s. If it doesn't, the fan-out is serial — fix it now, not on Sep 12.

### Phase C — x402 on Hedera via Blocky402 (Sep 10) — **the bounty** — ✅ code + live 402 Sep 8 `1ced8f4`; ⏳ paid request (Hedera accounts)

**Opus brief**
> Gate the paid route handlers with `@x402/next` using exactly the wiring in §1 (Hedera). **Per route — never `middleware.ts`**, which runs on Edge where the Hedera signer cannot. Facilitator `https://api.testnet.blocky402.com`. Register `hedera:*` with `ExactHederaScheme`. Price tiers in `src/x402.ts` as a single table: `preview` free · `agents` $0.001 · `resolve` $0.0005 · `corroborate` $0.004 · `lending` $0.002. `payTo` = `HEDERA_SERVICE_ACCOUNT_ID`. Start with **HBAR (`0.0.0`)** so no token association is needed; make USDC (`0.0.429274`) a config switch. On cold start call the facilitator's `/supported`, log the advertised `hedera:testnet` kind and `feePayer`, and **fail the request with 503** if absent — on serverless there is no boot to refuse. Cache that check for 60 s.
> Then write `src/agent/pay.ts`: an x402 client (`@x402/fetch` + `@x402/hedera` client signer from `HEDERA_AGENT_*`) that calls `/api/v1/agents/base/25975`, prints the 402 → payment → 200 sequence, and prints the settlement transaction id and a HashScan link (`https://hashscan.io/testnet/transaction/<id>`). It must **sign only**, never submit.
> Then `src/hcs.ts`: on every settled paid call, submit a compact receipt `{type:"assay.receipt.v1", route, payer, amount, asset, settlementTxId, verdict, deployment, block, ts}` to an HCS topic (`HCS_TOPIC_ID`; add `npm run hcs:create-topic`). Failures to write the receipt must not fail the paid response — log and continue.

**Acceptance (record all three on screen — they go in the video)**
- `curl -i https://<vercel-url>/api/v1/agents/base/25975` → `HTTP/1.1 402` with `PaymentRequirements` naming `hedera:testnet`.
- `npm run agent:pay` → `200`, verdict printed, HashScan link resolves to a real transfer to the service account.
- The HCS topic on HashScan shows the receipt message.
- README section "Payment flow" written with the exact sequence and the two curl outputs. **Tag `hedera-paid-request`.**

### Phase D — paying agent with a mandate (Sep 11 am) — ✅ code Sep 8 `7a2def2`; ⏳ live receipt (Base Sepolia ETH)

**Opus brief**
> Extend `src/agent/` into a small reference agent that (1) is given a counterparty (`chain:agentId` or an endpoint URL), (2) pays Assay for a check, (3) refuses to proceed on `WASH_REPUTATION_DETECTED`, requires a human step-up on `UNPROVEN` above a configurable spend, and proceeds on `VERIFIED`. The mandate is a JSON file `mandate.json` `{maxSpendUsd, allowedVerdicts, requireStepUpAbove, expiresAt}`. Use `@x402/fetch` lifecycle hooks (`onBeforePaymentCreation`) to enforce `maxSpendUsd` at the payment layer, not just in app logic. Print an **action trail**: intent → evidence bought (what, price, tx) → decision → next action. Add `npm run agent:demo` that runs the three fixture agents in a row.
> **Write side (the receipt).** `src/agent/receipt.ts`: after any successful x402 payment, the paying agent writes ERC-8004 feedback about the provider it paid — `giveFeedback` on the Reputation Registry on **base-sepolia** (`viem`, `AGENT_EVM_PRIVATE_KEY`), `feedbackURI` pointing at `/api/feedback/[id]` on our host, whose JSON includes `proofOfPayment: { fromAddress, toAddress, chainId: 296, txHash: <hedera settlement> }`. Register Assay itself as an agent on base-sepolia (`npm run register:self`, once) so the reference agent reviews *Assay* after paying it. Then run `assay base-sepolia:<assayId>` — the paid review is visible with `proofOfPaymentTxHash` set, and `nextSteps` counts down. Record that; it is the "what about good agents" answer on camera.

**Acceptance**
- `npm run agent:demo` shows one refusal (WASH), one step-up request (UNPROVEN), and the hook aborting a payment above the cap.
- After `npm run agent:pay`, `npm run assay -- base-sepolia:<assayId>` shows ≥1 review with a payment proof pointing at the HashScan transaction. **Tag `receipt-loop-closed`.**

### Phase E — MCP server, paid tools (Sep 11 pm) — ✅ Sep 8 `ae2207d`, both transports smoke-tested

**Opus brief**
> Add `src/mcp/tools.ts` with `@modelcontextprotocol/sdk` 1.30: tools `assay_check(chain, agentId)`, `assay_resolve(url)`, `assay_corroborate(chain, agentId)`, `assay_chains()`, later `lending_position_safety(...)`. Each tool result is the report as structured content **plus** a short natural-language summary that always ends with the provenance line (`deployment … block …`). Share the tool definitions from `src/mcp/tools.ts` across two transports:
> 1. **stdio** — `bin/assay-mcp.ts`, run by the judge on their own machine (`npm run mcp`). Free tools only; it calls the hosted API.
> 2. **Streamable HTTP** at `app/api/mcp/route.ts`, **stateless** (`sessionIdGenerator: undefined`) because Vercel has no persistent process. Here, gate the expensive tools with `@x402/mcp` per §1: `assay_agent` and `lending_position_safety` wrapped in `createPaymentWrapper(...)` at $0.05 and $0.02; `assay_chains`, `assay_thresholds` and `assay_resolve` free and unwrapped. This is one artifact serving two tracks — a paid MCP tool is simultaneously the Hedera "service worth paying for" and the Graph AI tooling surface.
> Rate-limit the free HTTP tools like the free routes. Write `docs/MCP.md` with Claude Desktop and Cursor config snippets. Add a `resources` entry exposing `registry/chains.json` read-only.

**Acceptance**
- From Claude Desktop (or `npx @modelcontextprotocol/inspector`), calling `assay_check` on `base 25975` returns the WASH verdict with the deployment hash in the text.
- `npx @modelcontextprotocol/inspector` against `https://<vercel-url>/api/mcp` lists the tools, and calling `assay_agent` **without payment returns a 402-shaped error**; the reference agent from Phase D calls it and pays. Record this — it is the strongest single shot in the Hedera video.
- The README has a "Use from Claude / Cursor" section. This is the Graph AI (From Scratch) submission surface.

### Phase F — DEFERRED (Idea B: lending evidence). Do not start until A–E, G–J are done.

**Opus brief**
> Add `registry/lending.json` with the six Messari deployments from `docs/PLAN.md` §1 (id, network, protocol, schema/subgraph/methodology versions). On load, verify each entry by querying `protocols { id name network schemaVersion subgraphVersion methodologyVersion }` and `_meta`; if the on-chain versions disagree with the registry, log a warning and trust the subgraph. Detect the compound-v3-base duplicate-ID problem by checking `protocols[0].network` and mark the entry `unusable` with a reason if it isn't Base.
> Implement `src/lending/` : `marketSnapshot(source, marketOrAsset)` (Lending/CDP 3.1.0 `markets` — totalValueLockedUSD, totalBorrowBalanceUSD, rates, liquidationThreshold, inputToken), `positionSafety(source, account)` (positions + health), and `reconcile(a, b)` that returns `AGREE | DISAGREE | METHODOLOGY_MISMATCH | SCHEMA_MISMATCH` — comparison is only attempted when `schemaVersion` and `methodologyVersion` match; disagreement beyond a tolerance yields `EVIDENCE_INCONSISTENT` and the API refuses to return a number. Expose `GET /api/v1/lending/market?asset=USDC&sources=aave-v3-ethereum,aave-v3-base` and `/api/v1/lending/position`. Add the MCP tool.
> Write `docs/ARCHITECTURE.md` and produce the architecture diagram (Mermaid in the doc **and** a PNG export in `docs/architecture.png` — Arc requires a diagram).

**Acceptance**
- `aave-v3-ethereum` vs `aave-v3-base` → `AGREE`/`DISAGREE` with numbers; `aave-v3-ethereum` vs `compound-v3-ethereum` → `METHODOLOGY_MISMATCH`; anything vs `moonwell-base` → `SCHEMA_MISMATCH`. All live.
- Adding a seventh lending source is a one-line JSON change. Record that moment for the Graph video.

### Phase G — Arc + console + Privy (Sep 13) — ✅ Arc rail + console Sep 8; ⏳ Arc live payment (faucet USDC); ⏳ Privy (app credentials)

**Opus brief**
> **Arc:** add `app/api/arc/v1/check/[chain]/[agentId]/route.ts` gated by `createGatewayMiddleware({ sellerAddress: ARC_SELLER_ADDRESS }).require("$0.001")` from `@circle-fin/x402-batching/server` (keep the Hedera routes untouched — two rails, one engine). Add `src/agent/pay-arc.ts` using `GatewayClient({ chain: "arcTestnet", privateKey })` → `deposit` → `pay`. Document Arc chain id `5042002` and the USDC-as-gas note in README.
> **Console:** the Next app already exists from Phase B — now add the pages Arc requires (frontend **and** backend **and** a diagram, all three): `/` demo console (enter `chain:id` or a URL → verdict card with findings + provenance, "paid via" badge linking to HashScan/Arcscan), `/trail` reading the action trail from the **HCS mirror node**, `/architecture` rendering `docs/ARCHITECTURE.md`'s diagram as a real page. Server components call `src/engine` directly; no mock data anywhere.
> **Privy:** `src/treasury/privy.ts` with `@privy-io/node`: create (or load) an org treasury wallet on Base Sepolia, attach a policy allowing transfers only to `ARC_SELLER_ADDRESS`/service addresses with a per-tx cap, create a key quorum used for "raise the cap" escalations, and perform **one real testnet USDC transfer** through the wallet (`npm run treasury:demo`). Persist wallet/policy/quorum ids in `.env`. Write the "How Privy enables Assay" paragraph in README (B2B: treasury + approval workflow + policy control).

**Acceptance**
- Arc: 402 → paid → 200 on the hosted URL; the batch settlement is visible on `testnet.arcscan.app`.
- The three pages are live on the Vercel URL and showing live verdicts; `/architecture` is linkable for the Arc submission.
- Privy: one live transfer hash; policy and quorum ids in the README.

### Phase H — World step-up (Sep 14) — ✅ code Sep 8 `f4cd9e3`; ⏳ live (sandbox + Selfie flag)

**Opus brief**
> Add `app/escalate/page.tsx`: when the reference agent requests a mandate change (raise cap / add venue / extend expiry), render `IDKitInviteCodeRequestWidget` from `@worldcoin/idkit` with the `selfieCheckLegacy` preset, `environment: "sandbox"`, `app_id` and action `assay-escalation`. `handleVerify` POSTs to `app/api/verify-proof/route.ts` which calls `POST https://developer.world.org/api/v4/verify/{rp_id}` and, on success, writes an approval record the agent polls (`/api/v1/mandate/[id]/approvals`). Frame it as **abuse-prevention / continuity**, not KYC. Keep `docs/FEEDBACK-world.md` open in the editor and log every friction point as you go (docs, portal, sandbox install, invite-code handling, error codes).
> Persist the approval as an **HCS message on the receipt topic**, not in memory — the API is serverless. The agent polls `/api/v1/mandate/:id/approvals`, which reads the mirror node. Test on Android: register the app, then scan `https://worldcoin.org/mini-app?app_id=app_…`. There is no Ledger tier — irreversible moves are gated by the Privy key quorum from Phase G instead, which is a real control and is demoable.

**Acceptance**
- A Selfie Check completed in the sandbox app flips an escalation to `approved`, and the agent proceeds. Recorded.
- `docs/FEEDBACK-world.md` has ≥ 8 concrete observations.

### Phase I — Bazantic, Uniswap, Harness PR (Sep 15) — ✅ code + docs Sep 8 `331c765`; Harness branch on fork `0xvikram/hedera-harness:doctor-x402-facilitator`; ⏳ PR (your word), Bazantic account, Uniswap key

**Opus brief**
> **Bazantic:** with `@bazantic/cli` add gateway 1 = the Assay API (`--spec-url https://<url>/openapi.json`), gateway 2 = the external API chosen in §4 (write a minimal OpenAPI 3.1 for it under `docs/openapi/`). Create two recipes: (a) *"Pre-flight before paying an agent"* — Assay check → external verification → **Uniswap API quote** for the amount to be paid; (b) *"Is this endpoint safe to pay?"* — resolve → check → external. Test each with `baz grant create` + `baz curl … --max-amount`. Record both screen captures.
> **Uniswap:** the quote step calls the Uniswap Trading API with `UNISWAP_API_KEY`; write `FEEDBACK.md` at repo root (what worked, what didn't, exact doc pages), point README at the exact file/lines, and submit `https://developers.uniswap.org/hackathon-feedback` with the FEEDBACK.md link.
> **Harness:** open one small, real PR against `hedera-dev/hedera-harness` derived from our integration — preferred: extend `doctor` to verify a configured x402 facilitator (`/supported` reachable, `hedera:testnet` advertised, feePayer present) with a `docs/` note; alternative: a validator fix for #41. Include before/after terminal output in the PR body.

**Acceptance**
- Both recipes run end-to-end from a grant; recordings saved under `docs/demo/`.
- `FEEDBACK.md` committed, form submitted (screenshot saved).
- PR URL in README.

### Phase J — videos, README, submission (Sep 15 pm – 16) — shot lists in `docs/DEMO.md`

Two cuts, scripted in `docs/demo/SCRIPT.md`:
- **≤ 5 min (Hedera / Arc / Privy):** problem (30 s: the 309k-review farm) → 402 → paid → 200 with HashScan → HCS receipt → agent refuses WASH → step-up via Selfie Check → Privy policy blocks over-cap → architecture.
- **2–4 min (The Graph):** naive average vs Assay on `base:25975` → MCP tool call from Claude → lending reconcile `METHODOLOGY_MISMATCH` live → add a source by JSON → provenance line.

README must have: one-paragraph pitch, setup from clean clone, architecture (link diagram), payment flow with real outputs, per-sponsor "where to look" table (file:line), Bazantic username, PR link, video links.

**Final acceptance:** on a clean machine or fresh clone, follow README only; every command works. Submit to every track in §6 before the deadline hour.

---

## 6. Submission checklist (tracks and their proof)

| Track | Proof you must have | Where |
|---|---|---|
| Hedera — AI & Agentic Payments | Live Blocky402-settled endpoint; one real paid request; HashScan; ≤5 min video | Phase C, J |
| The Graph — AI (From Scratch) | MCP server, live Graph data, 2–4 min video | Phase E, J |
| The Graph — Composable/Standardized | Six Agent0 deployments, one schema, cross-chain `corroborate()` + `CROSS_CHAIN_INCONSISTENT`; a chain is a registry row. Weaker than Messari; Phase F upgrades it if time allows | Phase A, E |
| Arc — Launch Testnet→Mainnet | Nanopayments route live; frontend+backend; diagram; mainnet-ready note by Sept 30 | Phase G |
| Arc — Agentic Economy | Agent with decision logic that pays over Arc | Phase G |
| Privy — B2B | Wallet + policy + quorum + approval workflow; source | Phase G |
| Privy — Financial flow | One live transfer | Phase G |
| World — Selfie Check | Working step-up in the Android sandbox; feedback doc | Phase H |
| Bazantic — Best Recipe | Recipe using Uniswap API + Assay; recording; username | Phase I |
| Bazantic — Agentify | External API gateway + recipe; recording; username | Phase I |
| Uniswap — Stack Contribution | `FEEDBACK.md`, form, README pointers | Phase I |
| Hedera — Harness OSS | Open PR, ≤5 min video of the improvement | Phase I |

Tier C (only if Sep 13–15 land early — and Phase F first): ENSv2 subnames per agent with a Permissioned Resolver holding the mandate hash; Chainlink CRE `handlerInTee` evaluating private mandate thresholds; Chainlink liquidation challenge (`join()` from Sept 8).

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
| World sandbox / Selfie flag not granted in time | Ship the escalation with the `orbLegacy` preset in sandbox; state plainly in the feedback doc the dates you requested Sandbox (Sept 6) and the Selfie Check flag, and that it was not enabled in time. Still submit — the feedback doc is graded, and "we asked on these dates and heard nothing" is itself the most useful feedback they will receive. |
| ~~No Ledger device~~ | **Resolved Sept 8: cut.** No device, no simulator, no honest demo. Do not revisit. |
| Arc mainnet not open by Sept 30 | "Deployment-ready" qualifies: mainnet config in `registry/`, documented switch. |
| Vercel 10 s function timeout on a multi-source reconcile | `export const maxDuration = 60` and fan out the subgraph queries with `Promise.all`, never a loop. Test the four-source path against the deployed URL, not locally, before Sep 12 ends. |
| Vercel runtime logs expire after 1 hour | Capture terminal and HashScan output the moment a thing first works — the Phase C acceptance recording is the artifact, not the log. |
| Two days already lost (Sept 6–7) | Absorbed by cutting Ledger and by collapsing API + web into one Next.js deployable. If Sep 10 ends without a paid Hedera request, stop adding tracks and spend Sep 11 finishing it — it is the one bounty you named. |
| 8 GB laptop | Build locally, serve remotely; never run web + api + agent + browser at once for the recording — record against the hosted URL. |
