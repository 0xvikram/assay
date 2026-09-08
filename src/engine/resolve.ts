import { healthyChains, type ChainEntry } from "./graph/registry";
import { fetchAgentsByEndpoint, type AgentStub } from "./graph/queries";

export type EndpointField = "mcpEndpoint" | "webEndpoint" | "a2aEndpoint";

export interface EndpointMatch {
  chain: ChainEntry;
  agent: AgentStub;
  matchedOn: EndpointField;
  matchedValue: string;
}

export interface ResolveResult {
  input: string;
  candidates: string[];
  matches: EndpointMatch[];
  chainsQueried: string[];
  /** Chains where more agents claim this endpoint than one page returns. */
  truncated: string[];
  /** Chains that could not be asked. Reported, never silently dropped. */
  failures: { chain: string; error: string }[];
}

/**
 * Registrations are free text, so the same endpoint shows up with and without a
 * trailing slash and with mixed-case hosts. The subgraph matches strings exactly;
 * we widen the net by asking for every spelling a careful operator might have used.
 */
export function endpointCandidates(input: string): string[] {
  const raw = input.trim();
  const out = new Set<string>([raw]);
  try {
    const u = new URL(raw);
    const base = `${u.protocol}//${u.host.toLowerCase()}${u.pathname}${u.search}`;
    const bare = base.endsWith("/") ? base.slice(0, -1) : base;
    out.add(bare);
    out.add(`${bare}/`);
  } catch {
    /* not a URL — match the literal only */
  }
  return [...out].filter(Boolean);
}

export async function resolveEndpoint(input: string): Promise<ResolveResult> {
  const candidates = endpointCandidates(input);
  const wanted = new Set(candidates);
  const chains = healthyChains();

  const settled = await Promise.allSettled(chains.map((c) => fetchAgentsByEndpoint(c, candidates)));

  const matches: EndpointMatch[] = [];
  const failures: ResolveResult["failures"] = [];
  const truncated: string[] = [];
  settled.forEach((r, i) => {
    const chain = chains[i]!;
    if (r.status === "rejected") {
      failures.push({ chain: chain.key, error: String((r.reason as Error)?.message ?? r.reason) });
      return;
    }
    if (r.value.data.agents.length >= 20) truncated.push(chain.key);
    for (const agent of r.value.data.agents) {
      const rf = agent.registrationFile;
      const fields: EndpointField[] = ["mcpEndpoint", "webEndpoint", "a2aEndpoint"];
      const hit = fields.find((f) => rf?.[f] && wanted.has(rf[f]!));
      if (hit) matches.push({ chain, agent, matchedOn: hit, matchedValue: rf![hit]! });
    }
  });

  return { input, candidates, matches, chainsQueried: chains.map((c) => c.key), truncated, failures };
}
