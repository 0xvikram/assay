# Uniswap Foundation — developer feedback (Stack Contribution track)

Written while integrating the Trading API as the quote step of Assay's pre-flight recipe.
The integration is `src/agent/quote.ts`; the recipe that uses it is `docs/bazantic/README.md` (Recipe A).

## What we used

- **Base URL and auth:** `https://trade-api.gateway.uniswap.org/v1`, `x-api-key` header — from
  https://developers.uniswap.org/docs/api-reference
- **Quote:** `POST /quote` with `type`, `amount`, `tokenInChainId`, `tokenOutChainId`, `tokenIn`,
  `tokenOut`, `swapper`, `slippageTolerance` — from https://developers.uniswap.org/docs/api-reference/aggregator_quote

## What worked

- The request body is small and obvious; a quote is one call with no SDK.
- `routing` in the response makes it clear when a quote would cross chains (`CHAINED`).

## What didn't, or cost time

1. **Doc URLs redirect twice.** `api-docs.uniswap.org/guides/get-started/quickstart` → 301 →
   `developers.uniswap.org/docs/trading/swapping-api/getting-started` → 303 →
   `…/llms.mdx/docs/…`. Automated fetchers (and AI agents reading docs) stop at the first hop.
   *Ask:* serve the final page at the canonical URL, or make the 303 a 200.
2. **The API reference page is not fetchable as plain text.** `…/llms.mdx/docs/api-reference/aggregator_quote`
   returns 404 while the HTML page exists; we recovered the request shape through a third-party
   docs index. *Ask:* a real `llms.txt` / `.md` mirror for the API reference — agents are your
   customers on this track.
3. **Headers with unclear defaults.** The curl example sends `x-universal-router-version`,
   `x-erc20eth-enabled`, `x-permit2-disabled`. Which are required for a quote-only call is not
   stated. We send only `x-universal-router-version: 2.0`. *Ask:* mark each as required/optional
   with its default.
4. **`slippageTolerance` is "Required" in one page and "Optional" in another** (chained-actions
   guide vs. aggregator reference). *Ask:* reconcile.
5. **Testnet story for quotes.** It is not clear whether `/quote` serves Base Sepolia or Sepolia
   amounts for hackathon-style testing; we quote on Base mainnet addresses with a read-only key and
   never execute. *Ask:* a one-line "testnets supported: …" on the reference page.

## Where it lives in the code

- `src/agent/quote.ts` — request, response handling, the CLI (`npm run agent:quote`)
- `docs/bazantic/README.md` — Recipe A step 3
- README → "Uniswap" section points here

## Live run (2026-09-08, Base mainnet quote, read-only key)

```
npm run agent:quote -- --chain 8453 --in USDC --out WETH --amount 1000000
  routing CLASSIC  request 9f35f007b7455c4e8fdaadaeee51d9e4
  in   1000000 of 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  out  403780917613459 of 0x4200000000000000000000000000000000000006
  gas  0.002449582420687579
```
Time from key creation to first successful quote: under ten minutes once the request shape was known;
most of the preceding hour went to the documentation issues above.
