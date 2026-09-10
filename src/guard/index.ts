import type { x402Client } from "@x402/core/client";

export type GuardVerdict = "VERIFIED" | "UNPROVEN" | "WASH_REPUTATION_DETECTED";

export interface Checked { ref: string; matchedOn: string; verdict: GuardVerdict; confidence: number; headline: string | null }

export interface GuardDecision {
  action: "allow" | "refuse";
  reason: string;
  payTo: string;
  resource: string | null;
  checked: Checked[];
}

export interface GuardPolicy {
  /** Verdicts that stop a payment. */
  refuse: GuardVerdict[];
  /** Refuse a counterparty with no ERC-8004 registration. Unknown is not the same as bad, so off by default. */
  refuseUnknown: boolean;
  /** Pay anyway when Assay cannot be reached. Off by default: a guard that fails open is a silent bypass. */
  failOpen: boolean;
}

export const DEFAULT_POLICY: GuardPolicy = { refuse: ["WASH_REPUTATION_DETECTED"], refuseUnknown: false, failOpen: false };

export interface GuardFindings {
  payTo: string;
  resource: string | null;
  checked: Checked[];
  /** The lookup worked and found no registration at this address or URL. */
  unregistered: boolean;
  /** Why Assay could not be asked, if it could not. */
  unreachable: string | null;
}

/**
 * Pure: given what the lookup found, may this payment go ahead? Kept apart
 * from the network so the rules are testable and readable in one place.
 *
 * A refused verdict wins over everything else — one farm at an address is
 * enough, because an owner running one has told you something about every
 * agent it owns. Then, if anything could not be checked, the guard refuses
 * rather than guess, unless told to fail open.
 */
export function decideGuard(x: GuardFindings, p: GuardPolicy): GuardDecision {
  const base = { payTo: x.payTo, resource: x.resource, checked: x.checked };
  const bad = x.checked.find((c) => p.refuse.includes(c.verdict));
  if (bad) return { ...base, action: "refuse", reason: `${bad.ref} is ${bad.verdict}${bad.headline ? ` — ${bad.headline}` : ""}` };
  if (x.unreachable) {
    return p.failOpen
      ? { ...base, action: "allow", reason: `could not check the counterparty (${x.unreachable}); paying anyway because failOpen is set` }
      : { ...base, action: "refuse", reason: `could not check the counterparty (${x.unreachable}); refusing rather than paying blind` };
  }
  if (x.unregistered) {
    return p.refuseUnknown
      ? { ...base, action: "refuse", reason: `${x.payTo} is not a registered ERC-8004 agent, and this guard refuses unknown counterparties` }
      : { ...base, action: "allow", reason: `${x.payTo} is not a registered ERC-8004 agent; nothing to check` };
  }
  return { ...base, action: "allow", reason: `checked ${x.checked.map((c) => `${c.ref} ${c.verdict}`).join(", ")}` };
}

export interface GuardOptions extends Partial<GuardPolicy> {
  /** Where Assay lives. Defaults to ASSAY_URL, then the public deployment. */
  base?: string;
  /** How many matched registrations to check. A URL can be claimed by dozens. */
  maxChecks?: number;
  onDecision?: (d: GuardDecision) => void;
  fetch?: typeof fetch;
}

/** Ask Assay who the payee is, then what their reputation is worth. Free routes, plain fetch. */
async function investigate(f: typeof fetch, base: string, payTo: string, resource: string | null, maxChecks: number): Promise<GuardFindings> {
  const empty = { payTo, resource, checked: [] as Checked[] };
  const q = new URLSearchParams({ address: payTo });
  if (resource) q.set("url", resource);
  let matches: { ref: string; chain: string; agentId: string; matchedOn: string }[];
  try {
    const r = await f(`${base}/api/v1/lookup?${q.toString()}`);
    if (!r.ok) throw new Error(`lookup HTTP ${r.status}`);
    matches = ((await r.json()) as { matches: typeof matches }).matches;
  } catch (e) {
    return { ...empty, unregistered: false, unreachable: (e as Error).message };
  }
  if (!matches.length) return { ...empty, unregistered: true, unreachable: null };

  const checked: Checked[] = [];
  let unreachable: string | null = null;
  const settled = await Promise.allSettled(matches.slice(0, maxChecks).map(async (m) => {
    const r = await f(`${base}/api/v1/preview/${m.chain}/${m.agentId}`);
    if (!r.ok) throw new Error(`preview ${m.ref} HTTP ${r.status}`);
    const p = (await r.json()) as { verdict: GuardVerdict; confidence: number; headline?: string };
    return { ref: m.ref, matchedOn: m.matchedOn, verdict: p.verdict, confidence: p.confidence, headline: p.headline ?? null };
  }));
  for (const s of settled) {
    if (s.status === "fulfilled") checked.push(s.value);
    else unreachable ??= String((s.reason as Error)?.message ?? s.reason);
  }
  return { payTo, resource, checked, unregistered: false, unreachable };
}

/**
 * Check before you pay, as one line in any x402 client:
 *
 *   const client = withAssayGuard(new x402Client().register(...));
 *
 * Before the client signs a payment, the guard reads the 402's payTo and
 * resource, asks Assay which registered agent that is and what its
 * reputation is worth, and aborts if the verdict is one it refuses. The
 * refusal happens before anything is signed, so no authorization exists to
 * be misused. It uses Assay's free routes through a plain fetch — never the
 * wrapped client — so checking a counterparty cannot itself trigger a payment.
 */
export function withAssayGuard(client: x402Client, opts: GuardOptions = {}): x402Client {
  const policy: GuardPolicy = {
    refuse: opts.refuse ?? DEFAULT_POLICY.refuse,
    refuseUnknown: opts.refuseUnknown ?? DEFAULT_POLICY.refuseUnknown,
    failOpen: opts.failOpen ?? DEFAULT_POLICY.failOpen,
  };
  const base = (opts.base ?? process.env.ASSAY_URL ?? "https://assay-dusky.vercel.app").replace(/\/$/, "");
  const f = opts.fetch ?? fetch;
  const maxChecks = opts.maxChecks ?? 5;
  return client.onBeforePaymentCreation(async ({ paymentRequired, selectedRequirements }) => {
    const payTo = String(selectedRequirements.payTo);
    const resource = (paymentRequired as { resource?: { url?: string } }).resource?.url ?? null;
    const d = decideGuard(await investigate(f, base, payTo, resource, maxChecks), policy);
    opts.onDecision?.(d);
    if (d.action === "refuse") return { abort: true as const, reason: `Assay guard: ${d.reason}` };
  });
}
