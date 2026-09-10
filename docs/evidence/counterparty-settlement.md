# The counterparty leg — the mandate decides whether, the policy decides whether we may

**When:** 2026-09-10 · **Treasury:** Privy server wallet `qcyq2vyj89zfkk800i6ddtnv`,
policy `j25rklmy138ec0lsm2g61mkg` owned by key quorum `gj5e8f3ci64ktujo4ktc6yd3`.

`decide()` in `src/agent/mandate.ts` is application logic running inside the agent's own
process. An agent that enforces its own spending limit is precisely what this project argues
you should not trust — it is the same error as an agent writing its own reviews, which we
refuse as `SELF_ISSUED_FEEDBACK`. So the decision is not the control. The Privy policy is:
it runs outside that process, its allowlist and per-transaction cap are owned by a key
quorum the agent cannot change alone, and it refuses before anything is signed.

Both have to agree. Two runs, same mandate, same verdict, opposite outcomes.

## 1 — mandate PROCEED, policy REFUSED

```
npm run agent:pay -- ethereum:6888

  5. decision under the mandate
     intent      pay ethereum:6888 up to 10000000 tinybar
     evidence    UNPROVEN (1000000 0.0.0 · 0.0.7162784@1789049238.941211203)
     decision    PROCEED — within the unproven-spend allowance

  6. settle with the counterparty
     recipient   0xb27afb1741aa9be0b924d99b26ebf5577054a138
     amount      1000000000000 wei on Base Sepolia
     policy REFUSED — the mandate said proceed and the wallet still said no
     400 {"error":"RPC request denied due to policy violation","code":"policy_violation"}
```

Minara AI's registered wallet has never been allowlisted on the treasury, so the money did
not move even though the agent had decided to send it. **This refusal is the product.**

## 2 — mandate PROCEED, policy ALLOWED

```
npm run agent:pay -- base-sepolia:9200

  6. settle with the counterparty
     recipient   0xde6b1fe6114c4406bf0e14bdada5593a717f68fe
     policy ALLOWED
     https://sepolia.basescan.org/tx/0xbe0ef498b140052f9b905ad0d4c7f87d172deb296b7dcf0f96a04f35890664e7
```

The recipient is whatever wallet the counterparty declared in its own ERC-8004 registration —
we pay the address the agent published, not one we chose for it.

## Why this and not a config flag

An allowlist held in `mandate.json` would be read by the same code that decides to ignore it.
Holding it in a policy owned by a key quorum means "raise the cap" is a quorum-signed change
rather than an edit — which is the same shape as the World step-up: the agent may ask for a
bigger envelope, and something outside the agent grants it.
