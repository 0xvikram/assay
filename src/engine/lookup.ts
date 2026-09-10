import { healthyChains } from "./graph/registry";
import { fetchAgentsByAddress, type AgentStub } from "./graph/queries";
import { resolveEndpoint } from "./resolve";

export type MatchedOn = "owner" | "agentWallet" | "endpoint";

export interface CounterpartyMatch {
  /** chain key : agentId — the form every agent route accepts. */
  ref: string;
  chain: string;
  chainId: number;
  agentId: string;
  name: string | null;
  matchedOn: MatchedOn;
}

export interface CounterpartyLookup {
  address: string | null;
  url: string | null;
  matches: CounterpartyMatch[];
  chainsQueried: string[];
  failures: { chain: string; error: string }[];
}

const EVM = /^0x[0-9a-fA-F]{40}$/;

/**
 * Who is being paid? A 402 names a payTo address and a resource URL;
 * ERC-8004 registrations name owners, wallets and endpoints. This joins the
 * two so a payment client can learn whose reputation it is about to trust
 * before it signs anything. A non-EVM payTo — a Hedera account, say — cannot
 * appear in a registration, so only the URL can identify that counterparty.
 * Address matches are listed first: the payee is more decisive than a URL
 * that forty registrations may claim.
 */
export async function lookupCounterparty(input: { address?: string | null; url?: string | null }, cap = 25): Promise<CounterpartyLookup> {
  const address = input.address && EVM.test(input.address) ? input.address.toLowerCase() : null;
  const url = input.url?.trim() || null;
  const chains = healthyChains();
  const matches = new Map<string, CounterpartyMatch>();
  const failures: CounterpartyLookup["failures"] = [];

  const add = (chainKey: string, chainId: number, a: AgentStub, matchedOn: MatchedOn) => {
    const ref = `${chainKey}:${a.agentId}`;
    if (!matches.has(ref)) matches.set(ref, { ref, chain: chainKey, chainId, agentId: a.agentId, name: a.registrationFile?.name ?? null, matchedOn });
  };

  if (address) {
    const settled = await Promise.allSettled(chains.map((c) => fetchAgentsByAddress(c, address)));
    settled.forEach((r, i) => {
      const c = chains[i]!;
      if (r.status === "rejected") { failures.push({ chain: c.key, error: String((r.reason as Error)?.message ?? r.reason) }); return; }
      for (const a of r.value.data.agents) add(c.key, c.chainId, a, a.owner.toLowerCase() === address ? "owner" : "agentWallet");
    });
  }
  if (url) {
    const r = await resolveEndpoint(url);
    for (const m of r.matches) add(m.chain.key, m.chain.chainId, m.agent, "endpoint");
    failures.push(...r.failures);
  }

  return { address, url, matches: [...matches.values()].slice(0, cap), chainsQueried: chains.map((c) => c.key), failures };
}
