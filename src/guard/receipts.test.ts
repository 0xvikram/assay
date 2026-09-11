import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeAbiParameters, keccak256, pad, toBytes, type Hex } from "viem";
import { pickSeller, transferFrom, type SellerMatch } from "./receipts";

const m = (agentId: string, matchedOn: string, chain = "base-sepolia"): SellerMatch => ({ ref: `${chain}:${agentId}`, chain, agentId, matchedOn });
const A = "0x1111111111111111111111111111111111111111" as const;
const B = "0x2222222222222222222222222222222222222222" as const;
const F = "0x3333333333333333333333333333333333333333" as const; // the facilitator that submits
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
const HASH = `0x${"ab".repeat(32)}` as Hex;
const transferLog = (from: string, to: string, value: bigint) => ({
  address: USDC,
  topics: [keccak256(toBytes("Transfer(address,address,uint256)")), pad(from as Hex), pad(to as Hex)] as Hex[],
  data: encodeAbiParameters([{ type: "uint256" }], [value]),
});

test("the agent whose declared wallet received the money is the seller", () => {
  const r = pickSeller([m("7", "owner"), m("9", "agentWallet")]);
  assert.ok("match" in r && r.match.agentId === "9");
});

test("an owner of one agent is that agent", () => {
  const r = pickSeller([m("12", "owner")]);
  assert.ok("match" in r && r.match.agentId === "12");
});

test("a payee behind two agents is skipped, not guessed", () => {
  const r = pickSeller([m("12", "owner"), m("13", "owner")]);
  assert.ok("skip" in r && /2 agents/.test(r.skip));
});

test("the paid URL breaks a tie, but only among agents the money actually reached", () => {
  const r = pickSeller([m("12", "owner"), m("13", "owner")], [m("13", "endpoint"), m("99", "endpoint")]);
  assert.ok("match" in r && r.match.agentId === "13");
});

test("a URL claim alone never makes someone the seller", () => {
  const r = pickSeller([], [m("99", "endpoint")]);
  assert.ok("skip" in r);
});

test("agents on other chains cannot receive a Base Sepolia receipt", () => {
  const r = pickSeller([m("5", "agentWallet", "base")]);
  assert.ok("skip" in r && /Base Sepolia/.test(r.skip));
});

test("an x402 settlement names the payer and payee in its Transfer log, not the submitter", () => {
  const t = transferFrom({ from: F, to: USDC, value: 0n, hash: HASH }, [transferLog(A, B, 1000n)], A);
  assert.deepEqual(t && { from: t.from.toLowerCase(), to: t.to.toLowerCase(), value: t.value, token: t.token }, { from: A, to: B, value: 1000n, token: USDC });
});

test("a Transfer from someone other than the stated payer is not this payment", () => {
  assert.equal(transferFrom({ from: F, to: USDC, value: 0n, hash: HASH }, [transferLog(B, A, 5n)], A), null);
});

test("a plain wallet payment is read from the transaction itself", () => {
  const t = transferFrom({ from: A, to: B, value: 10n ** 12n, hash: HASH }, []);
  assert.deepEqual(t && { from: t.from, to: t.to, value: t.value, token: t.token }, { from: A, to: B, value: 10n ** 12n, token: null });
});
