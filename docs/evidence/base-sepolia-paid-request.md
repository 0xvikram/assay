# The third rail — Base Sepolia settles for the first time

**When:** 2026-09-11 · **Facilitator:** x402.org · **Network:** `eip155:84532`

## What was wrong

Every paid route's 402 advertised three rails, and the Base Sepolia one had never settled.
Paying it returned `402 unsupported_scheme`, locally and in production.

The x402 resource server routes each network and scheme to the **first** facilitator that
claims it (`initialize()`: "earlier facilitators in the array get precedence"). The three we
use overlap:

| Facilitator | Also claims |
|---|---|
| Circle Gateway (batch) | `eip155:84532` and eleven other EVM testnets |
| x402.org | `hedera:testnet` |
| Blocky402 | `eip155:80002`, which Circle also claims |

The array was `[Blocky402, Circle, x402.org]`, so Circle won `exact · eip155:84532` and every
Base Sepolia payment went to Circle's batch facilitator — which expects a Gateway-batched
payment, received a plain EIP-3009 authorization, and refused it. Confirmed by building the
live server and asking it: `getFacilitatorClient(2, "eip155:84532", "exact")` →
`BatchFacilitatorClient`.

## The fix

Each facilitator is scoped to the one rail it is meant to settle, by filtering what it claims
in `getSupported()` (`scoped()` in `src/x402.ts`): Blocky402 → Hedera, Circle → Arc,
x402.org → Base Sepolia. Reordering the array would have fixed today's collision and broken
Hedera the day it moved x402.org forward; scoping makes routing explicit.

## Evidence

```
routing after the fix
  exact · hedera:testnet   → Blocky402
  exact · eip155:5042002   → Circle
  exact · eip155:84532     → x402.org

plain payment on the Base Sepolia rail
  HTTP 200 · success true
  https://sepolia.basescan.org/tx/0x5ae913934defeb7977db847b66f580b91e80be08c7710057c12a4d7a22d9bf00

through the x402 guard (npm run guard:demo), payee resolved to base-sepolia:9200, allowed
  HTTP 200
  https://sepolia.basescan.org/tx/0x54a8574feee3b6f67dce86353e2ba2a6d9f082fe7c9df03dd826f901a3266392

regressions, same run
  Hedera  0.0.7162784@1789072424.098624625  success
  Arc     806e7b69-e3bd-4c21-a82f-a2263364db69  batched by Circle Gateway
```
