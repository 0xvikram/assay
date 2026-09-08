import { assay, resolveChain, type AssayReport } from "./assay";
import { healthyChains } from "./graph/registry";
import { fetchAgentsByOwner, type AgentStub } from "./graph/queries";
import type { Finding, Verdict } from "./score/verdict";

export interface ChainPresence {
  chain: string;
  chainId: number;
  agents: {
    id: string;
    name: string | null;
    ens: string | null;
    verdict: Verdict | null;
    confidence: number | null;
    /** Set when the agent was found but its full assessment failed. */
    error?: string;
  }[];
}

export interface CorroborationReport {
  owner: string;
  chains: ChainPresence[];
  findings: Finding[];
  /** True when every chain tells the same story about who this owner is. */
  consistent: boolean;
  chainsQueried: string[];
  failures: { chain: string; error: string }[];
  readAt: string;
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase() || null;

/**
 * One chain's registry is one witness. An owner who runs the same agent on
 * several chains should look the same on each; an owner whose Base agent is a
 * farm has told you something about their Ethereum agent too. Reads every
 * healthy chain in parallel and assesses what it finds.
 */
export async function corroborate(ownerOrRef: string, perChainCap = 3): Promise<CorroborationReport> {
  let owner = ownerOrRef.trim();
  if (owner.includes(":")) {
    const [chainRef] = owner.split(":");
    resolveChain(chainRef!); // fail early on an unknown or unhealthy chain
    owner = (await assay(owner)).agent.owner;
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(owner)) throw new Error(`"${ownerOrRef}" is neither an address nor chain:agentId.`);
  owner = owner.toLowerCase();

  const chains = healthyChains();
  const settled = await Promise.allSettled(chains.map((c) => fetchAgentsByOwner(c, owner)));

  const failures: CorroborationReport["failures"] = [];
  const found: { chainKey: string; chainId: number; stubs: AgentStub[] }[] = [];
  settled.forEach((r, i) => {
    const c = chains[i]!;
    if (r.status === "rejected") failures.push({ chain: c.key, error: String((r.reason as Error)?.message ?? r.reason) });
    else if (r.value.data.agents.length) found.push({ chainKey: c.key, chainId: c.chainId, stubs: r.value.data.agents.slice(0, perChainCap) });
  });

  const reports = await Promise.allSettled(
    found.flatMap((f) => f.stubs.map((s) => assay(`${f.chainKey}:${s.agentId}`))),
  );

  let k = 0;
  const presence: ChainPresence[] = found.map((f) => ({
    chain: f.chainKey,
    chainId: f.chainId,
    agents: f.stubs.map((s) => {
      const r = reports[k++]!;
      const ok = r.status === "fulfilled" ? (r.value as AssayReport) : null;
      return {
        id: s.id,
        name: s.registrationFile?.name ?? null,
        ens: s.registrationFile?.ens ?? null,
        verdict: ok?.assessment.verdict ?? null,
        confidence: ok?.assessment.confidence ?? null,
        ...(r.status === "rejected" ? { error: String((r.reason as Error)?.message ?? r.reason) } : {}),
      };
    }),
  }));

  const findings: Finding[] = [];
  const names = new Set(presence.flatMap((p) => p.agents.map((a) => norm(a.name))).filter(Boolean));
  const enses = new Set(presence.flatMap((p) => p.agents.map((a) => norm(a.ens))).filter(Boolean));
  if (names.size > 1 || enses.size > 1) {
    findings.push({
      code: "CROSS_CHAIN_INCONSISTENT",
      severity: "warning",
      statement: "The same owner presents different identities on different chains.",
      measured: `${names.size} distinct names, ${enses.size} distinct ENS names across ${presence.length} chains`,
    });
  }
  const washed = presence.flatMap((p) => p.agents.filter((a) => a.verdict === "WASH_REPUTATION_DETECTED").map((a) => a.id));
  if (washed.length) {
    findings.push({
      code: "OWNER_RUNS_WASHED_AGENT",
      severity: "critical",
      statement: "This owner operates at least one agent with manufactured reputation.",
      measured: washed.join(", "),
    });
  }
  if (presence.length === 0) {
    findings.push({
      code: "OWNER_UNKNOWN",
      severity: "warning",
      statement: "No agent on any healthy chain is registered to this owner.",
      measured: `0 agents across ${chains.length} chains`,
    });
  }

  return {
    owner,
    chains: presence,
    findings,
    consistent: findings.every((f) => f.code !== "CROSS_CHAIN_INCONSISTENT"),
    chainsQueried: chains.map((c) => c.key),
    failures,
    readAt: new Date().toISOString(),
  };
}
