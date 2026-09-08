import { PrivyClient, generateP256KeyPair } from "@privy-io/node";
import { privateKeyToAccount } from "viem/accounts";

/**
 * The mandate's machine-enforced half. The reference agent's mandate.json is a
 * promise the agent keeps; a Privy policy is a rule the wallet keeps for it.
 * The treasury wallet can only pay allowlisted counterparties, never more than
 * the cap per transaction, and the policy itself is owned by a key quorum —
 * so "raise the cap" is a quorum-signed change, not an edit.
 */
const CAIP2 = "eip155:84532"; // Base Sepolia — the same chain the receipt is written on
const CHAIN_ID = 84532;

function client() {
  const appID = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appID || !appSecret) throw new Error("PRIVY_APP_ID / PRIVY_APP_SECRET are not set.");
  return new PrivyClient({ appId: appID, appSecret });
}

function allowlist(): `0x${string}`[] {
  const out = new Set<`0x${string}`>();
  const svc = process.env.SERVICE_EVM_PRIVATE_KEY as `0x${string}` | undefined;
  if (svc) out.add(privateKeyToAccount(svc).address);
  const seller = process.env.ARC_SELLER_ADDRESS as `0x${string}` | undefined;
  if (seller) out.add(seller);
  for (const a of (process.env.TREASURY_ALLOWLIST ?? "").split(",").map((s) => s.trim()).filter(Boolean)) out.add(a as `0x${string}`);
  return [...out];
}

export interface TreasurySetup {
  authorizationPublicKey: string;
  authorizationPrivateKey: string;
  quorumId: string;
  policyId: string;
  walletId: string;
  walletAddress: string;
  allowlist: string[];
  maxValueWei: string;
}

/**
 * One-time: an authorization key, a quorum holding it, a policy owned by the
 * quorum, and a wallet bound to the policy. Everything printed goes to .env.
 */
export async function setupTreasury(maxValueWei = "0x2386F26FC10000" /* 0.01 ETH */): Promise<TreasurySetup> {
  const privy = client();
  const key = process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY && process.env.PRIVY_AUTHORIZATION_PUBLIC_KEY
    ? { privateKey: process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY, publicKey: process.env.PRIVY_AUTHORIZATION_PUBLIC_KEY }
    : await generateP256KeyPair();

  const quorum = await privy.keyQuorums().create({
    display_name: "Assay treasury — mandate escalations",
    public_keys: [key.publicKey],
    authorization_threshold: 1,
  });

  const to = allowlist();
  if (!to.length) throw new Error("Nothing to allowlist: set SERVICE_EVM_PRIVATE_KEY, ARC_SELLER_ADDRESS or TREASURY_ALLOWLIST.");

  const policy = await privy.policies().create({
    version: "1.0",
    name: "Assay mandate — allowlisted counterparties, capped value",
    chain_type: "ethereum",
    owner_id: quorum.id,
    rules: [
      ...to.map((addr) => ({
        name: `allow ${addr}`,
        method: "eth_sendTransaction" as const,
        action: "ALLOW" as const,
        conditions: [
          { field_source: "ethereum_transaction" as const, field: "to" as const, operator: "eq" as const, value: addr },
          { field_source: "ethereum_transaction" as const, field: "value" as const, operator: "lte" as const, value: maxValueWei },
        ],
      })),
    ],
  });

  const wallet = await privy.wallets().create({
    chain_type: "ethereum",
    display_name: "Assay treasury",
    owner_id: quorum.id,
    policy_ids: [policy.id],
  });

  return {
    authorizationPublicKey: key.publicKey,
    authorizationPrivateKey: key.privateKey,
    quorumId: quorum.id,
    policyId: policy.id,
    walletId: wallet.id,
    walletAddress: wallet.address,
    allowlist: to,
    maxValueWei,
  };
}

/**
 * One live transfer through the policy-bound wallet. The Privy "financial
 * flow" track wants this to be real; the B2B track wants the policy to be the
 * thing that would have stopped a bad one.
 */
export async function treasuryTransfer(to: `0x${string}`, valueWei: bigint) {
  const privy = client();
  const walletId = process.env.PRIVY_WALLET_ID;
  const authKey = process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY;
  if (!walletId || !authKey) throw new Error("PRIVY_WALLET_ID / PRIVY_AUTHORIZATION_PRIVATE_KEY are not set — run npm run treasury:setup.");
  const res = await privy.wallets().ethereum().sendTransaction(walletId, {
    caip2: CAIP2,
    params: { transaction: { to, value: `0x${valueWei.toString(16)}`, chain_id: CHAIN_ID } },
    authorization_context: { authorization_private_keys: [authKey] },
  });
  return res;
}
