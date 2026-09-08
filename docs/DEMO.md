# Demo — two cuts

Record against the hosted URL, never localhost. Capture each step the day it first works;
Vercel logs vanish after an hour and the Base farm may go quiet.

## Cut 1 — ≤ 5 min (Hedera · Arc · Privy · World)

| # | Shot | On screen | Say |
|---|---|---|---|
| 1 | 0:00 | `npm run assay -- base:25975` | "The #1 agent on Base by review count. 309k reviews. 95% from one wallet, one score, one day, zero payment-backed. It's a farm — and any agent ranking by reputation would pick it first." |
| 2 | 0:30 | `npm run assay -- ethereum:14645` | "A hundred distinct reviewers, 97% in one day. Concentration alone would pass this. We don't." |
| 3 | 0:50 | `curl -i …/api/v1/agents/base/25975` → **402** | "Assay sells the verdict. Unpaid: 402. Two rails in one 402 — Hedera through Blocky402, Arc through Circle Gateway." |
| 4 | 1:10 | `npm run agent:pay` → 200 + HashScan link | "The agent signs, the facilitator settles. Here's the transaction. The verdict it paid for. And the mandate's decision: refuse." |
| 5 | 1:50 | HashScan topic page | "Every paid call leaves a receipt on HCS. That topic is our whole database." |
| 6 | 2:10 | `npm run agent:pay -- ethereum:6888 --receipt` | "Minara is honest but unproven. After paying, the agent writes the one review that can't be faked — proofOfPayment with the Hedera settlement — on Base Sepolia." |
| 7 | 2:40 | `npm run assay -- base-sepolia:<assayId>` | "Assay reviewing itself: one payment-backed review. The path to VERIFIED, counted down." |
| 8 | 3:00 | `npm run agent:pay-arc` | "Same purchase, second rail, no gas." |
| 9 | 3:20 | `npm run treasury:demo` | "Privy policy: allowlisted counterparties, capped value, owned by a key quorum. The stranger transfer is refused before anything is signed." |
| 10 | 3:45 | phone: `/escalate` + Selfie Check | "The agent wants a bigger envelope. A live human has to be here. Approval lands on the same ledger." |
| 11 | 4:15 | `/architecture` | "One engine, two doors, one ledger." |
| 12 | 4:40 | README | "Adding a chain is a registry row. Everything is live; nothing is mocked." |

## Cut 2 — 2–4 min (The Graph)

| # | Shot | Say |
|---|---|---|
| 1 | `npm run assay -- base:25975` | the farm, and the **provenance block**: deployment hash, block number, indexing-error flag, sample cap |
| 2 | `registry/chains.json` | "Six Agent0 deployments, one schema. Adding a chain is one row." Add a row live; run against it. |
| 3 | `--corroborate base:25975` | "The same owner across every chain — composed from six subgraphs in one read." |
| 4 | `--resolve https://mcp.zyf.ai` | "Forty agents claim one endpoint. Identity is the agent id, not the URL." |
| 5 | Claude Desktop → `assay_agent` | "Same engine as an MCP tool; the answer ends with the deployment and block, so the model carries provenance along." |
| 6 | `/api/mcp` in Inspector, unpaid → PaymentRequired | "Hosted, the expensive tools cost; discovery is free." |
| 7 | `--fixture` replay | "If the farm goes quiet, the demo replays a pinned snapshot — and says so." |

## Before recording

- [ ] `.env` complete; `npm run build && npm start` clean from a fresh clone
- [ ] Hedera accounts funded; `HCS_TOPIC_ID` set; one paid request already on HashScan
- [ ] Base Sepolia ETH on both EVM keys; `ASSAY_AGENT_ID` set
- [ ] Arc Gateway deposit done once
- [ ] Privy `treasury:setup` run; wallet funded
- [ ] World sandbox app installed on the Android phone; Selfie Check flag granted (or record the step-up with `orbLegacy` and say so)
- [ ] Terminal font large; window 1280×720; no secrets on screen (`.env` never opened on camera)
