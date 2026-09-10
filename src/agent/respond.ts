import { parseAbi, type Hex } from "viem";
import { BASE_SEPOLIA, clients } from "./receipt";
import { pinJson } from "../ipfs";

export const RESPONSE_ABI = parseAbi([
  "function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, string responseURI, bytes32 responseHash)",
]);

export interface TagInput {
  agentId: bigint;
  clientAddress: `0x${string}`;
  feedbackIndex: bigint;
  /** The response document, pinned to IPFS and referenced on-chain. */
  file: Record<string, unknown>;
  /** Simulate only: no pin, no transaction. */
  dryRun?: boolean;
}

/**
 * appendResponse is permissionless, and ERC-8004 names "any off-chain data
 * intelligence aggregator tagging feedback as spam" among its intended callers.
 * Assay is that caller, responding as its own registered identity so a reader
 * can tell who tagged what. It can tag; it cannot revoke — only the address
 * that wrote a review can — so the tag sits beside the review, on-chain, where
 * every reader of the registry finds it.
 *
 * Every write is simulated first, so a call the contract would reject fails
 * here rather than costing gas.
 */
export async function tagFeedback(input: TagInput) {
  const key = process.env.SERVICE_EVM_PRIVATE_KEY as Hex | undefined;
  if (!key) throw new Error("SERVICE_EVM_PRIVATE_KEY is not set (Assay's Base Sepolia identity).");
  const { account, pub, wallet } = clients(key);
  const target = { address: BASE_SEPOLIA.reputation, abi: RESPONSE_ABI, functionName: "appendResponse" } as const;

  if (input.dryRun) {
    await pub.simulateContract({ ...target, account, args: [input.agentId, input.clientAddress, input.feedbackIndex, "ipfs://dry-run", `0x${"00".repeat(32)}`] });
    return { simulated: true as const, responseURI: null, hash: null, explorer: null };
  }

  const pinned = await pinJson(input.file, `assay-response-${input.agentId}-${input.feedbackIndex}.json`);
  const { request } = await pub.simulateContract({ ...target, account, args: [input.agentId, input.clientAddress, input.feedbackIndex, pinned.uri, pinned.hash] });
  const hash = await wallet.writeContract(request);
  await pub.waitForTransactionReceipt({ hash });
  return { simulated: false as const, responseURI: pinned.uri, hash, explorer: `${BASE_SEPOLIA.explorer}/tx/${hash}` };
}
