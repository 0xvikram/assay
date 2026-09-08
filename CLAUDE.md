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
- **Gate payments per route handler, never in `middleware.ts`.** Next middleware runs on Edge; the
  Hedera signer needs Node. Every paid handler declares `runtime = "nodejs"` and `maxDuration = 60`.
- **State lives on HCS, not in a database or a module-level `Map`.** The deploy is serverless: receipts,
  mandate changes and approvals are messages on the receipt topic, read back via the mirror node.
- **No Ledger.** That track is cut (no device). Do not add a device gate, real or stubbed.
- **Adding a data source is a registry row** (`registry/*.json`), never a code path.
- Never commit `.env`. Every new secret → `.env.example` with an empty value and a comment.
- Keep the surface honest: if a sponsor feature isn't live, say so in README rather than stub it.

## Stack
Node 24 · TypeScript strict (`verbatimModuleSyntax`, `noUncheckedIndexedAccess`) · ESM ·
`tsx` for the CLI · **Next.js 16 App Router at the repo root is the only server** — UI, paid API and
MCP on one origin, deployed to **Vercel Hobby** · `@x402/next` + `@x402/mcp` for gating ·
`node:test` for tests · no ORM, no database.

## Commands
- `npm run assay -- base:25975` — CLI verdict (add `--json`)
- `npm run typecheck` — must be clean before every commit
- `npm test` — must be green before every commit
- Others are added per phase and documented in README the same commit.

## Conventions
- Small modules. `src/engine/` and `src/lending/` are pure and framework-free — they must never import from `next`. Side effects live in `app/api/`, `src/agent/`, `src/treasury/`, `src/hcs.ts`.
- Named finding codes are `SCREAMING_SNAKE`; verdicts are exactly `VERIFIED | UNPROVEN | WASH_REPUTATION_DETECTED`.
- Errors name the chain and the cause; no swallowed promises.
- Match existing comment density; explain *why* a rule exists, not what the code does.
- One commit per coherent step, message in the imperative, body says what changed and why.
- At the end of each day tag `day-N`. Deadline is Sep 16; the schedule in `docs/PLAN.md` §3 was recalibrated on Sep 8 and is the live one.

## When blocked
Say what's blocked, what was verified, and the smallest next step. Do not invent an
endpoint, address, or version — check `docs/PLAN.md` §1, then the linked docs.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
