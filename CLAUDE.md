# Assay — operating instructions for Claude Code

Read `docs/PLAN.md` before doing anything. It has the verified package versions,
endpoints, chain IDs and sponsor rules. Work one phase at a time; each phase ends
with its acceptance check passing and a commit.

## What this is
A paid pre-flight for agent payments: "is this ERC-8004 agent's reputation real?"
Engine reads The Graph (Agent0 + Messari subgraphs), returns a verdict with evidence
and a provenance envelope, sold per query over x402 (Hedera via Blocky402; Arc via
Nanopayments), exposed as REST + MCP. See `docs/PLAN.md` §0 and §2.

## Non-negotiables
- **Live data only.** Never mock a subgraph, a facilitator, or a wallet. Fixtures under
  `fixtures/` are demo backups and must print `source: fixture`.
- **Every answer carries provenance** (`deployment`, `block`, `hasIndexingErrors`,
  `sampleTruncated`, thresholds). A query result without `_meta` is refused, not returned.
- **Confidence is earned only from payment-backed, independent reviews.** Do not soften
  the verdict rules to make demos look nicer. Thresholds live only in `src/engine/score/verdict.ts`.
- **x402 clients sign only; the facilitator submits.** Never call sign-and-execute for payments.
- **Adding a data source is a registry row** (`registry/*.json`), never a code path.
- Never commit `.env`. Every new secret → `.env.example` with an empty value and a comment.
- Keep the surface honest: if a sponsor feature isn't live, say so in README rather than stub it.

## Stack
Node 24 · TypeScript strict (`verbatimModuleSyntax`, `noUncheckedIndexedAccess`) · ESM ·
`tsx` for running · Express 4 for HTTP (matches `@x402/express`) · `node:test` for tests ·
Next.js (App Router) in `web/` · no ORM, no database unless a phase says so.

## Commands
- `npm run assay -- base:25975` — CLI verdict (add `--json`)
- `npm run typecheck` — must be clean before every commit
- `npm test` — must be green before every commit
- Others are added per phase and documented in README the same commit.

## Conventions
- Small modules, pure functions in `src/engine/`, side effects only in `src/api/`, `src/agent/`, `src/treasury/`.
- Named finding codes are `SCREAMING_SNAKE`; verdicts are exactly `VERIFIED | UNPROVEN | WASH_REPUTATION_DETECTED`.
- Errors name the chain and the cause; no swallowed promises.
- Match existing comment density; explain *why* a rule exists, not what the code does.
- One commit per coherent step, message in the imperative, body says what changed and why.
- At the end of each day tag `day-N`.

## When blocked
Say what's blocked, what was verified, and the smallest next step. Do not invent an
endpoint, address, or version — check `docs/PLAN.md` §1, then the linked docs.
