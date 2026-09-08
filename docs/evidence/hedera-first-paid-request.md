# Evidence — first real x402 payment on Hedera testnet

**When:** 2026-09-08 ~14:23 IST · **Service:** https://assay-dusky.vercel.app · **Facilitator:** Blocky402 testnet

```
  1. ask without paying  https://assay-dusky.vercel.app/api/v1/agents/base/25975
     HTTP 402
     accepts hedera:testnet  asset 0.0.0  amount 1000000  payTo 0.0.10417408  feePayer 0.0.7162784
     accepts eip155:5042002  asset 0x3600000000000000000000000000000000000000  amount 1000  payTo 0xDe6B1Fe6114c4406Bf0E14bdadA5593A717F68Fe  feePayer -
  2. sign a payment, retry  as 0.0.10417423
     mandate: per-payment cap 5000000, run cap 20000000, expires 2026-09-30T00:00:00Z
     HTTP 200  5701 ms
  3. the verdict we paid for
     WASH_REPUTATION_DETECTED  confidence 0/100
     One address wrote most of this agent's reputation.
     deployment QmcLwgyKn3RnyhkkSwLYscP9dL1Fc6omvfC9bFRgcK1e7u · block 51034437
  4. settlement
     success true  network hedera:testnet  payer 0.0.10417423
     tx 0.0.7162784@1788858215.582262398
     https://hashscan.io/testnet/transaction/0.0.7162784%401788858215.582262398
     paid 1000000 0.0.0 on hedera:testnet · run total 1000000
  5. decision under the mandate
     intent      pay base:25975 up to 10000000 tinybar
     evidence    WASH_REPUTATION_DETECTED (1000000 0.0.0 · 0.0.7162784@1788858215.582262398)
     decision    REFUSE — WASH_REPUTATION_DETECTED is not an allowed verdict under this mandate
```

| Artifact | Link |
|---|---|
| Settlement transaction | https://hashscan.io/testnet/transaction/0.0.7162784%401788858215.582262398 |
| Service account (receives) | https://hashscan.io/testnet/account/0.0.10417408 |
| Agent account (pays, signs only) | https://hashscan.io/testnet/account/0.0.10417423 |
| HCS receipt topic | https://hashscan.io/testnet/topic/0.0.10419050 |
| Facilitator fee payer | 0.0.7162784 (Blocky402 testnet) |

The client signed only; the facilitator submitted and paid the network fee — the transaction id carries the fee payer's account, not the agent's.
