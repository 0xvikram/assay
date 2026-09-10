import type { RawMarket, RawProtocol } from "./queries";
import type { LendingSource } from "./registry";

export type Comparability =
  | "COMPARABLE"
  | "SCHEMA_MISMATCH"
  | "METHODOLOGY_MISMATCH"
  | "REGISTRY_DRIFT";

export type Reconciliation = "AGREE" | "DISAGREE" | "NOT_ATTEMPTED";

export interface SourceReading {
  key: string;
  protocol: string;
  network: string;
  schemaVersion: string;
  subgraphVersion: string;
  methodologyVersion: string;
  /** Set when the subgraph disagrees with what registry/lending.json expected. */
  drift: string | null;
  market: {
    id: string;
    name: string | null;
    asset: string;
    isActive: boolean;
    totalValueLockedUSD: number;
    totalBorrowBalanceUSD: number;
    liquidationThreshold: number;
    maximumLTV: number;
    lenderRate: number | null;
  } | null;
}

export interface Comparison {
  asset: string;
  comparability: Comparability;
  reconciliation: Reconciliation;
  /** Prose a caller can print verbatim. */
  statement: string;
  /** Only populated when the comparison was actually attempted. */
  deltas: { field: string; a: number; b: number; relDiff: number; withinTolerance: boolean }[];
  sources: [SourceReading, SourceReading];
}

/**
 * Two subgraphs agreeing on a number means nothing unless they computed it the
 * same way. Messari versions that intent: `schemaVersion` says what the fields
 * mean, `methodologyVersion` says how they were derived. Comparing across a
 * difference in either produces a number that looks authoritative and isn't —
 * so we refuse instead, and say which version differed.
 */
export const TOLERANCE = 0.02;

const num = (s: string | null | undefined) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export function readingFor(source: LendingSource, protocols: RawProtocol[], markets: RawMarket[], asset: string): SourceReading {
  const p = protocols[0];
  const wanted = asset.toLowerCase();
  const m =
    markets.find((x) => x.inputToken?.symbol.toLowerCase() === wanted) ??
    markets.find((x) => (x.name ?? "").toLowerCase().includes(wanted)) ??
    null;

  const drift =
    !p ? "the subgraph returned no protocol entity"
    : p.schemaVersion !== source.schemaVersion || p.methodologyVersion !== source.methodologyVersion
      ? `registry expected schema ${source.schemaVersion} / methodology ${source.methodologyVersion}, subgraph reports ${p.schemaVersion} / ${p.methodologyVersion}`
      : p.network.toUpperCase() !== source.network.toUpperCase()
        ? `registry expected network ${source.network}, subgraph reports ${p.network}`
        : null;

  const lender = m?.rates.find((r) => r.side === "LENDER");

  return {
    key: source.key,
    protocol: source.protocol,
    network: p?.network ?? source.network,
    schemaVersion: p?.schemaVersion ?? "?",
    subgraphVersion: p?.subgraphVersion ?? "?",
    methodologyVersion: p?.methodologyVersion ?? "?",
    drift,
    market: m
      ? {
          id: m.id,
          name: m.name,
          asset: m.inputToken?.symbol ?? asset,
          isActive: m.isActive,
          totalValueLockedUSD: num(m.totalValueLockedUSD),
          totalBorrowBalanceUSD: num(m.totalBorrowBalanceUSD),
          liquidationThreshold: num(m.liquidationThreshold),
          maximumLTV: num(m.maximumLTV),
          lenderRate: lender ? num(lender.rate) : null,
        }
      : null,
  };
}

/** Relative difference against the larger magnitude; 0 when both are 0. */
function rel(a: number, b: number): number {
  const scale = Math.max(Math.abs(a), Math.abs(b));
  return scale === 0 ? 0 : Math.abs(a - b) / scale;
}

export function reconcile(a: SourceReading, b: SourceReading, asset: string): Comparison {
  const pair: [SourceReading, SourceReading] = [a, b];
  const nope = (c: Comparability, statement: string): Comparison => ({
    asset, comparability: c, reconciliation: "NOT_ATTEMPTED", statement, deltas: [], sources: pair,
  });

  if (a.drift || b.drift) {
    return nope("REGISTRY_DRIFT", `A source no longer matches the registry, so the comparison was not attempted. ${[a.drift && `${a.key}: ${a.drift}`, b.drift && `${b.key}: ${b.drift}`].filter(Boolean).join("; ")}`);
  }
  if (a.schemaVersion !== b.schemaVersion) {
    return nope("SCHEMA_MISMATCH", `${a.key} is on schema ${a.schemaVersion} and ${b.key} is on ${b.schemaVersion}. The fields do not mean the same thing across those versions, so no number is returned.`);
  }
  if (a.methodologyVersion !== b.methodologyVersion) {
    return nope("METHODOLOGY_MISMATCH", `Both sources are on schema ${a.schemaVersion}, but ${a.key} derives its figures with methodology ${a.methodologyVersion} and ${b.key} with ${b.methodologyVersion}. Same field names, different derivation — comparing them would invent agreement.`);
  }
  if (!a.market || !b.market) {
    const missing = [!a.market && a.key, !b.market && b.key].filter(Boolean).join(" and ");
    return nope("COMPARABLE", `The sources are comparable, but ${missing} lists no ${asset} market, so there is nothing to reconcile.`);
  }

  const fields: [string, number, number][] = [
    ["liquidationThreshold", a.market.liquidationThreshold, b.market.liquidationThreshold],
    ["maximumLTV", a.market.maximumLTV, b.market.maximumLTV],
    ["lenderRate", a.market.lenderRate ?? 0, b.market.lenderRate ?? 0],
  ];
  const deltas = fields.map(([field, x, y]) => {
    const relDiff = rel(x, y);
    return { field, a: x, b: y, relDiff, withinTolerance: relDiff <= TOLERANCE };
  });

  const disagreements = deltas.filter((d) => !d.withinTolerance);
  if (disagreements.length === 0) {
    return {
      asset, comparability: "COMPARABLE", reconciliation: "AGREE", deltas, sources: pair,
      statement: `${a.key} and ${b.key} are on the same schema and methodology and agree on ${asset} within ${(TOLERANCE * 100).toFixed(0)}%.`,
    };
  }
  return {
    asset, comparability: "COMPARABLE", reconciliation: "DISAGREE", deltas, sources: pair,
    statement: `${a.key} and ${b.key} are directly comparable and disagree on ${asset}: ${disagreements.map((d) => `${d.field} ${d.a} vs ${d.b} (${(d.relDiff * 100).toFixed(1)}%)`).join("; ")}. Treat the market as EVIDENCE_INCONSISTENT rather than averaging them.`,
  };
}
