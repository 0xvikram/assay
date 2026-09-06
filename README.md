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
