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

_(to be extended with the live-key run: request id, response excerpt, time-to-first-quote)_
