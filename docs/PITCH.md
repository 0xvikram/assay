# Assay — the pitch

Short enough to say out loud. Long enough that a sponsor mentor can tell what to help with.

## One breath

**Before your agent pays another agent, Assay tells it whether that agent's reputation is real —
and after it pays, Assay writes the one kind of reputation that can't be faked.**

## The problem, with a number

ERC-8004 gives AI agents on-chain identity and reviews, so agents can pick trustworthy
counterparties. The #1 agent on Base by review count has **309,734 reviews**. We read them
live through The Graph: **95.5% come from one wallet, every score is identical, all of them
landed in one 24-hour window, zero are backed by a payment.** It's a farm, and today any agent
ranking by reputation would pick it first.

Independent research (arXiv:2606.26028, July 2026, 155k records) found the same thing at
scale: 59–91% of reviewers Sybil-flagged, **98.7–100% of feedback with no proof of payment**,
median cost to manipulate a score **$0.0027**. The paper measured. Two months later nothing
has changed — because measuring isn't the product.

## What Assay does

1. **Read.** `GET /v1/agents/base/25975` → `402` → pay a fraction of a cent over x402 on
   Hedera → `WASH_REPUTATION_DETECTED`, with the evidence and the exact subgraph deployment
   and block it was read at. If the source can't prove where the data came from, Assay refuses
   to answer rather than guess. Same thing as an MCP tool, so your Claude can call it.
2. **Write.** Every x402 payment yields a settlement hash. The paying agent mints ERC-8004
   feedback with `proofOfPayment` filled in — the field that 99% of records leave empty.
   Reviews are free to write, which is why they're worthless; a review that cost real work is
   worth something. That's how a *good* agent earns its way to `VERIFIED`.
3. **Path, not punishment.** Every report ends with what would change the verdict. Minara AI
   has 120 genuine reviewers and still reads `UNPROVEN` — the report says exactly what closes
   the gap: five payment-backed reviews from three independent payers.

The spec agrees this is someone else's job: *"Sybil attacks are possible… we expect many
players to build reputation systems."* And it names *"any off-chain data intelligence
aggregator tagging feedback as spam"* as an intended caller of `appendResponse`.

## What's real today (Sept 8, 09:50)

Working engine, 11 named detectors, live against six mainnet/testnet deployments through
The Graph, CLI. Three live verdicts: the Base farm; a sybil farm with 100 distinct reviewers
that concentration analysis alone would pass; and Minara AI, honest but unproven.

## Next 8 days

Hedera x402 gate via Blocky402 (Sep 10) → the receipt loop closed on base-sepolia (Sep 11) →
MCP with paid tools (Sep 12) → Arc rail + Privy policy wallet (Sep 13) → World Selfie Check as
the step-up when the agent wants a bigger spend cap (Sep 14) → Bazantic, Uniswap, Harness PR
(Sep 15) → submit (Sep 16). One Next.js deployable on Vercel; state lives on HCS.

## What I'd ask a mentor

- **Hedera:** is HBAR-priced x402 through Blocky402 testnet fine for the qualification, or do
  you want USDC on Hedera? Is an HCS receipt topic per paid call the kind of "real HCS use"
  that earns points?
- **The Graph:** does cross-chain composition across six Agent0 deployments with one schema
  meet the Composable bar, or do you want a second schema family (Messari) in the mix?
- **World:** is a Selfie Check as a *spend-cap escalation* (not KYC) the framing you want?
  Selfie Check flag requested for app_id ____ on Sept 8.
- **Anyone:** what's the hardest thing about a good new agent looking identical to a farm?
  Our answer is "payment-backed evidence outranks free evidence" — poke holes in it.
