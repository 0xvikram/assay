# Evidence — paid request on the Arc rail (Circle Gateway)

**When:** 2026-09-08 ~14:30 IST · **Service:** https://assay-dusky.vercel.app · **Buyer:** `0xE927352a95CE00AB33344640F31570d7c06EC040`

```
  0. deposit  1.00 USDC into the Gateway balance (one-time)
  1. pay on Arc  https://assay-dusky.vercel.app/api/v1/agents/base/25975
     4149 ms
  2. the verdict we paid for
     WASH_REPUTATION_DETECTED  confidence 0/100
     One address wrote most of this agent's reputation.
     deployment QmcLwgyKn3RnyhkkSwLYscP9dL1Fc6omvfC9bFRgcK1e7u · block 51034470
  3. settlement
     paid 0.001 USDC (1000 atomic) · tx 3e0e9f95-e790-4a28-8a8f-4733cbc40de5
     batched by Circle Gateway
  4. decision under the mandate  REFUSE — WASH_REPUTATION_DETECTED is not an allowed verdict under this mandate
```

Same route, same price tier, same engine as the Hedera request minutes earlier — the 402 listed both
rails and this client chose `eip155:5042002`. The payment was an off-chain signature; Circle Gateway
batches settlement, so the id above is the Gateway settlement reference. Chain id 5042002, RPC
`https://rpc.testnet.arc.io`, USDC as native gas.
