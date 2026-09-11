import { createPublicClient, createWalletClient, http, parseAbi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { pinJson } from "../ipfs";

/**
 * Verified twice on Sept 8: the ERC-8004 reference README and the Agent0
 * subgraph manifest for base-sepolia name the same two contracts.
 */
export const BASE_SEPOLIA = {
  chainId: 84532,
  identity: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  reputation: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
  rpc: process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org",
  explorer: "https://sepolia.basescan.org",
} as const;

export const REPUTATION_ABI = parseAbi([
  "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)",
  "function revokeFeedback(uint256 agentId, uint64 feedbackIndex)",
]);
export const IDENTITY_ABI = parseAbi([
  "function register(string agentURI) returns (uint256 agentId)",
  "function setAgentURI(uint256 agentId, string newURI)",
  "function ownerOf(uint256 tokenId) view returns (address)",
]);

export interface PaymentProof { fromAddress: string; toAddress: string; chainId: string; txHash: string }

export interface ReceiptInput {
  /** The agent that was paid. */
  agentId: bigint;
  /** 0–100. What the payer thought of the work. */
  value: number;
  endpoint: string;
  tool?: string;
  text?: string;
  proof: PaymentProof;
  tags?: [string, string];
}

export function clients(privateKey: Hex) {
  const account = privateKeyToAccount(privateKey);
  const transport = http(BASE_SEPOLIA.rpc);
  return {
    account,
    pub: createPublicClient({ chain: baseSepolia, transport }),
    wallet: createWalletClient({ account, chain: baseSepolia, transport }),
  };
}

/**
 * The receipt: ERC-8004 feedback whose file carries the settlement that paid
 * for the work. Reviews are free to write, which is why they are worthless;
 * this one cost exactly what the work cost. The payer writes it — the spec
 * bars the agent's owner from reviewing itself — and the file goes to IPFS
 * because that is the only place the indexer will read it from.
 */
export async function writeReceipt(input: ReceiptInput, privateKey?: Hex) {
  const key = privateKey ?? (process.env.AGENT_EVM_PRIVATE_KEY as Hex | undefined);
  if (!key) throw new Error("AGENT_EVM_PRIVATE_KEY is not set (the paying agent's Base Sepolia key).");
  const { account, pub, wallet } = clients(key);
  const [tag1, tag2] = input.tags ?? ["assay", "paid-check"];

  const file = {
    agentRegistry: `eip155:${BASE_SEPOLIA.chainId}:${BASE_SEPOLIA.identity}`,
    agentId: Number(input.agentId),
    clientAddress: `eip155:${BASE_SEPOLIA.chainId}:${account.address}`,
    createdAt: new Date().toISOString(),
    value: input.value,
    valueDecimals: 0,
    tag1,
    tag2,
    endpoint: input.endpoint,
    ...(input.tool ? { mcp: { tool: input.tool } } : {}),
    ...(input.text ? { text: input.text } : {}),
    proofOfPayment: input.proof,
  };
  const pinned = await pinJson(file, `assay-receipt-${Date.now()}.json`);

  const { request } = await pub.simulateContract({
    account,
    address: BASE_SEPOLIA.reputation,
    abi: REPUTATION_ABI,
    functionName: "giveFeedback",
    args: [input.agentId, BigInt(input.value), 0, tag1, tag2, input.endpoint, pinned.uri, pinned.hash],
  });
  const txHash = await wallet.writeContract(request);
  const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error(`giveFeedback reverted: ${txHash}`);

  return {
    clientAddress: account.address,
    feedbackURI: pinned.uri,
    feedbackHash: pinned.hash,
    txHash,
    block: Number(receipt.blockNumber),
    explorer: `${BASE_SEPOLIA.explorer}/tx/${txHash}`,
    file,
  };
}
