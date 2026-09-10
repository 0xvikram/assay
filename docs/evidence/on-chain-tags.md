# Writing the finding onto the fake reviews themselves

**When:** 2026-09-11 · **Registry:** ERC-8004 Reputation, Base Sepolia `0x8004B663…8713`
**Responder:** Assay, `0xDe6B1Fe6…F68Fe` — the owner of Assay's own registration, agent 9200

ERC-8004's `appendResponse` is permissionless, and the specification names *"any off-chain
data intelligence aggregator tagging feedback as spam"* as an intended caller. Assay can tag a
review; it cannot revoke one — only the address that wrote it can — so the tag sits beside the
review, on-chain, where every reader of the registry finds it.

## The farms

Found on Base Sepolia by scoring the top agents, then confirmed by Assay's own engine before
anything was written. Testnet only; mainnet is out of scope.

| Agent | Reviews | Verdict | Evidence (latest 1,000) |
|---|---|---|---|
| `base-sepolia:2851` | 2,881 | WASH_REPUTATION_DETECTED | 1 reviewer, 100% from `0x3287cb4f…eaad`, 100% in one 24h window, 0 paid |
| `base-sepolia:2733` | 2,766 | WASH_REPUTATION_DETECTED | the same single reviewer, the same pattern |

The scores are varied and low (0–34 of 100), so the response says exactly what is known —
single-source, not independent evidence — rather than calling the reviews inflated.

## What was written

```
2851 #2881  0x5df6f702e27db440879d56a5189958411829ef3f8422f343a5d149823d9e73fe  ipfs://QmRA1rAhvSu3CLfpB5sAVRTunCsSXpni3j6EQDQW8GyrNa
2851 #2880  0x8e7da63baf6b2d6bd1712cfe8e34db0e9e4d92cec269038dcecf471dea91d09a  ipfs://QmRQ5kkR8WjQ6DNYURJdsyGZiYic6XZSSAza2LY63wiSNF
2851 #2879  0x3c70762081164e99d145c9900d126be0ee5fdf645ffa40a57fac3d23c52b7c43  ipfs://QmQtfhSa8xK2ejvK4pJAwFs2RraGU81NhZa8XbVGfo3W2Y
2733 #2766  0xa9a17329b6cc4c7eb6bfbba547f076687c64512f084422258041d603ffda5c95  ipfs://QmR2h2uaC2TrTHTwbsMNwxiMhPqFKjJ6rJRkMWT7awmfmy
```

Each call was simulated first; one tag costs about 126k gas, roughly 7.6e-7 ETH on Base Sepolia.

## Verified

- **Indexed.** All four entries now carry a response from `0xde6b…f68fe` in the Agent0 subgraph,
  so any reader of the registry sees them — not only someone looking at Basescan.
- **The file says what it should.** `assay.response.v1`: responding as agent 9200; the subject
  (agent, reviewer, feedback index); verdict and a neutral classification,
  `not-independent-evidence`; the statement, sample basis included; the critical findings; the
  deployment and block it was read at; and the note that Assay can tag but not revoke.
- **Idempotent.** A re-run skips every entry Assay has already tagged:

```
#2881  already tagged by Assay — skipped
#2880  already tagged by Assay — skipped
#2879  already tagged by Assay — skipped
```
