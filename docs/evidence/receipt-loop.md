# Evidence — the receipt loop (Base Sepolia + Hedera)

**When:** 2026-09-08 ~15:50 IST

## 1. Assay registered as an ERC-8004 agent

```
  registering as 0xDe6B1Fe6114c4406Bf0E14bdadA5593A717F68Fe on base-sepolia
  registration file ipfs://QmQRDhVXG6kGQtZrKeN2SLaARpK18ssRsAsG7jqqs7fBA7
  tx https://sepolia.basescan.org/tx/0xf8bcf0c1e4ac1d7a4cfca6cfbf1410982bfa3367aa989eb497f099a16bc7ffbe
  Assay is agent 9200 on base-sepolia (84532:9200)
```

## 2. The paying agent buys a verdict on Hedera, then writes the receipt

```
  3. the verdict we paid for
     UNPROVEN  confidence 0/100   (ethereum:6888, Minara AI)
     deployment QmVX4bwHu8i487Q4FuaKr89rD2neBor67iepomMgXU5SHY · block 25932060
  4. settlement
     success true  network hedera:testnet  payer 0.0.10417423
     tx 0.0.7162784@1788863425.370033840
     https://hashscan.io/testnet/transaction/0.0.7162784%401788863425.370033840
  5. decision under the mandate
     decision    PROCEED — within the unproven-spend allowance
  6. write the receipt
     feedback file ipfs://QmemxvLASh4gjskJ5gPvCS1fUB4cwpZm8tt8kRXYtMcv1q
     giveFeedback  https://sepolia.basescan.org/tx/0xb8238519f39e83ef4d3af9a4e13838a6413f66d3b6c2f745af3f823f8d0998d5
```

The feedback file carries `proofOfPayment: { fromAddress: 0.0.10417423, toAddress: 0.0.10417408, chainId: "296", txHash: 0.0.7162784@1788863425.370033840 }` —
a Hedera settlement backing an ERC-8004 review on Base Sepolia. The writer is the agent key
(`0xE927…C040`), not the registration owner, as the spec requires.

## 3. Privy — policy-bound treasury

```
  1. allowlisted transfer → 0xDe6B1Fe6114c4406Bf0E14bdadA5593A717F68Fe
     https://sepolia.basescan.org/tx/0x50beff490104b8a9acac3ab529dcdf381d55e40b5f775170eb9ad60e230e7b43
  2. transfer to a stranger → 0x000000000000000000000000000000000000dEaD
     refused: 400 {"error":"RPC request denied due to policy violation","code":"policy_violation"}
```
Wallet `0x103938199206582f9e3a2F42c6d636A88298f0ed` · policy and wallet owned by the key quorum; the refusal happened
inside Privy before anything was signed.
