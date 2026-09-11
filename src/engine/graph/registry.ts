import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface ChainEntry {
  key: string;
  chainId: number;
  name: string;
  subgraphId: string;
  healthy: boolean;
  explorer: string;
}

// From the working directory, as the lending registry does. new URL(…, import.meta.url)
// broke once the engine ran inside rendered pages: the bundler turns that pattern
// into an asset reference with its own URL class, which fileURLToPath rejects.
const file = resolve(process.cwd(), "registry/chains.json");
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
