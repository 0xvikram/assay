import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface LendingSource {
  key: string;
  protocol: string;
  network: string;
  subgraphId: string;
  healthy: boolean;
  /** What the registry expects. The loader checks these against the subgraph. */
  schemaVersion: string;
  methodologyVersion: string;
  unhealthyReason?: string;
}

const file = resolve(process.cwd(), "registry/lending.json");
const raw = JSON.parse(readFileSync(file, "utf8")) as { sources: LendingSource[] };

export const SOURCES: LendingSource[] = raw.sources;

export function bySourceKey(key: string): LendingSource | undefined {
  return SOURCES.find((s) => s.key === key.toLowerCase());
}

export function healthySources(): LendingSource[] {
  return SOURCES.filter((s) => s.healthy);
}

/** Refuse rather than guess, exactly as the chain registry does. */
export function resolveSource(key: string): LendingSource {
  const s = bySourceKey(key);
  if (!s) throw new Error(`Unknown lending source "${key}". See registry/lending.json.`);
  if (!s.healthy) throw new Error(`${s.key} is not servable — ${s.unhealthyReason ?? "marked unhealthy"} — refusing to answer from it.`);
  return s;
}
