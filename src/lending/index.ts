import { fetchMarkets, fetchProtocol } from "./queries";
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

export interface ComparabilityPreview {
  a: string;
  b: string;
  comparability: Comparison["comparability"];
  statement: string;
  versions: { key: string; schemaVersion: string; methodologyVersion: string; network: string }[];
  readAt: string;
}

/**
 * Free: *whether* two sources may be compared, never what they say. The answer
 * is derived from the version triple alone, which the registry already
 * publishes — so this gives away nothing the paid route sells, and it is the
 * half of the argument worth showing a visitor.
 */
export async function previewComparability(aKey: string, bKey: string): Promise<ComparabilityPreview> {
  const a = resolveSource(aKey);
  const b = resolveSource(bKey);
  if (a.key === b.key) throw new Error(`Comparability needs two different sources; got ${a.key} twice.`);

  const [pa, pb] = await Promise.all([fetchProtocol(a), fetchProtocol(b)]);
  const ra = readingFor(a, pa.data.protocols ?? [], [], "");
  const rb = readingFor(b, pb.data.protocols ?? [], [], "");
  const c = reconcile(ra, rb, "");

  // reconcile() reports a missing market when the versions line up; for a
  // preview there are no markets by design, so say what that actually means.
  const comparable = c.comparability === "COMPARABLE";
  return {
    a: a.key,
    b: b.key,
    comparability: c.comparability,
    statement: comparable
      ? `Both sources are on schema ${ra.schemaVersion} and methodology ${ra.methodologyVersion}, so their figures were derived the same way and may be reconciled.`
      : c.statement,
    versions: [ra, rb].map((r) => ({ key: r.key, schemaVersion: r.schemaVersion, methodologyVersion: r.methodologyVersion, network: r.network })),
    readAt: new Date().toISOString(),
  };
}
