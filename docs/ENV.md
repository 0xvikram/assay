# Getting every `.env` value

Work top to bottom. **You** obtain the values in §1; scripts produce the ones in §2; §3 has
sensible defaults and can stay empty. Never paste a private key anywhere but `.env`
(gitignored — confirmed with `git ls-files | grep .env` → nothing).

Already set: `GRAPH_API_KEY`, `SERVICE_EVM_PRIVATE_KEY`, `AGENT_EVM_PRIVATE_KEY`.

---

## §1 — values you obtain (in this order)

### 1. `PUBLIC_BASE_URL` — Vercel (5 min)
1. https://vercel.com/new → **Import Git Repository** → pick `0xvikram/assay` (personal account, not an org).
2. Framework preset auto-detects Next.js. Leave build settings alone.
3. **Environment Variables** → add `GRAPH_API_KEY` = the value from your local `.env`.
4. **Deploy**. When it finishes, copy the production URL.
```
PUBLIC_BASE_URL=https://assay-xxxx.vercel.app
```
Later, every other secret you add locally must also be added in Vercel → Project → Settings →
Environment Variables (same names). Redeploy after adding.

### 2. Hedera — two ECDSA testnet accounts (10 min)
1. https://portal.hedera.com → sign in → **Testnet**.
2. **Create account** → key type **ECDSA** (not ED25519). Copy **Account ID** (`0.0.xxxxxxx`) and the
   **DER/HEX encoded private key** — use the **hex** one, `0x…`, 64 hex chars after `0x`.
3. Repeat for a second account. The portal funds each with testnet HBAR; if a balance shows 0, use the
   portal's faucet button.
```
HEDERA_SERVICE_ACCOUNT_ID=0.0.xxxxxxx      # first account — receives payments
HEDERA_SERVICE_PRIVATE_KEY=0x…
HEDERA_AGENT_ACCOUNT_ID=0.0.yyyyyyy        # second account — pays
HEDERA_AGENT_PRIVATE_KEY=0x…
```

### 3. Base Sepolia ETH on the two EVM keys (5 min)
Your two keys already exist in `.env`. Their addresses:
```
service  0xDe6B1Fe6114c4406Bf0E14bdadA5593A717F68Fe
agent    0xE927352a95CE00AB33344640F31570d7c06EC040
```
1. Any Base Sepolia faucet — https://www.alchemy.com/faucets/base-sepolia or
   https://portal.cdp.coinbase.com/products/faucet (Coinbase) or https://faucet.quicknode.com/base/sepolia.
2. Send to **both** addresses. ~0.05 ETH each is plenty.
Nothing to paste — the keys are already in the file.

### 4. Arc testnet USDC on the agent key (5 min)
1. https://faucet.circle.com → network **Arc Testnet** → address `0xE927352a95CE00AB33344640F31570d7c06EC040`.
2. Request twice if it allows (USDC is also the gas token on Arc).
Nothing to paste.

### 5. Privy app (5 min)
1. https://dashboard.privy.io → **Create app** → name `Assay` → type *Server / backend*.
2. **App settings → Basics**: copy **App ID**.
3. **App settings → Basics → App secret** → generate/reveal → copy.
```
PRIVY_APP_ID=…
PRIVY_APP_SECRET=…
```

### 6. Uniswap API key (3 min)
1. https://developers.uniswap.org/dashboard → sign in → **Create API key** (Trading API).
```
UNISWAP_API_KEY=…
```

### 7. World — app, RP, action, sandbox (15 min, has lead time)
1. https://developer.world.org → sign in → create a **team** if asked → **Create app** → name `Assay`.
2. Copy the **App ID** (`app_…`).
3. **World ID → Relying Party**: configure/create → copy **RP ID** (`rp_…`) and the **signing key
   private key** — shown **once**. Put it straight into `.env`.
4. **Actions** → create `assay-escalation` with environment **sandbox** (must match `NEXT_PUBLIC_WLD_ENVIRONMENT`).
5. Sidebar **World ID Sandbox** → **Android** → enter the Google account you use with the Play Store →
   request. Wait for the grant before opening the Play testing link (browser and Play Store must be
   signed into that same account).
6. Email `developers@toolsforhumanity.com`: *"Requesting Selfie Check (Beta) enablement for app_id ____ for
   ETHOnline 2026 (Selfie Check track)."*
```
NEXT_PUBLIC_WLD_APP_ID=app_…
NEXT_PUBLIC_WLD_RP_ID=rp_…
NEXT_PUBLIC_WLD_ACTION=assay-escalation
NEXT_PUBLIC_WLD_ENVIRONMENT=sandbox
RP_SIGNING_KEY=…
```

### 8. Bazantic (5 min)
1. Create an account on Bazantic; note the **username** — it goes in the ETHGlobal submission.
2. `npm i -g @bazantic/cli` → `baz login`.
No `.env` value; the CLI stores its own session.

---

## §2 — values scripts produce (run in this order, after §1)

```
npm run hcs:create-topic        → HCS_TOPIC_ID=0.0.zzzzzzz
npm run register:self           → ASSAY_AGENT_ID=<number>         (needs PUBLIC_BASE_URL + Base Sepolia ETH on service key)
npm run treasury:setup          → PRIVY_WALLET_ID, PRIVY_POLICY_ID, PRIVY_QUORUM_ID,
                                  PRIVY_AUTHORIZATION_PUBLIC_KEY, PRIVY_AUTHORIZATION_PRIVATE_KEY
```
Each prints the exact lines to paste. Then fund the Privy wallet address it prints with Base Sepolia ETH.

---

## §3 — defaults; leave empty unless you know why

```
X402_FACILITATOR_URL=      HEDERA_MIRROR_URL=      X402_ASSET=            BASE_SEPOLIA_RPC_URL=
IPFS_API_URL=              ARC_SELLER_ADDRESS  ← **must be set on the host**: without it (or SERVICE_EVM_PRIVATE_KEY) the 402 silently drops the Arc and Base Sepolia rails and advertises Hedera only=     ARC_GATEWAY_URL=       INTENDED_SPEND=
TREASURY_ALLOWLIST=        UNISWAP_API_URL=        SERVICE_EVM_ADDRESS=
```

---

## Then, in this order (I run these; each one gets recorded)

1. `npm run agent:pay` — first real paid request → HashScan link → **tag `hedera-paid-request`**
2. `npm run agent:pay -- ethereum:6888 --receipt` → `npm run assay -- base-sepolia:$ASSAY_AGENT_ID` — the receipt loop
3. `npm run agent:pay-arc -- --deposit 1.00` — second rail
4. `npm run treasury:demo` — the policy refusal
5. `npm run agent:quote -- --chain 8453 --in USDC --out WETH --amount 1000000`
6. `baz gateway add …` ×2, `baz grant create`, both recipes (docs/bazantic/README.md)
7. World step-up on the phone once the sandbox and flag arrive
