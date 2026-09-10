import { fetchMarkets } from "./queries";
import { resolveSource, SOURCES, type LendingSource } from "./registry";
import { reconcile, readingFor, TOLERANCE, type Comparison, type SourceReading } from "./reconcile";

export type { Comparison, SourceReading, LendingSource };
export { SOURCES, TOLERANCE };

export interface LendingProvenance {
  source: string;
  subgraphId: string;
  deployment: string;
  block: number;
  blockTime: string | null;
  hasIndexingErrors: boolean;
  latencyMs: number;
}

export interface LendingReport {
  asset: string;
  comparison: Comparison;
  provenance: LendingProvenance[];
  readAt: string;
  tolerance: number;
}

async function read(source: LendingSource, asset: string): Promise<{ reading: SourceReading; provenance: LendingProvenance }> {
  const { data, meta, latencyMs } = await fetchMarkets(source);
  return {
    reading: readingFor(source, data.protocols ?? [], data.markets ?? [], asset),
    provenance: {
      source: source.key,
      subgraphId: source.subgraphId,
      deployment: meta.deployment,
      block: meta.blockNumber,
      blockTime: meta.blockTimestamp ? new Date(meta.blockTimestamp * 1000).toISOString() : null,
      hasIndexingErrors: meta.hasIndexingErrors,
      latencyMs,
    },
  };
}

/**
 * Two independent Messari deployments, one shared query shape, one verdict.
 * Both sides are read in parallel and each carries its own provenance, because
 * "these agree" is only meaningful if you can say which two deployments at
 * which two blocks agreed.
 */
export async function compareMarket(aKey: string, bKey: string, asset: string): Promise<LendingReport> {
  const a = resolveSource(aKey);
  const b = resolveSource(bKey);
  if (a.key === b.key) throw new Error(`Reconciliation needs two different sources; got ${a.key} twice.`);

  const [ra, rb] = await Promise.all([read(a, asset), read(b, asset)]);
  return {
    asset: asset.toUpperCase(),
    comparison: reconcile(ra.reading, rb.reading, asset.toUpperCase()),
    provenance: [ra.provenance, rb.provenance],
    readAt: new Date().toISOString(),
    tolerance: TOLERANCE,
  };
}

/** One source, for callers who want the snapshot rather than the reconciliation. */
export async function marketSnapshot(key: string, asset: string) {
  const source = resolveSource(key);
  const { reading, provenance } = await read(source, asset);
  return { asset: asset.toUpperCase(), reading, provenance: [provenance], readAt: new Date().toISOString() };
}
