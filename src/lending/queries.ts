import { query, type GraphResult } from "../engine/graph/client";
import type { LendingSource } from "./registry";

/** The client wants a display name; a lending source is known by its key. */
const asGraphSource = (s: LendingSource) => ({ name: s.key, subgraphId: s.subgraphId });

export interface RawProtocol {
  id: string;
  name: string;
  network: string;
  type: string;
  schemaVersion: string;
  subgraphVersion: string;
  methodologyVersion: string;
  totalValueLockedUSD: string;
}

export interface RawMarket {
  id: string;
  name: string | null;
  isActive: boolean;
  canBorrowFrom: boolean;
  maximumLTV: string;
  liquidationThreshold: string;
  totalValueLockedUSD: string;
  totalDepositBalanceUSD: string;
  totalBorrowBalanceUSD: string;
  inputToken: { symbol: string; decimals: number } | null;
  rates: { rate: string; side: string; type: string }[];
}

const MARKET_FIELDS = `
  id name isActive canBorrowFrom maximumLTV liquidationThreshold
  totalValueLockedUSD totalDepositBalanceUSD totalBorrowBalanceUSD
  inputToken { symbol decimals }
  rates { rate side type }`;

/**
 * The version triple is read on every request, never trusted from the registry.
 * A source that has been upgraded under us must change the verdict, not be
 * silently compared against a stale expectation.
 */
export function fetchProtocol(source: LendingSource): Promise<GraphResult<{ protocols: RawProtocol[] }>> {
  return query<{ protocols: RawProtocol[] }>(
    asGraphSource(source),
    `protocols { id name network type schemaVersion subgraphVersion methodologyVersion totalValueLockedUSD }`,
    {},
    "",
  );
}

/** Markets for one asset symbol, plus the protocol's versions in the same read. */
export function fetchMarkets(source: LendingSource, first = 200): Promise<GraphResult<{ protocols: RawProtocol[]; markets: RawMarket[] }>> {
  return query<{ protocols: RawProtocol[]; markets: RawMarket[] }>(
    asGraphSource(source),
    `protocols { id name network type schemaVersion subgraphVersion methodologyVersion totalValueLockedUSD }
     markets(first: $first, orderBy: totalValueLockedUSD, orderDirection: desc) { ${MARKET_FIELDS} }`,
    { first },
    "$first: Int",
  );
}
