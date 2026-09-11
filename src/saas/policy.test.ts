import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, validateRules, DEFAULT_RULES as R } from "./policy";

test("a farm is refused even for a tiny payment", () => {
  assert.equal(decide(R, "WASH_REPUTATION_DETECTED", 0.001).action, "refuse");
});

test("a farm is refused even when a person would otherwise be asked", () => {
  assert.equal(decide(R, "WASH_REPUTATION_DETECTED", 500).action, "refuse");
});

test("a verified payee under the threshold is paid", () => {
  assert.equal(decide(R, "VERIFIED", 2).action, "pay");
});

test("anything above the approval threshold goes to a person, verified or not", () => {
  assert.equal(decide(R, "VERIFIED", 12).action, "approve");
});

test("an unproven payee is paid within the cap and escalated over it", () => {
  assert.equal(decide(R, "UNPROVEN", 0.5).action, "pay");
  const d = decide(R, "UNPROVEN", 3);
  assert.equal(d.action, "approve");
  assert.match(d.why, /over the \$1 cap/);
});

test("an amount that can't be priced is never treated as small", () => {
  assert.equal(decide(R, "UNPROVEN", null).action, "approve");
  assert.equal(decide({ ...R, approveAboveUsd: null }, "UNPROVEN", null).action, "approve");
});

test("unregistered payees follow their own rule", () => {
  assert.equal(decide(R, null, 0.1).action, "pay");
  assert.equal(decide({ ...R, unregistered: "refuse" }, null, 0.1).action, "refuse");
});

test("validation names the field that's wrong", () => {
  assert.throws(() => validateRules({ ...R, unproven: "maybe" }), /unproven must be one of pay, cap, refuse/);
  assert.throws(() => validateRules({ ...R, unprovenCapUsd: -1 }), /unprovenCapUsd must be a dollar amount/);
  assert.deepEqual(validateRules({ ...R, approveAboveUsd: "" }), { ...R, approveAboveUsd: null });
});
