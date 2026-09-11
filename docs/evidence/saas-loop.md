# The loop, closed end to end

**When:** 2026-09-11 · **Where:** the local build of commit that adds the SaaS layer, against live
Hedera testnet, Base Sepolia and The Graph.

## A payment that wrote its own review

`npm run agent:pay -- base-sepolia:9200` — the reference agent checking Assay's own registered
agent, paying it through the Privy wallet, and letting the payment write the receipt.

```
3. the verdict we paid for      UNPROVEN · confidence 25/100 (paid 0.01 ℏ on Hedera,
                                0.0.7162784@1789118563.396225949)
5. decision under the mandate   PROCEED — within the unproven-spend allowance
6. settle with the counterparty policy ALLOWED
                                0x98288ea50d62677679005416d1cb860346580bbc9aba32797087480e3979488b
                                recorded on HCS seq 27
7. the receipt it earned        review of base-sepolia:9200 written
                                0x8529c6014b32632b9c912149add61360cb3a91d7b1e87764fc0217e2ac4a952d
                                proof: 0x1039…f0ed paid 0xde6b…68fe in 0x98288ea5…488b
```

The proof was not supplied by the agent: `receiptForSettlement` read the payer, payee and value from
the settlement transaction, looked the payee up (it is 9200's declared wallet), and wrote the review
about that agent. The Agent0 subgraph indexed it within two minutes:

```
84532:9200:0xe927…c040:2  tag2 paid-job   proofOfPayment 0x1039…f0ed → 0xde6b…68fe  tx 0x98288ea5…488b
84532:9200:0xe927…c040:1  tag2 paid-check proofOfPayment 0.0.10417423 → 0.0.10417408 tx 0.0.7162784@1788863425.370033840
```

Honest reading: both reviews are from our own wallets, so 9200 moves to two payment-backed reviews
from two payers — and stays UNPROVEN, because every review still comes from one reviewer.

## The account layer, exercised

A fixed test account (`acct_selftest00000000`, not a real login) run through every server path,
with real writes to HCS topic 0.0.10419050:

```
issued ak_test_f0f71d96_…
✓ the key resolves to its account once the ledger has it
✓ a paid route serves a key holder without a payment: HTTP 200 WASH_REPUTATION_DETECTED
✓ the keyed call is metered on the ledger — this month: 1 report, $0.001
✓ the guard can read the saved policy by id (pol_5b6408e6d9bf9f70)
✓ the watch is listed; the daily check ran: ethereum:6888 UNPROVEN, unchanged
✓ a revoked key stops working — HTTP 401
```

Also checked: a request without a key still gets the 402; an unknown key gets 401 with a sentence
saying why; the badge, lookup, agent pages and ledger export return 200; no page overflows at 390px.
Signing in to the dashboard itself needs a Privy email code, so that step is the one not automated
here.
