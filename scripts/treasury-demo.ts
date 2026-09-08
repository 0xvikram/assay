import { privateKeyToAccount } from "viem/accounts";
import { treasuryTransfer } from "../src/treasury/privy";

/**
 * Two transfers: one to an allowlisted address under the cap (goes through),
 * one to a stranger (the policy refuses it before anything is signed). The
 * refusal is the demo.
 */
const svc = process.env.SERVICE_EVM_PRIVATE_KEY as `0x${string}` | undefined;
if (!svc) { console.error("SERVICE_EVM_PRIVATE_KEY is not set."); process.exit(2); }
const allowed = privateKeyToAccount(svc).address;
const stranger = "0x000000000000000000000000000000000000dEaD" as const;

console.log(`\n  1. allowlisted transfer → ${allowed}`);
const ok = await treasuryTransfer(allowed, 1_000_000_000_000n); // 0.000001 ETH
console.log(`     hash ${ok.hash}  https://sepolia.basescan.org/tx/${ok.hash}`);

console.log(`\n  2. transfer to a stranger → ${stranger}  (the policy should refuse)`);
try {
  const bad = await treasuryTransfer(stranger, 1_000_000_000_000n);
  console.log(`     UNEXPECTED: went through — ${bad.hash}`);
  process.exit(1);
} catch (err) {
  console.log(`     refused: ${(err as Error).message.slice(0, 200)}`);
}
console.log("");
