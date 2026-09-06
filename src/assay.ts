import { fetchAgent } from "./graph/queries.js";
import { computeSignals, type Signals } from "./score/signals.js";
import { assess, type Assessment, THRESHOLDS } from "./score/verdict.js";
import { byChainId, byKey, type ChainEntry } from "./graph/registry.js";

export interface Provenance {
  chain: string;
  chainId: number;
  subgraphId: string;
  /** The exact deployment the answer was read from — pinned, not "latest". */
  deployment: string;
  block: number;
  blockTime: string | null;
  hasIndexingErrors: boolean;
  sampleCap: number;
  sampleTruncated: boolean;
  readAt: string;
  latencyMs: number;
  thresholds: typeof THRESHOLDS;
}

export interface AssayReport {
  agent: {
    id: string;
    name: string | null;
    owner: string;
    wallet: string | null;
    ens: string | null;
    x402Support: boolean | null;
    registeredDaysAgo: number | null;
  };
  assessment: Assessment;
  signals: Signals;
  provenance: Provenance;
}

export function resolveChain(ref: string): ChainEntry {
  const chain = /^\d+$/.test(ref) ? byChainId(Number(ref)) : byKey(ref);
  if (!chain) throw new Error(`Unknown chain "${ref}". See registry/chains.json.`);
  if (!chain.healthy) throw new Error(`${chain.name} has no reliable indexer right now — refusing to answer from it.`);
  return chain;
}

/** `8453:1247` or `base:1247` or (chain, id). */
export async function assay(ref: string, sampleCap = 1000): Promise<AssayReport> {
  const [chainRef, agentRef] = ref.includes(":") ? ref.split(":") : [undefined, ref];
  if (!chainRef) throw new Error(`Reference must be "<chain>:<agentId>", e.g. base:1247 or 8453:1247`);
  const chain = resolveChain(chainRef);

  const { data, meta, latencyMs } = await fetchAgent(chain, `${chain.chainId}:${agentRef}`, sampleCap);
  if (!data.agent) throw new Error(`No agent ${agentRef} registered on ${chain.name}.`);

  const signals = computeSignals(data.agent);
  const assessment = assess(signals);
  const rf = data.agent.registrationFile;

  return {
    agent: {
      id: data.agent.id,
      name: rf?.name ?? null,
      owner: data.agent.owner,
      wallet: data.agent.agentWallet,
      ens: rf?.ens ?? null,
      x402Support: rf?.x402Support ?? null,
      registeredDaysAgo: signals.ageDays,
    },
    assessment,
    signals,
    provenance: {
      chain: chain.name,
      chainId: chain.chainId,
      subgraphId: chain.subgraphId,
      deployment: meta.deployment,
      block: meta.blockNumber,
      blockTime: meta.blockTimestamp ? new Date(meta.blockTimestamp * 1000).toISOString() : null,
      hasIndexingErrors: meta.hasIndexingErrors,
      sampleCap,
      sampleTruncated: signals.sample + signals.revoked >= sampleCap,
      readAt: new Date().toISOString(),
      latencyMs,
      thresholds: THRESHOLDS,
    },
  };
}
