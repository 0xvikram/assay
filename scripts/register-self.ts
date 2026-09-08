import type { Hex } from "viem";
import { pinJson } from "../src/ipfs";
import { BASE_SEPOLIA, IDENTITY_ABI, clients } from "../src/agent/receipt";

/**
 * Assay registers itself as an ERC-8004 agent on base-sepolia, once, so the
 * reference paying agent has something real to review after paying it. The
 * service key owns the registration; the agent key writes the review — the
 * spec forbids an owner reviewing itself, and we want the same rule to bite us.
 */
const key = process.env.SERVICE_EVM_PRIVATE_KEY as Hex | undefined;
const base = process.env.PUBLIC_BASE_URL;
if (!key || !base) {
  console.error("SERVICE_EVM_PRIVATE_KEY and PUBLIC_BASE_URL must be set.");
  process.exit(2);
}
const { account, pub, wallet } = clients(key);

const registration = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "Assay",
  description:
    "A paid pre-flight for agent payments. Answers whether an ERC-8004 agent's reputation is real — VERIFIED, UNPROVEN or WASH_REPUTATION_DETECTED — with evidence, next steps and the exact subgraph deployment and block it was read at. Confidence is earned only from payment-backed reviews by independent addresses.",
  image: `${base}/icon.png`,
  services: [
    { name: "web", endpoint: `${base}/` },
    { name: "MCP", endpoint: `${base}/api/mcp`, version: "2025-06-18" },
    { name: "OpenAPI", endpoint: `${base}/api/openapi` },
  ],
  x402Support: true,
  active: true,
  supportedTrust: ["reputation"],
};

console.log(`\n  registering as ${account.address} on base-sepolia`);
const pinned = await pinJson(registration, "assay-registration.json");
console.log(`  registration file ${pinned.uri}`);

const { request, result: agentId } = await pub.simulateContract({
  account, address: BASE_SEPOLIA.identity, abi: IDENTITY_ABI, functionName: "register", args: [pinned.uri],
});
const tx = await wallet.writeContract(request);
const rc = await pub.waitForTransactionReceipt({ hash: tx });
if (rc.status !== "success") throw new Error(`register reverted: ${tx}`);

console.log(`  tx ${BASE_SEPOLIA.explorer}/tx/${tx}`);
console.log(`\n  Assay is agent ${agentId} on base-sepolia (${BASE_SEPOLIA.chainId}:${agentId})`);
console.log(`  Add to .env:  ASSAY_AGENT_ID=${agentId}`);
console.log(`  Check it:     npm run assay -- base-sepolia:${agentId}\n`);
