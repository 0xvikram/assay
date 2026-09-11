import { test } from "node:test";
import assert from "node:assert/strict";
import { decideWithRules, amountUsd, decideGuard, DEFAULT_POLICY, type Checked, type GuardFindings } from "./index";

const PAYTO = "0x69747c4ce6185d21a33b3bcdba980d659600ac7b";
const c = (ref: string, verdict: Checked["verdict"], headline: string | null = null): Checked => ({ ref, matchedOn: "owner", verdict, confidence: 0, headline });
const f = (over: Partial<GuardFindings>): GuardFindings => ({ payTo: PAYTO, resource: null, checked: [], unregistered: false, unreachable: null, ...over });

test("a farm at the payee address is refused, with the reason", () => {
  const d = decideGuard(f({ checked: [c("base:25975", "WASH_REPUTATION_DETECTED", "One address wrote most of this agent's reputation.")] }), DEFAULT_POLICY);
  assert.equal(d.action, "refuse");
  assert.match(d.reason, /base:25975 is WASH_REPUTATION_DETECTED — One address/);
});

test("an unproven counterparty is allowed by default", () => {
  assert.equal(decideGuard(f({ checked: [c("ethereum:6888", "UNPROVEN")] }), DEFAULT_POLICY).action, "allow");
});

test("one farm among several agents at an address is enough", () => {
  const d = decideGuard(f({ checked: [c("base:1", "UNPROVEN"), c("base:2", "WASH_REPUTATION_DETECTED"), c("base:3", "VERIFIED")] }), DEFAULT_POLICY);
  assert.equal(d.action, "refuse");
  assert.match(d.reason, /base:2/);
});

test("an unregistered payee is allowed unless the policy refuses unknowns", () => {
  assert.equal(decideGuard(f({ unregistered: true }), DEFAULT_POLICY).action, "allow");
  assert.equal(decideGuard(f({ unregistered: true }), { ...DEFAULT_POLICY, refuseUnknown: true }).action, "refuse");
});

test("an unreachable Assay refuses by default rather than paying blind", () => {
  assert.equal(decideGuard(f({ unreachable: "lookup HTTP 503" }), DEFAULT_POLICY).action, "refuse");
  assert.equal(decideGuard(f({ unreachable: "lookup HTTP 503" }), { ...DEFAULT_POLICY, failOpen: true }).action, "allow");
});

test("a known farm is refused even when another check failed", () => {
  const d = decideGuard(f({ checked: [c("base:25975", "WASH_REPUTATION_DETECTED")], unreachable: "preview base:9 HTTP 429" }), { ...DEFAULT_POLICY, failOpen: true });
  assert.equal(d.action, "refuse");
  assert.match(d.reason, /WASH_REPUTATION_DETECTED/);
});

test("a stricter policy can refuse UNPROVEN too", () => {
  assert.equal(decideGuard(f({ checked: [c("ethereum:6888", "UNPROVEN")] }), { ...DEFAULT_POLICY, refuse: ["WASH_REPUTATION_DETECTED", "UNPROVEN"] }).action, "refuse");
});

import { DEFAULT_RULES } from "../saas/policy";

const found = (checked: { ref: string; verdict: "VERIFIED" | "UNPROVEN" | "WASH_REPUTATION_DETECTED" }[], extra: Partial<{ unregistered: boolean; unreachable: string | null }> = {}) => ({
  payTo: "0xabc", resource: null, unregistered: false, unreachable: null,
  checked: checked.map((c) => ({ ...c, matchedOn: "agentWallet", confidence: 0, headline: null })), ...extra,
});

test("policy: the worst verdict at the address decides, and a farm is refused", () => {
  const d = decideWithRules(found([{ ref: "base:1", verdict: "VERIFIED" }, { ref: "base:2", verdict: "WASH_REPUTATION_DETECTED" }]), DEFAULT_RULES, 0.01);
  assert.equal(d.action, "refuse");
  assert.match(d.reason, /base:2/);
});

test("policy: an unproven payee over the cap is refused as needing a person", () => {
  const d = decideWithRules(found([{ ref: "base:3", verdict: "UNPROVEN" }]), DEFAULT_RULES, 2);
  assert.equal(d.action, "refuse");
  assert.match(d.reason, /needs a person/);
});

test("policy: an unproven payee within the cap is paid", () => {
  assert.equal(decideWithRules(found([{ ref: "base:3", verdict: "UNPROVEN" }]), DEFAULT_RULES, 0.5).action, "allow");
});

test("policy: an unreachable Assay still refuses unless told to fail open", () => {
  assert.equal(decideWithRules(found([], { unreachable: "timeout" }), DEFAULT_RULES, 0.1).action, "refuse");
  assert.equal(decideWithRules(found([], { unreachable: "timeout" }), DEFAULT_RULES, 0.1, true).action, "allow");
});

test("a USDC payment is priced in dollars; anything else is unknown", () => {
  assert.equal(amountUsd({ asset: "0x036C", amount: "1000", extra: { name: "USDC" } }), 0.001);
  assert.equal(amountUsd({ asset: "0.0.0", amount: "1000000" }), null);
});
