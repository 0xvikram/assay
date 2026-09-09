# Bazantic — two gateways, two recipes

Bazantic sells API access to agents through **gateways** (an OpenAPI 3.1 document + a paid
endpoint) and **recipes** (chained calls). Both entries below are the *From Scratch* variety:
our own gateway is new to Bazantic and offered by no other sponsor; the second gateway is an
external, non-sponsor API. Grants settle on **Base**.

Prerequisites: `npm i -g @bazantic/cli`, a Bazantic account, and the hosted Assay URL.
**Put the Bazantic username in the ETHGlobal submission** — without it the entry cannot be attributed.

## Status (2026-09-09 — unblocked)

Bazantic asked whether the upstream was live and suggested refreshing the listing or registering a
fresh one. That was the fix: the CLI has no update command, so "refresh" means `gateway add` again.
Both fresh listings route. The old three are dead records — ignore them.

| Gateway | Slug | Status | Upstream |
|---|---|---|---|
| **assay** | `nnv7oxdx5jg45lc6bjj5nid3we` | **active · routing** | `https://assay-dusky.vercel.app` |
| **sourcify** | `vggzoxsifff7jm54ybgwz2bth4` | **active · routing** | `https://sourcify.dev/server` |
| ~~assay~~ | `fjjyd5hmivfipfh4boepxbwptu` | dead (404) | — |
| ~~sourcify~~ | `md2n3ty64rhb3a67bif77ueuhm` | dead, never left draft | — |
| ~~assay~~ | `7btlbq7n6nh3dm36ugrbopkuba` | dead, never left draft | — |

Verified 2026-09-09: both fresh hosts return a well-formed **402** with x402 v2 requirements on real
upstream paths, and `nnv7oxdx5jg45lc6bjj5nid3we/mcp` lists our tools over SSE. Upstream Sourcify is
healthy (`/health`, `/chains`, `/api-docs/openapi.json` all 200; a live `v2/contract/8453/…` lookup
returns `exact_match`), so the earlier 404 was never ours.

**What the gateway charges.** Decoding the `payment-required` header, both gateways bill the *caller*
`10000` units of USDC (**$0.01**) on `eip155:8453` — Base mainnet — to Bazantic's collector
`0x1Cc3cc084D6615972f8d9f0b1E6FEF8D35286B43`, via `WWW-Authenticate: Payment … method="tempo"`.
That is Bazantic's own charge for using the gateway, separate from what our origin charges upstream.

**Two open items, both minor:**
1. `vggzoxsifff7jm54ybgwz2bth4/mcp` still returns 404 while the assay gateway's `/mcp` works. Only
   the REST paths are needed for the recipe, so this does not block the track.
2. `baz curl` reads `x402Version` from the 402 *body*, but x402 v2 carries `PaymentRequired` in the
   `PAYMENT-REQUIRED` header with an empty body — so the CLI cannot parse a compliant v2 402 from
   our origin. Still worth raising; it is a real spec-conformance bug in their client.

**Funding — needs a human.** `baz grant create` prints an approval URL and waits for a browser
confirmation cross-checking the device fingerprint, so it cannot be scripted. The hosted wallet
`0x06e22C1d…0458` holds **20 USDC on Base Sepolia** and **nothing on Base mainnet**, so create the
grant on the testnet network:

```
baz grant create --name agent-1 --cap 5 --network base-sepolia
baz curl https://nnv7oxdx5jg45lc6bjj5nid3we.bazgateway.com/api/v1/preview/base/25975 --account agent-1 --json
```

No ETH is needed on either network: x402 signs an EIP-3009 authorization and the facilitator pays gas.

**Ready on our side:** the routes accept `eip155:84532` (Base Sepolia USDC via x402.org) precisely so
Bazantic's gateway can pay upstream; the local Bazantic wallet `0x06e22C1d…0458` holds 20 test USDC.

## Registered (2026-09-08)

| Gateway | Slug | MCP |
|---|---|---|
| assay | `7btlbq7n6nh3dm36ugrbopkuba` | https://7btlbq7n6nh3dm36ugrbopkuba.bazgateway.com/mcp |
| sourcify | `md2n3ty64rhb3a67bif77ueuhm` | https://md2n3ty64rhb3a67bif77ueuhm.bazgateway.com/mcp |

Bazantic's fetcher rejected Sourcify's own OpenAPI URL, so the gateway's spec is the one-endpoint
subset we serve at `https://assay-dusky.vercel.app/api/openapi/sourcify`; its endpoint is still `sourcify.dev`.

## Gateway 1 — Assay (ours)

```
baz gateway add \
  --name assay \
  --spec-url https://<host>/api/openapi \
  --endpoint https://<host> \
  --status draft --json
```

## Gateway 2 — Sourcify (external, non-sponsor)

Sourcify answers *"is this contract's source verified?"* — the right pre-flight for a counterparty
whose agent wallet is a contract. It publishes its own OpenAPI, so nothing is hand-written:

```
baz gateway add \
  --name sourcify \
  --spec-url https://sourcify.dev/server/api-docs/openapi.json \
  --endpoint https://sourcify.dev/server \
  --status draft --json
```

## Grants

```
baz grant create --name agent-1 --cap 5
```

## Recipe A — "Pre-flight before paying an agent" (Best Recipe; uses the Uniswap API)

1. **Assay** — `GET /api/v1/agents/{chain}/{agentId}` → verdict + provenance.
   Stop on `WASH_REPUTATION_DETECTED`.
2. **Sourcify** — `GET /v2/contract/{chainId}/{agentWallet}` → is the agent's wallet a verified contract?
3. **Uniswap Trading API** — quote the payment amount into the counterparty's asset
   (`POST /v1/quote`, `x-api-key`) so the agent knows exactly what it will spend.

```
baz curl https://<host>/api/v1/agents/base/25975 --account agent-1 --max-amount 0.02 --yes --json
baz curl "https://sourcify.dev/server/v2/contract/8453/0x69747c4ce6185d21a33b3bcdba980d659600ac7b" --account agent-1 --max-amount 0.01 --yes --json
npm run agent:quote -- --chain 8453 --in USDC --out WETH --amount 1000000
```

## Recipe B — "Is this endpoint safe to pay?"

1. **Assay** — `GET /api/v1/resolve?url=…` → which agents claim the endpoint.
2. **Assay** — `GET /api/v1/agents/{chain}/{agentId}` for the top match.
3. **Sourcify** — verified-source check on its wallet.

```
baz curl "https://<host>/api/v1/resolve?url=https://mcp.zyf.ai" --account agent-1 --max-amount 0.02 --yes --json
```

Record both runs as screen captures for the submission.
