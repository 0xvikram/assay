import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface ChainEntry {
  key: string;
  chainId: number;
  name: string;
  subgraphId: string;
  healthy: boolean;
  explorer: string;
}

const file = fileURLToPath(new URL("../../registry/chains.json", import.meta.url));
const raw = JSON.parse(readFileSync(file, "utf8")) as { chains: ChainEntry[] };

export const CHAINS: ChainEntry[] = raw.chains;

export function byChainId(chainId: number): ChainEntry | undefined {
  return CHAINS.find((c) => c.chainId === chainId);
}

export function byKey(key: string): ChainEntry | undefined {
  return CHAINS.find((c) => c.key === key.toLowerCase());
}

/** Chains we will actually answer from unless the caller opts in to the rest. */
export function healthyChains(): ChainEntry[] {
  return CHAINS.filter((c) => c.healthy);
}
