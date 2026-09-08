import { setupTreasury } from "../src/treasury/privy";

const t = await setupTreasury();
console.log(`\n  treasury wallet   ${t.walletAddress}  (${t.walletId})`);
console.log(`  policy            ${t.policyId}  — allow ${t.allowlist.join(", ")} · value ≤ ${t.maxValueWei}`);
console.log(`  key quorum        ${t.quorumId}  — owns the policy and the wallet; raising the cap needs its signature`);
console.log(`\n  Add to .env (the private key is the quorum's signer — treat it like one):`);
console.log(`  PRIVY_WALLET_ID=${t.walletId}\n  PRIVY_POLICY_ID=${t.policyId}\n  PRIVY_QUORUM_ID=${t.quorumId}`);
console.log(`  PRIVY_AUTHORIZATION_PUBLIC_KEY=${t.authorizationPublicKey}\n  PRIVY_AUTHORIZATION_PRIVATE_KEY=${t.authorizationPrivateKey}`);
console.log(`\n  Fund ${t.walletAddress} with Base Sepolia ETH, then: npm run treasury:demo\n`);
