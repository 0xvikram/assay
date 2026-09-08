# Bazantic — two gateways, two recipes

Bazantic sells API access to agents through **gateways** (an OpenAPI 3.1 document + a paid
endpoint) and **recipes** (chained calls). Both entries below are the *From Scratch* variety:
our own gateway is new to Bazantic and offered by no other sponsor; the second gateway is an
external, non-sponsor API. Grants settle on **Base**.

Prerequisites: `npm i -g @bazantic/cli`, a Bazantic account, and the hosted Assay URL.
**Put the Bazantic username in the ETHGlobal submission** — without it the entry cannot be attributed.

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
