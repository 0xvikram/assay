import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, type Mandate } from "./mandate";

const m: Mandate = {
  maxPaymentAmount: "5000000",
  maxTotalAmount: "20000000",
  allowedVerdicts: ["VERIFIED", "UNPROVEN"],
  requireStepUpAbove: "50000000",
  expiresAt: "2099-01-01T00:00:00Z",
};

test("a washed counterparty is refused regardless of amount", () => {
  assert.equal(decide(m, "WASH_REPUTATION_DETECTED", "1").action, "refuse");
});

test("an unproven counterparty proceeds under the step-up line and escalates above it", () => {
  assert.equal(decide(m, "UNPROVEN", "50000000").action, "proceed");
  assert.equal(decide(m, "UNPROVEN", "50000001").action, "step-up");
});

test("a verified counterparty proceeds even above the step-up line", () => {
  assert.equal(decide(m, "VERIFIED", "999999999999").action, "proceed");
});

test("a mandate that disallows UNPROVEN refuses it", () => {
  assert.equal(decide({ ...m, allowedVerdicts: ["VERIFIED"] }, "UNPROVEN", "1").action, "refuse");
});
